
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
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"

const subjects = ["Всі", "Математика", "Фізика", "Історія", "Література", "Хімія", "Англійська"]

export default function KnowledgeHub() {
  const router = useRouter()
  const [selectedSubject, setSelectedSubject] = React.useState("Всі")
  const [searchQuery, setSearchQuery] = React.useState("")
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
    let result = threads
    if (selectedSubject !== "Всі") {
      result = result.filter((t: any) => t.subject === selectedSubject)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((t: any) =>
        t.title?.toLowerCase().includes(q) || t.content?.toLowerCase().includes(q)
      )
    }
    return result
  }, [threads, selectedSubject, searchQuery])

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-5 sm:space-y-6 md:space-y-8 animate-reveal pb-32">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 shrink-0"
            onClick={() => router.push('/')}
          >
            <ChevronLeft className="size-5 sm:size-6 text-white" />
          </Button>
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-headline font-bold text-white truncate">
              Хаб <span className="text-primary text-glow">Знань</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm opacity-70">Спілкуйся та навчайся разом з усіма</p>
          </div>
        </div>
        <div className="w-full sm:w-auto">
          {profile?.isMuted ? (
            <Badge variant="destructive" className="h-11 sm:h-12 px-6 sm:px-8 flex items-center gap-3 rounded-xl sm:rounded-2xl w-full sm:w-auto justify-center font-black text-xs uppercase tracking-widest">
              <MicOff className="size-4" /> Чат заблоковано
            </Badge>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="cyber-gradient h-11 sm:h-12 px-6 sm:px-10 rounded-xl sm:rounded-2xl font-black shadow-xl shadow-primary/20 w-full sm:w-auto text-xs uppercase tracking-widest">
                  <Plus className="mr-2 size-4" /> Нова тема
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-0 sm:max-w-[550px] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10">
                <DialogHeader>
                  <DialogTitle className="text-2xl sm:text-3xl font-headline font-bold text-white text-center">Створити гілку</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 sm:space-y-6 py-4 sm:py-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Заголовок</Label>
                    <Input placeholder="Як розв'язати це рівняння?" value={newThreadTitle} onChange={(e) => setNewThreadTitle(e.target.value)} className="bg-white/5 border-white/10 h-12 sm:h-14 rounded-xl sm:rounded-2xl px-4 sm:px-6 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Предмет</Label>
                    <Select value={newThreadSubject} onValueChange={setNewThreadSubject}>
                      <SelectTrigger className="bg-white/5 border-white/10 h-12 sm:h-14 rounded-xl sm:rounded-2xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-panel border-white/10 rounded-xl sm:rounded-2xl">
                        {subjects.filter(s => s !== "Всі").map(s => (
                          <SelectItem key={s} value={s} className="rounded-lg sm:rounded-xl focus:bg-primary/20">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Текст посту</Label>
                    <Textarea placeholder="Опишіть ваше запитання детальніше..." className="bg-white/5 border-white/10 min-h-[120px] sm:min-h-[150px] rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white" value={newThreadContent} onChange={(e) => setNewThreadContent(e.target.value)} />
                  </div>
                </div>
                <DialogFooter className="gap-3">
                  <Button variant="ghost" className="h-11 sm:h-14 rounded-xl sm:rounded-2xl px-6 sm:px-8 hover:bg-white/5 font-bold text-sm" onClick={() => setIsDialogOpen(false)}>Скасувати</Button>
                  <Button className="cyber-gradient h-11 sm:h-14 rounded-xl sm:rounded-2xl px-8 sm:px-12 font-black text-xs uppercase tracking-widest" onClick={handleCreateThread}>Опублікувати</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* Search + Filters */}
      <div className="space-y-3 sm:space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors size-4 sm:size-5" />
          <Input
            placeholder="Шукати у Хабі..."
            className="pl-11 sm:pl-14 h-12 sm:h-14 bg-white/5 border-white/10 rounded-xl sm:rounded-2xl text-sm sm:text-base focus:ring-primary/30 text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {subjects.map(subject => (
            <Badge
              key={subject}
              className={cn(
                "cursor-pointer h-9 sm:h-10 px-4 sm:px-6 transition-all rounded-lg sm:rounded-xl border text-[10px] sm:text-[11px] font-black uppercase tracking-widest",
                selectedSubject === subject
                  ? 'cyber-gradient border-0 text-white shadow-lg shadow-primary/30'
                  : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
              )}
              onClick={() => setSelectedSubject(subject)}
            >
              {subject}
            </Badge>
          ))}
        </div>
      </div>

      {/* Threads */}
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {threadsLoading ? (
          <div className="py-16 sm:py-20 flex flex-col items-center gap-4 text-muted-foreground">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/50">Завантаження обговорень...</p>
          </div>
        ) : filteredThreads?.length > 0 ? (
          filteredThreads.map((thread: any) => (
            <Card key={thread.id} className="glass-panel hover:border-primary/30 transition-all group overflow-hidden border-0 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl">
              <CardHeader className="p-4 sm:p-6 md:p-8 pb-2 sm:pb-4 flex flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <Avatar className="size-10 sm:size-12 border border-primary/20 shrink-0">
                    <AvatarImage src={`https://picsum.photos/seed/${thread.id}/100`} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">{thread.authorName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm sm:text-base md:text-lg truncate">{thread.authorName}</p>
                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">
                      {thread.subject} • {thread.createdAt?.seconds ? new Date(thread.createdAt.seconds * 1000).toLocaleDateString() : "Щойно"}
                    </p>
                  </div>
                </div>
                <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1 text-[9px] sm:text-[10px] font-black shrink-0">+{thread.reward} XP</Badge>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 md:p-8 pt-1 sm:pt-2 space-y-3 sm:space-y-4 md:space-y-6">
                <h3 className="text-base sm:text-xl md:text-2xl font-headline font-bold text-white group-hover:text-primary transition-colors leading-tight">{thread.title}</h3>
                <p className="text-muted-foreground line-clamp-2 leading-relaxed text-xs sm:text-sm md:text-base">{thread.content}</p>
                <div className="flex items-center gap-4 sm:gap-8 pt-3 sm:pt-6 border-t border-white/5 text-xs sm:text-sm font-bold text-muted-foreground">
                  <button className="flex items-center gap-1.5 sm:gap-2 hover:text-primary transition-colors"><MessageSquare className="size-3.5 sm:size-4" /> {thread.repliesCount || 0}</button>
                  <button className="flex items-center gap-1.5 sm:gap-2 hover:text-pink-500 transition-colors"><Star className="size-3.5 sm:size-4" /> {thread.likesCount || 0}</button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="glass-panel border-0 rounded-[2rem] sm:rounded-[2.5rem] py-16 sm:py-24 text-center text-muted-foreground space-y-4">
            <MessageSquare className="size-12 sm:size-16 mx-auto opacity-10" />
            <p className="text-base sm:text-xl font-bold italic">Поки що пусто... Створіть першу тему!</p>
          </div>
        )}
      </div>
    </div>
  )
}
