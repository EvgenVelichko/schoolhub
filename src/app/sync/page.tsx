"use client";

import * as React from "react";
import { Globe, Loader2, RefreshCw, CheckCircle2, Wifi, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { syncWithNzPortal } from "@/app/actions/nz-sync";
import { motion, AnimatePresence } from "framer-motion";

const SYNC_MESSAGES = [
  "Синхронізація оцінок...",
  "Перевірка нових завдань...",
  "Оновлення розкладу...",
  "Аналіз успішності...",
  "Завантаження домашніх завдань...",
  "Синхронізація з класом...",
  "Перевірка контрольних...",
  "Оновлення рейтингу...",
  "Зʼєднання з NZ.ua...",
  "Пошук нових оцінок...",
];

function InfiniteSyncAnimation() {
  const [msgIndex, setMsgIndex] = React.useState(0);
  const [dots, setDots] = React.useState("");

  React.useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % SYNC_MESSAGES.length);
    }, 3000);
    return () => clearInterval(msgTimer);
  }, []);

  React.useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(dotTimer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center space-y-8"
    >
      <div className="relative mx-auto size-28">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/30 via-cyan-500/30 to-primary/30 animate-spin" style={{ animationDuration: "3s" }} />
        <div className="absolute inset-1 rounded-full bg-background flex items-center justify-center">
          <RefreshCw className="size-10 text-primary animate-spin" style={{ animationDuration: "2s" }} />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" style={{ animationDuration: "2s" }} />
        <div className="absolute -inset-3 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: "3s" }} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="size-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-bold text-green-400 uppercase tracking-wider">
            Активна синхронізація
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-xs text-muted-foreground font-mono tracking-wider"
          >
            {SYNC_MESSAGES[msgIndex]}{dots}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Інтервал", value: "10 хв" },
          { label: "Статус", value: "Online" },
          { label: "Режим", value: "Auto" },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-white font-mono">{stat.value}</p>
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-black mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function SyncPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();

  const [login, setLogin] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState("");
  const [syncComplete, setSyncComplete] = React.useState(false);

  const handleSync = async () => {
    if (!user || !login || !password) {
      toast({ title: "Увага", description: "Заповніть всі поля", variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    setProgress(10);
    setStatus("Авторизація на NZ.ua...");

    try {
      // 1. Fetch data from NZ.ua (server action)
      const result = await syncWithNzPortal(login, password, { deep: true });

      if (!result || !result.success || !result.data) {
        throw new Error(result?.error || "Невірні дані nz.ua");
      }

      setProgress(50);
      setStatus("Збереження даних...");

      const { data } = result;

      // Calculate stats
      let totalXp = 0;
      let totalScore = 0;
      let scoreCount = 0;
      data.grades.forEach((g) => {
        const v = parseInt(g.score);
        if (!isNaN(v)) { totalScore += v; scoreCount++; totalXp += v * 10; }
      });
      const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 1;

      // Build classroom data
      const gradeLevel = (data.gradeLevel || "Клас").toString().trim();
      const schoolId = String(data.schoolId);
      let classroom: any = null;
      if (schoolId && gradeLevel) {
        const normalizedClass = gradeLevel.replace(/\s+/g, "-").toUpperCase();
        const groupId = `class-${schoolId}-${normalizedClass}`;
        classroom = {
          groupId,
          groupData: {
            name: gradeLevel,
            type: "classroom",
            mode: "group",
            schoolId,
            schoolName: data.schoolName || "Моя школа",
            createdAt: new Date().toISOString(),
            admins: [user.uid],
          },
          memberData: {
            joinedAt: new Date().toISOString(),
            id: groupId,
            name: gradeLevel,
            type: "classroom",
          },
        };
      }

      // 2. Send everything to server API — admin SDK writes fast
      setProgress(60);
      setStatus("Запис у базу даних...");

      const res = await fetch("/api/sync-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          grades: data.grades,
          lessons: data.lessons,
          classroom,
          profile: {
            displayName: data.studentName || user.displayName,
            gradeLevel,
            schoolId,
            schoolName: data.schoolName,
            isNzConnected: true,
            nzLogin: login,
            nzPassword: password,
            academicStatus: avgScore >= 10 ? "Відмінник" : avgScore >= 7 ? "Хорошист" : "Потребує уваги",
            level: avgScore,
            xp: totalXp,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      setProgress(100);
      setStatus("Готово!");
      setSyncComplete(true);

      toast({
        title: "Синхронізація успішна",
        description: `Автосинхронізація кожні 10 хвилин увімкнена`,
      });

      setTimeout(() => router.push("/"), 4000);
    } catch (e: any) {
      const msg = e.message || "Невідома помилка";
      const isHtml = msg.includes("HTML") || msg.includes("Cloudflare");
      toast({
        title: isHtml ? "NZ.ua тимчасово недоступний" : "Помилка",
        description: isHtml
          ? "Сервер NZ.ua блокує запит. Перевірте логін/пароль або спробуйте через кілька хвилин."
          : msg,
        variant: "destructive",
      });
      setIsSyncing(false);
      setProgress(0);
      setStatus("");
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-8 animate-reveal">
      <div className="w-full max-w-md space-y-8">
        {/* Logo + Title */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="size-20 rounded-[1.5rem] cyber-gradient flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
            <Globe className="text-white size-9" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-white tracking-tight">
              Підключення <span className="text-primary text-glow">NZ.ua</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {syncComplete
                ? "Безперервна синхронізація активна"
                : "Введіть дані від NZ.ua щоб почати"}
            </p>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {syncComplete ? (
            <motion.div
              key="sync-active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-panel border-0 p-8 rounded-[2rem]">
                <InfiniteSyncAnimation />
              </Card>

              <div className="mt-5 space-y-2.5">
                {[
                  { icon: Wifi, text: "Автосинхронізація кожні 10 хвилин", color: "text-green-400" },
                  { icon: Zap, text: "Push-сповіщення про нові оцінки", color: "text-amber-400" },
                  { icon: CheckCircle2, text: "Працює навіть коли сайт закритий", color: "text-cyan-400" },
                ].map((feat, i) => (
                  <motion.div
                    key={feat.text}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                  >
                    <feat.icon className={`size-4.5 ${feat.color} shrink-0`} />
                    <span className="text-sm font-bold text-white/80">{feat.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="sync-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card className="glass-panel border-0 rounded-[2rem] overflow-hidden">
                {/* Progress bar on top */}
                {isSyncing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-6 pt-6 pb-2 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/60">
                        Прогрес
                      </p>
                      <span className="text-xs font-bold text-primary tabular-nums">{progress}%</span>
                    </div>
                    <Progress
                      value={progress}
                      className="h-2.5 bg-white/5 rounded-full"
                    />
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/70 text-center animate-pulse">
                      {status}
                    </p>
                  </motion.div>
                )}

                {/* Form */}
                <div className="p-6 space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-0.5">
                        Логін NZ.ua
                      </Label>
                      <Input
                        placeholder="Введіть логін"
                        className="bg-white/5 border-white/10 h-14 rounded-xl px-5 text-base focus:ring-primary/30 focus:border-primary/40 transition-all"
                        value={login}
                        onChange={(e) => setLogin(e.target.value)}
                        disabled={isSyncing}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-white/40 ml-0.5">
                        Пароль
                      </Label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="bg-white/5 border-white/10 h-14 rounded-xl px-5 text-base focus:ring-primary/30 focus:border-primary/40 transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSyncing}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full cyber-gradient h-14 rounded-xl font-black text-base active:scale-[0.97] transition-all"
                    onClick={handleSync}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="animate-spin size-5" />
                        Синхронізація...
                      </span>
                    ) : (
                      "УВІЙТИ ТА ПЕРЕВІРИТИ LVL"
                    )}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
