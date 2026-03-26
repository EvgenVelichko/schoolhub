
"use client"

import * as React from "react"
import { 
  TrendingUp, 
  Calendar, 
  Filter, 
  Star, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Calculator,
  ArrowUpRight,
  History,
  Loader2,
  Trophy,
  ArrowDownRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { format, isAfter, subWeeks, subDays, parseISO, startOfYear, endOfYear } from "date-fns"
import { uk } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export default function GradesPage() {
  const { user } = useUser()
  const db = useFirestore()
  
  const gradesQuery = React.useMemo(() => (
    user ? query(collection(db, "users", user.uid, "grades"), orderBy("timestamp", "desc")) : null
  ), [db, user])
  
  const { data: allGrades, loading } = useCollection(gradesQuery)
  const [activeFilter, setActiveFilter] = React.useState("all")

  const filteredGrades = React.useMemo(() => {
    if (!allGrades) return []
    const now = new Date()

    return allGrades.filter((g: any) => {
      if (!g.date) return activeFilter === "all"
      const d = parseISO(g.date)
      if (isNaN(d.getTime())) return activeFilter === "all"
      switch (activeFilter) {
        case "yesterday":
          return g.date === format(subDays(now, 1), 'yyyy-MM-dd')
        case "week":
          return isAfter(d, subWeeks(now, 1))
        case "sem1":
          return d.getMonth() >= 7 && d.getMonth() <= 11
        case "sem2":
          return d.getMonth() >= 0 && d.getMonth() <= 5
        default:
          return true
      }
    })
  }, [allGrades, activeFilter])

  const subjectStats = React.useMemo(() => {
    if (!allGrades) return []
    const stats: Record<string, { total: number, count: number, name: string, history: number[] }> = {}
    
    allGrades.forEach((g: any) => {
      const score = parseInt(g.score)
      if (isNaN(score)) return
      if (!stats[g.subject]) stats[g.subject] = { total: 0, count: 0, name: g.subject, history: [] }
      stats[g.subject].total += score
      stats[g.subject].count += 1
      stats[g.subject].history.push(score)
    })

    return Object.values(stats).map(s => {
      const avg = s.total / s.count
      const recentAvg = s.history.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(s.history.length, 3)
      const trend = recentAvg >= avg ? 'up' : 'down'
      
      return {
        ...s,
        average: avg.toFixed(1),
        trend
      }
    }).sort((a, b) => parseFloat(b.average) - parseFloat(a.average))
  }, [allGrades])

  const overallAverage = React.useMemo(() => {
    if (subjectStats.length === 0) return 0
    const sum = subjectStats.reduce((acc, s) => acc + parseFloat(s.average), 0)
    return (sum / subjectStats.length).toFixed(1)
  }, [subjectStats])

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="animate-spin text-primary size-12" />
      <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/50">Завантажуємо журнал...</p>
    </div>
  )

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-10 animate-reveal pb-32 overflow-x-hidden">
      <header className="space-y-2 sm:space-y-3">
        <h1 className="text-2xl sm:text-3xl md:text-6xl font-headline font-bold text-white text-glow tracking-tighter">
          Журнал <span className="text-primary">Досягнень</span>
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base md:text-xl max-w-2xl leading-relaxed opacity-70">
          Ваша академічна історія. Аналізуйте тренди та покращуйте результати.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <Card className="glass-panel border-0 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 col-span-1 flex flex-col justify-between group transition-all shadow-2xl">
          <div className="size-10 sm:size-12 md:size-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 mb-4 sm:mb-6 md:mb-8">
             <TrendingUp className="text-primary size-5 sm:size-6 md:size-7" />
          </div>
          <div>
            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Середній бал</p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black italic text-white tracking-tighter">{overallAverage}</h2>
          </div>
        </Card>

        <Card className="glass-panel border-0 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] p-4 sm:p-6 md:p-8 col-span-2 md:col-span-3 overflow-hidden relative shadow-2xl">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-bold flex items-center gap-3"><Calculator className="size-6 text-primary" /> Прогноз Успіху</h3>
              <p className="text-muted-foreground text-xs md:text-sm max-w-lg opacity-80">
                Ваша поточна активність показує позитивну динаміку. Отримайте ще кілька оцінок "12", щоб підвищити рейтинг.
              </p>
            </div>
            
            <div className="mt-6 md:mt-8 flex items-end justify-between">
               <div className="flex items-end gap-4 md:gap-6">
                  <div className="text-5xl md:text-7xl font-black text-primary italic leading-none">~{(parseFloat(String(overallAverage)) + 0.4).toFixed(1)}</div>
                  <div className="pb-1 md:pb-2">
                    <p className="text-[9px] font-black uppercase text-green-500 flex items-center gap-1.5 bg-green-500/10 px-2.5 py-1 rounded-full w-fit">
                      <ArrowUpRight className="size-3" /> Річний прогноз
                    </p>
                  </div>
               </div>
            </div>
          </div>
          <div className="absolute -right-20 -bottom-20 size-80 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-6 sm:space-y-8">
        <TabsList className="glass-panel p-1 rounded-xl sm:rounded-2xl h-11 sm:h-14 border-0 w-full md:w-fit flex shadow-xl overflow-x-auto scrollbar-none">
          <TabsTrigger value="list" className="rounded-lg sm:rounded-xl px-4 sm:px-6 md:px-10 h-full font-bold text-xs sm:text-sm data-[state=active]:cyber-gradient shrink-0">Всі оцінки</TabsTrigger>
          <TabsTrigger value="subjects" className="rounded-lg sm:rounded-xl px-4 sm:px-6 md:px-10 h-full font-bold text-xs sm:text-sm data-[state=active]:cyber-gradient shrink-0">Аналітика</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "all", label: "Рік" },
              { id: "yesterday", label: "Вчора" },
              { id: "week", label: "Тиждень" },
              { id: "sem1", label: "1 Сем" },
              { id: "sem2", label: "2 Сем" }
            ].map(f => (
              <Badge 
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={cn(
                  "cursor-pointer h-10 px-6 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest",
                  activeFilter === f.id ? "cyber-gradient border-0 text-white shadow-lg shadow-primary/30" : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                )}
              >
                {f.label}
              </Badge>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredGrades.length > 0 ? filteredGrades.map((grade: any, i: number) => (
                <motion.div
                  key={`${grade.id}-${i}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                >
                  <Card className="glass-panel border-0 rounded-[1.5rem] md:rounded-[2rem] p-5 flex items-center justify-between group transition-all shadow-lg hover:border-primary/40">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "size-12 md:size-14 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-black italic shrink-0",
                        parseInt(grade.score) >= 10 ? "bg-green-500/20 text-green-500" : "bg-primary/20 text-primary"
                      )}>
                        {grade.score}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-white text-base md:text-lg truncate leading-tight">{grade.subject}</h4>
                        <div className="flex flex-col mt-0.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 truncate">
                            {grade.type}
                          </span>
                          <span className="text-[9px] font-bold text-primary/80 uppercase mt-0.5">
                            {grade.date && !isNaN(parseISO(grade.date).getTime()) ? format(parseISO(grade.date), 'd MMM', { locale: uk }) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )) : (
                <div className="col-span-full py-20 text-center glass-panel rounded-[2.5rem] border-0 space-y-4">
                  <History className="size-10 text-muted-foreground opacity-20 mx-auto" />
                  <p className="text-muted-foreground text-lg font-medium italic">Дані відсутні.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4">
          {subjectStats.map((stat, i) => (
            <Card key={i} className="glass-panel border-0 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 transition-all group relative overflow-hidden">
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="space-y-1 min-w-0">
                  <h4 className="font-bold text-white text-lg md:text-xl truncate w-full group-hover:text-primary transition-colors">{stat.name}</h4>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Проаналізовано {stat.count} оцінок</p>
                </div>
                <div className={cn(
                  "size-10 md:size-12 rounded-xl flex items-center justify-center font-black italic shadow-lg shrink-0",
                  stat.trend === 'up' ? 'bg-green-500/20 text-green-500' : 'bg-primary/20 text-primary'
                )}>
                   {stat.average}
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-end">
                   <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Тренд</p>
                      <div className="flex items-center gap-1.5">
                         {stat.trend === 'up' ? <ArrowUpRight className="size-4 text-green-500" /> : <ArrowDownRight className="size-4 text-primary" />}
                         <span className={cn("font-bold text-xs", stat.trend === 'up' ? 'text-green-500' : 'text-primary')}>
                            {stat.trend === 'up' ? 'Вгору' : 'Стабільно'}
                         </span>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black uppercase text-muted-foreground">Мета</p>
                      <p className="font-bold text-white text-xs">12.0</p>
                   </div>
                </div>
                
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${(parseFloat(stat.average) / 12) * 100}%` }}
                     transition={{ duration: 1, ease: "easeOut" }}
                     className={cn("h-full", stat.trend === 'up' ? 'bg-green-500' : 'cyber-gradient')} 
                   />
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
