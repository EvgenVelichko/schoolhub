
"use client"

import * as React from "react"
import {
  Send,
  Hash,
  Loader2,
  Users,
  ChevronLeft,
  Pin,
  Reply,
  MoreVertical,
  Trash2,
  Edit3,
  X,
  MessageSquare,
  Lock,
  Unlock,
  Smile,
  Image as ImageIcon,
  AtSign,
  ArrowDown,
  Check,
  CheckCheck,
  Copy,
  Search,
  Settings,
  Bell,
  BellOff,
  Shield,
  UserPlus,
  Crown,
} from "lucide-react"
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase"
import {
  doc,
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  limit,
  updateDoc,
  deleteDoc,
  getDoc
} from "firebase/firestore"
import { useParams, useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { uk } from "date-fns/locale"

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "💀", "👀"]

function formatMessageTime(timestamp: any): string {
  if (!timestamp) return ""
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return format(date, 'HH:mm')
  } catch {
    return ""
  }
}

function formatMessageDate(timestamp: any): string {
  if (!timestamp) return ""
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return "Сьогодні"
    if (date.toDateString() === yesterday.toDateString()) return "Вчора"
    return format(date, 'd MMMM', { locale: uk })
  } catch {
    return ""
  }
}

function shouldShowDateSeparator(currentMsg: any, prevMsg: any): boolean {
  if (!prevMsg) return true
  const a = currentMsg?.createdAt?.toDate ? currentMsg.createdAt.toDate() : null
  const b = prevMsg?.createdAt?.toDate ? prevMsg.createdAt.toDate() : null
  if (!a || !b) return false
  return a.toDateString() !== b.toDateString()
}

