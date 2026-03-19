"use client"

import * as React from "react"
import { Trophy, Medal, Crown, Star, Minus, ChevronLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useCollection, useFirestore } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { useRouter } from "next/navigation"

export default function Leaderboard() {
  const router = useRouter()
  const db = useFirestore()
  const usersQuery = React.useMemo(() => query(
    collection(db, "users"),
    orderBy("xp", "desc"),
    limit(20)
  ), [db])

  const { data: topUsers, loading } = useCollection(usersQuery)

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-reveal overflow-x-hidden w-full">
      <header className="flex flex-col md:flex-row md:items-center gap-6">
        <Button 
          variant="ghost" 
          size="icon" 
          className="size-12 rounded-2xl bg-white/5 hover:bg-white/10 shrink-0"
          onClick={() => router.push('/')}
        >
          <ChevronLeft className="size-6 text-white" />
        </Button>
        <div className="text-center md:text-left space-y-1">
          <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-white text-glow">
            Глобальний <span className="text-primary">Рейтинг</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-lg">Найкращі учні School Hub.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {topUsers?.slice(0, 3).map((user: any, index: number) => (
          <Card 
            key={user.id} 
            className={`glass-panel border-0 relative overflow-hidden cursor-pointer transition-all hover:scale-[1.07] ${index === 0 ? 'scale-105 shadow-primary/20 shadow-2xl z-10' : 'scale-95 opacity-90'}`}
            onClick={() => router.push(`/profile/${user.id}`)}
          >
            <div className={`absolute top-0 right-0 p-4 ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-300' : 'text-amber-600'}`}>
              {index === 0 ? <Crown className="size-8" /> : <Medal className="size-8" />}
            </div>
            <CardHeader className="text-center pb-2">
              <div className="relative inline-block mx-auto mb-4">
                <Avatar className={`size-24 border-4 ${index === 0 ? 'border-yellow-500' : index === 1 ? 'border-gray-300' : 'border-amber-600'}`}>
                  <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.id}/200`} />
                  <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 cyber-gradient border-0 px-3">
                  #{index + 1}
                </Badge>
              </div>
              <CardTitle className="font-headline text-xl text-white">{user.displayName}</CardTitle>
              <p className="text-sm text-muted-foreground">{user.gradeLevel || "Рівень " + (user.level || 1)}</p>
            </CardHeader>
            <CardContent className="text-center pt-2">
              <div className="flex items-center justify-center gap-2 text-primary font-bold">
                <Star className="size-4 fill-primary" />
                {user.xp?.toLocaleString() || 0} XP
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-panel border-white/5 overflow-hidden border-0 rounded-[2rem]">
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {loading ? (
              <div className="p-10 text-center text-muted-foreground">Підрахунок результатів...</div>
            ) : topUsers?.slice(3).map((user: any, index: number) => (
              <div 
                key={user.id} 
                className="flex items-center justify-between p-4 md:p-6 hover:bg-white/5 transition-colors group cursor-pointer"
                onClick={() => router.push(`/profile/${user.id}`)}
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 font-headline font-bold text-muted-foreground text-center">
                    {index + 4}
                  </span>
                  <Avatar className="size-10 border border-white/10 group-hover:border-primary/50 transition-colors">
                    <AvatarImage src={user.photoURL || `https://picsum.photos/seed/${user.id}/100`} />
                    <AvatarFallback>{user.displayName?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-white group-hover:text-primary transition-colors truncate">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.gradeLevel || "Учень"}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-white">{user.xp?.toLocaleString() || 0}</p>
                  <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-widest">Досвід</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}