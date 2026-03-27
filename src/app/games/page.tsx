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
  Lock,
  Timer,
  Target,
  Shuffle,
  Type,
  Palette,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { useUser, useFirestore, useDoc } from "@/firebase"
import { doc, updateDoc, increment } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ─── Color Match game data ────
const COLORS = [
  { name: "ЧЕРВОНИЙ", color: "text-red-500" },
  { name: "СИНІЙ", color: "text-blue-500" },
  { name: "ЗЕЛЕНИЙ", color: "text-green-500" },
  { name: "ЖОВТИЙ", color: "text-yellow-500" },
  { name: "РОЖЕВИЙ", color: "text-pink-500" },
  { name: "БІЛИЙ", color: "text-white" },
]

// ─── Word Scramble data ────
const WORDS = [
  "ШКОЛА", "ФІЗИКА", "ХІМІЯ", "АЛГЕБРА", "МУЗИКА", "ІСТОРІЯ",
  "БІОЛОГІЯ", "УЧИТЕЛЬ", "УРОК", "ОЦІНКА", "ЗОШИТ", "ОЛІВЕЦЬ",
  "ПІДРУЧНИК", "ЗАВДАННЯ", "ПЕРЕРВА", "ДЗВОНИК", "КЛАС", "ПАРТА",
]

type GameType = 'none' | 'math' | 'memory' | 'clicker' | 'reaction' | 'colorMatch' | 'wordScramble' | 'twentyOne'

