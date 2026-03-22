"use client"

import * as React from "react"
import { 
  User, 
  Settings as SettingsIcon, 
  Users, 
  Trophy, 
  Star, 
  Coins, 
  Edit3, 
  MessageSquare, 
  UserPlus,
  Loader2,
  CheckCircle2,
  Camera,
  Crown,
  Flame,
  Zap,
  ChevronLeft,
  GraduationCap,
  Gem
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase"
import { doc, updateDoc, collection, setDoc, query, where, orderBy } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useUser()
  const db = useFirestore()
  
  const userDocRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile, loading: profileLoading } = useDoc(userDocRef)

  const friendsQuery = React.useMemo(() => (user ? collection(db, "users", user.uid, "friends") : null), [db, user])
  const { data: friends } = useCollection(friendsQuery)

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

  if (profileLoading) return <div className="h-screen flex items-center justify-center bg-[#0a0512]"><Loader2 className="animate-spin text-primary size-12" /></div>

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
  const hasStar = profile?.purchasedItems?.includes('star_badge') || isOwner;
  const hasBoost = profile?.purchasedItems?.includes('xp_boost') || isOwner;
  const hasNeon = profile?.purchasedItems?.includes('neon_name') || isOwner;
  const hasProfessor = profile?.purchasedItems?.includes('professor_badge') || isOwner;
  const hasDiamond = profile?.purchasedItems?.includes('diamond_badge') || isOwner;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 animate-reveal pb-32 overflow-x-hidden">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="rounded-2xl bg-white/5 hover:bg-white/10" onClick={() => router.back()}>
          <ChevronLeft className="size-6 text-white" />
        </Button>
        <h1 className="text-2xl font-headline font-bold text-white uppercase tracking-tight">Профіль</h1>
      </header>

      <div className="relative">
        <div className={cn(
          "h-48 md:h-72 rounded-[2.5rem] relative overflow-hidden transition-all duration-700 shadow-2xl",
          hasFire ? "bg-gradient-to-br from-red-600 via-orange-500 to-yellow-500" : "cyber-gradient"
        )}>
          {hasFire && <div className="absolute inset-0 flex items-center justify-center opacity-20"><Flame className="size-48 md:size-64 text-white animate-pulse" /></div>}
          <div className="absolute inset-0 bg-black/15 backdrop-blur-[1px]" />
          <div className="absolute top-6 right-6 flex gap-2 z-20">
             <Button variant="secondary" className="bg-white/10 hover:bg-white/20 border-white/10 text-white backdrop-blur-md rounded-2xl h-12 px-6 font-bold" onClick={() => setIsEditing(!isEditing)}>
                <Edit3 className="size-4 mr-2" /> {isEditing ? "Скасувати" : "Редагувати"}
             </Button>
          </div>
        </div>

        <div className="px-6 md:px-12 -mt-20 md:-mt-24 relative z-10 flex flex-col md:flex-row items-center md:items-end gap-8 text-center md:text-left">
          <div className="relative group shrink-0">
            <Avatar className={cn(
              "size-40 md:size-52 border-[8px] border-[#0c0805] shadow-2xl transition-all duration-500",
              hasAura && "ring-4 ring-yellow-500 ring-offset-4 ring-offset-[#0c0805]",
              hasRainbowAura && "aura-rainbow"
            )}>
              <AvatarImage src={profile.photoURL} className="object-cover" />
              <AvatarFallback className="text-6xl bg-primary/20 text-primary font-bold">{profile.displayName?.[0]}</AvatarFallback>
            </Avatar>
            {isEditing && (
              <button className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="size-10" />
              </button>
            )}
          </div>
          <div className="flex-1 pb-4 md:pb-6 space-y-4">
             <div className="flex flex-col md:flex-row md:items-center gap-4 justify-center md:justify-start">
               <h1 className={cn(
                 "text-4xl md:text-5xl font-headline font-bold text-white tracking-tighter leading-none px-1",
                 hasNeon && "neon-text-orange"
               )}>
                 {profile.displayName}
               </h1>
               <div className="flex items-center gap-3 justify-center md:justify-start">
                  {(hasVIP || isOwner) && <Crown className="size-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]" />}
                  {hasProfessor && <GraduationCap className="size-10 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.6)]" />}
                  {hasDiamond && <Gem className="size-10 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.6)]" />}
               </div>
             </div>

             <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <Badge className={cn("border-0 px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl shadow-lg", isOwner ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black" : hasFire ? "bg-red-500" : "cyber-gradient")}>
                  {isOwner ? "OWNER" : hasFire ? "LEGEND ON FIRE" : (profile.gradeLevel || "Школяр")}
                </Badge>
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-6 py-2 rounded-xl backdrop-blur-md">
                  <span className="text-white font-black uppercase text-[10px] tracking-widest">LV {profile.level}</span>
                  <div className="size-1.5 bg-white/20 rounded-full" />
                  <span className="text-primary font-black uppercase text-[10px] tracking-widest">{profile.xp || 0} XP</span>
                </div>
                {hasBoost && <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 gap-2 h-10 px-4 rounded-xl font-black uppercase text-[9px]"><Zap className="size-3.5" /> 2X XP ACTIVE</Badge>}
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
        <div className="space-y-6">
           <Card className="glass-panel border-0 rounded-[2.5rem] p-4 shadow-2xl">
              <CardHeader><CardTitle className="text-xl flex items-center gap-3 text-white"><Trophy className="size-6 text-primary" /> Статистика</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                 <StatItem icon={<Trophy className="text-yellow-500" />} label="Рейтинг XP" value={(profile.xp || 0).toLocaleString()} />
                 <StatItem icon={<Coins className="text-yellow-500" />} label="Монети" value={isOwner ? "∞" : (profile.coins || 0)} />
                 <StatItem icon={<Star className="text-primary" />} label="Статус" value={isOwner ? "Founder" : profile.academicStatus || "Новачок"} />
                 <StatItem icon={<Users className="text-blue-500" />} label="Друзі" value={friends?.length || 0} />
              </CardContent>
           </Card>

           <Card className="glass-panel border-0 rounded-[2.5rem] p-4 shadow-2xl">
              <CardHeader><CardTitle className="text-xl text-white">Досягнення</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                 {(profile?.achievements?.includes('smart_lazy') || isOwner) && <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 rounded-xl px-4 py-1.5 font-bold">Кмітливий, але лінивий</Badge>}
                 {(profile?.achievements?.includes('rich_student') || isOwner) && <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 rounded-xl px-4 py-1.5 font-bold">Багатий учень</Badge>}
                 {(profile?.achievements?.includes('night_owl') || isOwner) && <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 rounded-xl px-4 py-1.5 font-bold">Нічна сова</Badge>}
                 {(hasVIP || isOwner) && <Badge variant="outline" className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 rounded-xl px-4 py-1.5 font-bold">VIP Член</Badge>}
                 {(hasFire || isOwner) && <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 rounded-xl px-4 py-1.5 font-bold">Легенда</Badge>}
              </CardContent>
           </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
           {isEditing ? (
             <Card className="glass-panel border-0 animate-in slide-in-from-top-4 rounded-[2.5rem] shadow-2xl">
                <CardHeader className="p-10 pb-4">
                  <CardTitle className="text-2xl font-bold text-white">Редагування профілю</CardTitle>
                  <CardDescription>Змініть те, як інші бачать ваш профіль у School Hub.</CardDescription>
                </CardHeader>
                <CardContent className="p-10 pt-4 space-y-6">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">Ім'я відображення</label>
                      <Input value={editedName} onChange={(e) => setEditedName(e.target.value)} className="bg-white/5 border-white/10 h-16 rounded-2xl text-lg focus:ring-primary/40 px-6 text-white" />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] ml-1">Про мене</label>
                      <Textarea value={editedBio} onChange={(e) => setEditedBio(e.target.value)} className="bg-white/5 border-white/10 min-h-[180px] rounded-[2rem] text-white p-8 text-lg focus:ring-primary/40 leading-relaxed" placeholder="Розкажіть про свої захоплення та досягнення..." />
                   </div>
                   <div className="flex gap-4 justify-end pt-6">
                      <Button variant="ghost" className="rounded-2xl h-14 px-10 font-bold" onClick={() => setIsEditing(false)}>Скасувати</Button>
                      <Button className="cyber-gradient border-0 rounded-2xl h-14 px-16 font-black uppercase text-xs tracking-widest shadow-xl" onClick={handleUpdateProfile}>Зберегти зміни</Button>
                   </div>
                </CardContent>
             </Card>
           ) : (
             <Tabs defaultValue="about" className="w-full">
                <TabsList className="glass-panel p-1.5 border-0 rounded-[1.75rem] w-full justify-start md:w-fit h-16 shadow-xl">
                   <TabsTrigger value="about" className="rounded-xl px-12 h-full font-black uppercase text-[10px] tracking-widest data-[state=active]:cyber-gradient">Про мене</TabsTrigger>
                   <TabsTrigger value="friends" className="rounded-xl px-12 h-full font-black uppercase text-[10px] tracking-widest data-[state=active]:cyber-gradient">Друзі ({friends?.length || 0})</TabsTrigger>
                </TabsList>
                <TabsContent value="about" className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <Card className="glass-panel border-0 rounded-[3rem] shadow-2xl">
                      <CardContent className="p-12 space-y-8">
                         <div className="space-y-4">
                            <h3 className="text-xs font-black text-primary uppercase tracking-[0.4em]">Біографія</h3>
                            <p className="text-white/90 leading-relaxed text-xl font-medium italic">
                               {profile.bio || "Цей користувач ще не додав опис про себе. Будь першим, хто напише йому!"}
                            </p>
                         </div>
                      </CardContent>
                   </Card>
                </TabsContent>
                <TabsContent value="friends" className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {friends && friends.length > 0 ? friends.map((friend: any) => (
                        <div key={friend.id} className="glass-panel p-6 rounded-[2rem] flex items-center gap-5 group hover:border-primary/50 transition-all shadow-xl">
                           <Avatar className="size-16 border-2 border-white/10 shrink-0 group-hover:border-primary/30 transition-all">
                              <AvatarImage src={friend.photoURL} className="object-cover" />
                              <AvatarFallback className="bg-primary/20 text-primary font-bold">{friend.displayName?.[0]}</AvatarFallback>
                           </Avatar>
                           <div className="flex-1 min-w-0">
                              <p className="font-bold text-white text-lg group-hover:text-primary transition-colors truncate">{friend.displayName}</p>
                              <p className="text-xs text-muted-foreground font-black uppercase tracking-widest opacity-60">Учень School Hub</p>
                           </div>
                           <Button variant="ghost" size="icon" className="size-12 rounded-2xl hover:bg-primary/20 shrink-0 text-primary" onClick={() => router.push(`/messages?with=${friend.id}`)}>
                              <MessageSquare className="size-6" />
                           </Button>
                        </div>
                      )) : (
                        <Card className="glass-panel border-0 col-span-2 py-32 text-center rounded-[3.5rem] shadow-2xl">
                           <Users className="size-20 text-muted-foreground mx-auto mb-6 opacity-10" />
                           <p className="text-muted-foreground font-bold text-lg">У вас поки немає друзів. Знайдіть їх у Хабі Знань!</p>
                        </Card>
                      )}
                   </div>
                </TabsContent>
             </Tabs>
           )}
        </div>
      </div>
    </div>
  )
}

function StatItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all group shadow-inner">
       <div className="flex items-center gap-4">
          <div className="size-12 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
             {icon}
          </div>
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{label}</span>
       </div>
       <span className="font-black text-2xl text-white italic drop-shadow-md">{value}</span>
    </div>
  )
}
