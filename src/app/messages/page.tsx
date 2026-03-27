
"use client"

import * as React from "react"
import {
  Search,
  Send,
  MoreVertical,
  Image as ImageIcon,
  Loader2,
  ChevronLeft,
  MessageSquare
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { collection, query, where, orderBy, addDoc, serverTimestamp } from "firebase/firestore"
import { useSearchParams, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialReceiverId = searchParams.get('with')

  const { user } = useUser()
  const db = useFirestore()
  const [selectedReceiver, setSelectedReceiver] = React.useState<string | null>(initialReceiverId)
  const [messageText, setMessageText] = React.useState("")

  const messagesQuery = React.useMemo(() => {
    if (!user || !selectedReceiver) return null
    return query(
      collection(db, "messages"),
      where("senderId", "in", [user.uid, selectedReceiver]),
      where("receiverId", "in", [user.uid, selectedReceiver]),
      orderBy("createdAt", "asc")
    )
  }, [db, user, selectedReceiver])

  const { data: messages, loading } = useCollection(messagesQuery)

  const handleSendMessage = async () => {
    if (!user || !selectedReceiver || !messageText.trim()) return

    try {
      addDoc(collection(db, "messages"), {
        senderId: user.uid,
        senderName: user.displayName,
        receiverId: selectedReceiver,
        text: messageText,
        createdAt: serverTimestamp(),
        isRead: false
      })
      setMessageText("")
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background animate-reveal overflow-hidden relative scrollbar-none">
      {/* Header */}
      <header className="mobile-header-blur p-3 sm:p-4 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-10 rounded-xl hover:bg-white/10 shrink-0" onClick={() => router.back()}>
            <ChevronLeft className="size-5 sm:size-6 text-white" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-headline font-bold text-white truncate">Повідомлення</h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Direct Messages</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar — conversations list (desktop only) */}
        <div className="hidden md:flex w-80 lg:w-96 border-r border-white/5 flex-col bg-white/[0.01]">
          <div className="p-4 border-b border-white/5">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input placeholder="Пошук діалогів..." className="pl-11 bg-white/5 border-white/10 h-11 rounded-xl text-sm text-white" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-none p-3">
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/30 space-y-3">
              <MessageSquare className="size-10" />
              <p className="text-xs font-bold uppercase tracking-widest text-center">Ваші діалоги з'являться тут</p>
            </div>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedReceiver ? (
            <>
              {/* Chat header */}
              <div className="p-3 sm:p-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="size-10 border border-white/10 shrink-0">
                    <AvatarImage src={`https://picsum.photos/seed/${selectedReceiver}/50`} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">U</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm truncate">Учень</p>
                    <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">в мережі</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="size-9 rounded-xl hover:bg-white/10 shrink-0">
                  <MoreVertical className="size-4 text-muted-foreground" />
                </Button>
              </div>

              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-4 scrollbar-none overscroll-contain">
                {loading ? (
                  <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary size-8" /></div>
                ) : messages?.length > 0 ? (
                  messages.map((msg: any, i: number) => {
                    const isOwn = msg.senderId === user?.uid
                    return (
                      <div key={i} className={cn("flex gap-3 max-w-[85%]", isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
                        {!isOwn && (
                          <Avatar className="size-8 border border-white/10 shrink-0 mt-auto">
                            <AvatarFallback className="text-[9px] font-bold bg-white/5 text-white">U</AvatarFallback>
                          </Avatar>
                        )}
                        <div className={cn(
                          "p-3.5 sm:p-4 rounded-2xl text-sm sm:text-[15px] transition-all leading-relaxed",
                          isOwn ? 'chat-bubble-own' : 'chat-bubble-other'
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20 space-y-4">
                    <div className="size-20 sm:size-24 rounded-[2rem] bg-white/5 flex items-center justify-center animate-pulse">
                      <MessageSquare className="size-10 sm:size-12" />
                    </div>
                    <p className="text-base sm:text-lg font-headline font-bold uppercase tracking-widest text-center px-6">Напишіть перше повідомлення!</p>
                  </div>
                )}
              </CardContent>

              {/* Input */}
              <div className="p-3 sm:p-4 md:p-6 border-t border-white/5 bg-background/95 backdrop-blur-xl flex gap-3 shrink-0 safe-bottom">
                <Input
                  placeholder="Введіть повідомлення..."
                  className="bg-white/5 border-white/10 h-12 sm:h-14 rounded-xl sm:rounded-2xl px-4 sm:px-6 text-sm text-white focus:ring-primary/40"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button className="cyber-gradient size-12 sm:size-14 rounded-xl sm:rounded-2xl shrink-0 active:scale-95 transition-all" onClick={handleSendMessage}>
                  <Send className="size-5 sm:size-6 text-white" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/20 space-y-6 p-6">
              <div className="size-24 sm:size-28 rounded-[2rem] bg-white/5 flex items-center justify-center">
                <MessageSquare className="size-12 sm:size-14" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg sm:text-xl font-headline font-bold uppercase tracking-widest">Виберіть діалог</p>
                <p className="text-xs sm:text-sm opacity-50">щоб почати спілкування</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
