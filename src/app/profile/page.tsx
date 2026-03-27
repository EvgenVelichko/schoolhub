"use client"

import * as React from "react"
import {
  User,
  Trophy,
  Star,
  Coins,
  Edit3,
  Loader2,
  Camera,
  Crown,
  Flame,
  Zap,
  GraduationCap,
  Gem,
  Ghost,
  Monitor,
  Target,
  ShoppingCart,
  Sunrise,
  BookOpen,
  Award,
  Music,
  Swords,
  HeartPulse,
  Sparkles,
  Cloudy,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useUser, useFirestore, useDoc } from "@/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const MATRIX_CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF"

function MatrixRain() {
  const columns = React.useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: `${(i / 12) * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${3 + Math.random() * 4}s`,
      chars: Array.from({ length: 20 }, () => MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]).join('\n')
    }))
  }, [])

  return (
    <div className="matrix-rain">
      {columns.map(col => (
        <div
          key={col.id}
          className="matrix-column"
          style={{
            left: col.left,
            animationDelay: col.delay,
            animationDuration: col.duration
          }}
        >
          {col.chars}
        </div>
      ))}
    </div>
  )
}

function SnowEffect() {
  const flakes = React.useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${4 + Math.random() * 6}s`,
      size: `${8 + Math.random() * 8}px`,
    })), [])
  return (
    <div className="snow-container">
      {flakes.map(f => (
        <div key={f.id} className="snowflake" style={{ left: f.left, animationDelay: f.delay, animationDuration: f.duration, fontSize: f.size }}>❄</div>
      ))}
    </div>
  )
}

function MagicParticles() {
  const particles = React.useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${2 + Math.random() * 3}s`,
      size: `${3 + Math.random() * 4}px`,
    })), [])
  return (
    <div className="particles-container">
      {particles.map(p => (
        <div key={p.id} className="particle" style={{ left: p.left, top: p.top, animationDelay: p.delay, animationDuration: p.duration, width: p.size, height: p.size }} />
      ))}
    </div>
  )
}

function CloudBg() {
  const clouds = React.useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      top: `${10 + Math.random() * 60}%`,
      width: `${120 + Math.random() * 160}px`,
      height: `${60 + Math.random() * 80}px`,
      delay: `${i * 3 + Math.random() * 2}s`,
      duration: `${15 + Math.random() * 10}s`,
    })), [])
  return (
    <div className="cloud-container">
      {clouds.map(c => (
        <div key={c.id} className="cloud" style={{ top: c.top, width: c.width, height: c.height, animationDelay: c.delay, animationDuration: c.duration }} />
      ))}
    </div>
  )
}

const allAchievements = [
  { id: 'smart_lazy', label: 'Кмітливий', icon: <Zap className="size-3.5" />, color: 'emerald' },
  { id: 'rich_student', label: 'Багатій', icon: <Coins className="size-3.5" />, color: 'yellow' },
  { id: 'night_owl', label: 'Нічна сова', icon: <Star className="size-3.5" />, color: 'purple' },
  { id: 'first_sync', label: 'Перший синк', icon: <Sunrise className="size-3.5" />, color: 'sky' },
  { id: 'top_student', label: 'Відмінник', icon: <Award className="size-3.5" />, color: 'amber' },
  { id: 'shopaholic', label: 'Шопоголік', icon: <ShoppingCart className="size-3.5" />, color: 'pink' },
  { id: 'game_master', label: 'Геймер', icon: <Target className="size-3.5" />, color: 'indigo' },
  { id: 'bookworm', label: 'Книголюб', icon: <BookOpen className="size-3.5" />, color: 'teal' },
  { id: 'vip_status', label: 'VIP', icon: <Crown className="size-3.5" />, color: 'indigo' },
  { id: 'fire_title', label: 'Легенда', icon: <Flame className="size-3.5" />, color: 'red' },
  { id: 'matrix_hacker', label: 'Хакер', icon: <Monitor className="size-3.5" />, color: 'green' },
  { id: 'ghost_walker', label: 'Привид', icon: <Ghost className="size-3.5" />, color: 'slate' },
]

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  yellow: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  sky: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  amber: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  pink: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  teal: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
  red: 'bg-red-500/15 text-red-500 border-red-500/30',
  green: 'bg-green-500/15 text-green-400 border-green-500/30',
  slate: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

