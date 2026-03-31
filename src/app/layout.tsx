"use client";

import "./globals.css";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { PushInitializer } from "@/components/push-initializer";
import { MobileNav } from "@/components/mobile-nav";
import { NotificationBell } from "@/components/notification-bell";
import { Zap, User, Settings2, LogOut, Ban } from "lucide-react";
import { useUser, useDoc, useFirestore, useAuth } from "@/firebase";
import { doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import React from "react";

function MobileHeader() {
  const { user } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const userDocRef = React.useMemo(
    () => (user ? doc(db, "users", user.uid) : null),
    [db, user],
  );
  const { data: profile } = useDoc(userDocRef);

  const handleLogout = () => {
    signOut(auth);
    toast({ title: "Вихід", description: "До зустрічі в School Hub!" });
  };

  if (!user) return null;

  return (
    <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-white shrink-0 h-10 w-10 hover:bg-white/5 rounded-xl transition-colors" />
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg premium-gradient flex items-center justify-center shrink-0">
            <Zap className="text-white size-4 shrink-0" />
          </div>
          <span className="font-headline font-bold text-base tracking-tight text-white uppercase">
            HUB
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="size-10 border border-primary/20 shrink-0 cursor-pointer">
              <AvatarImage src={profile?.photoURL} className="object-cover" />
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                {user?.displayName?.[0]}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-52 glass-panel border-white/10 rounded-xl p-1 z-[150]"
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
            <DropdownMenuSeparator className="bg-white/5 my-1" />
            <DropdownMenuItem
              className="rounded-lg h-9 cursor-pointer text-destructive focus:bg-destructive/10 font-bold text-xs"
              onClick={handleLogout}
            >
              <LogOut className="size-4 mr-2" /> Вийти
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function BannedOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] h-screen w-screen flex flex-col items-center justify-center bg-black text-white p-10 text-center animate-in fade-in duration-500">
      <div className="size-32 rounded-[2.5rem] bg-destructive/20 flex items-center justify-center mb-8 border border-destructive/30">
        <Ban className="size-16 text-destructive" />
      </div>
      <h1 className="text-4xl md:text-6xl font-headline font-bold mb-6 tracking-tighter">
        ВАШ АККАУНТ ЗАБЛОКОВАНО
      </h1>
      <p className="text-muted-foreground text-lg md:text-xl max-w-lg leading-relaxed">
        Ви порушили правила спільноти School Hub. Зверніться до адміністратора
        для з'ясування причин.
      </p>
    </div>
  );
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const userDocRef = React.useMemo(
    () => (user ? doc(db, "users", user.uid) : null),
    [db, user],
  );
  const { data: profile, loading: profileLoading } = useDoc(userDocRef);

  const isOnboarding = pathname === "/sync" || pathname === "/auth";
  const isConnected = !!profile?.isNzConnected;

  React.useEffect(() => {
    if (
      profile &&
      !profileLoading &&
      !isConnected &&
      !isOnboarding
    ) {
      router.replace("/sync");
    }
  }, [profile, profileLoading, isConnected, isOnboarding, router]);

  if (profile?.isBanned) {
    return <BannedOverlay />;
  }

  // On sync/auth pages — fullscreen, no sidebar, no header, no nav
  if (isOnboarding && !isConnected) {
    return (
      <div className="h-[100dvh] w-full bg-background overflow-y-auto scrollbar-none">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-[100dvh] w-full bg-background scrollbar-none overflow-hidden animate-in fade-in slide-in-from-left-5 duration-500">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0 relative">
          <MobileHeader />
          <div className="flex-1 overflow-y-auto scrollbar-none outline-none overscroll-none scroll-smooth">
            <div className="min-h-full pb-24 md:pb-8 scrollbar-none">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className="dark scrollbar-none scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#6d28d9" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover"
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-[100dvh] overflow-hidden scrollbar-none grain-overlay">
        <FirebaseClientProvider>
          <PushInitializer />
          <MainLayout>{children}</MainLayout>
          <MobileNav />
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
