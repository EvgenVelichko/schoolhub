"use client"

import * as React from "react"
import { 
  Gamepad2, 
  BrainCircuit, 
  MousePointer2, 
  ChevronLeft,
  Coins,
  Loader2,
  AlertTriangle,
  Zap,
  Binary,
  Lock
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc } from "@/firebase"
import { doc, updateDoc, increment } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export default function PlayZone() {
  const router = useRouter()
  const { user } = useUser()
  const db = useFirestore()
  const userRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userRef)

  const [activeGame, setActiveGame] = React.useState<'none' | 'trivia' | 'clicker' | 'math' | 'memory'>('none')
  const [score, setScore] = React.useState(0)
  const [clickerCount, setClickerCount] = React.useState(0)
  
  const [mathProblem, setMathProblem] = React.useState({ q: "2 + 2", a: 4, options: [4, 5, 3, 6] })
  const [memorySequence, setMemorySequence] = React.useState<number[]>([])
  const [userSequence, setUserSequence] = React.useState<number[]>([])
  const [isShowingSequence, setIsShowingSequence] = React.useState(false)
  
  const lastClickRef = React.useRef<number>(0)
  const [isBlocked, setIsBlocked] = React.useState(false)

  const isOwner = profile?.role === 'owner';

  const generateMath = () => {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, res;
    
    if (op === '*') {
      a = Math.floor(Math.random() * 30) + 11;
      b = Math.floor(Math.random() * 30) + 11;
    } else {
      a = Math.floor(Math.random() * 900) + 100;
      b = Math.floor(Math.random() * 800) + 50;
    }
    
    res = op === '+' ? a + b : op === '-' ? a - b : a * b;

    const wrongOptions = new Set<number>();
    while (wrongOptions.size < 3) {
      const offset = Math.floor(Math.random() * 60) - 30;
      const wrongVal = res + (offset === 0 ? 17 : offset);
      if (wrongVal !== res && wrongVal > 0) wrongOptions.add(wrongVal);
    }

    const shuffledOptions = shuffleArray([res, ...Array.from(wrongOptions)]);
    setMathProblem({ q: `${a} ${op === '*' ? '×' : op} ${b}`, a: res, options: shuffledOptions });
  }

  const handleMathAnswer = (val: number) => {
    if (val === mathProblem.a) {
      setScore(s => s + 1);
      if (userRef && !isOwner) updateDoc(userRef, { coins: increment(5) });
      toast({ title: "Вірно!", description: "+5 монет" });
      generateMath();
    } else {
      toast({ title: "Помилка", variant: "destructive" });
      generateMath();
    }
  }

  const generateSequence = (length: number) => {
    // Ускладнено: сітка 4x4 (1-16)
    const newSeq = Array.from({ length }, () => Math.floor(Math.random() * 16) + 1);
    setMemorySequence(newSeq);
    setUserSequence([]);
    setIsShowingSequence(true);
    // Пришвидшено показ
    setTimeout(() => setIsShowingSequence(false), 1000 + (length * 300));
  }

  const handleMemoryInput = (num: number) => {
    if (isShowingSequence) return;
    const newSeq = [...userSequence, num];
    setUserSequence(newSeq);

    if (newSeq[newSeq.length - 1] !== memorySequence[newSeq.length - 1]) {
      toast({ title: "Fail!", variant: "destructive" });
      setActiveGame('none');
      return;
    }

    if (newSeq.length === memorySequence.length) {
      setScore(s => s + 1);
      if (userRef && !isOwner) updateDoc(userRef, { coins: increment(30) });
      toast({ title: "Чудово!", description: "+30 монет" });
      setTimeout(() => generateSequence(memorySequence.length + 1), 1000);
    }
  }

  const handleClick = () => {
    if (isBlocked) return
    const now = Date.now()
    const diff = now - lastClickRef.current
    if (lastClickRef.current !== 0 && diff < 50) {
      setIsBlocked(true)
      toast({ title: "Стоп!", description: "Занадто швидко!", variant: "destructive" })
      setTimeout(() => setIsBlocked(false), 5000)
      return
    }
    lastClickRef.current = now
    setClickerCount(prev => prev + 1)
    if ((clickerCount + 1) % 30 === 0 && userRef && !isOwner) {
      updateDoc(userRef, { coins: increment(1) });
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-reveal pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="size-12 rounded-xl bg-white/5" onClick={() => setActiveGame('none')}>
            <ChevronLeft className="size-6 text-white" />
          </Button>
          <div>
            <h1 className="font-headline text-2xl md:text-4xl font-bold text-white">Зона <span className="text-primary">Ігор</span></h1>
            <p className="text-muted-foreground text-xs uppercase font-black">Розважайся з розумом</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-6 py-3 rounded-2xl">
          <Coins className="size-5 text-yellow-500" />
          <span className="font-black text-white text-lg">{isOwner ? "∞" : (profile?.coins || 0)}</span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeGame === 'none' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <GameCard title="AI Вікторина" desc="ПОКИ В РОЗРОБЦІ" icon={<Lock className="size-8 text-muted-foreground" />} onPlay={() => toast({title: "В розробці"})} tags={["Coming Soon"]} disabled />
            <GameCard title="Memory 4x4" desc="Ускладнений тренажер пам'яті." icon={<Binary className="size-8 text-indigo-400" />} onPlay={() => { setActiveGame('memory'); generateSequence(2); setScore(0); }} tags={["Hardcore", "+30 Coins"]} />
            <GameCard title="Клікер Оцінок" desc="Фарми монети кліками." icon={<MousePointer2 className="size-8 text-primary" />} onPlay={() => setActiveGame('clicker')} tags={["Farm"]} />
            <GameCard title="Математика Hard" desc="Складні приклади." icon={<Zap className="size-8 text-blue-400" />} onPlay={() => { setActiveGame('math'); generateMath(); setScore(0); }} tags={["Math", "+5 Coins"]} />
          </motion.div>
        )}

        {activeGame === 'memory' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-panel max-w-2xl mx-auto p-12 text-center space-y-8 border-0 rounded-[3rem]">
              <div className="min-h-20 flex flex-wrap items-center justify-center gap-3">
                {isShowingSequence ? memorySequence.map((n, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ scale: 0 }} 
                      animate={{ scale: 1 }} 
                      className="size-14 rounded-2xl cyber-gradient flex items-center justify-center text-xl font-black text-white shadow-lg"
                    >
                      {n}
                    </motion.div>
                )) : <div className="text-2xl font-bold text-white/50 uppercase tracking-widest">Повторіть чергу!</div>}
              </div>
              <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map(n => (
                  <Button 
                    key={n} 
                    disabled={isShowingSequence} 
                    className="h-16 text-xl font-black rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/50 transition-all active:scale-90" 
                    onClick={() => handleMemoryInput(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {activeGame === 'math' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-panel max-w-2xl mx-auto p-12 text-center space-y-10 border-0 rounded-[3rem]">
               <div className="text-6xl font-black text-white italic drop-shadow-2xl">{mathProblem.q} = ?</div>
               <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                 {mathProblem.options.map((v, i) => (
                   <Button key={i} className="h-20 text-3xl font-black rounded-2xl bg-white/5 border border-white/10" onClick={() => handleMathAnswer(v)}>{v}</Button>
                 ))}
               </div>
            </Card>
          </motion.div>
        )}

        {activeGame === 'clicker' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-panel max-w-lg mx-auto p-12 text-center space-y-10 border-0 rounded-[2.5rem] relative overflow-hidden">
              {isBlocked && <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-10"><AlertTriangle className="size-20 text-destructive animate-bounce" /><p className="text-2xl font-black text-white uppercase mt-4">БЛОКУВАННЯ</p></div>}
              <button disabled={isBlocked} className="size-60 rounded-full cyber-gradient mx-auto flex items-center justify-center shadow-2xl active:scale-95 transition-all text-7xl font-black text-white border-[10px] border-white/10" onClick={handleClick}>12+</button>
              <div className="flex items-center justify-center gap-4 bg-white/5 px-8 py-5 rounded-[2rem] border border-white/10 text-white">
                <Coins className="size-8 text-yellow-500" />
                <span className="text-5xl font-black">{clickerCount}</span>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GameCard({ title, desc, icon, onPlay, tags, disabled }: { title: string, desc: string, icon: React.ReactNode, onPlay: () => void, tags: string[], disabled?: boolean }) {
  return (
    <Card className={cn("glass-panel flex flex-col border-0 p-8 rounded-[2.5rem] shadow-xl h-full group overflow-hidden", disabled && "opacity-50 grayscale")}>
      <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-all">{icon}</div>
      <h3 className="font-headline text-2xl text-white font-bold mb-3 uppercase">{title}</h3>
      <p className="text-muted-foreground mb-8 text-sm leading-relaxed flex-1">{desc}</p>
      <div className="flex flex-wrap gap-2 mb-10">{tags.map(tag => <Badge key={tag} variant="outline" className="text-[9px] uppercase font-black px-3 bg-white/5 border-white/10">{tag}</Badge>)}</div>
      <Button disabled={disabled} className="w-full h-16 rounded-2xl cyber-gradient text-white font-black uppercase tracking-widest shadow-lg" onClick={onPlay}>{disabled ? "ЗАКРИТО" : "ГРАТИ"}</Button>
    </Card>
  )
}
