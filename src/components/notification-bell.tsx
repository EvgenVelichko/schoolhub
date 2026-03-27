"use client"

import * as React from "react"
import { Bell, TrendingUp, MessageCircle, Zap, CheckCheck } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { collection, query, orderBy, limit, doc, writeBatch } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { uk } from "date-fns/locale"
import { cn } from "@/lib/utils"

const typeIcons: Record<string, typeof TrendingUp> = {
  grade: TrendingUp,
  message: MessageCircle,
  system: Zap,
}

const typeColors: Record<string, string> = {
  grade: "text-green-500 bg-green-500/20",
  message: "text-blue-400 bg-blue-500/20",
  system: "text-primary bg-primary/20",
}

export function NotificationBell() {
  const { user } = useUser()
  const db = useFirestore()
  const router = useRouter()

  const notifsQuery = React.useMemo(() => (
    user ? query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(20)
    ) : null
  ), [db, user])

  const { data: notifications } = useCollection(notifsQuery)

  const unread = React.useMemo(
    () => notifications?.filter((n: any) => !n.isRead) || [],
    [notifications]
  )

  const handleClick = async (notif: any) => {
    if (!user || notif.isRead) {
      if (notif.link) router.push(notif.link)
      return
    }
    const ref = doc(db, "users", user.uid, "notifications", notif.id)
    const batch = writeBatch(db)
    batch.update(ref, { isRead: true })
    await batch.commit()
    if (notif.link) router.push(notif.link)
  }

  const markAllRead = async () => {
    if (!user || unread.length === 0) return
    const batch = writeBatch(db)
    unread.forEach((n: any) => {
      batch.update(doc(db, "users", user.uid, "notifications", n.id), { isRead: true })
    })
    await batch.commit()
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative size-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors">
          <Bell className="size-5 text-white" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-5 rounded-full cyber-gradient flex items-center justify-center text-[9px] font-black text-white">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 glass-panel border-white/10 rounded-2xl p-0 z-[150] max-h-[70vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Сповіщення</p>
          {unread.length > 0 && (
            <button onClick={markAllRead} className="text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
              <CheckCheck className="size-3" /> Прочитати все
            </button>
          )}
        </div>

        <div className="overflow-y-auto scrollbar-none flex-1">
          {notifications && notifications.length > 0 ? (
            notifications.map((notif: any) => {
              const Icon = typeIcons[notif.type] || Zap
              const color = typeColors[notif.type] || typeColors.system
              const time = notif.createdAt?.toDate
                ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: uk })
                : ""

              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0",
                    !notif.isRead && "bg-primary/5"
                  )}
                >
                  <div className={cn("size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", color)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-xs font-bold truncate", notif.isRead ? "text-muted-foreground" : "text-white")}>{notif.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{notif.body}</p>
                    <p className="text-[9px] text-primary/60 mt-0.5">{time}</p>
                  </div>
                  {!notif.isRead && <div className="size-2 rounded-full bg-primary shrink-0 mt-2" />}
                </button>
              )
            })
          ) : (
            <div className="py-12 text-center space-y-2">
              <Bell className="size-8 text-muted-foreground opacity-20 mx-auto" />
              <p className="text-xs text-muted-foreground italic">Немає нових сповіщень</p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
