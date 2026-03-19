
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
  Smile
} from "lucide-react"
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
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
    limit(100)
  ), [db, groupId])

  const { data: messages, loading: messagesLoading } = useCollection(messagesQuery)
  
  const userProfileRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userProfileRef)

  const [text, setText] = React.useState("")
  const [replyTo, setReplyTo] = React.useState<any>(null)
  const [editingMessage, setEditingMessage] = React.useState<any>(null)

  const isUserAdmin = React.useMemo(() => {
    if (!user || !group) return false;
    return (group.admins || []).includes(user.uid) || profile?.role === 'owner' || profile?.role === 'admin';
  }, [user, group, profile]);

  const pinnedMessage = React.useMemo(() => {
    if (!group?.pinnedMessageId || !messages) return null;
    return messages.find((m: any) => m.id === group.pinnedMessageId);
  }, [group, messages]);

  const handleSend = async () => {
    if (!user || !text.trim()) return;
    
    if (group?.mode === 'channel' && !isUserAdmin) {
      toast({ title: "Обмеження", description: "Тільки адміністратори можуть писати в цьому режимі." });
      return;
    }

    try {
      if (editingMessage) {
        updateDoc(doc(db, "groups", groupId as string, "messages", editingMessage.id), {
          text: text.trim(),
          isEdited: true
        });
        setEditingMessage(null);
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
        });
      }
      setText("");
      setReplyTo(null);
    } catch (e) {
      toast({ title: "Помилка відправки", variant: "destructive" });
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const msgRef = doc(db, "groups", groupId as string, "messages", messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    const currentReactions = msgSnap.data().reactions || {};
    const usersForEmoji = currentReactions[emoji] || [];

    let updatedUsers;
    if (usersForEmoji.includes(user.uid)) {
      updatedUsers = usersForEmoji.filter((id: string) => id !== user.uid);
    } else {
      updatedUsers = [...usersForEmoji, user.uid];
    }

    updateDoc(msgRef, {
      [`reactions.${emoji}`]: updatedUsers
    });
  }

  const handlePin = async (messageId: string) => {
    if (!isUserAdmin) return;
    updateDoc(groupRef, { pinnedMessageId: messageId });
    toast({ title: "Повідомлення закріплено" });
  }

  const handleDelete = async (messageId: string) => {
    const msgRef = doc(db, "groups", groupId as string, "messages", messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;

    if (msgSnap.data().senderId === user?.uid || isUserAdmin) {
      deleteDoc(msgRef);
      toast({ title: "Видалено" });
    }
  }

  const toggleChannelMode = async () => {
    if (!isUserAdmin) return;
    const newMode = group?.mode === 'channel' ? 'group' : 'channel';
    updateDoc(groupRef, { mode: newMode });
    toast({ title: newMode === 'channel' ? "Режим каналу увімкнено" : "Режим групи увімкнено" });
  }

  if (groupLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary size-10" /></div>

  return (
    <div className="h-[100dvh] flex flex-col animate-reveal bg-[#0a0512] overflow-hidden relative">
      <header className="mobile-header-blur p-4 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="size-10 rounded-xl hover:bg-white/10" onClick={() => router.back()}>
            <ChevronLeft className="size-6 text-white" />
          </Button>
          <div className="flex flex-col min-w-0">
            <h1 className="text-base font-headline font-bold text-white truncate flex items-center gap-2">
              {group?.name?.toUpperCase()}
              {group?.mode === 'channel' && <span className="cyber-gradient text-[7px] h-3.5 px-1.5 rounded-full flex items-center font-black uppercase">CHANNEL</span>}
            </h1>
            <p className="text-[10px] text-muted-foreground font-medium truncate opacity-60 uppercase tracking-widest">{group?.schoolName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isUserAdmin && (
            <Button variant="ghost" size="icon" className="size-10 rounded-xl text-primary hover:bg-primary/10" onClick={toggleChannelMode}>
              {group?.mode === 'channel' ? <Unlock className="size-5" /> : <Lock className="size-5" />}
            </Button>
          )}
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
            <Users className="size-5 text-primary" />
          </div>
        </div>
      </header>

      <AnimatePresence>
        {pinnedMessage && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary/10 border-b border-primary/20 p-2.5 flex items-center justify-between shrink-0 z-40 overflow-hidden backdrop-blur-md"
          >
            <div className="flex items-center gap-3 px-4 min-w-0">
              <Pin className="size-3 text-primary shrink-0" />
              <p className="text-[11px] text-white/90 truncate font-medium">{pinnedMessage.text}</p>
            </div>
            <Button variant="ghost" size="icon" className="size-8" onClick={() => handlePin("")}>
              <X className="size-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <CardContent className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col-reverse gap-6 scrollbar-none overscroll-contain pb-32 md:pb-36 bg-gradient-to-b from-transparent via-[#0a0512]/50 to-[#0a0512]">
        {messagesLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
        ) : messages?.length > 0 ? (
          messages.map((msg: any) => {
            const isOwn = msg.senderId === user?.uid;
            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn("flex gap-3 max-w-[90%] sm:max-w-[75%] group", isOwn ? 'ml-auto flex-row-reverse' : 'mr-auto')}
              >
                {!isOwn && (
                  <Avatar className="size-8 border border-white/10 shrink-0 mt-auto shadow-md">
                    <AvatarImage src={msg.senderPhoto} className="object-cover" />
                    <AvatarFallback className="text-[10px] font-bold bg-primary/20 text-primary">{msg.senderName?.[0]}</AvatarFallback>
                  </Avatar>
                )}
                
                <div className={cn("space-y-1.5", isOwn ? 'items-end' : 'items-start')}>
                  {!isOwn && (
                    <p className="text-[9px] font-black text-muted-foreground px-1 uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                      {msg.senderName} {msg.isAdmin && <span className="text-primary text-[10px]">★</span>}
                    </p>
                  )}

                  <div className="relative group/bubble flex items-center gap-2">
                    <div className={cn(
                      "relative p-3.5 text-sm leading-relaxed shadow-xl",
                      isOwn ? 'chat-bubble-own' : 'chat-bubble-other'
                    )}>
                      {msg.replyToId && (
                        <div className="bg-black/20 border-l-2 border-white/40 p-2 rounded-lg mb-2 opacity-60 text-[10px]">
                          <p className="font-bold mb-0.5 truncate">{msg.replyToName}</p>
                          <p className="truncate">{msg.replyToText}</p>
                        </div>
                      )}
                      {msg.text}
                      {msg.isEdited && <span className="text-[8px] opacity-40 ml-2 italic">(ред.)</span>}
                    </div>

                    <div className={cn(
                      "opacity-0 group-hover/bubble:opacity-100 transition-all duration-300 flex items-center gap-1 shrink-0",
                      isOwn ? 'flex-row-reverse' : 'flex-row'
                    )}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 rounded-full bg-white/5 hover:bg-white/10">
                            <MoreVertical className="size-4 opacity-50 text-white" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isOwn ? 'end' : 'start'} className="glass-panel border-white/10 rounded-xl p-1 shadow-2xl">
                          <DropdownMenuItem onClick={() => setReplyTo(msg)} className="gap-2 font-bold text-xs rounded-lg text-white"><Reply className="size-3.5" /> Відповісти</DropdownMenuItem>
                          {isOwn && <DropdownMenuItem onClick={() => { setEditingMessage(msg); setText(msg.text); }} className="gap-2 font-bold text-xs rounded-lg text-white"><Edit3 className="size-3.5" /> Редагувати</DropdownMenuItem>}
                          {isUserAdmin && <DropdownMenuItem onClick={() => handlePin(msg.id)} className="gap-2 font-bold text-xs rounded-lg text-white"><Pin className="size-3.5" /> Закріпити</DropdownMenuItem>}
                          {(isOwn || isUserAdmin) && <DropdownMenuItem onClick={() => handleDelete(msg.id)} className="gap-2 font-bold text-xs text-destructive rounded-lg"><Trash2 className="size-3.5" /> Видалити</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {msg.reactions && Object.keys(msg.reactions).some(k => msg.reactions[k].length > 0) && (
                    <div className={cn("flex flex-wrap gap-1 mt-1", isOwn ? 'justify-end' : 'justify-start')}>
                      {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) => (
                        users.length > 0 && (
                          <button 
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all",
                              users.includes(user?.uid) ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-white/5 border-white/10 text-white/60'
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
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20 space-y-6">
            <div className="size-20 rounded-[2rem] bg-white/5 flex items-center justify-center animate-pulse">
              <MessageSquare className="size-10" />
            </div>
            <p className="text-lg font-headline font-bold uppercase tracking-widest">Напишіть першим!</p>
          </div>
        )}
      </CardContent>

      <footer className="fixed bottom-0 left-0 right-0 p-4 pb-8 md:pb-6 bg-[#0a0512]/90 backdrop-blur-2xl border-t border-white/5 space-y-3 z-50">
        <AnimatePresence>
          {replyTo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-primary/10 border-l-2 border-primary p-2 rounded-r-xl flex items-center justify-between text-xs overflow-hidden"
            >
              <div className="min-w-0">
                <p className="font-black text-[9px] uppercase tracking-widest text-primary">Відповідь {replyTo.senderName}</p>
                <p className="truncate opacity-60 italic text-white">{replyTo.text}</p>
              </div>
              <Button variant="ghost" size="icon" className="size-7 text-white" onClick={() => setReplyTo(null)}><X className="size-4" /></Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 items-center">
          {group?.mode === 'channel' && !isUserAdmin ? (
            <div className="flex-1 glass-panel h-14 flex items-center justify-center rounded-2xl border-white/10 text-muted-foreground italic text-[11px] gap-3">
              <Lock className="size-4" /> Коментування вимкнено адміністратором
            </div>
          ) : (
            <>
              <Input 
                placeholder={editingMessage ? "Редагувати..." : "Написати повідомлення..."} 
                className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-sm focus:ring-primary/40 transition-all shadow-inner text-white" 
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button className="cyber-gradient border-0 size-14 rounded-2xl shrink-0 shadow-xl shadow-primary/20 active:scale-95 transition-all" onClick={handleSend}>
                <Send className="size-6 text-white" />
              </Button>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
