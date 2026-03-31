"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Library,
  Gamepad2,
  Trophy,
  Zap,
  User,
  Settings2,
  Calendar,
  LogOut,
  ShieldAlert,
  Hash,
  MessageCircleQuestion,
  TrendingUp,
  ShoppingBag,
  Crown,
  MessageCircle,
  Bot,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useUser,
  useAuth,
  useDoc,
  useFirestore,
  useCollection,
} from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, collection, query } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/notification-bell";
import { cn } from "@/lib/utils";

const menuItems = [
  {
    icon: LayoutDashboard,
    label: "Дашборд",
    href: "/",
    color: "text-violet-400",
  },
  {
    icon: MessageCircle,
    label: "Повідомлення",
    href: "/messages",
    color: "text-indigo-400",
  },
  { icon: Bot, label: "ШІ Помічник", href: "/ai-chat", color: "text-cyan-400" },
  {
    icon: BookOpen,
    label: "ГДЗ / Книги",
    href: "/materials",
    color: "text-amber-400",
  },
  {
    icon: Calendar,
    label: "Розклад",
    href: "/schedule",
    color: "text-blue-400",
  },
  {
    icon: TrendingUp,
    label: "Оцінки",
    href: "/grades",
    color: "text-green-400",
  },
  {
    icon: Library,
    label: "Хаб Знань",
    href: "/hub",
    color: "text-emerald-400",
  },
  {
    icon: ShoppingBag,
    label: "Магазин",
    href: "/shop",
    color: "text-yellow-500",
  },
  {
    icon: Gamepad2,
    label: "Зона Ігор",
    href: "/games",
    color: "text-pink-400",
  },
  {
    icon: Trophy,
    label: "Рейтинг",
    href: "/leaderboard",
    color: "text-violet-400",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const { setOpenMobile, state } = useSidebar();

  const userDocRef = React.useMemo(
    () => (user ? doc(db, "users", user.uid) : null),
    [db, user],
  );
  const { data: profile } = useDoc(userDocRef);

  const membershipsQuery = React.useMemo(
    () =>
      user ? query(collection(db, "users", user.uid, "memberships")) : null,
    [db, user],
  );
  const { data: userMemberships } = useCollection(membershipsQuery);

  const handleLogout = () => {
    signOut(auth);
    toast({ title: "Вихід", description: "До зустрічі в School Hub!" });
  };

  const isAdmin =
    profile?.role === "admin" ||
    profile?.role === "owner" ||
    profile?.role === "tester";
  const isCollapsed = state === "collapsed";

  const hasAura = profile?.purchasedItems?.includes("aura_gold");
  const hasRainbowAura = profile?.purchasedItems?.includes("aura_rainbow");
  const hasVIP = profile?.purchasedItems?.includes("vip_status");
  const hasNeon = profile?.purchasedItems?.includes("neon_name");
  const hasFire = profile?.purchasedItems?.includes("fire_title");

  const classRooms = React.useMemo(() => {
    const list = [
      ...(userMemberships?.filter((m: any) => m.type === "classroom") || []),
    ];
    if (list.length === 0 && profile?.gradeLevel && profile?.schoolId) {
      const normalizedClass = profile.gradeLevel
        .trim()
        .replace(/\s+/g, "-")
        .toUpperCase();
      const virtualId = `class-${profile.schoolId}-${normalizedClass}`;
      list.push({
        id: virtualId,
        name: profile.gradeLevel.trim(),
        type: "classroom",
      });
    }
    return list;
  }, [userMemberships, profile]);

  if (pathname === "/auth" || (pathname === "/" && !user)) return null;

  return (
    <Sidebar collapsible="icon" className="border-r border-white/5 bg-sidebar">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between w-full">
          <Link
            href="/"
            onClick={() => setOpenMobile(false)}
            className="flex items-center gap-3"
          >
            <div className="size-9 rounded-xl cyber-gradient flex items-center justify-center shrink-0">
              <Zap className="text-white size-5" />
            </div>
            {!isCollapsed && (
              <span className="font-headline font-bold text-lg text-white tracking-tighter">
                SCHOOL <span className="text-primary">HUB</span>
              </span>
            )}
          </Link>
          {!isCollapsed && <NotificationBell />}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarMenu>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "h-10 rounded-xl mb-1 transition-all group",
                    isActive
                      ? "bg-white/5 border border-white/5"
                      : "hover:bg-white/5",
                  )}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpenMobile(false)}
                    className="flex items-center"
                  >
                    <div
                      className={cn(
                        "size-7 rounded-lg flex items-center justify-center transition-all shrink-0",
                        isActive ? "cyber-gradient text-white" : item.color,
                      )}
                    >
                      <item.icon className="size-4" />
                    </div>
                    {!isCollapsed && (
                      <span
                        className={cn(
                          "font-bold text-xs ml-3",
                          isActive
                            ? "text-white"
                            : "text-muted-foreground group-hover:text-white",
                        )}
                      >
                        {item.label}
                      </span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === "/support"}
              className="h-10 rounded-xl mb-1 hover:bg-white/5 group"
            >
              <Link
                href="/support"
                onClick={() => setOpenMobile(false)}
                className="flex items-center"
              >
                <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <MessageCircleQuestion className="size-4 text-blue-400" />
                </div>
                {!isCollapsed && (
                  <span className="font-bold text-xs ml-3 text-muted-foreground group-hover:text-white">
                    Підтримка
                  </span>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/admin"}
                className="h-10 rounded-xl mb-1 hover:bg-destructive/10 group"
              >
                <Link
                  href="/admin"
                  onClick={() => setOpenMobile(false)}
                  className="flex items-center"
                >
                  <div className="size-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                    <ShieldAlert className="size-4 text-destructive" />
                  </div>
                  {!isCollapsed && (
                    <span className="font-bold text-xs ml-3 text-destructive">
                      Адмін
                    </span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>

        {classRooms.length > 0 && (
          <div className="mt-6 px-2">
            {!isCollapsed && (
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2 px-2">
                Кімнати класу
              </p>
            )}
            <SidebarMenu>
              {classRooms.map((room: any) => {
                const isChatActive = pathname === `/chat/${room.id}`;
                return (
                  <SidebarMenuItem key={room.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isChatActive}
                      className="h-9 rounded-lg mb-1 hover:bg-white/5"
                    >
                      <Link
                        href={`/chat/${room.id}`}
                        onClick={() => setOpenMobile(false)}
                        className="flex items-center"
                      >
                        <div className="size-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Hash className="size-3 text-primary" />
                        </div>
                        {!isCollapsed && (
                          <span className="font-bold ml-3 text-[11px] truncate">
                            {room.name}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className={cn(
                "h-auto p-3 rounded-2xl transition-all border border-white/5 bg-white/5 group relative outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0",
                hasFire ? "cyber-gradient border-0" : "",
                hasAura && !hasFire && "ring-1 ring-yellow-500/30",
                hasRainbowAura && "aura-rainbow",
              )}
            >
              <Avatar className="size-9 border border-white/10 shrink-0">
                <AvatarImage src={profile?.photoURL} className="object-cover" />
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                  {user?.displayName?.[0]}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex flex-col items-start ml-3 overflow-hidden">
                  <span
                    className={cn(
                      "font-bold text-white truncate w-24 text-xs leading-none flex items-center gap-1.5",
                      hasNeon && "neon-text-orange",
                    )}
                  >
                    {profile?.displayName?.split(" ")[0] || "Учень"}
                    {hasVIP && (
                      <Crown className="size-3 text-yellow-400 fill-yellow-400" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-[8px] font-black uppercase tracking-[0.15em] mt-1.5 opacity-80",
                      hasFire ? "text-white" : "text-primary",
                    )}
                  >
                    {hasFire
                      ? "LEGEND ON FIRE"
                      : profile?.gradeLevel?.trim() || "Школяр"}
                  </span>
                </div>
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="end"
            className="w-52 glass-panel border-white/10 rounded-xl p-1"
          >
            <DropdownMenuItem
              asChild
              className="rounded-lg h-9 cursor-pointer focus:bg-primary/20"
            >
              <Link
                href="/profile"
                className="flex items-center w-full font-bold text-xs"
              >
                <User className="size-4 mr-2 text-primary" /> Профіль
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="rounded-lg h-9 cursor-pointer focus:bg-primary/20"
            >
              <Link
                href="/settings"
                className="flex items-center w-full font-bold text-xs"
              >
                <Settings2 className="size-4 mr-2 text-primary" /> Налаштування
              </Link>
            </DropdownMenuItem>
            <SidebarSeparator className="bg-white/5 my-1" />
            <DropdownMenuItem
              className="rounded-lg h-9 cursor-pointer text-destructive focus:bg-destructive/10 font-bold text-xs"
              onClick={handleLogout}
            >
              <LogOut className="size-4 mr-2" /> Вийти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
