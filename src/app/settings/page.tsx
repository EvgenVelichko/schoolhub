"use client"

import * as React from "react"
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Eye, 
  Palette, 
  Languages, 
  UserX,
  ChevronRight,
  Save,
  Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useUser, useFirestore, useDoc } from "@/firebase"
import { doc, updateDoc, setDoc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function SettingsPage() {
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
      // Використовуємо setDoc з merge: true для надійного створення об'єкта settings, якщо його немає
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
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="size-12 animate-spin text-primary" />
    </div>
  )

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-700">
      <header className="flex items-center justify-between">
         <div className="space-y-1">
            <h1 className="font-headline text-4xl font-bold tracking-tight text-white flex items-center gap-3">
               <SettingsIcon className="text-primary size-10" /> Налаштування
            </h1>
            <p className="text-muted-foreground text-lg">Керуйте вашим досвідом у School Hub.</p>
         </div>
         <Button 
           className="cyber-gradient border-0 h-12 rounded-2xl px-8 shadow-xl shadow-primary/20 shrink-0" 
           onClick={handleSaveSettings}
           disabled={isSaving}
         >
            {isSaving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}
            Зберегти
         </Button>
      </header>

      <div className="grid grid-cols-1 gap-6">
         <Card className="glass-panel border-0">
            <CardHeader>
               <CardTitle className="flex items-center gap-2"><Bell className="size-5 text-primary shrink-0" /> Сповіщення</CardTitle>
               <CardDescription>Виберіть, про що ви хочете отримувати повідомлення.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                     <Label htmlFor="notifs" className="text-base font-bold text-white">Push-сповіщення</Label>
                     <p className="text-sm text-muted-foreground">Отримувати сповіщення про нові оцінки та повідомлення.</p>
                  </div>
                  <Switch 
                    id="notifs" 
                    checked={notifs} 
                    onCheckedChange={setNotifs} 
                    className="shrink-0"
                  />
               </div>
               <Separator className="bg-white/5" />
               <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                     <Label htmlFor="mentions" className="text-base font-bold text-white">Згадки у Хабі</Label>
                     <p className="text-sm text-muted-foreground">Сповіщати, коли хтось тегає вас у дискусіях.</p>
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

         <Card className="glass-panel border-0">
            <CardHeader>
               <CardTitle className="flex items-center gap-2"><Shield className="size-5 text-primary shrink-0" /> Конфіденційність</CardTitle>
               <CardDescription>Керуйте видимістю вашого профілю.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                     <Label htmlFor="private" className="text-base font-bold text-white">Приватний профіль</Label>
                     <p className="text-sm text-muted-foreground">Тільки ваші друзі можуть бачити вашу статистику та оцінки.</p>
                  </div>
                  <Switch 
                    id="private" 
                    checked={privateProfile} 
                    onCheckedChange={setPrivateProfile} 
                    className="shrink-0"
                  />
               </div>
               <Separator className="bg-white/5" />
               <div className="flex items-center justify-between space-x-2">
                  <div className="space-y-0.5">
                     <Label htmlFor="activity" className="text-base font-bold text-white">Статус активності</Label>
                     <p className="text-sm text-muted-foreground">Показувати, коли ви онлайн.</p>
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

         <Card className="glass-panel border-0 bg-destructive/5 border-destructive/20">
            <CardHeader>
               <CardTitle className="flex items-center gap-2 text-destructive"><UserX className="size-5 shrink-0" /> Небезпечна зона</CardTitle>
            </CardHeader>
            <CardContent>
               <Button variant="outline" className="border-destructive/20 text-destructive hover:bg-destructive/10 w-full justify-between h-14 rounded-2xl shrink-0">
                  Видалити аккаунт назавжди
                  <ChevronRight className="size-4 shrink-0" />
               </Button>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