const lockedColor = 'bg-white/[0.03] text-muted-foreground/40 border-white/5'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser()
  const db = useFirestore()

  const userDocRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile, loading: profileLoading } = useDoc(userDocRef)

  const [isEditing, setIsEditing] = React.useState(false)
  const [editedName, setEditedName] = React.useState("")
  const [editedBio, setEditedBio] = React.useState("")

  React.useEffect(() => {
    if (profile) {
      setEditedName(profile.displayName || "")
      setEditedBio(profile.bio || "")
    }
  }, [profile])

  const handleUpdateProfile = async () => {
    if (!userDocRef) return
    try {
      await updateDoc(userDocRef, {
        displayName: editedName,
        bio: editedBio
      })
      setIsEditing(false)
      toast({ title: "Профіль оновлено", description: "Ваші зміни успішно збережені." })
    } catch (e) {
      toast({ title: "Помилка", description: "Не вдалося оновити профіль.", variant: "destructive" })
    }
  }

  if (profileLoading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary size-12" /></div>

  if (!user || !profile) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
        <p>Будь ласка, увійдіть в систему.</p>
        <Button className="cyber-gradient border-0" onClick={() => router.push("/auth")}>
          Перейти до входу
        </Button>
      </div>
    )
  }

  const isOwner = profile?.role === 'owner';
  const hasAura = profile?.purchasedItems?.includes('aura_gold') || isOwner;
  const hasRainbowAura = profile?.purchasedItems?.includes('aura_rainbow') || isOwner;
  const hasVIP = profile?.purchasedItems?.includes('vip_status') || isOwner;
  const hasFire = profile?.purchasedItems?.includes('fire_title') || isOwner;
  const hasBoost = profile?.purchasedItems?.includes('xp_boost') || isOwner;
  const hasNeon = profile?.purchasedItems?.includes('neon_name') || isOwner;
  const hasProfessor = profile?.purchasedItems?.includes('professor_badge') || isOwner;
  const hasDiamond = profile?.purchasedItems?.includes('diamond_badge') || isOwner;
  const hasMatrix = profile?.purchasedItems?.includes('matrix_effect') || isOwner;
  const hasGhost = profile?.purchasedItems?.includes('ghost_mode') || isOwner;
  const hasGoldenFrame = profile?.purchasedItems?.includes('golden_frame') || isOwner;
  const hasSnow = profile?.purchasedItems?.includes('snow_effect') || isOwner;
  const hasMusicBadge = profile?.purchasedItems?.includes('music_badge') || isOwner;
  const hasBattleTitle = profile?.purchasedItems?.includes('battle_title') || isOwner;
  const hasHpBar = profile?.purchasedItems?.includes('hp_bar') || isOwner;
  const hasChampionCrown = profile?.purchasedItems?.includes('champion_crown') || isOwner;
  const hasMagicParticles = profile?.purchasedItems?.includes('magic_particles') || isOwner;
  const hasCloudBg = profile?.purchasedItems?.includes('cloud_bg') || isOwner;
  const hasCustomTheme = profile?.purchasedItems?.includes('custom_theme') || isOwner;
  const hasStealthMode = profile?.purchasedItems?.includes('stealth_mode') || isOwner;

  const userAchievements = profile?.achievements || [];
  const purchasedItems = profile?.purchasedItems || [];

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-reveal pb-32 overflow-x-hidden">
      <div className="relative">
        <div className={cn(
          "h-40 sm:h-48 md:h-72 rounded-[2rem] sm:rounded-[2.5rem] relative overflow-hidden transition-all duration-700",
          hasMatrix ? "bg-gradient-to-br from-black via-green-950 to-black" :
          hasFire ? "bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500" :
          hasCustomTheme ? "bg-gradient-to-br from-fuchsia-600 via-violet-500 to-cyan-500" :
          hasCloudBg ? "bg-gradient-to-br from-slate-800 via-blue-900 to-slate-800" : "cyber-gradient"
        )}>
          {hasMatrix && <MatrixRain />}
          {hasFire && !hasMatrix && <div className="absolute inset-0 flex items-center justify-center opacity-20"><Flame className="size-32 sm:size-48 md:size-64 text-white animate-pulse" /></div>}
          {hasSnow && <SnowEffect />}
          {hasMagicParticles && <MagicParticles />}
          {hasCloudBg && !hasMatrix && <CloudBg />}
          <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px] z-[2]" />
          <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex gap-2 z-20">
             <Button variant="secondary" className="bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md rounded-xl sm:rounded-2xl h-9 sm:h-12 px-3 sm:px-6 font-bold text-xs sm:text-sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit3 className="size-3.5 sm:size-4 mr-1.5 sm:mr-2" /> {isEditing ? "Скасувати" : "Редагувати"}
             </Button>
          </div>
        </div>

        <div className="px-4 sm:px-6 md:px-12 -mt-16 sm:-mt-20 md:-mt-24 relative z-10 flex flex-col md:flex-row items-center md:items-end gap-4 sm:gap-8 text-center md:text-left">
          <div className={cn("relative group shrink-0", hasGhost && "ghost-shimmer", hasGoldenFrame && "golden-frame rounded-full")}>
            <Avatar className={cn(
              "size-28 sm:size-40 md:size-52 border-[6px] sm:border-[8px] border-[#0c0805] transition-all duration-500",
              hasAura && "ring-4 ring-yellow-500 ring-offset-4 ring-offset-[#0c0805]",
              hasRainbowAura && "aura-rainbow",
              hasGhost && "opacity-80"
            )}>
              <AvatarImage src={profile.photoURL} className="object-cover" />
              <AvatarFallback className="text-4xl sm:text-6xl bg-primary/20 text-primary font-bold">{profile.displayName?.[0]}</AvatarFallback>
            </Avatar>
            {isEditing && (
              <button className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="size-8 sm:size-10" />
              </button>
            )}
            {hasGhost && (
              <div className="absolute -bottom-1 -right-1 size-8 sm:size-10 rounded-full bg-slate-800 border-2 border-[#0c0805] flex items-center justify-center">
                <Ghost className="size-4 sm:size-5 text-slate-400" />
              </div>
            )}
            {hasHpBar && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-[80%] hp-bar">
                <div className="hp-bar-fill" style={{ width: `${Math.min(((profile.level || 1) / 12) * 100, 100)}%` }} />
              </div>
            )}
          </div>
          <div className="flex-1 pb-2 sm:pb-4 md:pb-6 space-y-3 sm:space-y-4 min-w-0">
             <div className="flex flex-col md:flex-row md:items-center gap-2 sm:gap-4 justify-center md:justify-start">
               <h1 className={cn(
                 "text-2xl sm:text-4xl md:text-5xl font-headline font-bold text-white tracking-tighter leading-none px-1",
                 hasNeon && "neon-text-orange",
                 hasGhost && "ghost-text"
               )}>
                 {profile.displayName}
               </h1>
               <div className="flex items-center gap-2 sm:gap-3 justify-center md:justify-start flex-wrap">
                  {hasChampionCrown && <Crown className="size-8 sm:size-12 text-yellow-400 champion-crown" />}
                  {(hasVIP || isOwner) && !hasChampionCrown && <Crown className="size-7 sm:size-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]" />}
                  {hasProfessor && <GraduationCap className="size-7 sm:size-10 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]" />}
                  {hasDiamond && <Gem className="size-7 sm:size-10 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" />}
                  {hasMusicBadge && <Music className="size-6 sm:size-8 text-violet-400 music-note" />}
                  {hasGhost && <Ghost className="size-7 sm:size-10 text-slate-400 drop-shadow-[0_0_15px_rgba(148,163,184,0.4)]" />}
               </div>
             </div>

             <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-4">
                <Badge className={cn("border-0 px-4 sm:px-6 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-xl", isOwner ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black" : hasFire ? "bg-red-500" : "cyber-gradient")}>
                  {isOwner ? "OWNER" : hasFire ? "LEGEND ON FIRE" : (profile.gradeLevel || "Школяр")}
                </Badge>
                <div className="flex items-center gap-2 sm:gap-4 bg-white/5 border border-white/10 px-3 sm:px-6 py-1.5 sm:py-2 rounded-xl backdrop-blur-md">
                  <span className="text-white font-black uppercase text-[9px] sm:text-[10px] tracking-widest">LV {profile.level}</span>
                  <div className="size-1 sm:size-1.5 bg-white/20 rounded-full" />
                  <span className="text-primary font-black uppercase text-[9px] sm:text-[10px] tracking-widest">{profile.xp || 0} XP</span>
                </div>
                {hasBoost && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 gap-1.5 sm:gap-2 h-8 sm:h-10 px-3 sm:px-4 rounded-xl font-black uppercase text-[8px] sm:text-[9px]"><Zap className="size-3 sm:size-3.5" /> 2X XP</Badge>}
                {hasBattleTitle && <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 gap-1.5 sm:gap-2 h-8 sm:h-10 px-3 sm:px-4 rounded-xl font-black uppercase text-[8px] sm:text-[9px]"><Swords className="size-3 sm:size-3.5" /> ВОЇН</Badge>}
                {hasStealthMode && <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 gap-1.5 sm:gap-2 h-8 sm:h-10 px-3 sm:px-4 rounded-xl font-black uppercase text-[8px] sm:text-[9px]">Офлайн</Badge>}
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 pt-4 sm:pt-6">
        <div className="space-y-4 sm:space-y-6">
           <Card className="glass-panel border-0 rounded-[2rem] sm:rounded-[2.5rem] p-3 sm:p-4">
              <CardHeader className="p-3 sm:p-6"><CardTitle className="text-lg sm:text-xl flex items-center gap-3 text-white"><Trophy className="size-5 sm:size-6 text-primary" /> Статистика</CardTitle></CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 p-3 sm:p-6 pt-0">
                 <StatItem icon={<Trophy className="text-yellow-500" />} label="XP" value={(profile.xp || 0).toLocaleString()} />
                 <StatItem icon={<Coins className="text-yellow-500" />} label="Монети" value={isOwner ? "∞" : (profile.coins || 0)} />
                 <StatItem icon={<Star className="text-primary" />} label="Статус" value={isOwner ? "Founder" : profile.academicStatus || "Новачок"} />
                 <StatItem icon={<Award className="text-emerald-400" />} label="Ачівки" value={`${userAchievements.length}/${allAchievements.length}`} />
              </CardContent>
           </Card>

           <Card className="glass-panel border-0 rounded-[2rem] sm:rounded-[2.5rem] p-3 sm:p-4">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle className="text-lg sm:text-xl text-white flex items-center gap-3">
                  <Award className="size-5 sm:size-6 text-primary" /> Досягнення
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 pt-0">
                <div className="flex flex-wrap gap-2">
                  {allAchievements.map((ach) => {
                    const isUnlocked = userAchievements.includes(ach.id) ||
                      (ach.id === 'vip_status' && (hasVIP || isOwner)) ||
                      (ach.id === 'fire_title' && (hasFire || isOwner)) ||
                      (ach.id === 'matrix_hacker' && (hasMatrix || isOwner)) ||
                      (ach.id === 'ghost_walker' && (hasGhost || isOwner)) ||
                      isOwner;
                    return (
                      <div
                        key={ach.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border transition-all",
                          isUnlocked ? colorMap[ach.color] : lockedColor
                        )}
                      >
                        <span className="shrink-0">{ach.icon}</span>
                        <span className={cn(
                          "text-[10px] sm:text-xs font-bold whitespace-nowrap",
                          !isUnlocked && "opacity-40"
                        )}>
                          {ach.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
           {isEditing ? (
             <Card className="glass-panel border-0 animate-in slide-in-from-top-4 rounded-[2rem] sm:rounded-[2.5rem]">
                <CardHeader className="p-6 sm:p-10 pb-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold text-white">Редагування профілю</CardTitle>
                  <CardDescription>Змініть те, як інші бачать ваш профіль у School Hub.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 sm:p-10 pt-4 space-y-4 sm:space-y-6">
                   <div className="space-y-2 sm:space-y-3">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">Ім'я відображення</label>
                      <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="bg-white/5 border-white/10 h-12 sm:h-16 rounded-xl sm:rounded-2xl text-base sm:text-lg focus:ring-primary/40 px-4 sm:px-6 text-white" />
                   </div>
                   <div className="space-y-2 sm:space-y-3">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">Про мене</label>
                      <Textarea value={editedBio} onChange={(e) => setEditedBio(e.target.value)} className="bg-white/5 border-white/10 min-h-[140px] sm:min-h-[180px] rounded-[1.5rem] sm:rounded-[2rem] text-white p-5 sm:p-8 text-base sm:text-lg focus:ring-primary/40 leading-relaxed" placeholder="Розкажіть про свої захоплення та досягнення..." />
                   </div>
                   <div className="flex gap-3 sm:gap-4 justify-end pt-4 sm:pt-6">
                      <Button variant="ghost" className="rounded-xl sm:rounded-2xl h-11 sm:h-14 px-6 sm:px-10 font-bold text-sm" onClick={() => setIsEditing(false)}>Скасувати</Button>
                      <Button className="cyber-gradient border-0 rounded-xl sm:rounded-2xl h-11 sm:h-14 px-8 sm:px-16 font-black uppercase text-[10px] sm:text-xs tracking-widest" onClick={handleUpdateProfile}>Зберегти</Button>
                   </div>
                </CardContent>
             </Card>
           ) : (
             <Card className="glass-panel border-0 rounded-[2rem] sm:rounded-[3rem]">
                <CardContent className="p-6 sm:p-12 space-y-6 sm:space-y-8">
                   <div className="space-y-3 sm:space-y-4">
                      <h3 className="text-xs font-black text-primary uppercase tracking-[0.4em]">Біографія</h3>
                      <p className="text-white/90 leading-relaxed text-base sm:text-xl font-medium italic">
                         {profile.bio || "Цей користувач ще не додав опис про себе."}
                      </p>
                   </div>

                   {purchasedItems.length > 0 && (
                     <div className="space-y-3 sm:space-y-4">
                       <h3 className="text-xs font-black text-primary uppercase tracking-[0.4em]">Колекція</h3>
                       <div className="flex flex-wrap gap-2">
                         {purchasedItems.map((itemId: string) => (
                           <Badge key={itemId} variant="outline" className="bg-white/5 border-white/10 text-white/70 text-[9px] sm:text-[10px] px-3 py-1 rounded-lg">
                             {itemId.replace(/_/g, ' ')}
                           </Badge>
                         ))}
                       </div>
                     </div>
                   )}
                </CardContent>
             </Card>
           )}
        </div>
      </div>
    </div>
  )
}

function StatItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group shadow-inner">
       <div className="size-9 sm:size-11 rounded-xl sm:rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
          {icon}
       </div>
       <span className="text-[9px] sm:text-[10px] text-muted-foreground font-black uppercase tracking-widest shrink-0">{label}</span>
       <span className="font-black text-sm sm:text-lg text-white italic drop-shadow-md ml-auto text-right truncate">{value}</span>
    </div>
  )
}
