"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, Bot, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Головна", href: "/" },
  { icon: MessageCircle, label: "Чати", href: "/messages" },
  { icon: Bot, label: "ШІ", href: "/ai-chat" },
  { icon: BookOpen, label: "ГДЗ", href: "/materials" },
  { icon: User, label: "Профіль", href: "/profile" },
];

export function MobileNav() {
  const pathname = usePathname();

  if (pathname === "/auth" || pathname === "/sync" || pathname?.startsWith("/chat/")) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-2xl border-t border-white/[0.06] px-2 flex items-center justify-around z-[100] safe-bottom pt-1.5 pb-2.5">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname?.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 transition-all duration-300 w-full py-1 touch-target relative",
              isActive ? "text-primary" : "text-muted-foreground/50",
            )}
          >
            <div
              className={cn(
                "size-10 rounded-2xl flex items-center justify-center transition-all duration-300 relative",
                isActive ? "bg-primary/15 scale-105" : "bg-transparent",
              )}
            >
              <item.icon
                className={cn(
                  "size-[22px] transition-all duration-300",
                  isActive &&
                    "drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]",
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isActive && (
                <div className="absolute -bottom-1 w-4 h-[3px] rounded-full bg-primary" />
              )}
            </div>
            <span
              className={cn(
                "text-[9px] font-bold uppercase tracking-wider text-center leading-none transition-all",
                isActive ? "opacity-100" : "opacity-50",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
