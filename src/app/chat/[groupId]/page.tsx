"use client";

import * as React from "react";
import {
  Send,
  Hash,
  Loader2,
  Users,
  ChevronLeft,
  Pin,
  Reply,
  MoreVertical,
  Trash2,
  Edit3,
  X,
  MessageSquare,
  Lock,
  Unlock,
  Smile,
  ArrowDown,
  Check,
  Copy,
  Search,
  Settings,
  Shield,
  Crown,
  BarChart3,
  Megaphone,
  Plus,
  Minus,
  Bot,
  ArrowUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import {
  doc,
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  limit,
  updateDoc,
  deleteDoc,
  getDoc,
  where,
  getDocs,
  collectionGroup,
} from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { notifyUser } from "@/lib/send-notification";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays } from "date-fns";
import { uk } from "date-fns/locale";
import { isFriday, buildFridayLessons } from "@/lib/friday-schedule";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "💀", "👀"];

function formatTime(timestamp: any): string {
  if (!timestamp) return "";
  try {
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(d, "HH:mm");
  } catch {
    return "";
  }
}

function formatDate(timestamp: any): string {
  if (!timestamp) return "";
  try {
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Сьогодні";
    if (d.toDateString() === yesterday.toDateString()) return "Вчора";
    return format(d, "d MMMM", { locale: uk });
  } catch {
    return "";
  }
}

function needsDateSep(cur: any, prev: any): boolean {
  if (!prev) return true;
  const a = cur?.createdAt?.toDate?.();
  const b = prev?.createdAt?.toDate?.();
  if (!a || !b) return false;
  return a.toDateString() !== b.toDateString();
}

/* ─── Poll Card ──────────────────────────────────────── */

