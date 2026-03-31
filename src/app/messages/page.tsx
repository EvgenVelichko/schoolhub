"use client"

import * as React from "react"
import {
  Search,
  Send,
  MoreVertical,
  Loader2,
  MessageSquare,
  UserPlus,
  Users,
  Check,
  CheckCheck,
  X,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useUser, useFirestore } from "@/firebase"
import {
  collection,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  onSnapshot,
  limit,
  setDoc,
} from "firebase/firestore"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"
import { uk } from "date-fns/locale"
import { toast } from "@/hooks/use-toast"
import { notifyUser } from "@/lib/send-notification"

type Tab = "chats" | "friends" | "requests" | "search"

function formatTime(timestamp: any): string {
  if (!timestamp) return ""
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    if (date.toDateString() === now.toDateString()) return format(date, "HH:mm")
    return format(date, "dd.MM", { locale: uk })
  } catch { return "" }
}

export default function MessagesPage() {
  const { user } = useUser()
  const db = useFirestore()

  const [tab, setTab] = React.useState<Tab>("chats")
  const [selectedChat, setSelectedChat] = React.useState<string | null>(null)
  const [selectedChatUser, setSelectedChatUser] = React.useState<any>(null)
  const [messageText, setMessageText] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [searching, setSearching] = React.useState(false)
  const [chatMessages, setChatMessages] = React.useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = React.useState(false)
  const [conversations, setConversations] = React.useState<any[]>([])
  const [friends, setFriends] = React.useState<any[]>([])
  const [friendRequests, setFriendRequests] = React.useState<any[]>([])
  const [sentRequests, setSentRequests] = React.useState<string[]>([])
  const [isTyping, setIsTyping] = React.useState(false)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const typingTimeoutRef = React.useRef<any>(null)

  React.useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, "dm_conversations"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    )
    return onSnapshot(q, (snap) => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [db, user])

  React.useEffect(() => {
    if (!user) return
    return onSnapshot(query(collection(db, "users", user.uid, "friends")), (snap) => {
      setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [db, user])

  React.useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, "friend_requests"),
      where("toId", "==", user.uid),
      where("status", "==", "pending")
    )
    return onSnapshot(q, (snap) => {
      setFriendRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [db, user])

  // Track sent friend requests
  React.useEffect(() => {
    if (!user) return
    const q = query(
      collection(db, "friend_requests"),
      where("fromId", "==", user.uid),
      where("status", "==", "pending")
    )
    return onSnapshot(q, (snap) => {
      setSentRequests(snap.docs.map(d => d.data().toId))
    })
  }, [db, user])

  React.useEffect(() => {
    if (!selectedChat) { setChatMessages([]); return }
    setLoadingMessages(true)
    const q = query(
      collection(db, "dm_conversations", selectedChat, "messages"),
      orderBy("createdAt", "asc")
    )
    return onSnapshot(q, (snap) => {
      setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoadingMessages(false)
      snap.docs.forEach(d => {
        const msg = d.data()
        if (msg.senderId !== user?.uid && !msg.isRead) {
          updateDoc(doc(db, "dm_conversations", selectedChat!, "messages", d.id), { isRead: true })
        }
      })
    })
  }, [db, selectedChat, user])

  React.useEffect(() => {
    if (!selectedChat || !selectedChatUser) return
    const typingRef = doc(db, "dm_conversations", selectedChat, "typing", selectedChatUser.id)
    return onSnapshot(typingRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setIsTyping(data?.isTyping && data?.uid !== user?.uid)
      } else {
        setIsTyping(false)
      }
    })
  }, [db, selectedChat, selectedChatUser, user])

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [chatMessages, isTyping])

  const handleSearch = React.useCallback(async () => {
    if (!searchQuery.trim() || !user) return
    setSearching(true)
    try {
      const q = query(collection(db, "users"), limit(50))
      const snap = await getDocs(q)
      setSearchResults(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((u: any) =>
            u.id !== user.uid &&
            (u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             u.gradeLevel?.toLowerCase().includes(searchQuery.toLowerCase()))
          )
      )
    } catch (e) { console.error(e) }
    finally { setSearching(false) }
  }, [db, user, searchQuery])

  React.useEffect(() => {
    const t = setTimeout(() => { if (searchQuery.trim()) handleSearch() }, 400)
    return () => clearTimeout(t)
  }, [searchQuery, handleSearch])

  const sendFriendRequest = async (toUser: any) => {
    if (!user) return
    try {
      await addDoc(collection(db, "friend_requests"), {
        fromId: user.uid, fromName: user.displayName, fromPhoto: user.photoURL,
        toId: toUser.id, toName: toUser.displayName, toPhoto: toUser.photoURL,
        status: "pending", createdAt: serverTimestamp(),
      })
      toast({ title: "Запит надіслано", description: `Запит дружби надіслано ${toUser.displayName}` })
      notifyUser({
        userId: toUser.id,
        title: "Новий запит дружби",
        body: `${user.displayName} хоче додати вас у друзі`,
        link: "/messages",
        tag: "friend-request",
      })
    } catch (e) { console.error(e) }
  }

  const acceptFriendRequest = async (request: any) => {
    if (!user) return
    try {
      await setDoc(doc(db, "users", user.uid, "friends", request.fromId), {
        displayName: request.fromName, photoURL: request.fromPhoto, addedAt: serverTimestamp(),
      })
      await setDoc(doc(db, "users", request.fromId, "friends", user.uid), {
        displayName: user.displayName, photoURL: user.photoURL, addedAt: serverTimestamp(),
      })
      await updateDoc(doc(db, "friend_requests", request.id), { status: "accepted" })
      toast({ title: "Друга додано!", description: `${request.fromName} тепер ваш друг` })
    } catch (e) { console.error(e) }
  }

  const declineFriendRequest = async (request: any) => {
    try { await updateDoc(doc(db, "friend_requests", request.id), { status: "declined" }) }
    catch (e) { console.error(e) }
  }

  const openChat = async (otherId: string, otherData: any) => {
    if (!user) return
    const existing = conversations.find((c: any) =>
      c.participants?.includes(otherId) && c.participants?.includes(user.uid)
    )
    if (existing) {
      setSelectedChat(existing.id)
      setSelectedChatUser({ id: otherId, ...otherData })
      return
    }
    try {
      const convRef = await addDoc(collection(db, "dm_conversations"), {
        participants: [user.uid, otherId],
        participantNames: { [user.uid]: user.displayName, [otherId]: otherData.displayName },
        participantPhotos: { [user.uid]: user.photoURL, [otherId]: otherData.photoURL },
        lastMessage: "", lastMessageAt: serverTimestamp(), createdAt: serverTimestamp(),
      })
      setSelectedChat(convRef.id)
      setSelectedChatUser({ id: otherId, ...otherData })
    } catch (e) { console.error(e) }
  }

  const handleSendMessage = async () => {
    if (!user || !selectedChat || !messageText.trim()) return
    const text = messageText.trim()
    setMessageText("")
    try {
      await addDoc(collection(db, "dm_conversations", selectedChat, "messages"), {
        senderId: user.uid, senderName: user.displayName, text, createdAt: serverTimestamp(), isRead: false,
      })
      await updateDoc(doc(db, "dm_conversations", selectedChat), {
        lastMessage: text, lastMessageAt: serverTimestamp(), lastSenderId: user.uid,
      })
      setDoc(doc(db, "dm_conversations", selectedChat, "typing", user.uid), { isTyping: false, uid: user.uid }, { merge: true })
      // Push to the other user
      if (selectedChatUser) {
        notifyUser({
          userId: selectedChatUser.id,
          title: user.displayName || "Нове повідомлення",
          body: text.slice(0, 100),
          link: "/messages",
          tag: `dm-${selectedChat}`,
        })
      }
    } catch (e) { console.error(e) }
  }

  const handleInputChange = (value: string) => {
    setMessageText(value)
    if (!selectedChat || !user) return
    const typingRef = doc(db, "dm_conversations", selectedChat, "typing", user.uid)
    setDoc(typingRef, { isTyping: true, uid: user.uid }, { merge: true })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setDoc(typingRef, { isTyping: false, uid: user.uid }, { merge: true })
    }, 2000)
  }

  const getOtherUser = (conv: any) => {
    if (!user) return { id: "", name: "Учень", photo: "" }
    const otherId = conv.participants?.find((p: string) => p !== user.uid)
    return {
      id: otherId,
      name: conv.participantNames?.[otherId] || "Учень",
      photo: conv.participantPhotos?.[otherId] || "",
    }
  }

  // ======= CHAT VIEW =======
  if (selectedChat && selectedChatUser) {
    return (
      <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
        <header className="mobile-header-blur p-3 flex items-center justify-between shrink-0 z-50">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="size-10 rounded-xl hover:bg-white/10 shrink-0"
              onClick={() => { setSelectedChat(null); setSelectedChatUser(null) }}>
              <ArrowLeft className="size-5 text-white" />
            </Button>
            <Avatar className="size-10 border border-white/10 shrink-0">
              <AvatarImage src={selectedChatUser.photoURL} />
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                {selectedChatUser.displayName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{selectedChatUser.displayName || "Учень"}</p>
              {isTyping ? (
                <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">друкує...</p>
              ) : (
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">в мережі</p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-9 rounded-xl hover:bg-white/10 shrink-0">
            <MoreVertical className="size-4 text-muted-foreground" />
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-3 overscroll-contain">
          {loadingMessages ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary size-8" /></div>
          ) : chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20 space-y-4">
              <div className="size-20 rounded-[2rem] bg-white/5 flex items-center justify-center"><MessageSquare className="size-10" /></div>
              <p className="text-sm font-bold uppercase tracking-widest text-center">Напишіть перше повідомлення!</p>
            </div>
          ) : (
            <AnimatePresence>
              {chatMessages.map((msg: any, i: number) => {
                const isOwn = msg.senderId === user?.uid
                const showAvatar = !isOwn && (i === 0 || chatMessages[i - 1]?.senderId !== msg.senderId)
                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className={cn("flex gap-2.5 max-w-[85%]", isOwn ? "ml-auto flex-row-reverse" : "mr-auto")}>
                    {!isOwn && (
                      <div className="w-8 shrink-0">
                        {showAvatar && (
                          <Avatar className="size-8 border border-white/10 mt-auto">
                            <AvatarImage src={selectedChatUser.photoURL} />
                            <AvatarFallback className="text-[9px] font-bold bg-white/5 text-white">
                              {selectedChatUser.displayName?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <div className={cn("p-3 text-[14px] leading-relaxed", isOwn ? "chat-bubble-own" : "chat-bubble-other")}>
                        {msg.text}
                      </div>
                      <div className={cn("flex items-center gap-1 px-1", isOwn ? "justify-end" : "justify-start")}>
                        <span className="text-[9px] text-muted-foreground/40">{formatTime(msg.createdAt)}</span>
                        {isOwn && (
                          msg.isRead
                            ? <CheckCheck className="size-3 text-cyan-400" />
                            : <Check className="size-3 text-muted-foreground/40" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          )}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 max-w-[85%] mr-auto">
              <Avatar className="size-8 border border-white/10 shrink-0 mt-auto">
                <AvatarFallback className="text-[9px] font-bold bg-white/5 text-white">{selectedChatUser.displayName?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="chat-bubble-other p-3.5 flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-white/40 typing-dot" />
                <div className="size-1.5 rounded-full bg-white/40 typing-dot" />
                <div className="size-1.5 rounded-full bg-white/40 typing-dot" />
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-3 border-t border-white/5 bg-background/95 backdrop-blur-xl flex gap-3 shrink-0 safe-bottom">
          <Input placeholder="Повідомлення..." className="bg-white/5 border-white/10 h-12 rounded-xl px-4 text-sm text-white focus:ring-primary/40"
            value={messageText} onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} />
          <Button className="cyber-gradient size-12 rounded-xl shrink-0 active:scale-95 transition-all"
            onClick={handleSendMessage} disabled={!messageText.trim()}>
            <Send className="size-5 text-white" />
          </Button>
        </div>
      </div>
    )
  }

  // ======= MAIN MESSAGES VIEW =======
  return (
    <div className="h-[100dvh] flex flex-col bg-background animate-reveal overflow-hidden">
      <header className="mobile-header-blur p-3 sm:p-4 shrink-0 z-50">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-headline font-bold text-white">Повідомлення</h1>
          {friendRequests.length > 0 && (
            <Badge className="bg-destructive text-white text-[9px] px-1.5 h-5 font-bold">{friendRequests.length}</Badge>
          )}
        </div>
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {([
            { key: "chats" as Tab, label: "Чати", icon: MessageSquare },
            { key: "friends" as Tab, label: "Друзі", icon: Users },
            { key: "requests" as Tab, label: "Запити", icon: UserPlus },
            { key: "search" as Tab, label: "Пошук", icon: Search },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all relative",
                tab === t.key ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white"
              )}>
              <t.icon className="size-3.5" />
              {t.label}
              {t.key === "requests" && friendRequests.length > 0 && (
                <span className="size-2 rounded-full bg-destructive absolute top-1 right-2" />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-none pb-28">
        <AnimatePresence mode="wait">
          {tab === "chats" && (
            <motion.div key="chats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-1">
              {conversations.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground/30 space-y-3">
                  <MessageSquare className="size-12 mx-auto" />
                  <p className="text-xs font-bold uppercase tracking-widest">Ще немає діалогів</p>
                  <p className="text-[10px] text-muted-foreground/20">Знайдіть друзів у вкладці «Пошук»</p>
                </div>
              ) : conversations.map((conv: any, i: number) => {
                const other = getOtherUser(conv)
                return (
                  <motion.button key={conv.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => openChat(other.id, { displayName: other.name, photoURL: other.photo })}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left">
                    <div className="relative shrink-0">
                      <Avatar className="size-12 border border-white/10">
                        <AvatarImage src={other.photo} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">{other.name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 size-3 rounded-full bg-green-500 border-2 border-background online-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-white text-sm truncate">{other.name}</p>
                        <span className="text-[9px] text-muted-foreground/50 shrink-0 ml-2">{formatTime(conv.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {conv.lastSenderId === user?.uid && <CheckCheck className="size-3 text-cyan-400 shrink-0" />}
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || "Розпочніть діалог"}</p>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          )}

          {tab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-1">
              {friends.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground/30 space-y-3">
                  <Users className="size-12 mx-auto" />
                  <p className="text-xs font-bold uppercase tracking-widest">Поки що немає друзів</p>
                </div>
              ) : friends.map((friend: any, i: number) => (
                <motion.button key={friend.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => openChat(friend.id, friend)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all text-left">
                  <div className="relative shrink-0">
                    <Avatar className="size-11 border border-white/10">
                      <AvatarImage src={friend.photoURL} />
                      <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">{friend.displayName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 size-2.5 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{friend.displayName}</p>
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">в мережі</p>
                  </div>
                  <MessageSquare className="size-4 text-muted-foreground/30" />
                </motion.button>
              ))}
            </motion.div>
          )}

          {tab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 space-y-2">
              {friendRequests.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground/30 space-y-3">
                  <UserPlus className="size-12 mx-auto" />
                  <p className="text-xs font-bold uppercase tracking-widest">Немає нових запитів</p>
                </div>
              ) : friendRequests.map((req: any, i: number) => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-panel rounded-2xl p-4 flex items-center gap-3">
                  <Avatar className="size-11 border border-white/10 shrink-0">
                    <AvatarImage src={req.fromPhoto} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">{req.fromName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{req.fromName}</p>
                    <p className="text-[10px] text-muted-foreground">Хоче додати вас в друзі</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="icon" className="size-9 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary" onClick={() => acceptFriendRequest(req)}>
                      <Check className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-9 rounded-xl hover:bg-destructive/20 text-destructive" onClick={() => declineFriendRequest(req)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {tab === "search" && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3">
              <div className="relative group mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input placeholder="Шукати за ім'ям або класом..." className="pl-11 bg-white/5 border-white/10 h-11 rounded-xl text-sm text-white"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
              </div>
              {searching ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary size-6" /></div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((u: any, i: number) => {
                    const isFriend = friends.some((f: any) => f.id === u.id)
                    return (
                      <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all">
                        <Avatar className="size-11 border border-white/10 shrink-0">
                          <AvatarImage src={u.photoURL} />
                          <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">{u.displayName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{u.displayName}</p>
                          <p className="text-[10px] text-muted-foreground">{u.gradeLevel || "Школяр"}</p>
                        </div>
                        {isFriend ? (
                          <Button size="sm" variant="ghost" className="h-8 rounded-xl text-[10px] font-bold text-primary"
                            onClick={() => openChat(u.id, u)}>Написати</Button>
                        ) : sentRequests.includes(u.id) ? (
                          <Button size="sm" variant="ghost" className="h-8 rounded-xl text-[10px] font-bold text-muted-foreground" disabled>
                            <Check className="size-3 mr-1" /> Надіслано
                          </Button>
                        ) : (
                          <Button size="sm" className="h-8 rounded-xl text-[10px] font-bold cyber-gradient"
                            onClick={() => sendFriendRequest(u)}>
                            <UserPlus className="size-3 mr-1" /> Додати
                          </Button>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              ) : searchQuery.trim() ? (
                <div className="text-center py-10 text-muted-foreground/30">
                  <p className="text-xs font-bold uppercase tracking-widest">Нікого не знайдено</p>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground/20">
                  <Search className="size-10 mx-auto mb-3 opacity-30" />
                  <p className="text-xs font-bold uppercase tracking-widest">Введіть ім'я для пошуку</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
