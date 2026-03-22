"use client"

import * as React from "react"
import { ShieldCheck, Globe, Loader2 } from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { toast } from "@/hooks/use-toast"
import { useUser, useFirestore } from "@/firebase"
import { doc, collection, writeBatch, serverTimestamp, Firestore, getDocs } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { syncWithNzPortal } from "@/app/actions/nz-sync"

const MAX_BATCH_OPS = 499;

async function commitInChunks(db: Firestore, ops: Array<{ type: 'set' | 'update'; ref: any; data: any; options?: any }>) {
  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const chunk = ops.slice(i, i + MAX_BATCH_OPS);
    const batch = writeBatch(db);
    for (const op of chunk) {
      if (op.type === 'set') {
        batch.set(op.ref, op.data, op.options || {});
      } else {
        batch.update(op.ref, op.data);
      }
    }
    await batch.commit();
  }
}

export default function SyncPage() {
  const { user } = useUser()
  const db = useFirestore()
  const router = useRouter()
  
  const [login, setLogin] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [status, setStatus] = React.useState("")

  const getClassroomOps = (userId: string, userName: string, schoolId: string, schoolName: string, gradeLevel: string) => {
    if (!schoolId || !gradeLevel) return [];

    const normalizedClass = (gradeLevel || "Клас").toString().trim().replace(/\s+/g, '-').toUpperCase();
    const groupId = `class-${schoolId}-${normalizedClass}`;
    const groupRef = doc(db, "groups", groupId);
    const membershipRef = doc(db, "users", userId, "memberships", groupId);

    return [
      {
        type: 'set' as const,
        ref: groupRef,
        data: {
          name: (gradeLevel || "Клас").toString().trim(),
          type: "classroom",
          mode: "group",
          schoolId: String(schoolId),
          schoolName: schoolName || "Моя школа",
          createdAt: serverTimestamp(),
          admins: [userId]
        },
        options: { merge: true }
      },
      {
        type: 'set' as const,
        ref: membershipRef,
        data: {
          joinedAt: serverTimestamp(),
          id: groupId,
          name: (gradeLevel || "Клас").toString().trim(),
          type: "classroom"
        },
        options: { merge: true }
      }
    ];
  };

  const handleSync = async () => {
    if (!user || !login || !password) {
      toast({ title: "Увага", description: "Заповніть всі поля", variant: "destructive" });
      return;
    }

    setIsSyncing(true)
    setProgress(10)
    setStatus("Авторизація на NZ.ua...")

    try {
      const result = await syncWithNzPortal(login, password);

      if (!result || !result.success || !result.data) {
        throw new Error(result?.error || "Невірні дані nz.ua");
      }

      setProgress(40)
      setStatus("Обробка оцінок...")

      const { data } = result;
      const ops: Array<{ type: 'set' | 'update'; ref: any; data: any; options?: any }> = [];

      // Delete all existing grades to prevent duplicates from old sourceKey formats.
      const existingGrades = await getDocs(collection(db, "users", user.uid, "grades"));
      const deleteRefs: any[] = [];
      existingGrades.forEach(d => deleteRefs.push(d.ref));
      for (let i = 0; i < deleteRefs.length; i += MAX_BATCH_OPS) {
        const chunk = deleteRefs.slice(i, i + MAX_BATCH_OPS);
        const delBatch = writeBatch(db);
        chunk.forEach(ref => delBatch.delete(ref));
        await delBatch.commit();
      }

      let totalXp = 0;
      let totalScore = 0;
      let scoreCount = 0;

      data.grades.forEach(g => {
        const scoreVal = parseInt(g.score);
        if (!isNaN(scoreVal)) {
          totalScore += scoreVal;
          scoreCount++;
          totalXp += (scoreVal * 10);
        }
        const rawId = g.sourceKey || `${g.subject}_${g.date}_${g.type}_${g.score}`;
        const safeId = "grd_" + rawId.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
        ops.push({ type: 'set', ref: doc(db, "users", user.uid, "grades", safeId), data: { ...g, timestamp: g.timestamp, syncedAt: serverTimestamp() } });
      });

      const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 1;

      setProgress(60)
      setStatus("Оновлення розкладу...")
      data.lessons.forEach(l => {
        const rawId = `${l.date}_${l.order}`;
        const safeId = "lsn_" + rawId.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
        ops.push({ type: 'set', ref: doc(db, "users", user.uid, "lessons", safeId), data: { ...l, syncedAt: serverTimestamp() }, options: { merge: true } });
      });

      setProgress(85)
      setStatus("Підключення до кімнати класу...")
      ops.push(...getClassroomOps(user.uid, data.studentName || user.displayName || "Учень", data.schoolId, data.schoolName, data.gradeLevel));

      ops.push({
        type: 'update',
        ref: doc(db, "users", user.uid),
        data: {
          displayName: data.studentName || user.displayName,
          gradeLevel: (data.gradeLevel || "Клас").toString().trim(),
          schoolId: String(data.schoolId),
          schoolName: data.schoolName,
          isNzConnected: true,
          nzLogin: login,
          nzPassword: password,
          academicStatus: avgScore >= 10 ? "Відмінник" : avgScore >= 7 ? "Хорошист" : "Потребує уваги",
          level: avgScore,
          xp: totalXp,
          lastSync: new Date().toISOString()
        }
      });

      await commitInChunks(db, ops);
      
      setProgress(100)
      setStatus("Готово!")
      toast({ title: "Синхронізація успішна", description: `Ваш рівень тепер: ${avgScore}` })
      setTimeout(() => router.push('/'), 1000);
      
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" })
      setIsSyncing(false)
      setProgress(0)
      setStatus("Помилка")
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-12 animate-reveal">
      <div className="text-center space-y-6">
        <div className="size-24 rounded-[2rem] cyber-gradient flex items-center justify-center mx-auto shadow-2xl shadow-primary/30 group">
          <Globe className="text-white size-12 group-hover:rotate-12 transition-transform duration-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-headline font-bold text-white tracking-tight">Підключення <span className="text-primary text-glow">NZ.ua</span></h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">Ваш рівень залежатиме від ваших реальних оцінок.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="glass-panel border-0 p-8 space-y-8 rounded-[2.5rem] shadow-2xl">
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-primary/60 ml-1">Логін NZ.ua</Label>
              <Input placeholder="Введіть логін" className="bg-white/5 border-white/10 h-16 rounded-2xl px-6 text-lg focus:ring-primary/30" value={login} onChange={(e) => setLogin(e.target.value)} disabled={isSyncing} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-primary/60 ml-1">Пароль</Label>
              <Input type="password" placeholder="••••••••" className="bg-white/5 border-white/10 h-16 rounded-2xl px-6 text-lg focus:ring-primary/30" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSyncing} />
            </div>
          </div>
          <Button className="w-full cyber-gradient h-18 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 active:scale-95 transition-all" onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? <Loader2 className="animate-spin mr-3 size-6" /> : "УВІЙТИ ТА ПЕРЕВІРИТИ LVL"}
          </Button>
        </Card>

        <div className="space-y-6">
          <Card className="glass-panel border-0 p-8 space-y-6 rounded-[2.5rem]">
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs font-black uppercase text-white tracking-widest">Прогрес</p>
                <span className="text-primary font-bold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-4 bg-white/5 rounded-full" />
              <p className="text-[11px] uppercase font-black tracking-[0.3em] text-primary/80 text-center animate-pulse">{status || "Очікування..."}</p>
            </div>
          </Card>
          
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-colors">
            <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-green-500" />
            </div>
            <span className="text-sm font-bold text-white/90">Рівень росте разом з оцінками</span>
          </div>
        </div>
      </div>
    </div>
  )
}
