// Hardcoded Friday schedule template — 7 lessons
// Merged with NZ.ua synced data when available (homework, room, teacher)

export interface FridayLesson {
  subject: string
  time: string
  timeEnd: string
  room: string
  teacher: string
  homework: string
  date: string
  order: number
}

export const FRIDAY_SCHEDULE_TEMPLATE: Omit<FridayLesson, 'date'>[] = [
  { order: 1, subject: "Фізкультура",           time: "08:30", timeEnd: "09:15", room: "спортзал", teacher: "Вчитель", homework: "" },
  { order: 2, subject: "Фізика",                time: "09:25", timeEnd: "10:10", room: "---",      teacher: "Вчитель", homework: "" },
  { order: 3, subject: "Геометрія",             time: "10:30", timeEnd: "11:15", room: "---",      teacher: "Вчитель", homework: "" },
  { order: 4, subject: "Українська мова",        time: "11:25", timeEnd: "12:10", room: "---",      teacher: "Вчитель", homework: "" },
  { order: 5, subject: "Інформатика",            time: "12:30", timeEnd: "13:15", room: "---",      teacher: "Вчитель", homework: "" },
  { order: 6, subject: "Українська література",  time: "13:25", timeEnd: "14:10", room: "---",      teacher: "Вчитель", homework: "" },
  { order: 7, subject: "Біологія",               time: "14:20", timeEnd: "15:05", room: "---",      teacher: "Вчитель", homework: "" },
]

/**
 * Returns true if the given date string (yyyy-MM-dd) falls on a Friday.
 */
export function isFriday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay() === 5
}

/**
 * Build a complete Friday schedule by merging the static template with
 * any NZ.ua synced lessons for that date. Synced data provides homework,
 * room, and teacher when a matching subject is found.
 */
export function buildFridayLessons(dateStr: string, syncedLessons: any[]): FridayLesson[] {
  return FRIDAY_SCHEDULE_TEMPLATE.map(tpl => {
    const match = syncedLessons.find(
      (l: any) => l.subject === tpl.subject && l.date === dateStr
    )
    return {
      ...tpl,
      date: dateStr,
      homework: match?.homework || tpl.homework,
      room: (match?.room && match.room !== '---') ? match.room : tpl.room,
      teacher: (match?.teacher && match.teacher !== 'Вчитель') ? match.teacher : tpl.teacher,
    }
  })
}
