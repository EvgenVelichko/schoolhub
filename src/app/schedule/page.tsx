
"use client"

import * as React from "react"
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Loader2,
  AlertCircle,
  BookOpen,
  Coffee,
  Sparkles,
  Calculator,
  Languages,
  History,
  Beaker,
  Music,
  Palette,
  Zap,
  Leaf,
  Globe,
  Cpu,
  Dumbbell,
  Heart,
  Hammer,
  ChevronLeft
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy, where } from "firebase/firestore"
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns"
import { uk } from "date-fns/locale"
import { useRouter } from "next/navigation"

const subjectIcons: Record<string, React.ReactNode> = {
  "Математика": <Calculator className="size-5 text-blue-400" />,
  "Алгебра": <Calculator className="size-5 text-blue-400" />,
  "Геометрія": <Calculator className="size-5 text-cyan-400" />,
  "Українська мова": <Languages className="size-5 text-orange-400" />,
  "Українська література": <BookOpen className="size-5 text-orange-400" />,
  "Зарубіжна література": <BookOpen className="size-5 text-pink-400" />,
  "Англійська мова": <Languages className="size-5 text-indigo-400" />,
  "Німецька мова": <Languages className="size-5 text-yellow-400" />,
  "Французька мова": <Languages className="size-5 text-blue-300" />,
  "Історія": <History className="size-5 text-yellow-500" />,
  "Всесвітня історія": <History className="size-5 text-yellow-600" />,
  "Історія України": <History className="size-5 text-yellow-400" />,
  "Фізика": <Zap className="size-5 text-purple-400" />,
  "Хімія": <Beaker className="size-5 text-green-400" />,
  "Біологія": <Leaf className="size-5 text-green-500" />,
  "Географія": <Globe className="size-5 text-emerald-400" />,
  "Інформатика": <Cpu className="size-5 text-slate-400" />,
  "Фізкультура": <Dumbbell className="size-5 text-red-400" />,
  "Основи здоров'я": <Heart className="size-5 text-rose-400" />,
  "Мистецтво": <Palette className="size-5 text-pink-400" />,
  "Музика": <Music className="size-5 text-indigo-400" />,
  "Трудове навчання": <Hammer className="size-5 text-amber-600" />,
  "Я досліджую світ": <Sparkles className="size-5 text-sky-400" />,
  "Default": <Sparkles className="size-5 text-primary" />
};

