"use client"

import * as React from "react"
import { 
  Coins, 
  RefreshCw, 
  CalendarDays,
  Coffee,
  Sparkles,
  Calculator,
  Languages,
  Loader2,
  ArrowRight,
  Clock,
  TrendingUp,
  Zap,
  Star
} from "lucide-react"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
} from "@/components/ui/carousel"
import { useUser, useDoc, useFirestore, useCollection } from "@/firebase"
import { doc, collection, query, orderBy, limit, writeBatch, serverTimestamp, where, Firestore, getDocs } from "firebase/firestore"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format, parseISO, isAfter, set, addDays } from "date-fns"
import { uk } from "date-fns/locale"
import { syncWithNzPortal } from "@/app/actions/nz-sync"
import { toast } from "@/hooks/use-toast"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const subjectIcons: Record<string, React.ReactNode> = {
  "Математика": <Calculator className="size-5 text-blue-400" />,
  "Фізика": <Zap className="size-5 text-purple-400" />,
  "Українська мова": <Languages className="size-5 text-orange-400" />,
  "Default": <Sparkles className="size-5 text-primary" />
};

const SYNC_INTERVAL = 60000;
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

export default function Home() {
  const { user, loading: userLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  
  const userDocRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile, loading: profileLoading } = useDoc(userDocRef)

  const lessonsQuery = React.useMemo(() => {
    if (!user) return null;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return query(
      collection(db, "users", user.uid, "lessons"), 
      where("date", ">=", todayStr),
      orderBy("date", "asc"),
      limit(100)
    );
  }, [db, user?.uid]);
  
  const { data: allFetchedLessons, loading: lessonsLoading } = useCollection(lessonsQuery)

  const gradesQuery = React.useMemo(() => (user ? query(
    collection(db, "users", user.uid, "grades"), 
    orderBy("timestamp", "desc"), 
    limit(4)
  ) : null), [db, user])
  const { data: latestGrades } = useCollection(gradesQuery)

  const [isSyncing, setIsSyncing] = React.useState(false)

  React.useEffect(() => {
    if (!userLoading && !user) {
      router.push('/auth');
    }
  }, [user, userLoading, router]);

  const { targetDate, scheduleLabel } = React.useMemo(() => {
    const now = new Date();
    const switchTime = set(now, { hours: 15, minutes: 5, seconds: 0 });
    let target = now;
    let label = "На сьогодні";
    const todayStr = format(now, 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(now, 1), 'yyyy-MM-dd');
    const checkDate = isAfter(now, switchTime) ? tomorrowStr : todayStr;

    if (allFetchedLessons && allFetchedLessons.length > 0) {
      const futureLessons = allFetchedLessons.filter((l: any) => l.date >= checkDate);
      if (futureLessons.length > 0) {
        const firstDate = futureLessons[0].date;
        target = parseISO(firstDate);
        label = firstDate === todayStr ? "На сьогодні" : firstDate === tomorrowStr ? "На завтра" : format(target, 'EEEE', { locale: uk });
      }
    }
    return { targetDate: target, scheduleLabel: label };
  }, [allFetchedLessons]);

  const displayedLessons = React.useMemo(() => {
    if (!allFetchedLessons) return [];
    const dateKey = format(targetDate, 'yyyy-MM-dd');
    return allFetchedLessons
      .filter((l: any) => l.date === dateKey)
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  }, [allFetchedLessons, targetDate]);

  const performSync = async (manual = false) => {
    if (!profile?.nzLogin || !profile?.nzPassword || !user || isSyncing) return;
    
    const lastSyncDate = profile.lastSync ? new Date(profile.lastSync).getTime() : 0;
    const nowTs = new Date().getTime();
    if (!manual && nowTs - lastSyncDate < SYNC_INTERVAL) return;

    setIsSyncing(true);
    try {
      const result = await syncWithNzPortal(profile.nzLogin, profile.nzPassword);
      if (result && result.success && result.data) {
        const ops: Array<{ type: 'set' | 'update'; ref: any; data: any; options?: any }> = [];
        const hasXpBoost = profile?.purchasedItems?.includes('xp_boost');

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

        let totalScore = 0;
        let scoreCount = 0;

        result.data.grades.forEach((g: any) => {
          const s = parseInt(g.score);
          if (!isNaN(s)) {
            totalScore += s;
            scoreCount++;
          }
          const rawId = g.sourceKey || `${g.subject}_${g.date}_${g.type}_${g.score}`;
          const safeId = "grd_" + rawId.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
          ops.push({ type: 'set', ref: doc(db, "users", user.uid, "grades", safeId), data: { ...g, timestamp: g.timestamp, syncedAt: serverTimestamp() } });
        });

        const calculatedXp = totalScore * (hasXpBoost ? 25 : 10);
        const avg = scoreCount > 0 ? Math.round(totalScore / scoreCount) : (profile?.level || 1);

        result.data.lessons.forEach((l: any) => {
          const rawId = `${l.date}_${l.order}`;
          const safeId = "lsn_" + rawId.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').toLowerCase();
          ops.push({ type: 'set', ref: doc(db, "users", user.uid, "lessons", safeId), data: { ...l, syncedAt: serverTimestamp() }, options: { merge: true } });
        });

        const achievements = [...(profile?.achievements || [])];
        const hour = new Date().getHours();

        if (hour >= 23 || hour <= 4) if (!achievements.includes('night_owl')) achievements.push('night_owl');
        if (avg >= 10 && scoreCount > 0 && scoreCount < 15) if (!achievements.includes('smart_lazy')) achievements.push('smart_lazy');
        if (profile?.coins >= 5000 && !achievements.includes('rich_student')) achievements.push('rich_student');

        ops.push({
          type: 'update',
          ref: doc(db, "users", user.uid),
          data: {
            displayName: result.data.studentName || profile?.displayName,
            gradeLevel: (result.data.gradeLevel || "Клас").toString().trim(),
            level: avg,
            xp: calculatedXp,
            lastSync: new Date().toISOString(),
            achievements: Array.from(new Set(achievements)),
            academicStatus: avg >= 10 ? "Відмінник" : avg >= 7 ? "Хорошист" : "Учень"
          }
        });

        await commitInChunks(db, ops);
        if (manual) toast({ title: "Синхронізовано!", description: `Ваш рівень: ${avg}` });
      }
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = () => performSync(true);

  React.useEffect(() => {
    if (!profile?.nzLogin || !profile?.nzPassword || !user || profileLoading) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') performSync(false);
    }, SYNC_INTERVAL);
    performSync(false);
    return () => clearInterval(interval);
  }, [profile?.nzLogin, profile?.nzPassword, user, profileLoading]);

  if (userLoading || profileLoading) return <div className="fixed inset-0 bg-[#0a0512] flex items-center justify-center z-[100]"><Loader2 className="size-10 text-primary animate-spin" /></div>

  const isOwner = profile?.role === 'owner';

  return (
    <div className="min-h-screen bg-[#0a0512] scrollbar-none">
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10 animate-reveal">
        <header className="flex flex-col sm:flex-row justify-between items-center glass-panel p-6 md:p-8 rounded-[2.5rem] border-0 relative overflow-hidden gap-6">
          <div className="flex items-center gap-4 md:gap-6 z-10 w-full sm:w-auto">
            <Avatar className="size-16 md:size-20 border-2 border-primary/30 shadow-2xl shrink-0">
              <AvatarImage src={profile?.photoURL} className="object-cover" />
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xl">{user?.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-3xl font-headline font-bold text-white truncate leading-tight">Привіт, {profile?.displayName?.split(' ')[0]}!</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black uppercase tracking-widest px-3 py-1">
                  {(profile?.gradeLevel || "Школяр").toString().trim()}
                </Badge>
                {profile?.achievements?.includes('night_owl') && <Star className="size-4 text-indigo-400" />}
                {profile?.achievements?.includes('smart_lazy') && <Zap className="size-4 text-emerald-400" />}
                {profile?.achievements?.includes('rich_student') && <Coins className="size-4 text-yellow-500" />}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-4 z-10 w-full sm:w-auto">
            <div className="flex items-center gap-3 text-yellow-500 bg-yellow-500/10 px-6 py-3 rounded-2xl border border-yellow-500/20 shrink-0">
              <Coins className="size-6" />
              <span className="text-xl font-black">{isOwner ? "∞" : (profile?.coins || 0)}</span>
        </div>
            <Button variant="ghost" size="icon" className={cn("size-14 rounded-2xl bg-white/5", isSyncing && "animate-spin text-primary")} onClick={handleManualSync} disabled={isSyncing}>
              <RefreshCw className="size-7" />
            </Button>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
        </header>

        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-4">
               <div className="size-12 md:size-14 rounded-[1.5rem] bg-primary/10 flex items-center justify-center shadow-xl">
                 <CalendarDays className="size-6 md:size-7 text-primary" />
               </div>
               <div>
                 <h2 className="text-xl md:text-2xl font-headline font-bold text-white">{scheduleLabel} • {format(targetDate, 'd MMM', { locale: uk })}</h2>
               </div>
             </div>
             <Button variant="ghost" asChild className="text-primary font-black uppercase text-[10px] tracking-widest hover:bg-primary/5 rounded-xl">
               <Link href="/schedule">Увесь тиждень <ArrowRight className="ml-2 size-4" /></Link>
             </Button>
          </div>

          <div className="w-full">
            {lessonsLoading ? (
              <div className="p-20 text-center text-muted-foreground"><Loader2 className="animate-spin text-primary size-10 mx-auto" /></div>
            ) : displayedLessons.length > 0 ? (
              <Carousel opts={{ align: "start", duration: 35 }} className="w-full">
                <CarouselContent className="-ml-6">
                  {displayedLessons.map((lesson: any, i: number) => (
                    <CarouselItem key={i} className="pl-6 basis-[85%] sm:basis-1/2 lg:basis-1/3">
                      <Card className="glass-panel border-0 rounded-[2.5rem] overflow-hidden hover:bg-white/5 transition-all shadow-2xl h-full flex flex-col group">
                        <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                          <span className="text-[10px] font-black uppercase text-white/60 flex items-center gap-2">
                            <Clock className="size-3.5 text-primary" /> {lesson.time}
                          </span>
                          <Badge className="bg-primary/10 text-primary font-black px-3 py-1 text-[9px] rounded-lg">УРОК {lesson.order}</Badge>
                        </div>
                        <div className="p-7 space-y-6 flex-1">
                          <div className="flex gap-4">
                            <div className="size-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                              {subjectIcons[lesson.subject] || subjectIcons["Default"]}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-bold text-white truncate leading-tight">{lesson.subject}</h3>
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] mt-1.5">Каб. {lesson.room}</p>
        </div>
      </div>
                          {lesson.homework && (
                            <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 mt-auto">
                              <p className="text-xs text-white/80 italic line-clamp-2 leading-relaxed">{lesson.homework}</p>
                            </div>
                          )}
                        </div>
           </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            ) : (
              <div className="glass-panel p-20 rounded-[3.5rem] text-center space-y-4">
                 <Coffee className="size-12 text-primary/30 mx-auto" />
                 <p className="text-2xl font-bold text-white">Уроків немає</p>
        </div>
            )}
                   </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="glass-panel p-10 border-0 rounded-[3.5rem] flex flex-col items-center justify-center text-center gap-8 shadow-2xl relative overflow-hidden group">
            <div className="text-6xl md:text-7xl font-black italic text-white text-glow z-10 leading-none">LV {profile?.level || 1}</div>
            <div className="w-full space-y-4 z-10">
              <div className="flex justify-between text-[10px] md:text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                <span>Ранг: {profile?.academicStatus || "Новачок"}</span>
                <span className="text-primary">{profile?.xp || 0} XP</span>
                   </div>
              <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((profile?.level || 1) / 12) * 100}%` }}
                  className="h-full cyber-gradient" 
                />
                   </div>
              <p className="text-[9px] text-muted-foreground italic leading-relaxed">Ваш рівень — це ваш середній бал.</p>
                         </div>
            <div className="absolute -right-24 -bottom-24 size-80 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                           </div>

          <Card className="glass-panel border-0 rounded-[3.5rem] md:col-span-2 overflow-hidden flex flex-col shadow-2xl">
            <CardHeader className="p-6 md:p-8 bg-white/[0.02] border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-4">
                <TrendingUp className="size-5 text-green-500" /> Останні оцінки
              </CardTitle>
              <Button variant="ghost" asChild className="text-primary font-bold text-xs hover:bg-primary/5 rounded-xl">
                <Link href="/grades">Весь журнал <ArrowRight className="ml-2 size-4" /></Link>
                           </Button>
            </CardHeader>
            <div className="flex-1 divide-y divide-white/5">
              {latestGrades?.length ? latestGrades.map((g: any, i: number) => (
                <div key={i} className="p-5 md:p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4 md:gap-5">
                    <div className={cn(
                      "size-12 md:size-14 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black italic shadow-xl",
                      parseInt(g.score) >= 10 ? 'bg-green-500/20 text-green-500' : 'bg-primary/20 text-primary'
                    )}>
                      {g.score}
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm md:text-base truncate max-w-[150px] md:max-w-none">{g.subject}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1 opacity-60">{g.type}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-muted-foreground bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">{g.date}</span>
                        </div>
                      )) : (
                <div className="p-24 text-center opacity-30 text-base font-medium">Очікування синхронізації...</div>
                      )}
                   </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
