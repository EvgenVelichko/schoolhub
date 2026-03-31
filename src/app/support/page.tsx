"use client";

import * as React from "react";
import {
  Send,
  Loader2,
  ChevronLeft,
  LifeBuoy,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import {
  doc,
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  limit,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { deleteReportMessages } from "@/lib/report-utils";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function SupportChat() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();

  const reportId = React.useMemo(
    () => (user ? `report-${user.uid}` : null),
    [user],
  );
  const reportRef = React.useMemo(
    () => (reportId ? doc(db, "reports", reportId) : null),
    [db, reportId],
  );
  const { data: report, loading: reportLoading } = useDoc(reportRef);

  const messagesQuery = React.useMemo(
    () =>
      reportId
        ? query(
            collection(db, "reports", reportId, "messages"),
            orderBy("createdAt", "desc"),
            limit(50),
          )
        : null,
    [db, reportId],
  );

  const { data: messages, loading: messagesLoading } =
    useCollection(messagesQuery);
  const [text, setText] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleSend = async () => {
    if (!user || !text.trim() || !reportId) return;
    if (report?.status === "closed") return;

    try {
      if (!report) {
        await setDoc(doc(db, "reports", reportId), {
          userId: user.uid,
          userName: user.displayName || "Учень",
          userPhoto: user.photoURL || "",
          createdAt: serverTimestamp(),
          lastMessage: text.trim(),
          status: "active",
        });
        toast({ title: "Репорт створено" });
      }

      await addDoc(collection(db, "reports", reportId, "messages"), {
        senderId: user.uid,
        senderName: user.displayName,
        text: text.trim(),
        createdAt: serverTimestamp(),
        isAdmin: false,
      });
      setText("");
    } catch (e) {
      toast({ title: "Помилка відправки", variant: "destructive" });
    }
  };

  const handleClearAndClose = async () => {
    if (!reportRef || !reportId) return;
    setIsDeleting(true);
    try {
      await deleteReportMessages(db, reportId);
      await deleteDoc(reportRef);
      toast({ title: "Репорт видалено" });
      router.replace("/");
    } catch (e) {
      toast({ title: "Помилка", variant: "destructive" });
      setIsDeleting(false);
    }
  };

  if (reportLoading || isDeleting)
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary size-10" />
      </div>
    );

  const isClosed = report?.status === "closed";

  return (
    <div className="h-[100dvh] flex flex-col bg-background animate-reveal overflow-hidden relative scrollbar-none">
      <header className="mobile-header-blur p-4 flex items-center justify-between shrink-0 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-10 rounded-xl hover:bg-white/10"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-6 text-white" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base font-headline font-bold text-white truncate">
              Підтримка
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
              Reports v2
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <Button
              variant="ghost"
              size="icon"
              className="size-10 rounded-xl text-destructive hover:bg-destructive/10"
              onClick={handleClearAndClose}
            >
              <Trash2 className="size-5" />
            </Button>
          )}
          <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <LifeBuoy className="text-blue-400 size-5" />
          </div>
        </div>
      </header>

      <CardContent className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col-reverse gap-6 scrollbar-none overscroll-contain bg-gradient-to-b from-transparent to-[#0a0512] pb-32">
        <AnimatePresence>
          {isClosed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-red-500/5 border border-red-500/20 p-8 rounded-[2.5rem] text-center space-y-6 mb-4 backdrop-blur-md"
            >
              <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <AlertCircle className="size-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-headline font-bold text-white">
                  Звернення закрито
                </p>
                <p className="text-xs text-muted-foreground">
                  Ви можете видалити цей репорт, щоб почати новий.
                </p>
              </div>
              <Button
                variant="destructive"
                className="w-full h-14 rounded-2xl font-black text-sm uppercase active:scale-95 transition-all"
                onClick={handleClearAndClose}
              >
                ВИДАЛИТИ РЕПОРТ
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {messagesLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-primary" />
          </div>
        ) : isClosed ? null : (
          messages?.map((msg: any, i: number) => {
            const isOwn = !msg.isAdmin;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: isOwn ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                className={cn(
                  "flex gap-3 max-w-[85%]",
                  isOwn ? "ml-auto flex-row-reverse" : "mr-auto",
                )}
              >
                {!isOwn && (
                  <Avatar className="size-9 border border-white/10 shrink-0 mt-auto shadow-md">
                    <AvatarFallback className="text-[9px] font-bold bg-white/5 text-white">
                      A
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "space-y-1.5",
                    isOwn ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "p-4 rounded-2xl text-[15px] transition-all leading-relaxed",
                      isOwn ? "chat-bubble-own" : "chat-bubble-other",
                    )}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[8px] font-black uppercase text-muted-foreground/40 px-2 tracking-widest">
                    {msg.isAdmin ? "Адмін" : "Ви"}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}

        {!messages?.length && !reportLoading && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-20 space-y-6">
            <div className="size-24 rounded-[2rem] bg-white/5 flex items-center justify-center animate-pulse">
              <LifeBuoy className="size-12" />
            </div>
            <p className="text-lg font-headline font-bold uppercase tracking-widest text-center px-10">
              Маєте запитання? Ми тут, щоб допомогти!
            </p>
          </div>
        )}
      </CardContent>

      <footer
        className={cn(
          "fixed bottom-0 left-0 right-0 p-4 md:p-6 bg-background/95 backdrop-blur-3xl border-t border-white/5 flex gap-3 pb-8 md:pb-6 z-50 transition-all duration-500",
          isClosed
            ? "translate-y-full opacity-0 pointer-events-none"
            : "translate-y-0 opacity-100",
        )}
      >
        <Input
          placeholder={isClosed ? "Звернення закрите" : "Напишіть нам..."}
          className="bg-white/5 border-white/10 h-14 rounded-2xl px-6 text-sm text-white focus:ring-primary/40 shadow-inner"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isClosed}
        />
        <Button
          className="cyber-gradient size-14 rounded-2xl shrink-0 active:scale-95 transition-all"
          onClick={handleSend}
          disabled={isClosed}
        >
          <Send className="size-6 text-white" />
        </Button>
      </footer>
    </div>
  );
}