export default function SchedulePage() {
  const { user, loading: userLoading } = useUser()
  const db = useFirestore()
  const router = useRouter()
  
  const lessonsQuery = React.useMemo(() => (
    user ? query(collection(db, "users", user.uid, "lessons"), orderBy("date", "asc"), orderBy("order", "asc")) : null
  ), [db, user])
  
  const { data: allLessons, loading: lessonsLoading } = useCollection(lessonsQuery)

  const today = new Date()
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 })

  const getLessonsForDay = (dayOffset: number) => {
    const targetDate = addDays(currentWeekStart, dayOffset)
    const targetDateStr = format(targetDate, 'yyyy-MM-dd')
    
    return allLessons?.filter((lesson: any) => {
      return lesson.date === targetDateStr
    }).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) || []
  }

  if (userLoading || lessonsLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0512]">
      <Loader2 className="size-12 animate-spin text-primary" />
      <p className="text-xs font-bold tracking-widest text-primary/50 uppercase">School Hub...</p>
    </div>
  )

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-reveal overflow-x-hidden w-full max-w-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
        <div className="flex items-center gap-3 md:gap-4 min-w-0 w-full">
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-10 md:size-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 shadow-xl shrink-0"
            onClick={() => router.push('/')}
          >
            <ChevronLeft className="size-5 md:size-6 text-white" />
          </Button>
          <div className="space-y-0.5 min-w-0 flex-1">
            <h1 className="font-headline text-2xl md:text-5xl font-bold tracking-tight text-white flex items-center gap-2 truncate">
              Мій <span className="text-primary text-glow">Тиждень</span>
            </h1>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 rounded-lg font-black tracking-widest uppercase text-[8px] md:text-[10px] w-fit">
              {format(currentWeekStart, 'dd.MM')} — {format(addDays(currentWeekStart, 4), 'dd.MM')}
            </Badge>
          </div>
        </div>
      </header>

      <Tabs defaultValue={format(today, 'eeee', { locale: uk }).toLowerCase()} className="w-full">
        <TabsList className="bg-white/5 backdrop-blur-2xl p-1.5 border border-white/10 rounded-[2rem] w-full grid grid-cols-5 h-16 md:h-20 shadow-2xl relative z-10">
          {Array.from({ length: 5 }).map((_, idx) => {
            const date = addDays(currentWeekStart, idx)
            const isToday = isSameDay(today, date)
            const dayKey = format(date, 'eeee', { locale: uk }).toLowerCase()
            return (
              <TabsTrigger 
                key={dayKey} 
                value={dayKey} 
                className={`rounded-xl md:rounded-2xl h-full flex flex-col items-center justify-center gap-0.5 md:gap-1 data-[state=active]:cyber-gradient data-[state=active]:text-white transition-all duration-300 ${isToday ? 'border border-primary/30' : ''}`}
              >
                <span className="text-[8px] md:text-[9px] opacity-70 font-black uppercase tracking-widest">{format(date, 'EE', { locale: uk })}</span>
                <span className="text-sm md:text-base font-black">{format(date, 'dd')}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {Array.from({ length: 5 }).map((_, idx) => {
          const date = addDays(currentWeekStart, idx)
          const dayLessons = getLessonsForDay(idx)
          const dayName = format(date, 'eeee', { locale: uk }).toLowerCase()

          return (
            <TabsContent key={dayName} value={dayName} className="mt-6 md:mt-8 space-y-4 md:space-y-6 relative focus-visible:outline-none w-full max-w-full">
              {dayLessons.length > 0 ? dayLessons.map((lesson: any, lIdx: number) => (
                <div key={lIdx} className="relative group animate-in fade-in slide-in-from-bottom-6 duration-500 w-full" style={{ animationDelay: `${lIdx * 50}ms` }}>
                  <Card className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] md:rounded-[2.5rem] hover:border-primary/40 transition-all duration-500 overflow-hidden shadow-2xl group-hover:bg-white/[0.07] w-full">
                    <div className="flex flex-col md:flex-row items-stretch">
                      <div className="w-full md:w-28 bg-primary/5 flex md:flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 p-4 md:p-6 shrink-0 gap-3 md:gap-1">
                        <span className="text-[8px] md:text-[9px] font-black text-primary/80 uppercase tracking-widest">УРОК {lesson.order}</span>
                        <span className="text-lg md:text-2xl font-black text-white italic">{lesson.time}</span>
                      </div>
                      <CardContent className="p-5 md:p-8 flex-1 min-w-0">
                        <div className="space-y-4 md:space-y-6">
                          <div className="flex gap-4 items-center min-w-0">
                            <div className="size-10 md:size-14 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                               {subjectIcons[lesson.subject] || subjectIcons["Default"]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base md:text-2xl font-bold text-white truncate leading-tight group-hover:text-primary transition-colors">{lesson.subject}</h3>
                              <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1 text-[10px] md:text-xs text-muted-foreground font-medium opacity-70">
                                <span className="truncate max-w-[120px]">{lesson.teacher}</span>
                                <span className="flex items-center gap-1 shrink-0"><MapPin className="size-3 text-primary" /> Каб. {lesson.room}</span>
                              </div>
                            </div>
                          </div>

                          {lesson.homework && (
                            <div className="p-4 rounded-xl md:rounded-[1.75rem] bg-primary/5 border border-primary/10 group-hover:bg-primary/10 transition-all duration-300">
                              <p className="text-xs md:text-sm text-white/80 leading-relaxed italic line-clamp-3 md:line-clamp-none">{lesson.homework}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                </div>
              )) : (
                <div className="bg-white/5 backdrop-blur-2xl p-16 md:p-20 rounded-[2.5rem] md:rounded-[3.5rem] border border-white/10 text-center flex flex-col items-center gap-4 md:gap-6 shadow-2xl">
                   <Coffee className="size-10 md:size-12 text-primary/30" />
                   <p className="text-xl md:text-2xl font-bold text-white">Відпочинок!</p>
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
