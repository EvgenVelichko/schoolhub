"use client";

import * as React from "react";
import {
  ChevronLeft,
  Coins,
  Zap,
  Sparkles,
  Crown,
  Flame,
  Layout,
  Rocket,
  Gem,
  Monitor,
  ShieldCheck,
  Ghost,
  Check,
  Lock,
  ShoppingCart,
  Palette,
  Music,
  Eye,
  Snowflake,
  Swords,
  HeartPulse,
  Trophy,
  Wand2,
  Bolt,
  Cloudy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import {
  doc,
  updateDoc,
  increment,
  arrayUnion,
  collection,
  query,
  orderBy,
  setDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type ShopCategory = "all" | "cosmetic" | "boost" | "effect";
type Rarity = "common" | "rare" | "epic" | "legendary";

interface ShopItem {
  id: string;
  title: string;
  description: string;
  price: number;
  iconName: string;
  badge?: string;
  category: ShopCategory;
  color: string;
  rarity: Rarity;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  zap: <Zap className="size-6 text-yellow-400" />,
  sparkles: <Sparkles className="size-6 text-orange-400" />,
  rocket: <Rocket className="size-6 text-pink-500" />,
  crown: <Crown className="size-6 text-indigo-400" />,
  layout: <Layout className="size-6 text-pink-400" />,
  flame: <Flame className="size-6 text-red-500" />,
  gem: <Gem className="size-6 text-cyan-400" />,
  monitor: <Monitor className="size-6 text-green-500" />,
  ghost: <Ghost className="size-6 text-slate-400" />,
  shield: <ShieldCheck className="size-6 text-yellow-500" />,
  palette: <Palette className="size-6 text-fuchsia-400" />,
  bolt: <Bolt className="size-6 text-amber-400" />,
  snowflake: <Snowflake className="size-6 text-sky-300" />,
  music: <Music className="size-6 text-violet-400" />,
  eye: <Eye className="size-6 text-teal-400" />,
  swords: <Swords className="size-6 text-rose-500" />,
  heart: <HeartPulse className="size-6 text-red-400" />,
  trophy: <Trophy className="size-6 text-yellow-300" />,
  wand: <Wand2 className="size-6 text-purple-300" />,
  cloud: <Cloudy className="size-6 text-blue-300" />,
};

// Fallback items if Firebase collection is empty
const DEFAULT_ITEMS: ShopItem[] = [
  {
    id: "xp_boost",
    title: "Double XP",
    description: "Подвоєний досвід за всі оцінки при наступній синхронізації.",
    price: 1500,
    iconName: "zap",
    badge: "Boost",
    category: "boost",
    color: "yellow",
    rarity: "rare",
  },
  {
    id: "aura_gold",
    title: "Золота Аура",
    description: "Унікальний золотий німб навколо вашого аватара.",
    price: 5000,
    iconName: "sparkles",
    badge: "Premium",
    category: "cosmetic",
    color: "orange",
    rarity: "epic",
  },
  {
    id: "aura_rainbow",
    title: "Райдужна Аура",
    description: "Анімоване райдужне світіння профілю. Тільки для легенд.",
    price: 15000,
    iconName: "rocket",
    badge: "Limited",
    category: "cosmetic",
    color: "pink",
    rarity: "legendary",
  },
  {
    id: "vip_status",
    title: "VIP Статус",
    description: "Корона біля імені та доступ до секретних функцій.",
    price: 10000,
    iconName: "crown",
    badge: "Elite",
    category: "cosmetic",
    color: "indigo",
    rarity: "legendary",
  },
  {
    id: "neon_name",
    title: "Неоновий Нік",
    description: "Ваше ім'я буде світитися в усіх списках рейтингу.",
    price: 3500,
    iconName: "layout",
    category: "cosmetic",
    color: "pink",
    rarity: "rare",
  },
  {
    id: "fire_title",
    title: "Титул 'У Вогні'",
    description: "Ваш статус зміниться на ексклюзивне 'LEGEND ON FIRE'.",
    price: 2500,
    iconName: "flame",
    category: "cosmetic",
    color: "red",
    rarity: "common",
  },
  {
    id: "diamond_badge",
    title: "Діамантовий Значок",
    description: "Елітний символ статусу для найбагатших учнів.",
    price: 25000,
    iconName: "gem",
    badge: "Rich",
    category: "cosmetic",
    color: "cyan",
    rarity: "legendary",
  },
  {
    id: "matrix_effect",
    title: "Ефект Матриці",
    description: "Цифровий потік коду у вашому профілі.",
    price: 8500,
    iconName: "monitor",
    badge: "FX",
    category: "effect",
    color: "green",
    rarity: "epic",
  },
  {
    id: "ghost_mode",
    title: "Ghost Mode",
    description: "Ваш профіль стане анонімним у загальному рейтингу.",
    price: 25000,
    iconName: "ghost",
    badge: "Utility",
    category: "boost",
    color: "slate",
    rarity: "rare",
  },
  {
    id: "golden_frame",
    title: "Золота Рамка",
    description: "Преміальна рамка для вашого аватара.",
    price: 7000,
    iconName: "shield",
    category: "cosmetic",
    color: "yellow",
    rarity: "epic",
  },
  {
    id: "custom_theme",
    title: "Кастомна Тема",
    description: "Зміни кольорову палітру свого профілю на унікальну.",
    price: 6000,
    iconName: "palette",
    category: "cosmetic",
    color: "fuchsia",
    rarity: "epic",
  },
  {
    id: "coin_magnet",
    title: "Магніт Монет",
    description: "+50% монет за ігри протягом 24 годин.",
    price: 2000,
    iconName: "bolt",
    badge: "Boost",
    category: "boost",
    color: "amber",
    rarity: "rare",
  },
  {
    id: "snow_effect",
    title: "Ефект Снігу",
    description: "Падаючий сніг на вашому профілі. Зимова магія.",
    price: 5500,
    iconName: "snowflake",
    badge: "FX",
    category: "effect",
    color: "sky",
    rarity: "rare",
  },
  {
    id: "music_badge",
    title: "Музичний Значок",
    description: "Анімований значок ноти біля вашого імені.",
    price: 1800,
    iconName: "music",
    category: "cosmetic",
    color: "violet",
    rarity: "common",
  },
  {
    id: "stealth_mode",
    title: "Режим Невидимки",
    description: "Ваш онлайн-статус приховано від інших.",
    price: 25000,
    iconName: "eye",
    badge: "Utility",
    category: "boost",
    color: "teal",
    rarity: "rare",
  },
  {
    id: "battle_title",
    title: "Титул 'Воїн'",
    description: "Ексклюзивний титул для справжніх бійців рейтингу.",
    price: 4500,
    iconName: "swords",
    category: "cosmetic",
    color: "rose",
    rarity: "epic",
  },
  {
    id: "hp_bar",
    title: "HP Бар Профілю",
    description:
      "Ігровий бар здоров'я під аватаром. Чим вищий бал — тим більше HP.",
    price: 3200,
    iconName: "heart",
    badge: "FX",
    category: "effect",
    color: "red",
    rarity: "rare",
  },
  {
    id: "champion_crown",
    title: "Корона Чемпіона",
    description: "Золота анімована корона — тільки для топ-1 рейтингу.",
    price: 50000,
    iconName: "trophy",
    badge: "Ultra",
    category: "cosmetic",
    color: "yellow",
    rarity: "legendary",
  },
  {
    id: "magic_particles",
    title: "Магічні Частинки",
    description: "Зіркові частинки літають навколо вашого аватара.",
    price: 9000,
    iconName: "wand",
    badge: "FX",
    category: "effect",
    color: "purple",
    rarity: "epic",
  },
  {
    id: "cloud_bg",
    title: "Хмарний Фон",
    description: "Рухомі хмари на фоні вашого профілю.",
    price: 4000,
    iconName: "cloud",
    badge: "FX",
    category: "effect",
    color: "blue",
    rarity: "rare",
  },
];

const RARITY_COLORS: Record<Rarity, string> = {
  common: "from-slate-500/20 to-slate-600/5 border-slate-500/20",
  rare: "from-blue-500/20 to-blue-600/5 border-blue-500/20",
  epic: "from-purple-500/20 to-purple-600/5 border-purple-500/20",
  legendary: "from-amber-500/20 to-orange-600/5 border-amber-500/20",
};
const RARITY_LABELS: Record<Rarity, string> = {
  common: "Звичайний",
  rare: "Рідкісний",
  epic: "Епічний",
  legendary: "Легендарний",
};
const RARITY_TEXT: Record<Rarity, string> = {
  common: "text-slate-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

const CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "cosmetic", label: "Косметика" },
  { id: "boost", label: "Бусти" },
  { id: "effect", label: "Ефекти" },
];

export default function ShopPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const userDocRef = React.useMemo(
    () => (user ? doc(db, "users", user.uid) : null),
    [db, user],
  );
  const { data: profile } = useDoc(userDocRef);
  const [activeCategory, setActiveCategory] =
    React.useState<ShopCategory>("all");
  const [buyingId, setBuyingId] = React.useState<string | null>(null);

  // Load items from Firebase
  const shopItemsQuery = React.useMemo(
    () => query(collection(db, "shop_items"), orderBy("price", "asc")),
    [db],
  );
  const { data: firebaseItems, loading: itemsLoading } =
    useCollection(shopItemsQuery);

  const shopItems: ShopItem[] = React.useMemo(() => {
    if (firebaseItems && firebaseItems.length > 0) {
      return firebaseItems.map((item: any) => ({
        id: item.id || item.itemId,
        title: item.title,
        description: item.description,
        price: item.price,
        iconName: item.iconName || "sparkles",
        badge: item.badge,
        category: item.category || "cosmetic",
        color: item.color || "violet",
        rarity: item.rarity || "common",
      }));
    }
    return DEFAULT_ITEMS;
  }, [firebaseItems]);

  const isOwner = profile?.role === "owner";

  const filtered = React.useMemo(() => {
    if (activeCategory === "all") return shopItems;
    return shopItems.filter((i) => i.category === activeCategory);
  }, [activeCategory, shopItems]);

  const ownedCount = profile?.purchasedItems?.length || 0;

  const handleBuy = async (item: ShopItem) => {
    if (!profile || !userDocRef) return;
    const price = isOwner ? 0 : item.price;
    if (!isOwner && (profile.coins || 0) < price) {
      toast({
        title: "Мало монет",
        description: `Потрібно ${price} монет`,
        variant: "destructive",
      });
      return;
    }
    setBuyingId(item.id);
    try {
      const updateData: any = { purchasedItems: arrayUnion(item.id) };
      if (!isOwner) updateData.coins = increment(-price);

      const achievements = [...(profile?.achievements || [])];
      const purchasedCount = (profile?.purchasedItems?.length || 0) + 1;
      if (purchasedCount >= 5 && !achievements.includes("shopaholic"))
        achievements.push("shopaholic");
      if (
        item.id === "matrix_effect" &&
        !achievements.includes("matrix_hacker")
      )
        achievements.push("matrix_hacker");
      if (item.id === "ghost_mode" && !achievements.includes("ghost_walker"))
        achievements.push("ghost_walker");
      if (achievements.length > (profile?.achievements?.length || 0)) {
        updateData.achievements = Array.from(new Set(achievements));
      }

      await updateDoc(userDocRef, updateData);
      toast({ title: "Придбано!", description: `${item.title} активовано.` });
    } catch {
      toast({ title: "Помилка", variant: "destructive" });
    } finally {
      setBuyingId(null);
    }
  };

  const handleSeedToFirebase = async () => {
    let count = 0;
    for (const item of DEFAULT_ITEMS) {
      try {
        const { id, ...data } = item;
        await setDoc(
          doc(db, "shop_items", id),
          { ...data, itemId: id },
          { merge: true },
        );
        count++;
      } catch (e: any) {
        console.error(`Failed to seed ${item.id}:`, e);
        toast({
          title: `Помилка: ${item.id}`,
          description:
            e?.message ||
            "Permission denied. Перевірте Firestore Rules: allow write на shop_items.",
          variant: "destructive",
        });
        return;
      }
    }
    toast({
      title: "Готово!",
      description: `${count} товарів завантажено в Firebase.`,
    });
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-reveal pb-32">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-10 sm:size-12 rounded-xl bg-white/5 hover:bg-white/10"
              onClick={() => router.back()}
            >
              <ChevronLeft className="size-5 sm:size-6 text-white" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-headline font-bold text-white tracking-tighter">
                Магазин <span className="text-primary text-glow">Hub</span>
              </h1>
              <p className="text-muted-foreground text-[10px] sm:text-xs opacity-60 mt-0.5">
                Придбано {ownedCount} з {shopItems.length} предметів
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <Button
                size="sm"
                variant="ghost"
                className="h-9 rounded-xl text-[10px] font-bold text-muted-foreground hover:text-white"
                onClick={handleSeedToFirebase}
              >
                Sync DB
              </Button>
            )}
            <div className="flex items-center gap-2 sm:gap-3 bg-yellow-500/10 border border-yellow-500/20 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl shrink-0">
              <Coins className="size-4 sm:size-5 text-yellow-500" />
              <span className="text-lg sm:text-2xl font-black text-white">
                {isOwner ? "∞" : profile?.coins || 0}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 shrink-0",
                activeCategory === cat.id
                  ? "cyber-gradient border-0 text-white"
                  : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:bg-white/[0.06]",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Featured item */}
      {activeCategory === "all" &&
        (() => {
          const featured = shopItems.find(
            (i) =>
              i.rarity === "legendary" &&
              !profile?.purchasedItems?.includes(i.id),
          );
          if (!featured) return null;
          const canAfford = isOwner || (profile?.coins || 0) >= featured.price;
          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative glass-panel rounded-[2rem] p-6 sm:p-8 overflow-hidden border border-amber-500/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8">
                <div className="size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  {ICON_MAP[featured.iconName] || (
                    <Sparkles className="size-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                      Рекомендовано
                    </Badge>
                    <Badge className="bg-amber-500/10 text-amber-300/60 border-0 text-[8px] font-black uppercase tracking-widest px-2 py-0.5">
                      {RARITY_LABELS[featured.rarity]}
                    </Badge>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white">
                    {featured.title}
                  </h3>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-1 opacity-70">
                    {featured.description}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5">
                    <Coins className="size-5 text-yellow-500" />
                    <span className="text-2xl font-black text-white">
                      {isOwner ? 0 : featured.price}
                    </span>
                  </div>
                  <Button
                    className={cn(
                      "cyber-gradient rounded-xl h-11 px-6 font-black text-xs flex-1 sm:flex-none",
                      !canAfford && "opacity-50",
                    )}
                    onClick={() => handleBuy(featured)}
                    disabled={buyingId === featured.id}
                  >
                    <ShoppingCart className="size-4 mr-2" />
                    {buyingId === featured.id ? "..." : "КУПИТИ"}
                  </Button>
                </div>
              </div>
            </motion.div>
          );
        })()}

      {itemsLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary size-8" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((item, i) => {
              const isOwned = profile?.purchasedItems?.includes(item.id);
              const canAfford = isOwner || (profile?.coins || 0) >= item.price;
              const currentPrice = isOwner ? 0 : item.price;
              const isBuying = buyingId === item.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className={cn(
                    "group relative glass-panel rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden transition-all duration-300",
                    isOwned ? "border-primary/15" : "hover:border-white/10",
                  )}
                >
                  <div
                    className={cn(
                      "h-0.5 w-full bg-gradient-to-r",
                      RARITY_COLORS[item.rarity]
                        .replace("border-", "from-")
                        .replace("/20", "/40"),
                    )}
                  />
                  <div className="p-4 sm:p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={cn(
                          "size-12 sm:size-14 rounded-xl bg-gradient-to-br border flex items-center justify-center transition-transform group-hover:scale-105",
                          RARITY_COLORS[item.rarity],
                        )}
                      >
                        {ICON_MAP[item.iconName] || (
                          <Sparkles className="size-6 text-primary" />
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {isOwned && (
                          <div className="flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-0.5 rounded-md">
                            <Check className="size-3" />
                            <span className="text-[8px] font-black uppercase">
                              Є
                            </span>
                          </div>
                        )}
                        <span
                          className={cn(
                            "text-[8px] font-black uppercase tracking-widest",
                            RARITY_TEXT[item.rarity],
                          )}
                        >
                          {RARITY_LABELS[item.rarity]}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white leading-tight mb-1">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-[11px] sm:text-xs leading-relaxed flex-1 opacity-70">
                      {item.description}
                    </p>
                    <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Coins className="size-3.5 text-yellow-500" />
                        <span
                          className={cn(
                            "text-sm sm:text-base font-black",
                            isOwned
                              ? "text-white/40 line-through"
                              : canAfford
                                ? "text-white"
                                : "text-red-400",
                          )}
                        >
                          {currentPrice}
                        </span>
                      </div>
                      {isOwned ? (
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-400/60">
                          Придбано
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          className={cn(
                            "rounded-xl h-8 sm:h-9 px-3 sm:px-5 font-black text-[9px] sm:text-[10px] uppercase tracking-wider",
                            canAfford
                              ? "cyber-gradient"
                              : "bg-white/5 text-white/40",
                          )}
                          disabled={!canAfford || isBuying}
                          onClick={() => handleBuy(item)}
                        >
                          {isBuying ? (
                            "..."
                          ) : !canAfford ? (
                            <>
                              <Lock className="size-3 mr-1" /> Мало
                            </>
                          ) : (
                            "Купити"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
