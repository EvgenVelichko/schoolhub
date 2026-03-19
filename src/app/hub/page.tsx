
"use client"

import * as React from "react"
import { 
  Search, 
  Plus, 
  MessageSquare, 
  Star, 
  Loader2,
  MicOff,
  Filter,
  ChevronLeft
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, addDoc, serverTimestamp, doc } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"

const subjects = ["Всі", "Математика", "Фізика", "Історія", "Література", "Хімія", "Англійська"]

export default function KnowledgeHub() {
  const router = useRouter()
  const [selectedSubject, setSelectedSubject] = React.useState("Всі")
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [newThreadTitle, setNewThreadTitle] = React.useState("")
  const [newThreadContent, setNewThreadContent] = React.useState("")
  const [newThreadSubject, setNewThreadSubject] = React.useState("Математика")
  
  const db = useFirestore()
  const { user } = useUser()
  const userDocRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userDocRef)

  const threadsQuery = React.useMemo(() => query(collection(db, "threads"), orderBy("createdAt", "desc")), [db])
  const { data: threads, loading: threadsLoading } = useCollection(threadsQuery)

  const handleCreateThread = async () => {
    if (!user) return toast({ title: "Потрібна авторизація", variant: "destructive" })
    if (profile?.isMuted) return toast({ title: "Ви замучені", variant: "destructive" })
    if (!newThreadTitle || !newThreadContent) return toast({ title: "Заповніть поля", variant: "destructive" })

    try {
      addDoc(collection(db, "threads"), {
        title: newThreadTitle,
        content: newThreadContent,
        subject: newThreadSubject,
        authorId: user.uid,
        authorName: user.displayName || "Анонім",
        createdAt: serverTimestamp(),
        repliesCount: 0,
        likesCount: 0,
        reward: 20
      })
      setIsDialogOpen(false)
      setNewThreadTitle("")
      setNewThreadContent("")
      toast({ title: "Створено!" })
    } catch (e) {
      toast({ title: "Помилка", variant: "destructive" })
    }
  }

  const filteredThreads = React.useMemo(() => {
    if (!threads) return []
    if (selectedSubject === "Всі") return threads
    return threads.filter((t: any) => t.subject === selectedSubject)
  }, [threads, selectedSubject])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-10 animate-reveal pb-32">
      <header className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            className="size-12 rounded-2xl bg-white/5 hover:bg-white/10 shrink-0"
            onClick={() => router.push('/')}
          >
            <ChevronLeft className="size-6 text-white" />
          </Button>
          <div className="space-y-1 min-w-0">
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-white truncate">Хаб <span className="text-primary text-glow">Знань</span></h1>
            <p className="text-muted-foreground text-xs md:text-sm">Спілкуйся та навчайся разом з усіма</p>
          </div>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          {profile?.isMuted ? (
            <Badge variant="destructive" className="h-14 px-8 flex items-center gap-3 rounded-2xl w-full justify-center">
              <MicOff className="size-5" /> Чат заблоковано
            </Badge>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="cyber-gradient h-14 px-10 rounded-2xl font-bold shadow-xl shadow-primary/20 w-full md:w-auto">
                  <Plus className="mr-2 size-5" /> Нове обговорення
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-0 sm:max-w-[550px] rounded-[2.5rem] p-10">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-headline font-bold text-white text-center">Створити гілку</DialogTitle>
                </DialogHeader>
                <div className="space-y-8 py-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Заголовок</Label>
                    <Input placeholder="Як розв'язати це рівняння?" value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)} className="bg-white/5 border-white/10 h-14 rounded-2xl" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Предмет</Label>
                    <Select value={newThreadSubject} onValueChange={setNewThreadSubject}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-14 rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-white/10 rounded-2xl">
                        {subjects.filter(s => s !== "Всі").map(s => (
                          <SelectItem key={s} value={s} className="rounded-xl focus:bg-primary/20">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Текст посту</Label>
                    <Textarea placeholder="Опишіть ваше запитання детальніше..." className="bg-white/5 border-white/10 min-h-[150px] rounded-2xl p-6" value={newThreadContent} onChange={(e) => setNewThreadContent(e.target.value)} />
                  </div>
                </div>
                <DialogFooter className="gap-3">
                  <Button variant="ghost" className="h-14 rounded-2xl px-8 hover:bg-white/5" onClick={() => setIsDialogOpen(false)}>Скасувати</Button>
                  <Button className="cyber-gradient h-14 rounded-2xl px-12 font-bold" onClick={handleCreateThread}>Опублікувати</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <Card className="glass-panel border-0 rounded-[2.5rem] p-8 h-fit">
          <div className="space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2"><Filter className="size-4 text-primary" /> Фільтри</h2>
            <div className="flex flex-wrap gap-2">
              {subjects.map(subject => (
                <Badge key={subject} variant={selectedSubject === subject ? "default" : "outline"} className={`cursor-pointer h-10 px-6 transition-all rounded-xl border-white/10 ${selectedSubject === subject ? 'cyber-gradient border-0' : 'bg-white/5 hover:bg-white/10'}`} onClick={() => setSelectedSubject(subject)}>
                  {subject}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        <div className="lg:col-span-3 space-y-8">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors size-5" />
            <Input placeholder="Шукати у Хабі..." className="pl-14 h-16 bg-white/5 border-white/10 rounded-[1.5rem] text-lg focus:ring-primary/30" />
          </div>

          <div className="space-y-6">
            {threadsLoading ? (
              <div className="py-20 flex flex-col items-center gap-4 text-muted-foreground"><Loader2 className="size-10 animate-spin text-primary" /><p>Завантаження обговорень...</p></div>
            ) : filteredThreads?.length > 0 ? (
              filteredThreads.map((thread: any) => (
                <Card key={thread.id} className="glass-panel hover:border-primary/30 transition-all group overflow-hidden border-0 rounded-[2rem]">
                  <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="size-12 border border-primary/20">
                        <AvatarImage src={`https://picsum.photos/seed/${thread.id}/100`} />
                        <AvatarFallback>{thread.authorName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white text-lg">{thread.authorName}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          {thread.subject} • {thread.createdAt?.seconds ? new Date(thread.createdAt.seconds * 1000).toLocaleDateString() : "Щойно"}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 rounded-xl px-4">+{thread.reward} XP</Badge>
                  </CardHeader>
                  <CardContent className="p-8 pt-2 space-y-6">
                    <h3 className="text-2xl font-headline font-bold text-white group-hover:text-primary transition-colors leading-tight">{thread.title}</h3>
                    <p className="text-muted-foreground line-clamp-2 leading-relaxed text-lg">{thread.content}</p>
                    <div className="flex items-center gap-8 pt-6 border-t border-white/5 text-sm font-bold text-muted-foreground">
                      <button className="flex items-center gap-2 hover:text-primary transition-colors"><MessageSquare className="size-4" /> {thread.repliesCount || 0} відповідей</button>
                      <button className="flex items-center gap-2 hover:text-pink-500 transition-colors"><Star className="size-4" /> {thread.likesCount || 0} вподобань</button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="glass-panel border-0 rounded-[2.5rem] py-32 text-center text-muted-foreground space-y-4">
                <MessageSquare className="size-16 mx-auto opacity-10" />
                <p className="text-xl italic">Поки що пусто... Створіть першу тему!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
