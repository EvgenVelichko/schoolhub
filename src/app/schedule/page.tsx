
"use client"

import * as React from "react"
import {
  Clock,
  Loader2,
  Coffee,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Calculator,
  Languages,
  History,
  Zap,
  Beaker,
  Leaf,
  Globe,
  Cpu,
  Dumbbell,
  Heart,
  Palette,
  Music,
  Hammer,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { format, startOfWeek, addDays, isWeekend, addWeeks } from "date-fns"
import { uk } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { isFriday, buildFridayLessons } from "@/lib/friday-schedule"

interface Lesson {
  subject: string
  time: string
  timeEnd: string
  room: string
  teacher: string
  homework: string
  date: string
  order: number
}

const DAY_NAMES = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця"]
const DAY_SHORT = ["ПН", "ВТ", "СР", "ЧТ", "ПТ"]

const SUBJECT_ICONS: Record<string, React.ReactNode> = {
  "Математика": <Calculator className="size-5 text-blue-400" />,
  "Алгебра": <Calculator className="size-5 text-blue-400" />,
  "Геометрія": <Calculator className="size-5 text-cyan-400" />,
  "Українська мова": <Languages className="size-5 text-orange-400" />,
  "Українська література": <BookOpen className="size-5 text-orange-300" />,
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
  "Default": <Sparkles className="size-5 text-primary" />,
}

const URL_RE = /(https?:\/\/[^\s,;)>\]]+)/g

function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE)
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/40 hover:decoration-primary/80 break-all transition-colors font-medium not-italic"
          >
            {(() => {
              try { return new URL(part).hostname.replace('www.', '') } catch { return 'Посилання' }
            })()}
            <ExternalLink className="size-2.5 shrink-0 inline" />
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  )
}

function getWeekStart(date: Date): Date {
  if (isWeekend(date)) {
    return startOfWeek(addWeeks(date, 1), { weekStartsOn: 1 })
  }
  return startOfWeek(date, { weekStartsOn: 1 })
}

function hasValidTime(lesson: Lesson) {
  return lesson.time && lesson.time !== '--:--'
}

