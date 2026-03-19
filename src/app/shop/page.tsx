"use client"

import * as React from "react"
import { 
  ShoppingBag, 
  ChevronLeft, 
  Coins, 
  Zap, 
  Sparkles, 
  Crown,
  Flame,
  Star,
  Layout,
  Rocket,
  Gem,
  Monitor,
  ShieldCheck,
  Ghost
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUser, useFirestore, useDoc } from "@/firebase"
import { doc, updateDoc, increment, arrayUnion } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

const shopItems = [
  {
    id: "xp_boost",
    title: "Double XP Boost",
    description: "Подвоєний досвід за всі оцінки при наступній синхронізації.",
    price: 1500,
    icon: <Zap className="size-6 text-yellow-400" />,
    badge: "Boost"
  },
  {
    id: "aura_gold",
    title: "Золота Аура",
    description: "Унікальний золотий німб навколо вашого аватара.",
    price: 5000,
    icon: <Sparkles className="size-6 text-orange-400" />,
    badge: "Premium"
  },
  {
    id: "aura_rainbow",
    title: "Райдужна Аура",
    description: "Анімоване райдужне світіння профілю. Тільки для легенд.",
    price: 15000,
    icon: <Rocket className="size-6 text-pink-500" />,
    badge: "Limited"
  },
  {
    id: "vip_status",
    title: "VIP Статус",
    description: "Корона біля імені та доступ до секретних функцій.",
    price: 10000,
    icon: <Crown className="size-6 text-indigo-400" />,
    badge: "Elite"
  },
  {
    id: "neon_name",
    title: "Неоновий Нік",
    description: "Ваше ім'я буде світитися в усіх списках рейтингу.",
    price: 3500,
    icon: <Layout className="size-6 text-pink-400" />
  },
  {
    id: "fire_title",
    title: "Титул 'У Вогні'",
    description: "Ваш статус зміниться на ексклюзивне 'LEGEND ON FIRE'.",
    price: 2500,
    icon: <Flame className="size-6 text-red-500" />
  },
  {
    id: "diamond_badge",
    title: "Діамантовий Значок",
    description: "Елітний символ статусу для найбагатших учнів.",
    price: 25000,
    icon: <Gem className="size-6 text-cyan-400" />,
    badge: "Rich"
  },
  {
    id: "matrix_effect",
    title: "Ефект Матриці",
    description: "Цифровий потік коду у вашому профілі.",
    price: 8500,
    icon: <Monitor className="size-6 text-green-500" />,
    badge: "FX"
  },
  {
    id: "ghost_mode",
    title: "Ghost Mode",
    description: "Ваш профіль стане анонімним у загальному рейтингу.",
    price: 4000,
    icon: <Ghost className="size-6 text-slate-400" />,
    badge: "Utility"
  },
  {
    id: "golden_frame",
    title: "Золота Рамка",
    description: "Преміальна рамка для вашого аватара.",
    price: 7000,
    icon: <ShieldCheck className="size-6 text-yellow-500" />
  }
]

export default function ShopPage() {
  const router = useRouter()
  const { user } = useUser()
  const db = useFirestore()
  const userDocRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: profile } = useDoc(userDocRef)

  const isOwner = profile?.role === 'owner';

  const handleBuy = async (item: any) => {
    if (!profile || !userDocRef) return
    const price = isOwner ? 0 : item.price;
    if (!isOwner && (profile.coins || 0) < price) {
      toast({ title: "Мало монет", variant: "destructive" })
      return
    }
    try {
      await updateDoc(userDocRef, {
        coins: isOwner ? profile.coins : increment(-price),
        purchasedItems: arrayUnion(item.id)
      });
      toast({ title: "Придбано!", description: `${item.title} активовано.` });
    } catch (e) {
      toast({ title: "Помилка", variant: "destructive" })
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-10 animate-reveal pb-32">
      <header className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="size-12 rounded-2xl bg-white/5" onClick={() => router.back()}>
            <ChevronLeft className="size-6 text-white" />
          </Button>
          <h1 className="text-3xl md:text-5xl font-headline font-bold text-white tracking-tighter">Магазин <span className="text-primary">Hub</span></h1>
        </div>
        <div className="flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/20 px-6 py-3 rounded-2xl">
          <Coins className="size-6 text-yellow-500" />
          <span className="text-2xl font-black text-white">{isOwner ? "∞" : (profile?.coins || 0)}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shopItems.map((item) => {
          const isOwned = profile?.purchasedItems?.includes(item.id);
          const currentPrice = isOwner ? 0 : item.price;
          return (
            <Card key={item.id} className={cn(
              "glass-panel border-0 rounded-[2.5rem] p-8 flex flex-col group transition-all duration-500",
              isOwned && "opacity-80 border border-primary/20 bg-primary/5"
            )}>
              <div className="flex justify-between items-start mb-6">
                <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">{item.icon}</div>
                {item.badge && <Badge className="cyber-gradient border-0 px-3 py-1 uppercase text-[9px] font-black">{item.badge}</Badge>}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm flex-1">{item.description}</p>
              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="size-5 text-yellow-500" />
                  <span className="text-2xl font-black text-white">{currentPrice}</span>
                </div>
                <Button disabled={isOwned} className={cn("rounded-2xl h-12 px-8 font-black text-xs", isOwned ? "bg-green-500/20 text-green-500" : "cyber-gradient")} onClick={() => handleBuy(item)}>
                  {isOwned ? "ПРИДБАНО" : "КУПИТИ"}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