function PollCard({
  msg, user, onVote,
}: {
  msg: any; user: any; onVote: (msgId: string, optIdx: number) => void;
}) {
  const options: { text: string; votes: string[] }[] = msg.pollOptions || [];
  const totalVotes = options.reduce((s, o) => s + (o.votes?.length || 0), 0);
  const userVotedIdx = options.findIndex((o) => o.votes?.includes(user?.uid));

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="p-4 pb-2 flex items-start gap-3">
          <div className="size-8 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <BarChart3 className="size-4 text-violet-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white leading-snug">{msg.pollQuestion}</p>
            {msg.pollIsAnonymous && (
              <p className="text-[9px] text-white/20 mt-1 uppercase font-bold tracking-widest">Анонімне</p>
            )}
          </div>
        </div>
        <div className="p-3 pt-2 space-y-1.5">
          {options.map((opt, idx) => {
            const count = opt.votes?.length || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isVoted = userVotedIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => onVote(msg.id, idx)}
                className={cn(
                  "w-full relative rounded-xl overflow-hidden text-left transition-all h-10 flex items-center px-3 border",
                  isVoted ? "border-violet-500/30 bg-violet-500/10" : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]",
                )}
              >
                <div
                  className={cn("absolute inset-y-0 left-0 transition-all duration-500", isVoted ? "bg-violet-500/15" : "bg-white/[0.03]")}
                  style={{ width: `${pct}%` }}
                />
                <span className="relative z-10 text-xs font-medium text-white/80 truncate flex-1">{opt.text}</span>
                <span className={cn("relative z-10 text-[10px] font-bold ml-2 shrink-0", isVoted ? "text-violet-400" : "text-white/30")}>{pct}%</span>
                {isVoted && <Check className="relative z-10 size-3 text-violet-400 ml-1 shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="px-4 pb-3">
          <p className="text-[10px] text-white/20 font-medium">{totalVotes} {totalVotes === 1 ? "голос" : totalVotes < 5 ? "голоси" : "голосів"}</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Announcement Card ──────────────────────────────── */

function AnnouncementCard({ msg }: { msg: any }) {
  return (
    <div className="w-full max-w-md">
      <div className="bg-amber-500/[0.04] border border-amber-500/10 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Megaphone className="size-3.5 text-amber-400" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Оголошення</span>
        </div>
        <p className="text-sm text-white/80 leading-relaxed">{msg.text}</p>
        <p className="text-[9px] text-white/20 font-medium">{msg.senderName} · {formatTime(msg.createdAt)}</p>
      </div>
    </div>
  );
}

/* ─── Members Panel ──────────────────────────────────── */

function MembersPanel({
  groupId, group, currentUserId, onClose,
}: {
  groupId: string; group: any; currentUserId?: string; onClose: () => void;
}) {
  const db = useFirestore();
  const [members, setMembers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    async function loadMembers() {
      try {
        // Find all users who have a membership doc with this groupId
        const membershipsSnap = await getDocs(
          query(collectionGroup(db, "memberships"), where("id", "==", groupId))
        );

        const userIds = new Set<string>();
        for (const memberDoc of membershipsSnap.docs) {
          const userId = memberDoc.ref.parent.parent?.id;
          if (userId) userIds.add(userId);
        }

        // Fetch user profiles
        const profiles: any[] = [];
        for (const uid of userIds) {
          const userDoc = await getDoc(doc(db, "users", uid));
          if (userDoc.exists()) {
            profiles.push({ id: uid, ...userDoc.data() });
          }
        }

        // Sort: admins first, then alphabetically
        const admins = group?.admins || [];
        profiles.sort((a, b) => {
          const aAdmin = admins.includes(a.id) ? 0 : 1;
          const bAdmin = admins.includes(b.id) ? 0 : 1;
          if (aAdmin !== bAdmin) return aAdmin - bAdmin;
          return (a.displayName || "").localeCompare(b.displayName || "");
        });

        if (!cancelled) {
          setMembers(profiles);
          setLoading(false);

          // Update member count on group doc if different
          if (profiles.length !== (group?.memberCount || 0)) {
            updateDoc(doc(db, "groups", groupId), { memberCount: profiles.length }).catch(() => {});
          }
        }
      } catch (e) {
        console.error("Failed to load members:", e);
        if (!cancelled) setLoading(false);
      }
    }

    loadMembers();
    return () => { cancelled = true; };
  }, [db, groupId, group]);

  const admins = group?.admins || [];

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="absolute inset-y-0 right-0 w-full sm:w-80 z-50 bg-background/95 backdrop-blur-2xl border-l border-white/[0.04] flex flex-col"
    >
      <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Users className="size-4 text-white/40" />
          <h3 className="text-sm font-bold text-white">Учасники</h3>
          <span className="text-[10px] text-white/20 font-bold">{members.length}</span>
        </div>
        <Button variant="ghost" size="icon" className="size-8 rounded-lg text-white/30 hover:text-white" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-none">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 text-violet-400 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-xs text-white/20 text-center py-8">Учасників поки немає</p>
        ) : (
          members.map((m) => {
            const isAdmin = admins.includes(m.id);
            const isYou = m.id === currentUserId;
            return (
              <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                <div className="relative">
                  <Avatar className="size-9 border border-white/[0.06]">
                    <AvatarImage src={m.photoURL} className="object-cover" />
                    <AvatarFallback className="text-[10px] font-bold bg-violet-500/10 text-violet-400">
                      {m.displayName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  {isAdmin && (
                    <div className="absolute -bottom-0.5 -right-0.5 size-4 rounded-full bg-amber-500 flex items-center justify-center border-2 border-background">
                      <Crown className="size-2 text-white" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white/80 truncate flex items-center gap-1.5">
                    {m.displayName}
                    {isYou && <span className="text-[9px] text-white/20">(ви)</span>}
                  </p>
                  <p className="text-[10px] text-white/20 truncate">
                    {m.gradeLevel && `${m.gradeLevel} клас`}
                    {isAdmin && " · Адмін"}
                  </p>
                </div>
                <div className="text-[10px] text-white/10 font-bold">Lv.{m.level || 1}</div>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

/* ─── Main Chat ──────────────────────────────────────── */

export default function ClassroomChat() {
  const { groupId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();

  const groupRef = React.useMemo(() => doc(db, "groups", groupId as string), [db, groupId]);
  const { data: group, loading: groupLoading } = useDoc(groupRef);

  const messagesQuery = React.useMemo(
    () => query(collection(db, "groups", groupId as string, "messages"), orderBy("createdAt", "desc"), limit(150)),
    [db, groupId],
  );
  const { data: messages, loading: messagesLoading } = useCollection(messagesQuery);

  const userProfileRef = React.useMemo(() => (user ? doc(db, "users", user.uid) : null), [db, user]);
  const { data: profile } = useDoc(userProfileRef);

  const [text, setText] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<any>(null);
  const [editingMessage, setEditingMessage] = React.useState<any>(null);
  const [showMembers, setShowMembers] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showScrollDown, setShowScrollDown] = React.useState(false);

  const [showPollDialog, setShowPollDialog] = React.useState(false);
  const [pollQuestion, setPollQuestion] = React.useState("");
  const [pollOptions, setPollOptions] = React.useState(["", ""]);
  const [pollIsAnonymous, setPollIsAnonymous] = React.useState(false);

  const [showAnnouncementDialog, setShowAnnouncementDialog] = React.useState(false);
  const [announcementText, setAnnouncementText] = React.useState("");

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const isUserAdmin = React.useMemo(() => {
    if (!user || !group) return false;
    return (group.admins || []).includes(user.uid) || profile?.role === "owner" || profile?.role === "admin";
  }, [user, group, profile]);

  const pinnedMessage = React.useMemo(() => {
    if (!group?.pinnedMessageId || !messages) return null;
    return messages.find((m: any) => m.id === group.pinnedMessageId);
  }, [group, messages]);

  const filteredMessages = React.useMemo(() => {
    if (!messages) return [];
    if (!searchQuery.trim()) return messages;
    return messages.filter(
      (m: any) =>
        m.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.senderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.pollQuestion?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [messages, searchQuery]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    e.target.style.height = "0";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleSend = async () => {
    if (!user || !text.trim()) return;

    if (group?.mode === "channel" && !isUserAdmin) {
      toast({ title: "Обмеження", description: "Тільки адміністратори можуть писати." });
      return;
    }

    const msgText = text.trim();
    try {
      if (editingMessage) {
        updateDoc(doc(db, "groups", groupId as string, "messages", editingMessage.id), { text: msgText, isEdited: true });
        setEditingMessage(null);
      } else {
        addDoc(collection(db, "groups", groupId as string, "messages"), {
          senderId: user.uid,
          senderName: user.displayName,
          senderPhoto: user.photoURL,
          text: msgText,
          type: "text",
          replyToId: replyTo?.id || null,
          replyToText: replyTo?.text || null,
          replyToName: replyTo?.senderName || null,
          reactions: {},
          createdAt: serverTimestamp(),
          isAdmin: isUserAdmin,
        });
      }
      setText("");
      setReplyTo(null);
      if (inputRef.current) inputRef.current.style.height = "44px";

      if (!editingMessage) {
        notifyUser({
          groupId: groupId as string,
          excludeUserId: user.uid,
          title: group?.name || "Чат",
          body: `${user.displayName}: ${msgText.slice(0, 100)}`,
          link: `/chat/${groupId}`,
          tag: `chat-${groupId}`,
        });
      }
    } catch {
      toast({ title: "Помилка відправки", variant: "destructive" });
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const msgRef = doc(db, "groups", groupId as string, "messages", messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;
    const currentReactions = msgSnap.data().reactions || {};
    const usersForEmoji = currentReactions[emoji] || [];
    const updatedUsers = usersForEmoji.includes(user.uid)
      ? usersForEmoji.filter((id: string) => id !== user.uid)
      : [...usersForEmoji, user.uid];
    updateDoc(msgRef, { [`reactions.${emoji}`]: updatedUsers });
  };

  const handlePin = async (messageId: string) => {
    if (!isUserAdmin) return;
    updateDoc(groupRef, { pinnedMessageId: messageId });
    toast({ title: messageId ? "Закріплено" : "Відкріплено" });
  };

  const handleDelete = async (messageId: string) => {
    const msgRef = doc(db, "groups", groupId as string, "messages", messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;
    if (msgSnap.data().senderId === user?.uid || isUserAdmin) {
      deleteDoc(msgRef);
      toast({ title: "Видалено" });
    }
  };

  const handleCopyText = (t: string) => {
    navigator.clipboard.writeText(t);
    toast({ title: "Скопійовано" });
  };

  const toggleChannelMode = async () => {
    if (!isUserAdmin) return;
    const newMode = group?.mode === "channel" ? "group" : "channel";
    updateDoc(groupRef, { mode: newMode });
    toast({ title: newMode === "channel" ? "Режим каналу" : "Режим групи" });
  };

  const handleCreatePoll = async () => {
    if (!user || !pollQuestion.trim()) return;
    const validOptions = pollOptions.filter((o) => o.trim());
    if (validOptions.length < 2) { toast({ title: "Мінімум 2 варіанти" }); return; }
    try {
      await addDoc(collection(db, "groups", groupId as string, "messages"), {
        senderId: user.uid, senderName: user.displayName, senderPhoto: user.photoURL,
        type: "poll", text: "", pollQuestion: pollQuestion.trim(),
        pollOptions: validOptions.map((t) => ({ text: t.trim(), votes: [] })),
        pollIsAnonymous, reactions: {}, createdAt: serverTimestamp(), isAdmin: isUserAdmin,
      });
      setShowPollDialog(false); setPollQuestion(""); setPollOptions(["", ""]); setPollIsAnonymous(false);
    } catch { toast({ title: "Помилка", variant: "destructive" }); }
  };

  const handleVote = async (messageId: string, optionIdx: number) => {
    if (!user) return;
    const msgRef = doc(db, "groups", groupId as string, "messages", messageId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return;
    const data = msgSnap.data();
    const options = [...(data.pollOptions || [])];
    for (const opt of options) opt.votes = (opt.votes || []).filter((id: string) => id !== user.uid);
    const wasVoted = (data.pollOptions[optionIdx]?.votes || []).includes(user.uid);
    if (!wasVoted) options[optionIdx].votes.push(user.uid);
    await updateDoc(msgRef, { pollOptions: options });
  };

  const handleCreateAnnouncement = async () => {
    if (!user || !announcementText.trim()) return;
    try {
      await addDoc(collection(db, "groups", groupId as string, "messages"), {
        senderId: user.uid, senderName: user.displayName, senderPhoto: user.photoURL,
        type: "announcement", text: announcementText.trim(), reactions: {}, createdAt: serverTimestamp(), isAdmin: true,
      });
      setShowAnnouncementDialog(false); setAnnouncementText("");
    } catch { toast({ title: "Помилка", variant: "destructive" }); }
  };

  const handleHwBot = async () => {
    if (!user) return;
    try {
      const tomorrow = addDays(new Date(), 1);
      const tomorrowStr = format(tomorrow, "yyyy-MM-dd");
      let lessons: any[] = [];
      if (isFriday(tomorrowStr)) {
        const snap = await getDocs(query(collection(db, "users", user.uid, "lessons"), where("date", "==", tomorrowStr), orderBy("order", "asc")));
        lessons = buildFridayLessons(tomorrowStr, snap.docs.map((d) => d.data()));
      } else {
        const snap = await getDocs(query(collection(db, "users", user.uid, "lessons"), where("date", "==", tomorrowStr), orderBy("order", "asc")));
        lessons = snap.docs.map((d) => d.data());
      }
      if (lessons.length === 0) { toast({ title: "На завтра уроків не знайдено" }); return; }
      const dayName = format(tomorrow, "EEEE", { locale: uk });
      let hwText = `📚 ДЗ на ${dayName} (${format(tomorrow, "dd.MM")}):\n\n`;
      let hasHw = false;
      lessons.forEach((l: any, i: number) => {
        const hw = l.homework?.trim();
        hwText += `${i + 1}. ${l.subject}: ${hw || "—"}\n`;
        if (hw) hasHw = true;
      });
      if (!hasHw) hwText += "\nДомашнє завдання не знайдено.";
      await addDoc(collection(db, "groups", groupId as string, "messages"), {
        senderId: "hw-bot", senderName: "HW Bot", senderPhoto: "", type: "text",
        text: hwText.trim(), reactions: {}, createdAt: serverTimestamp(), isAdmin: true,
      });
      toast({ title: "ДЗ опубліковано" });
    } catch { toast({ title: "Помилка бота", variant: "destructive" }); }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setShowScrollDown(e.currentTarget.scrollTop < -200);
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (groupLoading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="animate-spin text-violet-400 size-8" />
        <p className="text-[10px] font-bold tracking-widest text-white/20 uppercase">Завантаження...</p>
      </div>
    );

  const memberCount = group?.memberCount || 0;

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden relative">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[-20%] w-[50%] h-[50%] bg-violet-500/[0.02] blur-[100px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-blue-500/[0.015] blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-20 px-3 sm:px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/[0.04] bg-background/60 backdrop-blur-2xl gap-2">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="size-9 rounded-xl hover:bg-white/5 shrink-0" onClick={() => router.back()}>
            <ChevronLeft className="size-5 text-white/50" />
          </Button>
          <div className="size-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 border border-violet-500/10 flex items-center justify-center shrink-0">
            <Hash className="size-4 text-violet-400" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-sm font-bold text-white truncate flex items-center gap-2">
              {group?.name}
              {group?.mode === "channel" && (
                <span className="text-[8px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-md font-bold uppercase">CH</span>
              )}
            </h1>
            <p className="text-[10px] text-white/25 font-medium truncate flex items-center gap-1.5">
              {group?.schoolName}
              {memberCount > 0 && (
                <>
                  <span className="text-white/10">·</span>
                  <span>{memberCount} уч.</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="size-8 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/5"
            onClick={() => { setShowSearch((s) => !s); setSearchQuery(""); }}>
            <Search className="size-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/5"
            onClick={() => setShowMembers((s) => !s)}>
            <Users className="size-3.5" />
          </Button>
          {isUserAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/5">
                  <Settings className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-2xl border-white/[0.06] rounded-xl p-1 w-52">
                <DropdownMenuItem onClick={toggleChannelMode} className="gap-2.5 text-xs rounded-lg text-white/70 h-9">
                  {group?.mode === "channel" ? <Unlock className="size-3.5 text-emerald-400" /> : <Lock className="size-3.5 text-amber-400" />}
                  {group?.mode === "channel" ? "Груповий режим" : "Режим каналу"}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.04]" />
                <DropdownMenuItem onClick={() => setShowAnnouncementDialog(true)} className="gap-2.5 text-xs rounded-lg text-white/70 h-9">
                  <Megaphone className="size-3.5 text-amber-400" /> Оголошення
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleHwBot} className="gap-2.5 text-xs rounded-lg text-white/70 h-9">
                  <Bot className="size-3.5 text-blue-400" /> ДЗ на завтра
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="shrink-0 z-10 overflow-hidden border-b border-white/[0.04] bg-background/80 backdrop-blur-xl">
            <div className="p-3 flex items-center gap-2">
              <Search className="size-3.5 text-white/20 shrink-0" />
              <Input placeholder="Пошук..." className="bg-white/[0.03] border-white/[0.04] h-8 rounded-lg text-xs" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
              <Button variant="ghost" size="icon" className="size-8 shrink-0 text-white/20" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                <X className="size-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned */}
      <AnimatePresence>
        {pinnedMessage && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-violet-500/[0.04] border-b border-violet-500/10 shrink-0 z-10 overflow-hidden">
            <div className="p-2.5 flex items-center justify-between px-4 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Pin className="size-3 text-violet-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-violet-400 font-bold uppercase tracking-widest">Закріплено</p>
                  <p className="text-[11px] text-white/50 truncate">{pinnedMessage.text || pinnedMessage.pollQuestion}</p>
                </div>
              </div>
              {isUserAdmin && (
                <Button variant="ghost" size="icon" className="size-6 shrink-0 text-white/20" onClick={() => handlePin("")}>
                  <X className="size-3" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-3 sm:p-4 flex flex-col-reverse gap-1 scrollbar-none overscroll-contain relative z-10">
          {messagesLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-violet-400 size-5" />
            </div>
          ) : filteredMessages?.length > 0 ? (
            filteredMessages.map((msg: any, idx: number) => {
              const isOwn = msg.senderId === user?.uid;
              const prevMsg = filteredMessages[idx + 1];
              const nextMsg = idx > 0 ? filteredMessages[idx - 1] : null;
              const showDate = needsDateSep(msg, prevMsg);
              const isSameSender = prevMsg?.senderId === msg.senderId && !showDate;
              const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

              if (msg.type === "announcement") {
                return (
                  <React.Fragment key={msg.id}>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex justify-center">
                      <AnnouncementCard msg={msg} />
                    </motion.div>
                    {showDate && (
                      <div className="flex items-center justify-center py-3 mt-2">
                        <div className="bg-white/[0.03] border border-white/[0.04] px-4 py-1 rounded-full">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">{formatDate(msg.createdAt)}</span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              }

              if (msg.type === "poll") {
                return (
                  <React.Fragment key={msg.id}>
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("flex gap-2.5 group relative mt-3", isOwn ? "ml-auto" : "mr-auto")}>
                      {!isOwn && (
                        <div className="w-7 shrink-0 flex flex-col justify-end">
                          <Avatar className="size-7 border border-white/[0.06]">
                            <AvatarImage src={msg.senderPhoto} className="object-cover" />
                            <AvatarFallback className="text-[9px] font-bold bg-violet-500/10 text-violet-400">{msg.senderName?.[0]}</AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        {!isOwn && (
                          <p className="text-[10px] font-semibold text-white/25 px-1 flex items-center gap-1.5">
                            {msg.senderName}
                            {msg.isAdmin && <Crown className="size-2.5 text-amber-400" />}
                          </p>
                        )}
                        <PollCard msg={msg} user={user} onVote={handleVote} />
                      </div>
                    </motion.div>
                    {showDate && (
                      <div className="flex items-center justify-center py-3 mt-2">
                        <div className="bg-white/[0.03] border border-white/[0.04] px-4 py-1 rounded-full">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">{formatDate(msg.createdAt)}</span>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={msg.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn("flex gap-2 max-w-[88%] sm:max-w-[75%] group relative", isOwn ? "ml-auto" : "mr-auto", isSameSender ? "mt-0.5" : "mt-3")}
                  >
                    {!isOwn && (
                      <div className="w-7 shrink-0 flex flex-col justify-end">
                        {isLastInGroup ? (
                          <Avatar className="size-7 border border-white/[0.06]">
                            <AvatarImage src={msg.senderPhoto} className="object-cover" />
                            <AvatarFallback className="text-[9px] font-bold bg-violet-500/10 text-violet-400">{msg.senderName?.[0]}</AvatarFallback>
                          </Avatar>
                        ) : <div className="size-7" />}
                      </div>
                    )}

                    <div className={cn("space-y-1 flex flex-col", isOwn ? "items-end" : "items-start")}>
                      {!isOwn && !isSameSender && (
                        <p className="text-[10px] font-semibold text-white/25 px-1 flex items-center gap-1.5">
                          {msg.senderName}
                          {msg.isAdmin && <Crown className="size-2.5 text-amber-400" />}
                          {msg.senderId === "hw-bot" && <Bot className="size-2.5 text-blue-400" />}
                        </p>
                      )}

                      <div className="relative group/bubble flex items-center gap-1">
                        {isOwn && (
                          <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-6 rounded-full bg-white/[0.03] hover:bg-white/[0.06]">
                                  <MoreVertical className="size-3 text-white/20" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-2xl border-white/[0.06] rounded-xl p-1 w-44">
                                <DropdownMenuItem onClick={() => setReplyTo(msg)} className="gap-2 text-[11px] rounded-lg text-white/60 h-8"><Reply className="size-3" /> Відповісти</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyText(msg.text)} className="gap-2 text-[11px] rounded-lg text-white/60 h-8"><Copy className="size-3" /> Копіювати</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setEditingMessage(msg); setText(msg.text); inputRef.current?.focus(); }} className="gap-2 text-[11px] rounded-lg text-white/60 h-8"><Edit3 className="size-3" /> Редагувати</DropdownMenuItem>
                                {isUserAdmin && <DropdownMenuItem onClick={() => handlePin(msg.id)} className="gap-2 text-[11px] rounded-lg text-white/60 h-8"><Pin className="size-3" /> Закріпити</DropdownMenuItem>}
                                <DropdownMenuSeparator className="bg-white/[0.04]" />
                                <DropdownMenuItem onClick={() => handleDelete(msg.id)} className="gap-2 text-[11px] rounded-lg text-red-400/70 h-8"><Trash2 className="size-3" /> Видалити</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}

                        <div className={cn(
                          "relative px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap",
                          isOwn
                            ? "rounded-2xl rounded-br-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-lg shadow-violet-500/10"
                            : "rounded-2xl rounded-bl-lg bg-white/[0.03] border border-white/[0.05] text-white/80",
                        )}>
                          {msg.replyToId && (
                            <div className={cn("border-l-2 p-2 rounded-lg mb-2 text-[10px]", isOwn ? "bg-black/20 border-white/30" : "bg-white/[0.03] border-violet-500/30")}>
                              <p className="font-bold mb-0.5 truncate opacity-60">{msg.replyToName}</p>
                              <p className="truncate opacity-40">{msg.replyToText}</p>
                            </div>
                          )}
                          <span>{msg.text}</span>
                          <span className={cn("inline-flex items-center gap-1 ml-2 align-bottom float-right mt-1", isOwn ? "text-white/30" : "text-white/15")}>
                            {msg.isEdited && <span className="text-[8px] italic">ред.</span>}
                            <span className="text-[9px] font-medium">{formatTime(msg.createdAt)}</span>
                          </span>
                        </div>

                        {!isOwn && (
                          <div className="opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-6 rounded-full bg-white/[0.03] hover:bg-white/[0.06]">
                                  <MoreVertical className="size-3 text-white/20" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="bg-background/95 backdrop-blur-2xl border-white/[0.06] rounded-xl p-1 w-44">
                                <DropdownMenuItem onClick={() => setReplyTo(msg)} className="gap-2 text-[11px] rounded-lg text-white/60 h-8"><Reply className="size-3" /> Відповісти</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCopyText(msg.text)} className="gap-2 text-[11px] rounded-lg text-white/60 h-8"><Copy className="size-3" /> Копіювати</DropdownMenuItem>
                                {isUserAdmin && (
                                  <>
                                    <DropdownMenuItem onClick={() => handlePin(msg.id)} className="gap-2 text-[11px] rounded-lg text-white/60 h-8"><Pin className="size-3" /> Закріпити</DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-white/[0.04]" />
                                    <DropdownMenuItem onClick={() => handleDelete(msg.id)} className="gap-2 text-[11px] rounded-lg text-red-400/70 h-8"><Trash2 className="size-3" /> Видалити</DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      {/* Quick reactions on hover */}
                      <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5", isOwn ? "justify-end" : "justify-start")}>
                        {QUICK_REACTIONS.map((emoji) => (
                          <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}
                            className="size-6 rounded-full hover:bg-white/[0.06] flex items-center justify-center text-xs transition-all hover:scale-125 active:scale-90">
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Reactions */}
                      {msg.reactions && Object.keys(msg.reactions).some((k: string) => msg.reactions[k].length > 0) && (
                        <div className={cn("flex flex-wrap gap-1", isOwn ? "justify-end" : "justify-start")}>
                          {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) =>
                            users.length > 0 && (
                              <button key={emoji} onClick={() => handleReaction(msg.id, emoji)}
                                className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-all hover:scale-105",
                                  users.includes(user?.uid) ? "bg-violet-500/15 border-violet-500/30 text-violet-400" : "bg-white/[0.03] border-white/[0.04] text-white/40")}>
                                {emoji} {users.length}
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {showDate && (
                    <div className="flex items-center justify-center py-3 mt-2">
                      <div className="bg-white/[0.03] border border-white/[0.04] px-4 py-1 rounded-full">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/20">{formatDate(msg.createdAt)}</span>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <div className="size-20 rounded-[1.5rem] bg-white/[0.02] flex items-center justify-center border border-white/[0.04]">
                <MessageSquare className="size-8 text-white/10" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-white/15">{searchQuery ? "Нічого не знайдено" : "Починайте спілкування"}</p>
                {!searchQuery && <p className="text-[11px] text-white/10">Напишіть перше повідомлення</p>}
              </div>
            </div>
          )}
        </div>

        {/* Members panel overlay */}
        <AnimatePresence>
          {showMembers && (
            <MembersPanel groupId={groupId as string} group={group} currentUserId={user?.uid} onClose={() => setShowMembers(false)} />
          )}
        </AnimatePresence>
      </div>

      {/* Scroll FAB */}
      <AnimatePresence>
        {showScrollDown && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-28 right-4 z-30">
            <Button size="icon" className="size-9 rounded-full bg-violet-500/80 hover:bg-violet-500 text-white shadow-lg" onClick={scrollToBottom}>
              <ArrowDown className="size-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Poll Dialog */}
      <AnimatePresence>
        {showPollDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowPollDialog(false)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-background/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl w-full max-w-md p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <BarChart3 className="size-4 text-violet-400" />
                  </div>
                  <h2 className="text-base font-bold text-white">Опитування</h2>
                </div>
                <Button variant="ghost" size="icon" className="size-7 rounded-lg text-white/20" onClick={() => setShowPollDialog(false)}><X className="size-3.5" /></Button>
              </div>
              <Input placeholder="Запитання..." className="bg-white/[0.03] border-white/[0.04] h-11 rounded-xl text-sm" value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)} autoFocus />
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input placeholder={`Варіант ${idx + 1}`} className="bg-white/[0.03] border-white/[0.04] h-9 rounded-xl text-sm flex-1"
                      value={opt} onChange={(e) => { const n = [...pollOptions]; n[idx] = e.target.value; setPollOptions(n); }} />
                    {pollOptions.length > 2 && (
                      <Button variant="ghost" size="icon" className="size-7 rounded-lg text-red-400/40 hover:text-red-400 shrink-0"
                        onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}><Minus className="size-3" /></Button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 8 && (
                <Button variant="ghost" className="w-full h-8 rounded-xl text-xs text-violet-400/60 gap-2"
                  onClick={() => setPollOptions([...pollOptions, ""])}><Plus className="size-3" /> Додати варіант</Button>
              )}
              <label className="flex items-center gap-3 cursor-pointer px-1">
                <input type="checkbox" checked={pollIsAnonymous} onChange={(e) => setPollIsAnonymous(e.target.checked)} className="accent-violet-500 size-4 rounded" />
                <span className="text-xs text-white/50">Анонімне</span>
              </label>
              <Button className="w-full h-11 rounded-xl bg-violet-500 hover:bg-violet-400 font-bold text-sm"
                onClick={handleCreatePoll} disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}>Створити</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcement Dialog */}
      <AnimatePresence>
        {showAnnouncementDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowAnnouncementDialog(false)}>
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-background/95 backdrop-blur-2xl border border-white/[0.06] rounded-2xl w-full max-w-md p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="size-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Megaphone className="size-4 text-amber-400" />
                  </div>
                  <h2 className="text-base font-bold text-white">Оголошення</h2>
                </div>
                <Button variant="ghost" size="icon" className="size-7 rounded-lg text-white/20" onClick={() => setShowAnnouncementDialog(false)}><X className="size-3.5" /></Button>
              </div>
              <textarea placeholder="Текст оголошення..."
                className="w-full bg-white/[0.03] border border-white/[0.04] rounded-xl text-sm text-white p-3 min-h-[100px] resize-none outline-none focus:ring-1 focus:ring-violet-500/30"
                value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} autoFocus />
              <Button className="w-full h-11 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-sm border border-amber-500/20"
                onClick={handleCreateAnnouncement} disabled={!announcementText.trim()}>Опублікувати</Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — input area */}
      <footer className="relative z-20 border-t border-white/[0.04] bg-background/80 backdrop-blur-2xl">
        <AnimatePresence>
          {(replyTo || editingMessage) && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className={cn("flex items-center justify-between px-4 py-2 border-b", editingMessage ? "bg-blue-500/[0.03] border-blue-500/10" : "bg-violet-500/[0.03] border-violet-500/10")}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn("size-7 rounded-lg flex items-center justify-center shrink-0", editingMessage ? "bg-blue-500/10" : "bg-violet-500/10")}>
                    {editingMessage ? <Edit3 className="size-3 text-blue-400" /> : <Reply className="size-3 text-violet-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-[9px] font-bold uppercase tracking-widest", editingMessage ? "text-blue-400" : "text-violet-400")}>
                      {editingMessage ? "Редагування" : `Відповідь ${replyTo?.senderName}`}
                    </p>
                    <p className="text-[11px] truncate text-white/30">{editingMessage?.text || replyTo?.text}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="size-6 text-white/20 shrink-0"
                  onClick={() => { setReplyTo(null); setEditingMessage(null); setText(""); }}><X className="size-3.5" /></Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-3 sm:p-4 safe-bottom">
          {group?.mode === "channel" && !isUserAdmin ? (
            <div className="h-11 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/[0.04] text-white/15 text-[11px] gap-2 font-medium">
              <Lock className="size-3.5" /> Коментування вимкнено
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon"
                className="size-10 rounded-xl bg-white/[0.03] border border-white/[0.04] text-white/25 hover:bg-white/[0.06] shrink-0"
                onClick={() => setShowPollDialog(true)}>
                <BarChart3 className="size-4" />
              </Button>
              <div className="flex-1 flex items-end gap-2 p-1.5 rounded-xl bg-white/[0.03] border border-white/[0.04] focus-within:border-violet-500/20 transition-colors">
                <textarea ref={inputRef}
                  placeholder={editingMessage ? "Редагувати..." : "Повідомлення..."}
                  className="flex-1 bg-transparent border-0 text-sm text-white placeholder:text-white/15 px-2 py-2 resize-none outline-none min-h-[40px] max-h-[120px] leading-relaxed"
                  style={{ height: "40px" }}
                  value={text}
                  onChange={handleInputChange}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  rows={1}
                />
                <Button
                  className={cn("size-9 rounded-lg shrink-0 transition-all", text.trim() ? "bg-violet-500 hover:bg-violet-400 shadow-md shadow-violet-500/15" : "bg-white/[0.03]")}
                  onClick={handleSend} disabled={!text.trim()} size="icon">
                  <ArrowUp className={cn("size-4", text.trim() ? "text-white" : "text-white/15")} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