export default function ClassroomChat() {
  const { groupId } = useParams()
  const router = useRouter()
  const { user } = useUser()
  const db = useFirestore()

  const groupRef = React.useMemo(() => doc(db, "groups", groupId as string), [db, groupId])
  const { data: group, loading: groupLoading } = useDoc(groupRef)

  const messagesQuery = React.useMemo(() => query(
    collection(db, "groups", groupId as string, "messages"),
    orderBy("createdAt", "desc"),
    limit(150)
  ), [db, groupId])

  const { data: messages, loading: messagesLoading } = useCollection(messagesQuery)

  const userProfileRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)

  const [text, setText] = React.useState("")
  const [replyTo, setReplyTo] = React.useState<any>(null)
  const [editingMessage, setEditingMessage] = React.useState<any>(null)
  const [showMembers, setShowMembers] = React.useState(false)
  const [showSearch, setShowSearch] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [showScrollDown, setShowScrollDown] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const isUserAdmin = React.useMemo(() => {
    if (!user || !group) return false
    return (group.admins || []).includes(user.uid) || profile?.role === 'owner' || profile?.role === 'admin'
  }, [user, group, profile])

  const pinnedMessage = React.useMemo(() => {
    if (!group?.pinnedMessageId || !messages) return null
    return messages.find((m: any) => m.id === group.pinnedMessageId)
  }, [group, messages])

  const memberCount = group?.memberCount || group?.members?.length || 0

  const filteredMessages = React.useMemo(() => {
    if (!messages) return []
    if (!searchQuery.trim()) return messages
    return messages.filter((m: any) =>
      m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.senderName?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [messages, searchQuery])

  const handleSend = async () => {
    if (!user || !text.trim()) return

    if (group?.mode === 'channel' && !isUserAdmin) {
      toast({ title: "Обмеження", description: "Тільки адміністратори можуть писати в цьому режимі." })
      return
    }

    try {
      if (editingMessage) {
        updateDoc(doc(db, "groups", groupId as string, "messages", editingMessage.id), {
          text: text.trim(),
          isEdited: true
        })
        setEditingMessage(null)
      } else {
        addDoc(collection(db, "groups", groupId as string, "messages"), {
          senderId: user.uid,
          senderName: user.displayName,
          senderPhoto: user.photoURL,
          text: text.trim(),
          type: "text",
          replyToId: replyTo?.id || null,
          replyToText: replyTo?.text || null,
          replyToName: replyTo?.senderName || null,
          reactions: {},
          createdAt: serverTimestamp(),
          isAdmin: isUserAdmin
        })
      }
      setText("")
      setReplyTo(null)
    } catch {
      toast({ title: "Помилка відправки", variant: "destructive" })
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return
    const msgRef = doc(db, "groups", groupId as string, "messages", messageId)
    const msgSnap = await getDoc(msgRef)
    if (!msgSnap.exists()) return

    const currentReactions = msgSnap.data().reactions || {}
    const usersForEmoji = currentReactions[emoji] || []

    let updatedUsers
    if (usersForEmoji.includes(user.uid)) {
      updatedUsers = usersForEmoji.filter((id: string) => id !== user.uid)
    } else {
      updatedUsers = [...usersForEmoji, user.uid]
    }

    updateDoc(msgRef, { [`reactions.${emoji}`]: updatedUsers })
  }

  const handlePin = async (messageId: string) => {
    if (!isUserAdmin) return
    updateDoc(groupRef, { pinnedMessageId: messageId })
    toast({ title: "Повідомлення закріплено" })
  }

  const handleDelete = async (messageId: string) => {
    const msgRef = doc(db, "groups", groupId as string, "messages", messageId)
    const msgSnap = await getDoc(msgRef)
    if (!msgSnap.exists()) return

    if (msgSnap.data().senderId === user?.uid || isUserAdmin) {
      deleteDoc(msgRef)
      toast({ title: "Видалено" })
    }
  }

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Скопійовано" })
  }

  const toggleChannelMode = async () => {
    if (!isUserAdmin) return
    const newMode = group?.mode === 'channel' ? 'group' : 'channel'
    updateDoc(groupRef, { mode: newMode })
    toast({ title: newMode === 'channel' ? "Режим каналу увімкнено" : "Режим групи увімкнено" })
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    setShowScrollDown(el.scrollTop < -200)
  }

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  if (groupLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0a0512] gap-4">
      <Loader2 className="animate-spin text-primary size-10" />
      <p className="text-xs font-bold tracking-widest text-primary/50 uppercase">Завантаження кімнати...</p>
    </div>
  )

  return (
    <div className="h-[100dvh] flex flex-col animate-reveal bg-[#0a0512] overflow-hidden relative">
      {/* Header */}
      <header className="mobile-header-blur p-3 sm:p-4 flex items-center justify-between shrink-0 z-50 gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="size-9 sm:size-10 rounded-xl hover:bg-white/10 shrink-0" onClick={() => router.back()}>
            <ChevronLeft className="size-5 sm:size-6 text-white" />
          </Button>
          <div className="size-9 sm:size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Hash className="size-4 sm:size-5 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm sm:text-base font-headline font-bold text-white truncate flex items-center gap-2">
              {group?.name}
              {group?.mode === 'channel' && (
                <Badge className="cyber-gradient text-[7px] h-4 px-1.5 rounded-md border-0 font-black uppercase shrink-0">
                  Channel
                </Badge>
              )}
            </h1>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium truncate opacity-60 flex items-center gap-1.5">
              {group?.schoolName}
              {memberCount > 0 && (
                <>
                  <span className="text-white/10">|</span>
                  <Users className="size-2.5" />
                  {memberCount}
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl text-muted-foreground hover:text-white hover:bg-white/10"
            onClick={() => { setShowSearch(s => !s); setSearchQuery("") }}
          >
            <Search className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl text-muted-foreground hover:text-white hover:bg-white/10"
            onClick={() => setShowMembers(s => !s)}
          >
            <Users className="size-4" />
          </Button>
          {isUserAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9 rounded-xl text-muted-foreground hover:text-white hover:bg-white/10">
                  <Settings className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-panel border-white/10 rounded-xl p-1 shadow-2xl w-56">
                <DropdownMenuItem onClick={toggleChannelMode} className="gap-2.5 font-bold text-xs rounded-lg text-white h-10">
                  {group?.mode === 'channel' ? <Unlock className="size-4 text-green-400" /> : <Lock className="size-4 text-yellow-400" />}
                  {group?.mode === 'channel' ? 'Увімкнути груповий режим' : 'Увімкнути режим каналу'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 z-40 overflow-hidden border-b border-white/5 bg-black/30 backdrop-blur-md"
          >
            <div className="p-3 flex items-center gap-2">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Пошук повідомлень..."
                className="bg-white/5 border-white/10 h-9 rounded-xl text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <Button variant="ghost" size="icon" className="size-9 shrink-0" onClick={() => { setShowSearch(false); setSearchQuery("") }}>
                <X className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned message */}
      <AnimatePresence>
        {pinnedMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary/5 border-b border-primary/10 shrink-0 z-40 overflow-hidden backdrop-blur-md"
          >
            <div className="p-2.5 flex items-center justify-between px-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Pin className="size-3.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-primary font-black uppercase tracking-widest">Закріплено</p>
                  <p className="text-[11px] text-white/80 truncate">{pinnedMessage.text}</p>
                </div>
              </div>
              {isUserAdmin && (
                <Button variant="ghost" size="icon" className="size-7 shrink-0 text-white/40 hover:text-white" onClick={() => handlePin("")}>
                  <X className="size-3.5" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members panel */}
      <AnimatePresence>
        {showMembers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="shrink-0 z-40 overflow-hidden border-b border-white/5 bg-black/30 backdrop-blur-md"
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Users className="size-3.5" /> Учасники
                </h3>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => setShowMembers(false)}>
                  <X className="size-3.5" />
                </Button>
              </div>
              {group?.admins?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-primary/50 px-1">Адміністратори</p>
                  <div className="flex flex-wrap gap-2">
                    {group.admins.map((adminId: string) => (
                      <Badge key={adminId} className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-lg gap-1">
                        <Shield className="size-2.5" />
                        {adminId === user?.uid ? 'Ви' : adminId.slice(0, 8)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/50 italic">
                {memberCount > 0 ? `${memberCount} учасників у кімнаті` : 'Учасники з\'являться після приєднання'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <CardContent
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 flex flex-col-reverse gap-1 scrollbar-none overscroll-contain pb-32 md:pb-36 relative"
      >
        {messagesLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : filteredMessages?.length > 0 ? (
          filteredMessages.map((msg: any, idx: number) => {
            const isOwn = msg.senderId === user?.uid
            const prevMsg = filteredMessages[idx + 1]
            const nextMsg = idx > 0 ? filteredMessages[idx - 1] : null
            const showDate = shouldShowDateSeparator(msg, prevMsg)
            const isSameSender = prevMsg?.senderId === msg.senderId && !showDate
            const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId

            return (
              <React.Fragment key={msg.id}>
                {/* Message */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "flex gap-2.5 max-w-[88%] sm:max-w-[75%] group relative",
                    isOwn ? 'ml-auto' : 'mr-auto',
                    isSameSender ? 'mt-0.5' : 'mt-3'
                  )}
                >
                  {/* Avatar */}
                  {!isOwn && (
                    <div className="w-8 shrink-0 flex flex-col justify-end">
                      {isLastInGroup ? (
                        <Avatar className="size-8 border border-white/10 shadow-md">
                          <AvatarImage src={msg.senderPhoto} className="object-cover" />
                          <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">{msg.senderName?.[0]}</AvatarFallback>
                        </Avatar>
                      ) : <div className="size-8" />}
                    </div>
                  )}

                  <div className={cn("space-y-1", isOwn ? 'items-end' : 'items-start', "flex flex-col")}>
                    {/* Sender name */}
                    {!isOwn && !isSameSender && (
                      <p className="text-[10px] font-bold text-muted-foreground/60 px-1 flex items-center gap-1.5">
                        {msg.senderName}
                        {msg.isAdmin && <Crown className="size-2.5 text-primary fill-primary" />}
                      </p>
                    )}

                    {/* Bubble + actions */}
                    <div className="relative group/bubble flex items-center gap-1.5">
                      {/* Own message actions — left side */}
                      {isOwn && (
                        <div className="opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 flex items-center gap-0.5 shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 rounded-full bg-white/5 hover:bg-white/10">
                                <MoreVertical className="size-3.5 opacity-50 text-white" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass-panel border-white/10 rounded-xl p-1 shadow-2xl w-48">
                              <DropdownMenuItem onClick={() => setReplyTo(msg)} className="gap-2.5 font-bold text-xs rounded-lg text-white h-9">
                                <Reply className="size-3.5" /> Відповісти
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyText(msg.text)} className="gap-2.5 font-bold text-xs rounded-lg text-white h-9">
                                <Copy className="size-3.5" /> Копіювати
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditingMessage(msg); setText(msg.text); inputRef.current?.focus() }} className="gap-2.5 font-bold text-xs rounded-lg text-white h-9">
                                <Edit3 className="size-3.5" /> Редагувати
                              </DropdownMenuItem>
                              {isUserAdmin && (
                                <DropdownMenuItem onClick={() => handlePin(msg.id)} className="gap-2.5 font-bold text-xs rounded-lg text-white h-9">
                                  <Pin className="size-3.5" /> Закріпити
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="bg-white/5" />
                              <DropdownMenuItem onClick={() => handleDelete(msg.id)} className="gap-2.5 font-bold text-xs text-destructive rounded-lg h-9">
                                <Trash2 className="size-3.5" /> Видалити
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      {/* Message bubble */}
                      <div className={cn(
                        "relative px-3.5 py-2.5 text-[13px] sm:text-sm leading-relaxed",
                        isOwn
                          ? "cyber-gradient text-white rounded-2xl rounded-br-sm shadow-lg shadow-primary/10"
                          : "bg-white/[0.06] text-white rounded-2xl rounded-bl-sm border border-white/5"
                      )}>
                        {/* Reply preview */}
                        {msg.replyToId && (
                          <div className={cn(
                            "border-l-2 p-2 rounded-lg mb-2 text-[10px] sm:text-[11px]",
                            isOwn ? "bg-black/20 border-white/40" : "bg-white/5 border-primary/40"
                          )}>
                            <p className="font-bold mb-0.5 truncate opacity-70">{msg.replyToName}</p>
                            <p className="truncate opacity-50">{msg.replyToText}</p>
                          </div>
                        )}

                        {/* Text */}
                        <span>{msg.text}</span>

                        {/* Time + edited */}
                        <span className={cn(
                          "inline-flex items-center gap-1 ml-2 align-bottom float-right mt-1",
                          isOwn ? "text-white/40" : "text-white/20"
                        )}>
                          {msg.isEdited && <span className="text-[8px] italic">ред.</span>}
                          <span className="text-[9px] font-medium">{formatMessageTime(msg.createdAt)}</span>
                        </span>
                      </div>

                      {/* Other message actions — right side */}
                      {!isOwn && (
                        <div className="opacity-0 group-hover/bubble:opacity-100 transition-all duration-200 flex items-center gap-0.5 shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 rounded-full bg-white/5 hover:bg-white/10">
                                <MoreVertical className="size-3.5 opacity-50 text-white" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="glass-panel border-white/10 rounded-xl p-1 shadow-2xl w-48">
                              <DropdownMenuItem onClick={() => setReplyTo(msg)} className="gap-2.5 font-bold text-xs rounded-lg text-white h-9">
                                <Reply className="size-3.5" /> Відповісти
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyText(msg.text)} className="gap-2.5 font-bold text-xs rounded-lg text-white h-9">
                                <Copy className="size-3.5" /> Копіювати
                              </DropdownMenuItem>
                              {isUserAdmin && (
                                <>
                                  <DropdownMenuItem onClick={() => handlePin(msg.id)} className="gap-2.5 font-bold text-xs rounded-lg text-white h-9">
                                    <Pin className="size-3.5" /> Закріпити
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/5" />
                                  <DropdownMenuItem onClick={() => handleDelete(msg.id)} className="gap-2.5 font-bold text-xs text-destructive rounded-lg h-9">
                                    <Trash2 className="size-3.5" /> Видалити
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>

                    {/* Quick reactions bar — appears on hover */}
                    <div className={cn(
                      "opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-0.5",
                      isOwn ? "justify-end" : "justify-start"
                    )}>
                      {QUICK_REACTIONS.map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="size-7 rounded-full hover:bg-white/10 flex items-center justify-center text-sm transition-all hover:scale-125 active:scale-90"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    {/* Reactions display */}
                    {msg.reactions && Object.keys(msg.reactions).some((k: string) => msg.reactions[k].length > 0) && (
                      <div className={cn("flex flex-wrap gap-1", isOwn ? 'justify-end' : 'justify-start')}>
                        {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) => (
                          users.length > 0 && (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[11px] font-bold border transition-all hover:scale-105",
                                users.includes(user?.uid)
                                  ? 'bg-primary/20 border-primary/40 text-primary shadow-sm shadow-primary/10'
                                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                              )}
                            >
                              {emoji} {users.length}
                            </button>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Date separator */}
                {showDate && (
                  <div className="flex items-center justify-center py-3 mt-2">
                    <div className="bg-white/5 border border-white/5 px-4 py-1.5 rounded-full">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        {formatMessageDate(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                )}
              </React.Fragment>
            )
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-6">
            <div className="size-24 rounded-[2rem] bg-white/[0.03] flex items-center justify-center border border-white/5">
              <MessageSquare className="size-10 opacity-20" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-headline font-bold uppercase tracking-widest opacity-20">
                {searchQuery ? 'Нічого не знайдено' : 'Напишіть першим!'}
              </p>
              {!searchQuery && (
                <p className="text-[11px] opacity-15 max-w-[200px]">
                  Почніть спілкування у кімнаті класу
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Scroll to bottom FAB */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-32 right-4 z-50"
          >
            <Button
              size="icon"
              className="size-10 rounded-full bg-primary/90 hover:bg-primary text-white shadow-xl shadow-primary/20"
              onClick={scrollToBottom}
            >
              <ArrowDown className="size-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — input area */}
      <footer className="fixed bottom-0 left-0 right-0 bg-[#0a0512]/95 backdrop-blur-2xl border-t border-white/5 z-50">
        {/* Reply / Edit bar */}
        <AnimatePresence>
          {(replyTo || editingMessage) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className={cn(
                "flex items-center justify-between px-4 py-2.5 border-b",
                editingMessage ? "bg-blue-500/5 border-blue-500/10" : "bg-primary/5 border-primary/10"
              )}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    "size-8 rounded-lg flex items-center justify-center shrink-0",
                    editingMessage ? "bg-blue-500/10" : "bg-primary/10"
                  )}>
                    {editingMessage ? <Edit3 className="size-3.5 text-blue-400" /> : <Reply className="size-3.5 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <p className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      editingMessage ? "text-blue-400" : "text-primary"
                    )}>
                      {editingMessage ? 'Редагування' : `Відповідь ${replyTo?.senderName}`}
                    </p>
                    <p className="text-[11px] truncate text-white/50">{editingMessage?.text || replyTo?.text}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white/40 hover:text-white shrink-0"
                  onClick={() => { setReplyTo(null); setEditingMessage(null); setText("") }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="p-3 sm:p-4 pb-6 sm:pb-5">
          {group?.mode === 'channel' && !isUserAdmin ? (
            <div className="glass-panel h-12 flex items-center justify-center rounded-2xl border-white/10 text-muted-foreground/50 text-[11px] gap-2.5 font-medium">
              <Lock className="size-4" /> Коментування вимкнено адміністратором
            </div>
          ) : (
            <div className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder={editingMessage ? "Редагувати повідомлення..." : "Написати повідомлення..."}
                  className="bg-white/5 border-white/10 h-12 rounded-2xl pl-4 pr-4 text-sm focus:ring-primary/40 transition-all text-white"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                />
              </div>
              <Button
                className={cn(
                  "size-12 rounded-2xl shrink-0 shadow-xl transition-all active:scale-95",
                  text.trim()
                    ? "cyber-gradient border-0 shadow-primary/20"
                    : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
                )}
                onClick={handleSend}
                disabled={!text.trim()}
              >
                <Send className="size-5" />
              </Button>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}
