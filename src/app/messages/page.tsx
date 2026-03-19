
"use client"

import * as React from "react"
import { 
  Search, 
  Send, 
  MoreVertical, 
  User, 
  Image as ImageIcon,
  Loader2,
  ArrowLeft,
  MessageSquare
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useUser, useFirestore, useCollection } from "@/firebase"
import { collection, query, where, orderBy, addDoc, serverTimestamp } from "firebase/firestore"
import { useSearchParams } from "next/navigation"

export default function MessagesPage() {
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
    <div className="h-[calc(100vh-2rem)] p-4 md:p-6 max-w-7xl mx-auto flex gap-6 animate-in fade-in duration-500">
      <Card className="glass-panel w-1/3 flex flex-col border-0 overflow-hidden hidden md:flex">
        <CardHeader className="pb-4 border-b border-white/5">
           <div className="flex items-center justify-between mb-4">
              <CardTitle className="font-headline text-2xl">Повідомлення</CardTitle>
           </div>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Пошук діалогів..." className="pl-10 bg-white/5 border-white/10" />
           </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-0">
           <div className="p-4 text-center text-muted-foreground italic text-sm">
              Ваші активні діалоги з'являться тут.
           </div>
        </CardContent>
      </Card>

      <Card className="glass-panel flex-1 flex flex-col border-0 overflow-hidden">
        {selectedReceiver ? (
          <>
            <CardHeader className="border-b border-white/5 p-4 flex flex-row items-center justify-between">
               <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                     <AvatarImage src={`https://picsum.photos/seed/${selectedReceiver}/50`} />
                     <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <div>
                     <p className="font-bold">Учень</p>
                     <p className="text-xs text-green-500">в мережі</p>
                  </div>
               </div>
               <Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
               {loading ? (
                 <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>
               ) : messages?.length > 0 ? (
                 messages.map((msg: any, i: number) => (
                   <div key={i} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                        msg.senderId === user?.uid 
                          ? 'cyber-gradient text-white rounded-br-none' 
                          : 'bg-white/10 text-white rounded-bl-none'
                      }`}>
                         {msg.text}
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                    <MessageSquare className="size-12" />
                    <p>Напишіть перше повідомлення!</p>
                 </div>
               )}
            </CardContent>

            <div className="p-4 border-t border-white/5 flex gap-2">
               <Button variant="ghost" size="icon" className="text-muted-foreground"><ImageIcon className="size-5" /></Button>
               <Input 
                  placeholder="Введіть повідомлення..." 
                  className="bg-white/5 border-white/10 h-12 rounded-2xl" 
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
               />
               <Button className="cyber-gradient border-0 size-12 rounded-2xl" onClick={handleSendMessage}>
                  <Send className="size-4 text-white" />
               </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
             <div className="size-20 rounded-full bg-white/5 flex items-center justify-center">
                <MessageSquare className="size-10" />
             </div>
             <p className="text-lg font-medium">Виберіть діалог, щоб почати спілкування</p>
          </div>
        )}
      </Card>
    </div>
  )
}