export default function SchedulePage() {
  const { user, loading: userLoading } = useUser()
  const db = useFirestore()

  const today = new Date()
  const [weekOffset, setWeekOffset] = React.useState(0)
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)

  const baseWeekStart = React.useMemo(() => getWeekStart(today), [])
  const currentWeekStart = React.useMemo(() => addWeeks(baseWeekStart, weekOffset), [baseWeekStart, weekOffset])

  const lessonsQuery = React.useMemo(() => (
    user ? query(collection(db, "users", user.uid, "lessons"), orderBy("date", "asc"), orderBy("order", "asc")) : null
  ), [db, user])

  const { data: allLessons, loading: lessonsLoading } = useCollection(lessonsQuery)

  const getLessonsForDay = (dayOffset: number): Lesson[] => {
    const targetDate = addDays(currentWeekStart, dayOffset)
    const targetDateStr = format(targetDate, 'yyyy-MM-dd')

    if (isFriday(targetDateStr)) {
      return buildFridayLessons(targetDateStr, allLessons || []) as Lesson[]
    }

    const raw = (allLessons?.filter((lesson: any) => lesson.date === targetDateStr) || [])
      .sort((a: any, b: any) => {
        const orderA = a.order || 0
        const orderB = b.order || 0
        if (orderA && orderB) return orderA - orderB
        if (!orderA && !orderB) return (a.time || '').localeCompare(b.time || '')
        const timeA = a.time || ''
        const timeB = b.time || ''
        if (timeA && timeB) return timeA.localeCompare(timeB)
        if (orderA) return -1
        return 1
      }) as Lesson[]
    // Deduplicate by order+subject
    const seen = new Set<string>()
    return raw.filter(l => {
      const key = `${l.order}_${l.subject}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  const isCurrentWeek = weekOffset === 0
  const todayDayIndex = today.getDay() - 1

  React.useEffect(() => {
    if (isCurrentWeek && !isWeekend(today) && todayDayIndex >= 0 && todayDayIndex <= 4) {
      setSelectedDay(todayDayIndex)
    } else {
      setSelectedDay(null)
    }
  }, [weekOffset])

  const dayLessonCounts = React.useMemo(() => {
    return DAY_NAMES.map((_, idx) => getLessonsForDay(idx).length)
  }, [allLessons, currentWeekStart])

  if (userLoading || lessonsLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="size-12 animate-spin text-primary" />
      <p className="text-xs font-bold tracking-widest text-primary/50 uppercase">Завантаження розкладу...</p>
    </div>
  )

  const activeDayIndex = selectedDay

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto space-y-5 sm:space-y-6 animate-reveal w-full pb-32">
      {/* Header */}
      <header className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-headline text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white">
            Розклад <span className="text-primary text-glow">уроків</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm opacity-70">
            {format(currentWeekStart, 'dd MMMM', { locale: uk })} — {format(addDays(currentWeekStart, 4), 'dd MMMM yyyy', { locale: uk })}
          </p>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 shrink-0"
            onClick={() => setWeekOffset(w => w - 1)}
          >
            <ChevronLeft className="size-4 text-white" />
          </Button>
          {!isCurrentWeek && (
            <Button
              variant="ghost"
              className="h-9 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-bold"
              onClick={() => setWeekOffset(0)}
            >
              Сьогодні
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 shrink-0"
            onClick={() => setWeekOffset(w => w + 1)}
          >
            <ChevronRight className="size-4 text-white" />
          </Button>
          {isWeekend(today) && isCurrentWeek && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 px-2.5 py-0.5 rounded-lg font-black tracking-widest uppercase text-[8px] sm:text-[10px] ml-auto">
              Наступний тиждень
            </Badge>
          )}
        </div>
      </header>

      {/* Day selector pills */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {DAY_NAMES.map((_, idx) => {
          const dayDate = addDays(currentWeekStart, idx)
          const isToday = isCurrentWeek && !isWeekend(today) && todayDayIndex === idx
          const isSelected = activeDayIndex === idx
          const lessonCount = dayLessonCounts[idx]

          return (
            <button
              key={idx}
              onClick={() => setSelectedDay(isSelected ? null : idx)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl border transition-all duration-300 shrink-0 min-w-[56px] sm:min-w-[64px]",
                isSelected
                  ? "bg-primary/15 border-primary/40 shadow-lg shadow-primary/10"
                  : isToday
                    ? "bg-white/[0.06] border-primary/20"
                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
              )}
            >
              <span className={cn(
                "text-[10px] sm:text-xs font-black uppercase tracking-wider",
                isSelected ? "text-primary" : isToday ? "text-primary/70" : "text-muted-foreground"
              )}>
                {DAY_SHORT[idx]}
              </span>
              <span className={cn(
                "text-lg sm:text-xl font-bold",
                isSelected ? "text-white" : isToday ? "text-white" : "text-white/60"
              )}>
                {format(dayDate, 'd')}
              </span>
              {lessonCount > 0 ? (
                <span className={cn(
                  "text-[9px] font-bold",
                  isSelected ? "text-primary" : isToday ? "text-primary/60" : "text-muted-foreground/40"
                )}>
                  {lessonCount}
                </span>
              ) : (
                <span className="text-[9px] text-muted-foreground/20">—</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Schedule content */}
      <div className="space-y-6 sm:space-y-8">
        {DAY_NAMES.map((dayName, idx) => {
          const dayDate = addDays(currentWeekStart, idx)
          const lessons = getLessonsForDay(idx)
          const isToday = isCurrentWeek && !isWeekend(today) && todayDayIndex === idx

          if (activeDayIndex !== null && activeDayIndex !== idx) return null

          return (
            <div
              key={idx}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: activeDayIndex !== null ? '0ms' : `${idx * 60}ms` }}
            >
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2 rounded-xl",
                  isToday
                    ? "bg-primary/15 border border-primary/30"
                    : "bg-white/5 border border-white/5"
                )}>
                  <CalendarDays className={cn("size-4", isToday ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("text-sm sm:text-base font-bold", isToday ? "text-primary" : "text-white")}>
                    {dayName}
                  </span>
                  <span className={cn("text-[10px] sm:text-xs font-medium", isToday ? "text-primary/70" : "text-muted-foreground")}>
                    {format(dayDate, 'dd.MM')}
                  </span>
                </div>
                {isToday && (
                  <Badge className="bg-primary/20 text-primary border-0 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg">
                    Сьогодні
                  </Badge>
                )}
                {lessons.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/50 font-medium ml-auto">
                    {lessons.length} {lessons.length === 1 ? 'урок' : lessons.length < 5 ? 'уроки' : 'уроків'}
                  </span>
                )}
              </div>

              {/* Lessons — same card style as dashboard */}
              {lessons.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {lessons.map((lesson, lIdx) => {
                    const showTime = hasValidTime(lesson)
                    const hasOrder = lesson.order > 0
                    const icon = SUBJECT_ICONS[lesson.subject] || SUBJECT_ICONS["Default"]

                    return (
                      <Card
                        key={lIdx}
                        className="glass-panel border-0 rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden hover:bg-white/[0.04] transition-all shadow-2xl flex flex-col group"
                      >
                        {/* Top bar — time + order badge */}
                        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                          <span className="text-[10px] font-black uppercase text-white/50 flex items-center gap-2">
                            <Clock className="size-3.5 text-primary" />
                            {showTime ? `${lesson.time} – ${lesson.timeEnd}` : 'Час не вказано'}
                          </span>
                          {hasOrder ? (
                            <Badge className="bg-primary/10 text-primary font-black px-2.5 py-0.5 text-[9px] rounded-lg border-0">
                              УРОК {lesson.order}
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-500/10 text-yellow-500/70 font-black px-2.5 py-0.5 text-[9px] rounded-lg border-0">
                              БЕЗ №
                            </Badge>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col">
                          <div className="flex gap-3 sm:gap-4">
                            <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                              {icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm sm:text-base font-bold text-white truncate leading-tight group-hover:text-primary transition-colors">
                                {lesson.subject}
                              </h3>
                              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em] mt-1 truncate">
                                {lesson.room && lesson.room !== '---' ? `Каб. ${lesson.room}` : ''}
                                {lesson.teacher && lesson.teacher !== 'Вчитель' && (
                                  <span className="text-muted-foreground/40 hidden sm:inline">
                                    {lesson.room && lesson.room !== '---' ? ' • ' : ''}{lesson.teacher}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Homework */}
                          {lesson.homework && (
                            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-primary/5 border border-primary/10 mt-auto">
                              <div className="flex items-start gap-2">
                                <BookOpen className="size-3 sm:size-3.5 text-primary/50 mt-0.5 shrink-0" />
                                <p className="text-[11px] sm:text-xs text-white/70 leading-relaxed">
                                  <Linkify text={lesson.homework} />
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              ) : (
                <Card className="glass-panel border-0 rounded-[1.5rem] sm:rounded-[2rem]">
                  <div className="py-10 sm:py-14 flex flex-col items-center gap-3 text-muted-foreground/30">
                    <Coffee className="size-8 sm:size-10" />
                    <span className="text-xs sm:text-sm font-medium">Немає уроків</span>
                  </div>
                </Card>
              )}
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {allLessons && allLessons.length === 0 && (
        <Card className="glass-panel border-0 rounded-[2rem] p-6 sm:p-8 flex items-start gap-4">
          <div className="size-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="size-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm sm:text-base font-bold text-yellow-400">Розклад порожній</p>
            <p className="text-xs sm:text-sm text-yellow-500/60 mt-1">Синхронізуйте дані з NZ.ua, щоб побачити розклад уроків.</p>
          </div>
        </Card>
      )}
    </div>
  )
}
