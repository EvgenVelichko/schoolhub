"use client"

import * as React from "react"
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  UserX,
  ChevronRight,
  Save,
  Loader2,
  ChevronLeft
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useUser, useFirestore, useDoc } from "@/firebase"
import { doc, setDoc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useUser()
  const db = useFirestore()
  const userDocRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile, loading } = useDoc(userDocRef)

  const [notifs, setNotifs] = React.useState(true)
  const [privateProfile, setPrivateProfile] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)

  React.useEffect(() => {
    if (profile?.settings) {
      setNotifs(profile.settings.notificationsEnabled ?? true)
      setPrivateProfile(profile.settings.privateProfile ?? false)
    }
  }, [profile])

  const handleSaveSettings = async () => {
    if (!userDocRef || !user) return
    setIsSaving(true)
    try {
      await setDoc(userDocRef, {
        settings: {
          notificationsEnabled: notifs,
          privateProfile: privateProfile
        }
      }, { merge: true })

      toast({ title: "Налаштування збережено", description: "Ваші зміни успішно застосовані." })
    } catch (e: any) {
      toast({ title: "Помилка", description: "Не вдалося зберегти налаштування.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="size-12 animate-spin text-primary" />
      <p className="text-xs font-black uppercase tracking-[0.3em] text-primary/50">Завантаження...</p>
    </div>
  )

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-reveal pb-32">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-white/5 shrink-0" onClick={() => router.back()}>
            <ChevronLeft className="size-5 sm:size-6 text-white" />
          </Button>
          <div className="space-y-1 min-w-0">
            <h1 className="font-headline text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white">
              Налашту<span className="text-primary text-glow">вання</span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm opacity-70">Керуйте вашим досвідом у School Hub.</p>
          </div>
        </div>
        <Button
          className="cyber-gradient border-0 h-11 sm:h-12 rounded-xl sm:rounded-2xl px-6 sm:px-8 shrink-0 font-black text-xs uppercase tracking-widest"
          onClick={handleSaveSettings}
          disabled={isSaving}
        >
          {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
          Зберегти
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:gap-6">
        <Card className="glass-panel border-0 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-5 sm:p-8">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl text-white">
              <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                <Bell className="size-5 sm:size-6 text-primary" />
              </div>
              Сповіщення
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm ml-[52px] sm:ml-[60px] opacity-70">Виберіть, про що ви хочете отримувати повідомлення.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 sm:space-y-6 p-5 sm:p-8 pt-0">
            <div className="flex items-center justify-between gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="space-y-1 min-w-0">
                <Label htmlFor="notifs" className="text-sm sm:text-base font-bold text-white">Push-сповіщення</Label>
                <p className="text-xs sm:text-sm text-muted-foreground opacity-70">Отримувати сповіщення про нові оцінки та повідомлення.</p>
              </div>
              <Switch
                id="notifs"
                checked={notifs}
                onCheckedChange={setNotifs}
                className="shrink-0"
              />
            </div>
            <div className="flex items-center justify-between gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 opacity-60">
              <div className="space-y-1 min-w-0">
                <Label htmlFor="mentions" className="text-sm sm:text-base font-bold text-white">Згадки у Хабі</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">Сповіщати, коли хтось тегає вас у дискусіях.</p>
              </div>
              <Switch
                id="mentions"
                checked={true}
                className="shrink-0"
                disabled
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-5 sm:p-8">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl text-white">
              <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                <Shield className="size-5 sm:size-6 text-primary" />
              </div>
              Конфіденційність
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm ml-[52px] sm:ml-[60px] opacity-70">Керуйте видимістю вашого профілю.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 sm:space-y-6 p-5 sm:p-8 pt-0">
            <div className="flex items-center justify-between gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5">
              <div className="space-y-1 min-w-0">
                <Label htmlFor="private" className="text-sm sm:text-base font-bold text-white">Приватний профіль</Label>
                <p className="text-xs sm:text-sm text-muted-foreground opacity-70">Тільки ваші друзі можуть бачити вашу статистику та оцінки.</p>
              </div>
              <Switch
                id="private"
                checked={privateProfile}
                onCheckedChange={setPrivateProfile}
                className="shrink-0"
              />
            </div>
            <div className="flex items-center justify-between gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/5 opacity-60">
              <div className="space-y-1 min-w-0">
                <Label htmlFor="activity" className="text-sm sm:text-base font-bold text-white">Статус активності</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">Показувати, коли ви онлайн.</p>
              </div>
              <Switch
                id="activity"
                checked={true}
                className="shrink-0"
                disabled
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-0 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-destructive/10 bg-destructive/[0.02]">
          <CardHeader className="p-5 sm:p-8">
            <CardTitle className="flex items-center gap-3 text-lg sm:text-xl text-destructive">
              <div className="size-10 sm:size-12 rounded-xl sm:rounded-2xl bg-destructive/10 flex items-center justify-center border border-destructive/20 shrink-0">
                <UserX className="size-5 sm:size-6 text-destructive" />
              </div>
              Небезпечна зона
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-8 pt-0">
            <Button variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10 w-full justify-between h-12 sm:h-14 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm">
              Видалити аккаунт назавжди
              <ChevronRight className="size-4 shrink-0" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
