"use client"

import * as React from "react"
import { Trophy, Medal, Crown, Star, ChevronLeft, Ghost } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function Leaderboard() {
  const router = useRouter()
  const db = useFirestore()
  const { user } = useUser()

  const currentUserRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user])
  const { data: currentProfile } = useDoc(currentUserRef)

  const usersQuery = React.useMemo(() => query(
    collection(db, "users"),
    orderBy("xp", "desc"),
    limit(20)
  ), [db])

  const { data: topUsers, loading } = useCollection(usersQuery)

  const isGhostUser = (userData: any) => {
    return userData?.purchasedItems?.includes('ghost_mode')
  }

  const getDisplayName = (userData: any) => {
    if (isGhostUser(userData) && userData.id !== user?.uid) return "Невідомий учень"
    return userData.displayName
  }

  const getDisplayAvatar = (userData: any) => {
    if (isGhostUser(userData) && userData.id !== user?.uid) return null
    return userData.photoURL
  }

  const getAvatarFallback = (userData: any) => {
    if (isGhostUser(userData) && userData.id !== user?.uid) return "?"
    return userData.displayName?.[0]
  }

  const handleUserClick = (userData: any) => {
    if (isGhostUser(userData) && userData.id !== user?.uid) return
    router.push(`/profile/${userData.id}`)
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-reveal overflow-x-hidden w-full pb-32">
      <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <Button
          variant="ghost"
          size="icon"
          className="size-10 sm:size-12 rounded-2xl bg-white/5 hover:bg-white/10 shrink-0 self-start"
          onClick={() => router.push('/')}
        >
          <ChevronLeft className="size-5 sm:size-6 text-white" />
        </Button>
        <div className="space-y-1">
          <h1 className="font-headline text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white text-glow">
            Глобальний <span className="text-primary">Рейтинг</span>
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm md:text-lg">Найкращі учні School Hub.</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
        {topUsers?.slice(0, 3).map((userData: any, index: number) => {
          const isGhost = isGhostUser(userData) && userData.id !== user?.uid
          return (
            <Card
              key={userData.id}
              className={cn(
                "glass-panel border-0 relative overflow-hidden transition-all",
                !isGhost && "cursor-pointer hover:scale-[1.03] sm:hover:scale-[1.07]",
                index === 0 ? 'sm:scale-105 shadow-primary/20 shadow-2xl z-10' : 'sm:scale-95 opacity-90',
                isGhost && "ghost-shimmer"
              )}
              onClick={() => handleUserClick(userData)}
            >
              <div className={cn(
                "absolute top-2 right-2 sm:top-4 sm:right-4",
                index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-300' : 'text-amber-600'
              )}>
                {isGhost ? <Ghost className="size-5 sm:size-8 text-slate-400" /> :
                 index === 0 ? <Crown className="size-5 sm:size-8" /> : <Medal className="size-5 sm:size-8" />}
              </div>
              <CardHeader className="text-center pb-1 sm:pb-2 px-2 sm:px-6">
                <div className="relative inline-block mx-auto mb-2 sm:mb-4">
                  <Avatar className={cn(
                    "size-14 sm:size-20 md:size-24 border-2 sm:border-4",
                    isGhost ? "border-slate-500/30" :
                    index === 0 ? 'border-yellow-500' : index === 1 ? 'border-gray-300' : 'border-amber-600'
                  )}>
                    <AvatarImage src={getDisplayAvatar(userData) || undefined} />
                    <AvatarFallback className={cn(isGhost && "bg-slate-800 text-slate-500")}>
                      {getAvatarFallback(userData)}
                    </AvatarFallback>
                  </Avatar>
                  <Badge className="absolute -bottom-1 sm:-bottom-2 left-1/2 -translate-x-1/2 cyber-gradient border-0 px-2 sm:px-3 text-[9px] sm:text-xs">
                    #{index + 1}
                  </Badge>
                </div>
                <CardTitle className={cn(
                  "font-headline text-sm sm:text-lg md:text-xl text-white truncate",
                  isGhost && "ghost-text"
                )}>
                  {getDisplayName(userData)}
                </CardTitle>
                <p className="text-[9px] sm:text-sm text-muted-foreground truncate">
                  {isGhost ? "Ghost Mode" : (userData.gradeLevel || "Рівень " + (userData.level || 1))}
                </p>
              </CardHeader>
              <CardContent className="text-center pt-1 sm:pt-2 px-2 sm:px-6 pb-3 sm:pb-6">
                <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-primary font-bold text-xs sm:text-base">
                  <Star className="size-3 sm:size-4 fill-primary" />
                  {userData.xp?.toLocaleString() || 0} XP
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="glass-panel border-white/5 overflow-hidden border-0 rounded-[1.5rem] sm:rounded-[2rem]">
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {loading ? (
              <div className="p-10 text-center text-muted-foreground">Підрахунок результатів...</div>
            ) : topUsers?.slice(3).map((userData: any, index: number) => {
              const isGhost = isGhostUser(userData) && userData.id !== user?.uid
              return (
                <div
                  key={userData.id}
                  className={cn(
                    "flex items-center justify-between p-3 sm:p-4 md:p-6 hover:bg-white/5 transition-colors group",
                    !isGhost && "cursor-pointer"
                  )}
                  onClick={() => handleUserClick(userData)}
                >
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                    <span className="w-6 sm:w-8 font-headline font-bold text-muted-foreground text-center text-sm sm:text-base shrink-0">
                      {index + 4}
                    </span>
                    <Avatar className={cn(
                      "size-8 sm:size-10 border border-white/10 shrink-0",
                      !isGhost && "group-hover:border-primary/50 transition-colors"
                    )}>
                      <AvatarImage src={getDisplayAvatar(userData) || undefined} />
                      <AvatarFallback className={cn("text-xs", isGhost && "bg-slate-800 text-slate-500")}>
                        {getAvatarFallback(userData)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className={cn(
                        "font-bold text-white text-sm sm:text-base truncate",
                        !isGhost && "group-hover:text-primary transition-colors",
                        isGhost && "ghost-text"
                      )}>
                        {getDisplayName(userData)}
                      </p>
                      <p className="text-[9px] sm:text-xs text-muted-foreground truncate">
                        {isGhost ? "Ghost Mode" : (userData.gradeLevel || "Учень")}
                      </p>
                    </div>
                    {isGhost && <Ghost className="size-4 text-slate-500 shrink-0 ml-1" />}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-bold text-white text-sm sm:text-base">{userData.xp?.toLocaleString() || 0}</p>
                    <p className="text-[8px] sm:text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Досвід</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
