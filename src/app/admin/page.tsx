"use client";

import * as React from "react";
import {
  ShieldAlert,
  Trash2,
  Coins,
  Loader2,
  Ban,
  MessageSquare,
  LifeBuoy,
  Send,
  MicOff,
  Mic,
  UserCog,
  Plus,
  Lock,
  XCircle,
  Crown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCollection, useFirestore, useUser, useDoc } from "@/firebase";
import {
  collection,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { deleteReportMessages } from "@/lib/report-utils";
import { toast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const QUICK_REPLIES = [
  "Вітаю! Яке у вас запитання?",
  "Напишіть детальніше про проблему.",
  "Ми вже працюємо над цим!",
  "Передано спеціалісту.",
];

const ROLES_FOR_OWNER = ["user", "tester", "admin", "owner"];
const ROLES_FOR_ADMIN = ["user", "tester", "admin"];

export default function AdminHub() {
  const { user: currentUser } = useUser();
  const db = useFirestore();

  const userProfileRef = React.useMemo(
    () => (currentUser ? doc(db, "users", currentUser.uid) : null),
    [db, currentUser],
  );
  const { data: profile, loading: profileLoading } = useDoc(userProfileRef);

  const usersQuery = React.useMemo(
    () => query(collection(db, "users"), orderBy("displayName", "asc")),
    [db],
  );
  const { data: users } = useCollection(usersQuery);

  const reportsQuery = React.useMemo(
    () =>
      query(
        collection(db, "reports"),
        orderBy("status", "asc"),
        orderBy("createdAt", "desc"),
      ),
    [db],
  );
  const { data: reports } = useCollection(reportsQuery);

  const [activeReportId, setActiveReportId] = React.useState<string | null>(
    null,
  );
  const [replyText, setReplyText] = React.useState("");

  const reportMessagesQuery = React.useMemo(
    () =>
      activeReportId
        ? query(
            collection(db, "reports", activeReportId, "messages"),
            orderBy("createdAt", "desc"),
          )
        : null,
    [db, activeReportId],
  );
  const { data: supportMessages } = useCollection(reportMessagesQuery);

  const handleUpdateUser = async (
    userId: string,
    data: any,
    targetRole: string,
  ) => {
    // Власник недоторканний
    if (
      targetRole === "owner" &&
      (data.isBanned !== undefined || data.isMuted !== undefined)
    ) {
      toast({
        title: "Помилка",
        description: "Власник недоторканний!",
        variant: "destructive",
      });
      return;
    }

    // Заборона змінювати свій профіль
    if (userId === currentUser?.uid) {
      toast({
        title: "Помилка",
        description: "Не можна змінювати свій профіль!",
        variant: "destructive",
      });
      return;
    }

    // Тільки owner може давати роль owner
    if (data.role === "owner" && role !== "owner") {
      toast({
        title: "Помилка",
        description: "Тільки власник може призначати роль Owner!",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDoc(doc(db, "users", userId), data);
      toast({ title: "Дані оновлено" });
    } catch (e) {
      toast({ title: "Помилка", variant: "destructive" });
    }
  };

  const handleAddCoins = async (userId: string, amount: number) => {
    // Заборона додавати монети собі
    if (userId === currentUser?.uid) {
      toast({
        title: "Помилка",
        description: "Не можна додавати монети собі!",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDoc(doc(db, "users", userId), { coins: increment(amount) });
      toast({ title: "Монети додано" });
    } catch (e) {
      toast({ title: "Помилка", variant: "destructive" });
    }
  };

  const handleSendReply = async (customText?: string) => {
    const messageToSend = customText || replyText;
    if (!currentUser || !messageToSend.trim() || !activeReportId) return;

    try {
      await addDoc(collection(db, "reports", activeReportId, "messages"), {
        senderId: currentUser.uid,
        senderName: profile?.displayName || "Адміністратор Hub",
        text: messageToSend.trim(),
        createdAt: serverTimestamp(),
        isAdmin: true,
      });
      await updateDoc(doc(db, "reports", activeReportId), {
        lastMessage: messageToSend.trim(),
        status: "active",
      });
      setReplyText("");
    } catch (e) {
      toast({ title: "Помилка відповіді", variant: "destructive" });
    }
  };

  const handleCloseReport = async (id: string) => {
    try {
      await deleteReportMessages(db, id);
      await updateDoc(doc(db, "reports", id), { status: "closed" });
      toast({ title: "Звернення закрито" });
    } catch (e) {
      toast({ title: "Помилка", variant: "destructive" });
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!confirm("Видалити репорт назавжди?")) return;
    try {
      await deleteReportMessages(db, id);
      await deleteDoc(doc(db, "reports", id));
      if (activeReportId === id) setActiveReportId(null);
      toast({ title: "Репорт видалено" });
    } catch (e) {
      toast({ title: "Помилка видалення", variant: "destructive" });
    }
  };

  if (profileLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary size-10" />
      </div>
    );

  const role = profile?.role || "user";
  if (role !== "admin" && role !== "owner" && role !== "tester")
    return (
      <div className="h-screen flex items-center justify-center text-muted-foreground">
        Доступ обмежено.
      </div>
    );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-10 animate-reveal pb-20 scrollbar-none">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl cyber-gradient flex items-center justify-center">
            <ShieldAlert className="text-white size-8" />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-headline font-bold text-white">
              Адмін <span className="text-primary">Hub</span>
            </h1>
            <p className="text-muted-foreground text-sm uppercase tracking-[0.3em] font-black mt-1">
              Керування системою
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-primary/20 bg-primary/5 px-6 py-2 text-primary font-black uppercase tracking-widest rounded-xl"
        >
          {role}
        </Badge>
      </header>

      <Tabs defaultValue="users" className="space-y-8">
        <TabsList className="glass-panel p-1.5 rounded-2xl h-16 border-0 w-full md:w-auto">
          <TabsTrigger
            value="users"
            className="rounded-xl px-10 h-full flex-1 md:flex-none font-bold"
          >
            Користувачі
          </TabsTrigger>
          <TabsTrigger
            value="support"
            className="rounded-xl px-10 h-full flex-1 md:flex-none font-bold"
          >
            Підтримка
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="glass-panel border-0 rounded-[2rem] overflow-hidden">
            <div className="overflow-x-auto scrollbar-none">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="px-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                      Користувач
                    </TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                      Роль
                    </TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                      Баланс
                    </TableHead>
                    <TableHead className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                      Статус
                    </TableHead>
                    <TableHead className="text-right px-8 font-black uppercase text-[10px] tracking-widest text-muted-foreground">
                      Дії
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u: any) => {
                    const isTargetOwner = u.role === "owner";
                    const isSelf = u.id === currentUser?.uid;
                    const availableRoles =
                      role === "owner" ? ROLES_FOR_OWNER : ROLES_FOR_ADMIN;
                    return (
                      <TableRow
                        key={u.id}
                        className={cn(
                          "hover:bg-white/5 transition-colors border-white/5",
                          isSelf && "bg-primary/5",
                        )}
                      >
                        <TableCell className="px-8 flex items-center gap-4 py-6">
                          <Avatar className="size-12 border-2 border-white/10">
                            <AvatarImage
                              src={u.photoURL}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold">
                              {u.displayName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-lg leading-none">
                                {u.displayName}
                              </span>
                              {isTargetOwner && (
                                <Crown className="size-4 text-yellow-500" />
                              )}
                              {isSelf && (
                                <Badge className="bg-primary/20 text-primary border-primary/20 rounded-md font-black text-[8px] tracking-widest px-1.5 py-0.5">
                                  ВИ
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-primary font-black uppercase tracking-widest mt-2">
                              {(u.gradeLevel || "Новачок").toString().trim()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isSelf || isTargetOwner}
                                className={cn(
                                  "bg-white/5 border-white/10 rounded-xl h-9 hover:bg-primary/10 transition-all gap-2 group",
                                  (isSelf || isTargetOwner) &&
                                    "opacity-50 cursor-not-allowed",
                                )}
                              >
                                <UserCog className="size-3.5 text-primary" />
                                <span className="font-bold uppercase text-[10px] tracking-wider">
                                  {u.role || "user"}
                                </span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="glass-panel border-white/10 rounded-xl p-2 w-48">
                              {availableRoles.map((r) => (
                                <DropdownMenuItem
                                  key={r}
                                  className={cn(
                                    "rounded-lg font-bold uppercase text-[10px] tracking-widest mb-1 text-white",
                                    u.role === r
                                      ? "bg-primary/20 text-primary"
                                      : "hover:bg-white/5",
                                  )}
                                  onClick={() =>
                                    handleUpdateUser(u.id, { role: r }, u.role)
                                  }
                                >
                                  {r}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                              <Coins className="size-3.5" />
                              <span className="font-black text-xs">
                                {isTargetOwner ? "∞" : u.coins || 0}
                              </span>
                            </div>
                            {!isTargetOwner && !isSelf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 rounded-lg hover:bg-green-500/10 hover:text-green-500"
                                onClick={() => handleAddCoins(u.id, 100)}
                              >
                                <Plus className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {u.isBanned && (
                              <Badge
                                variant="destructive"
                                className="rounded-md font-black text-[9px] tracking-widest px-2 py-1"
                              >
                                BANNED
                              </Badge>
                            )}
                            {u.isMuted && (
                              <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 rounded-md font-black text-[9px] tracking-widest px-2 py-1">
                                MUTED
                              </Badge>
                            )}
                            {!u.isBanned && !u.isMuted && (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20 rounded-md font-black text-[9px] tracking-widest px-2 py-1">
                                ACTIVE
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-8">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isTargetOwner || isSelf}
                              className={cn(
                                "rounded-xl",
                                u.isMuted
                                  ? "text-orange-500 bg-orange-500/10"
                                  : "text-muted-foreground hover:bg-white/5",
                                (isTargetOwner || isSelf) &&
                                  "opacity-20 cursor-not-allowed",
                              )}
                              onClick={() =>
                                handleUpdateUser(
                                  u.id,
                                  { isMuted: !u.isMuted },
                                  u.role,
                                )
                              }
                            >
                              {u.isMuted ? (
                                <MicOff className="size-4" />
                              ) : (
                                <Mic className="size-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isTargetOwner || isSelf}
                              className={cn(
                                "rounded-xl",
                                u.isBanned
                                  ? "text-green-500 bg-green-500/10"
                                  : "text-destructive hover:bg-destructive/10",
                                (isTargetOwner || isSelf) &&
                                  "opacity-20 cursor-not-allowed",
                              )}
                              onClick={() =>
                                handleUpdateUser(
                                  u.id,
                                  { isBanned: !u.isBanned },
                                  u.role,
                                )
                              }
                            >
                              <Ban className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent
          value="support"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          <Card className="glass-panel border-0 p-8 space-y-6 rounded-[2.5rem] h-fit overflow-y-auto max-h-[700px] scrollbar-none">
            <h2 className="font-bold flex items-center gap-3 text-xl text-white">
              <LifeBuoy className="size-6 text-primary" /> Активні репорти
            </h2>
            <div className="space-y-3">
              {reports?.map((t: any) => (
                <div key={t.id} className="group relative">
                  <button
                    onClick={() => setActiveReportId(t.id)}
                    className={cn(
                      "w-full p-5 rounded-2xl text-left transition-all border border-transparent text-white",
                      activeReportId === t.id
                        ? "cyber-gradient"
                        : "bg-white/5 hover:bg-white/10",
                      t.status === "closed" ? "opacity-50 border-white/10" : "",
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-bold truncate text-sm">{t.userName}</p>
                      {t.status === "closed" && (
                        <Badge className="bg-white/20 text-[8px] rounded h-4">
                          CLOSED
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-white/50 truncate mt-2 font-medium">
                      {t.lastMessage}
                    </p>
                  </button>
                  <div className="absolute right-3 top-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-white/50 hover:bg-white/10 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseReport(t.id);
                      }}
                    >
                      <Lock className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReport(t.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {!reports?.length && (
                <p className="text-center py-10 text-muted-foreground opacity-30 italic">
                  Немає активних звернень
                </p>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-2 glass-panel border-0 flex flex-col h-[700px] rounded-[2.5rem] overflow-hidden">
            {activeReportId ? (
              <>
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white">
                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="size-5 text-primary" />
                    </div>
                    <span className="font-bold text-lg">Діалог репорта</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveReportId(null)}
                    className="rounded-xl"
                  >
                    <XCircle className="size-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 flex flex-col-reverse scrollbar-none overscroll-contain">
                  {supportMessages?.map((msg: any, i: number) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-4",
                        msg.isAdmin ? "flex-row-reverse" : "justify-start",
                      )}
                    >
                      <Avatar className="size-10 border border-white/10 mt-auto shrink-0">
                        <AvatarFallback className="text-[10px] font-bold bg-white/5 text-white">
                          {msg.isAdmin ? "A" : msg.senderName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "max-w-[75%] p-4 rounded-2xl",
                          msg.isAdmin
                            ? "cyber-gradient text-white rounded-br-none"
                            : "bg-white/10 text-white border border-white/5 rounded-bl-none",
                        )}
                      >
                        <p className="text-[9px] font-black uppercase text-white/40 mb-1 tracking-widest">
                          {msg.isAdmin ? "Адмін" : msg.senderName}
                        </p>
                        <p className="text-[15px] font-medium leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-8 border-t border-white/5 space-y-4 bg-black/30 backdrop-blur-md">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_REPLIES.map((q, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        size="sm"
                        className="text-[10px] font-bold rounded-xl bg-white/5 h-8 px-4 text-white hover:bg-primary/20 hover:border-primary/50"
                        onClick={() => handleSendReply(q)}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-4">
                    <Input
                      placeholder="Відповідь..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                      className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-white"
                    />
                    <Button
                      className="cyber-gradient size-14 shrink-0 rounded-2xl"
                      onClick={() => handleSendReply()}
                    >
                      <Send className="size-5 text-white" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/30 space-y-4">
                <MessageSquare className="size-20" />
                <p className="text-xl font-bold uppercase tracking-widest">
                  Виберіть репорт
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
