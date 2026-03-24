
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Calendar, TrendingUp, Library, User } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { icon: LayoutDashboard, label: "Головна", href: "/" },
  { icon: Calendar, label: "Розклад", href: "/schedule" },
  { icon: TrendingUp, label: "Оцінки", href: "/grades" },
  { icon: Library, label: "Хаб", href: "/hub" },
  { icon: User, label: "Профіль", href: "/profile" },
]

export function MobileNav() {
  const pathname = usePathname()

  if (pathname === '/auth' || pathname?.startsWith('/chat')) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0512]/95 backdrop-blur-2xl border-t border-white/5 px-1 sm:px-2 flex items-start justify-around z-[100] safe-bottom pt-2 pb-3">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-300 w-full py-1 touch-target",
              isActive ? "text-primary" : "text-muted-foreground opacity-60"
            )}
          >
            <div className={cn(
              "size-9 rounded-xl flex items-center justify-center transition-all",
              isActive ? "bg-primary/20" : "bg-transparent"
            )}>
              <item.icon className={cn("size-5", isActive ? "animate-float" : "")} />
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest text-center leading-none">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