export default function PlayZone() {
  const router = useRouter()
  const { user } = useUser()
  const db = useFirestore()
  const userRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userRef)

  const [activeGame, setActiveGame] = React.useState<GameType>('none')
  const [score, setScore] = React.useState(0)

  const isOwner = profile?.role === 'owner'
  const hasCoinMagnet = profile?.purchasedItems?.includes('coin_magnet')
  const coinMultiplier = hasCoinMagnet ? 1.5 : 1

  const addCoins = (amount: number) => {
    if (userRef && !isOwner) {
      const final = Math.round(amount * coinMultiplier)
      updateDoc(userRef, { coins: increment(final) })
      return final
    }
    return amount
  }

  const exitGame = () => { setActiveGame('none'); setScore(0) }

  // ─── MATH ────
  const [mathProblem, setMathProblem] = React.useState({ q: "2 + 2", a: 4, options: [4, 5, 3, 6] })

  const generateMath = () => {
    const ops = ['+', '-', '*']
    const op = ops[Math.floor(Math.random() * ops.length)]
    let a: number, b: number, res: number
    if (op === '*') {
      a = Math.floor(Math.random() * 30) + 11
      b = Math.floor(Math.random() * 30) + 11
    } else {
      a = Math.floor(Math.random() * 900) + 100
      b = Math.floor(Math.random() * 800) + 50
    }
    res = op === '+' ? a + b : op === '-' ? a - b : a * b

    const wrongOptions = new Set<number>()
    while (wrongOptions.size < 3) {
      const offset = Math.floor(Math.random() * 60) - 30
      const wrongVal = res + (offset === 0 ? 17 : offset)
      if (wrongVal !== res && wrongVal > 0) wrongOptions.add(wrongVal)
    }
    setMathProblem({ q: `${a} ${op === '*' ? '×' : op} ${b}`, a: res, options: shuffleArray([res, ...Array.from(wrongOptions)]) })
  }

  const handleMathAnswer = (val: number) => {
    if (val === mathProblem.a) {
      setScore(s => s + 1)
      const earned = addCoins(5)
      toast({ title: "Вірно!", description: `+${earned} монет` })
    } else {
      toast({ title: "Помилка!", variant: "destructive" })
    }
    generateMath()
  }

  // ─── MEMORY ────
  const [memorySequence, setMemorySequence] = React.useState<number[]>([])
  const [userSequence, setUserSequence] = React.useState<number[]>([])
  const [isShowingSequence, setIsShowingSequence] = React.useState(false)

  const generateSequence = (length: number) => {
    const newSeq = Array.from({ length }, () => Math.floor(Math.random() * 16) + 1)
    setMemorySequence(newSeq)
    setUserSequence([])
    setIsShowingSequence(true)
    setTimeout(() => setIsShowingSequence(false), 1000 + (length * 300))
  }

  const handleMemoryInput = (num: number) => {
    if (isShowingSequence) return
    const newSeq = [...userSequence, num]
    setUserSequence(newSeq)
    if (newSeq[newSeq.length - 1] !== memorySequence[newSeq.length - 1]) {
      toast({ title: "Fail!", description: `Рахунок: ${score}`, variant: "destructive" })
      exitGame()
      return
    }
    if (newSeq.length === memorySequence.length) {
      setScore(s => s + 1)
      const earned = addCoins(30)
      toast({ title: "Чудово!", description: `+${earned} монет` })
      setTimeout(() => generateSequence(memorySequence.length + 1), 800)
    }
  }

  // ─── CLICKER ────
  const [clickerCount, setClickerCount] = React.useState(0)
  const [isBlocked, setIsBlocked] = React.useState(false)
  const lastClickRef = React.useRef<number>(0)

  const handleClick = () => {
    if (isBlocked) return
    const now = Date.now()
    if (lastClickRef.current !== 0 && now - lastClickRef.current < 50) {
      setIsBlocked(true)
      toast({ title: "Стоп!", description: "Занадто швидко!", variant: "destructive" })
      setTimeout(() => setIsBlocked(false), 5000)
      return
    }
    lastClickRef.current = now
    setClickerCount(prev => prev + 1)
    if ((clickerCount + 1) % 30 === 0) addCoins(1)
  }

  // ─── REACTION ────
  const [reactionState, setReactionState] = React.useState<'waiting' | 'ready' | 'go' | 'result'>('waiting')
  const [reactionTime, setReactionTime] = React.useState(0)
  const [reactionBest, setReactionBest] = React.useState(9999)
  const reactionStartRef = React.useRef(0)
  const reactionTimerRef = React.useRef<any>(null)

  const startReaction = () => {
    setReactionState('ready')
    const delay = 1500 + Math.random() * 4000
    reactionTimerRef.current = setTimeout(() => {
      reactionStartRef.current = Date.now()
      setReactionState('go')
    }, delay)
  }

  const handleReactionClick = () => {
    if (reactionState === 'ready') {
      clearTimeout(reactionTimerRef.current)
      setReactionState('waiting')
      toast({ title: "Рано!", description: "Чекайте зелений!", variant: "destructive" })
      return
    }
    if (reactionState === 'go') {
      const time = Date.now() - reactionStartRef.current
      setReactionTime(time)
      setReactionState('result')
      if (time < reactionBest) setReactionBest(time)
      if (time < 300) {
        const earned = addCoins(20)
        toast({ title: `${time}мс — Блискавка!`, description: `+${earned} монет` })
        setScore(s => s + 1)
      } else if (time < 500) {
        const earned = addCoins(10)
        toast({ title: `${time}мс — Швидко!`, description: `+${earned} монет` })
        setScore(s => s + 1)
      } else {
        toast({ title: `${time}мс`, description: "Спробуй швидше!" })
      }
    }
  }

  // ─── COLOR MATCH ────
  const [colorWord, setColorWord] = React.useState({ text: "ЧЕРВОНИЙ", displayColor: "text-blue-500", correctColor: "СИНІЙ" })
  const [colorOptions, setColorOptions] = React.useState<string[]>([])
  const [colorStreak, setColorStreak] = React.useState(0)
  const [colorTimeLeft, setColorTimeLeft] = React.useState(30)
  const colorTimerRef = React.useRef<any>(null)

  const generateColorRound = () => {
    const wordEntry = COLORS[Math.floor(Math.random() * COLORS.length)]
    let colorEntry: typeof COLORS[0]
    do {
      colorEntry = COLORS[Math.floor(Math.random() * COLORS.length)]
    } while (colorEntry.name === wordEntry.name)

    const correctAnswer = colorEntry.name
    const wrongAnswers = new Set<string>()
    while (wrongAnswers.size < 2) {
      const r = COLORS[Math.floor(Math.random() * COLORS.length)]
      if (r.name !== correctAnswer) wrongAnswers.add(r.name)
    }
    setColorWord({ text: wordEntry.name, displayColor: colorEntry.color, correctColor: correctAnswer })
    setColorOptions(shuffleArray([correctAnswer, ...Array.from(wrongAnswers)]))
  }

  const startColorMatch = () => {
    setColorStreak(0)
    setColorTimeLeft(30)
    setScore(0)
    generateColorRound()
    clearInterval(colorTimerRef.current)
    colorTimerRef.current = setInterval(() => {
      setColorTimeLeft(t => {
        if (t <= 1) {
          clearInterval(colorTimerRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  React.useEffect(() => {
    if (colorTimeLeft === 0 && activeGame === 'colorMatch') {
      const earned = addCoins(score * 3)
      toast({ title: "Час вийшов!", description: `Рахунок: ${score} • +${earned} монет` })
    }
  }, [colorTimeLeft])

  React.useEffect(() => {
    return () => {
      clearInterval(colorTimerRef.current)
      clearTimeout(reactionTimerRef.current)
    }
  }, [])

  const handleColorAnswer = (answer: string) => {
    if (colorTimeLeft <= 0) return
    if (answer === colorWord.correctColor) {
      setScore(s => s + 1)
      setColorStreak(s => s + 1)
      generateColorRound()
    } else {
      setColorStreak(0)
      toast({ title: "Ні!", variant: "destructive" })
      generateColorRound()
    }
  }

  // ─── WORD SCRAMBLE ────
  const [scrambledWord, setScrambledWord] = React.useState("")
  const [originalWord, setOriginalWord] = React.useState("")
  const [wordInput, setWordInput] = React.useState("")

  const generateWord = () => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)]
    setOriginalWord(word)
    let scrambled = word
    let attempts = 0
    do {
      scrambled = shuffleArray(word.split('')).join('')
      attempts++
    } while (scrambled === word && attempts < 20)
    setScrambledWord(scrambled)
    setWordInput("")
  }

  const checkWord = () => {
    if (wordInput.toUpperCase().trim() === originalWord) {
      setScore(s => s + 1)
      const earned = addCoins(15)
      toast({ title: "Правильно!", description: `+${earned} монет` })
      generateWord()
    } else {
      toast({ title: "Неправильно", variant: "destructive" })
    }
  }

  // ─── 21 (BLACKJACK LITE) ────
  const [bjCards, setBjCards] = React.useState<number[]>([])
  const [bjDealerCards, setBjDealerCards] = React.useState<number[]>([])
  const [bjGameOver, setBjGameOver] = React.useState(false)
  const [bjBet] = React.useState(50)

  const drawCard = () => Math.floor(Math.random() * 10) + 2
  const sumCards = (cards: number[]) => cards.reduce((a, b) => a + b, 0)

  const startBlackjack = () => {
    setBjCards([drawCard(), drawCard()])
    setBjDealerCards([drawCard()])
    setBjGameOver(false)
  }

  const bjHit = () => {
    const newCards = [...bjCards, drawCard()]
    setBjCards(newCards)
    if (sumCards(newCards) > 21) {
      setBjGameOver(true)
      toast({ title: "Перебір!", description: `${sumCards(newCards)} — програш`, variant: "destructive" })
    }
  }

  const bjStand = () => {
    let dealer = [...bjDealerCards]
    while (sumCards(dealer) < 17) dealer.push(drawCard())
    setBjDealerCards(dealer)
    setBjGameOver(true)

    const playerSum = sumCards(bjCards)
    const dealerSum = sumCards(dealer)
    if (dealerSum > 21 || playerSum > dealerSum) {
      const earned = addCoins(bjBet)
      setScore(s => s + 1)
      toast({ title: "Перемога!", description: `+${earned} монет` })
    } else if (playerSum === dealerSum) {
      toast({ title: "Нічия" })
    } else {
      toast({ title: "Програш", description: `Дилер: ${dealerSum}`, variant: "destructive" })
    }
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-reveal pb-32">
      <header className="flex items-center justify-between gap-3 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="size-10 sm:size-12 rounded-xl bg-white/5" onClick={exitGame}>
            <ChevronLeft className="size-5 sm:size-6 text-white" />
          </Button>
          <div>
            <h1 className="font-headline text-xl sm:text-2xl md:text-4xl font-bold text-white">Зона <span className="text-primary text-glow">Ігор</span></h1>
            <p className="text-muted-foreground text-[10px] sm:text-xs uppercase font-black tracking-widest">
              {activeGame !== 'none' ? `Рахунок: ${score}` : "Розважайся з розумом"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 px-3 sm:px-6 py-2 sm:py-3 rounded-2xl shrink-0">
          <Coins className="size-4 sm:size-5 text-yellow-500" />
          <span className="font-black text-white text-base sm:text-lg">{isOwner ? "∞" : (profile?.coins || 0)}</span>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {/* ─── GAME SELECT ──── */}
        {activeGame === 'none' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          >
            <GameCard title="Математика" desc="Складні приклади на швидкість." icon={<Zap className="size-7 text-blue-400" />}
              onPlay={() => { setActiveGame('math'); generateMath(); setScore(0) }} tags={["Math", "+5"]} />

            <GameCard title="Memory 4×4" desc="Запам'ятай і повтори послідовність чисел." icon={<Binary className="size-7 text-indigo-400" />}
              onPlay={() => { setActiveGame('memory'); generateSequence(2); setScore(0) }} tags={["Hardcore", "+30"]} />

            <GameCard title="Клікер" desc="Фарми монети швидкими кліками." icon={<MousePointer2 className="size-7 text-primary" />}
              onPlay={() => { setActiveGame('clicker'); setClickerCount(0) }} tags={["Farm", "+1/30"]} />

            <GameCard title="Реакція" desc="Натисни як тільки екран стане зеленим." icon={<Timer className="size-7 text-green-400" />}
              onPlay={() => { setActiveGame('reaction'); setScore(0); setReactionBest(9999); startReaction() }} tags={["Speed", "+20"]} />

            <GameCard title="Колір ≠ Слово" desc="Назви колір тексту, ігноруючи написане слово. 30 сек." icon={<Palette className="size-7 text-rose-400" />}
              onPlay={() => { setActiveGame('colorMatch'); startColorMatch() }} tags={["Brain", "+3/шт"]} />

            <GameCard title="Анаграма" desc="Розшифруй перемішане слово зі шкільної тематики." icon={<Type className="size-7 text-amber-400" />}
              onPlay={() => { setActiveGame('wordScramble'); generateWord(); setScore(0) }} tags={["Words", "+15"]} />

            <GameCard title="Двадцять Одне" desc="Набери 21, але не більше. Обіграй дилера!" icon={<Target className="size-7 text-emerald-400" />}
              onPlay={() => { setActiveGame('twentyOne'); startBlackjack(); setScore(0) }} tags={["Cards", "+50"]} />
          </motion.div>
        )}

        {/* ─── MATH ──── */}
        {activeGame === 'math' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-panel max-w-2xl mx-auto p-8 sm:p-12 text-center space-y-8 border-0 rounded-[2.5rem]">
              <div className="text-4xl sm:text-6xl font-black text-white italic drop-shadow-2xl">{mathProblem.q} = ?</div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-sm mx-auto">
                {mathProblem.options.map((v, i) => (
                  <Button key={i} className="h-16 sm:h-20 text-2xl sm:text-3xl font-black rounded-2xl bg-white/5 border border-white/10 hover:bg-primary/20 hover:border-primary/40 transition-all active:scale-95" onClick={() => handleMathAnswer(v)}>{v}</Button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">Правильних: {score}</p>
            </Card>
          </motion.div>
        )}

        {/* ─── MEMORY ──── */}
        {activeGame === 'memory' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-panel max-w-2xl mx-auto p-8 sm:p-12 text-center space-y-6 border-0 rounded-[2.5rem]">
              <div className="min-h-20 flex flex-wrap items-center justify-center gap-3">
                {isShowingSequence ? memorySequence.map((n, i) => (
                  <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.15 }}
                    className="size-14 rounded-2xl cyber-gradient flex items-center justify-center text-xl font-black text-white">{n}</motion.div>
                )) : <div className="text-xl font-bold text-white/50 uppercase tracking-widest">Повторіть послідовність!</div>}
              </div>
              <div className="text-xs text-muted-foreground">Введено: {userSequence.length} / {memorySequence.length}</div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-sm mx-auto">
                {Array.from({ length: 16 }, (_, i) => i + 1).map(n => (
                  <Button key={n} disabled={isShowingSequence}
                    className={cn("h-12 sm:h-14 text-lg font-black rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 transition-all active:scale-90",
                      userSequence.includes(n) && "bg-primary/20 border-primary/40")}
                    onClick={() => handleMemoryInput(n)}>{n}</Button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── CLICKER ──── */}
        {activeGame === 'clicker' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-panel max-w-lg mx-auto p-8 sm:p-12 text-center space-y-8 border-0 rounded-[2.5rem] relative overflow-hidden">
              {isBlocked && (
                <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-10">
                  <AlertTriangle className="size-16 text-destructive animate-bounce" />
                  <p className="text-xl font-black text-white uppercase mt-4">Антибот: 5 сек</p>
                </div>
              )}
              <button disabled={isBlocked} className="size-48 sm:size-60 rounded-full cyber-gradient mx-auto flex items-center justify-center active:scale-95 transition-all text-6xl sm:text-7xl font-black text-white border-8 border-white/10" onClick={handleClick}>
                12+
              </button>
              <div className="flex items-center justify-center gap-4 bg-white/5 px-6 py-4 rounded-2xl border border-white/[0.06] text-white">
                <Coins className="size-6 text-yellow-500" />
                <span className="text-4xl sm:text-5xl font-black">{clickerCount}</span>
                <span className="text-xs text-muted-foreground ml-2">= {Math.floor(clickerCount / 30)} монет</span>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── REACTION ──── */}
        {activeGame === 'reaction' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-panel max-w-2xl mx-auto border-0 rounded-[2.5rem] overflow-hidden">
              <button
                className={cn(
                  "w-full h-[50vh] sm:h-[60vh] flex flex-col items-center justify-center transition-colors duration-200 gap-4",
                  reactionState === 'waiting' && "bg-white/[0.02]",
                  reactionState === 'ready' && "bg-red-500/20",
                  reactionState === 'go' && "bg-green-500/20",
                  reactionState === 'result' && "bg-white/[0.02]",
                )}
                onClick={() => {
                  if (reactionState === 'waiting') startReaction()
                  else if (reactionState === 'ready' || reactionState === 'go') handleReactionClick()
                  else if (reactionState === 'result') startReaction()
                }}
              >
                {reactionState === 'waiting' && (
                  <>
                    <Target className="size-16 text-primary" />
                    <p className="text-2xl font-bold text-white">Натисни щоб почати</p>
                  </>
                )}
                {reactionState === 'ready' && (
                  <>
                    <div className="size-20 rounded-full bg-red-500/30 border-4 border-red-500/50 animate-pulse" />
                    <p className="text-xl font-bold text-red-400">Чекай...</p>
                  </>
                )}
                {reactionState === 'go' && (
                  <>
                    <div className="size-20 rounded-full bg-green-500/30 border-4 border-green-500/50" />
                    <p className="text-2xl font-black text-green-400 uppercase">ТИСНИ!</p>
                  </>
                )}
                {reactionState === 'result' && (
                  <>
                    <p className="text-6xl font-black text-white">{reactionTime}<span className="text-2xl text-muted-foreground">мс</span></p>
                    <p className="text-sm text-muted-foreground">Рекорд: {reactionBest < 9999 ? `${reactionBest}мс` : '—'}</p>
                    <p className="text-xs text-primary mt-2">Натисни для нового раунду</p>
                  </>
                )}
              </button>
            </Card>
          </motion.div>
        )}

        {/* ─── COLOR MATCH ──── */}
        {activeGame === 'colorMatch' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-panel max-w-lg mx-auto p-8 sm:p-12 text-center space-y-8 border-0 rounded-[2.5rem]">
              <div className="flex items-center justify-between">
                <Badge className="bg-white/5 border-white/10 text-white font-black text-sm px-3 py-1">
                  <Timer className="size-4 mr-1.5 text-primary" /> {colorTimeLeft}с
                </Badge>
                <Badge className="bg-primary/10 border-primary/20 text-primary font-black text-sm px-3 py-1">
                  {score} очок
                </Badge>
              </div>

              {colorTimeLeft > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">Який КОЛІР тексту?</p>
                  <div className={cn("text-5xl sm:text-6xl font-black uppercase", colorWord.displayColor)}>
                    {colorWord.text}
                  </div>
                  {colorStreak >= 3 && <p className="text-xs text-amber-400 font-black">Серія: {colorStreak}!</p>}
                  <div className="grid grid-cols-3 gap-3">
                    {colorOptions.map(opt => (
                      <Button key={opt} className="h-14 font-black text-sm rounded-xl bg-white/5 border border-white/10 hover:bg-primary/20 transition-all active:scale-95" onClick={() => handleColorAnswer(opt)}>
                        {opt}
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="space-y-4 py-8">
                  <p className="text-4xl font-black text-white">{score}</p>
                  <p className="text-muted-foreground text-sm">правильних відповідей</p>
                  <Button className="cyber-gradient rounded-xl h-12 px-8 font-black" onClick={startColorMatch}>
                    Ще раз
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ─── WORD SCRAMBLE ──── */}
        {activeGame === 'wordScramble' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-panel max-w-lg mx-auto p-8 sm:p-12 text-center space-y-8 border-0 rounded-[2.5rem]">
              <p className="text-xs text-muted-foreground uppercase font-black tracking-widest">Розшифруй слово</p>
              <div className="flex items-center justify-center gap-2">
                {scrambledWord.split('').map((ch, i) => (
                  <motion.div key={i} initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: i * 0.05 }}
                    className="size-12 sm:size-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xl sm:text-2xl font-black text-white">
                    {ch}
                  </motion.div>
                ))}
              </div>
              <div className="flex gap-2 max-w-xs mx-auto">
                <input
                  value={wordInput}
                  onChange={e => setWordInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && checkWord()}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-lg font-bold text-white uppercase placeholder:text-white/20 focus:outline-none focus:border-primary/40"
                  placeholder="Відповідь..."
                  autoFocus
                />
                <Button className="cyber-gradient rounded-xl h-12 px-5 font-black" onClick={checkWord}>OK</Button>
              </div>
              <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                <span>Вгадано: {score}</span>
                <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={generateWord}>
                  <Shuffle className="size-3 mr-1" /> Пропустити
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── 21 (BLACKJACK) ──── */}
        {activeGame === 'twentyOne' && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-panel max-w-lg mx-auto p-8 sm:p-12 text-center space-y-8 border-0 rounded-[2.5rem]">
              {/* Dealer */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Дилер {bjGameOver ? `• ${sumCards(bjDealerCards)}` : ''}</p>
                <div className="flex items-center justify-center gap-2">
                  {bjDealerCards.map((c, i) => (
                    <div key={i} className="size-14 sm:size-16 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xl font-black text-red-400">{c}</div>
                  ))}
                  {!bjGameOver && <div className="size-14 sm:size-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-black text-white/20">?</div>}
                </div>
              </div>

              <div className="h-px bg-white/5" />

              {/* Player */}
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ви • {sumCards(bjCards)}</p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {bjCards.map((c, i) => (
                    <motion.div key={i} initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
                      className={cn("size-14 sm:size-16 rounded-xl border flex items-center justify-center text-xl font-black",
                        sumCards(bjCards) > 21 ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-primary/10 border-primary/20 text-primary"
                      )}>{c}</motion.div>
                  ))}
                </div>
              </div>

              {!bjGameOver ? (
                <div className="flex gap-3 justify-center">
                  <Button className="h-14 px-8 rounded-xl bg-white/5 border border-white/10 font-black text-base hover:bg-primary/20 transition-all" onClick={bjHit}>
                    Ще
                  </Button>
                  <Button className="h-14 px-8 rounded-xl cyber-gradient font-black text-base" onClick={bjStand}>
                    Стоп
                  </Button>
                </div>
              ) : (
                <Button className="cyber-gradient rounded-xl h-12 px-8 font-black" onClick={startBlackjack}>
                  Нова гра
                </Button>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GameCard({ title, desc, icon, onPlay, tags, disabled }: { title: string; desc: string; icon: React.ReactNode; onPlay: () => void; tags: string[]; disabled?: boolean }) {
  return (
    <div className={cn("glass-panel flex flex-col p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] h-full group overflow-hidden transition-all", disabled && "opacity-50 grayscale")}>
      <div className="size-12 sm:size-14 rounded-xl bg-white/5 border border-white/[0.06] flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="font-headline text-lg sm:text-xl text-white font-bold mb-1.5 uppercase">{title}</h3>
      <p className="text-muted-foreground mb-4 sm:mb-6 text-xs leading-relaxed flex-1 opacity-70">{desc}</p>
      <div className="flex flex-wrap gap-1.5 mb-4 sm:mb-6">{tags.map(tag => <Badge key={tag} variant="outline" className="text-[8px] sm:text-[9px] uppercase font-black px-2 bg-white/[0.03] border-white/[0.06]">{tag}</Badge>)}</div>
      <Button disabled={disabled} className="w-full h-11 sm:h-12 rounded-xl cyber-gradient text-white font-black uppercase tracking-widest text-xs" onClick={onPlay}>
        {disabled ? "ЗАКРИТО" : "ГРАТИ"}
      </Button>
    </div>
  )
}
