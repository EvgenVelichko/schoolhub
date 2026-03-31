"use client";

import * as React from "react";
import {
  Send,
  Bot,
  Loader2,
  Sparkles,
  ChevronLeft,
  Trash2,
  Zap,
  Clock,
  ArrowUp,
  BrainCircuit,
  Wand2,
  BookOpen,
  Calculator,
  FlaskConical,
  Languages,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useUser, useDoc, useFirestore } from "@/firebase";
import { doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: number;
};

type SavedChat = {
  messages: Message[];
  savedAt: number;
};

const STORAGE_KEY = "ai-chat-messages";
const CLEAR_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

function loadChat(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const saved: SavedChat = JSON.parse(raw);
    if (Date.now() - saved.savedAt > CLEAR_INTERVAL) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return saved.messages;
  } catch {
    return [];
  }
}

function saveChat(messages: Message[]) {
  if (typeof window === "undefined") return;
  const data: SavedChat = { messages, savedAt: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getTimeUntilClear(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return "";
    const saved: SavedChat = JSON.parse(raw);
    const remaining = CLEAR_INTERVAL - (Date.now() - saved.savedAt);
    if (remaining <= 0) return "";
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return `${hours}г ${mins}хв`;
  } catch {
    return "";
  }
}

const SUBJECTS = [
  { label: "Всі", icon: Sparkles, value: null },
  { label: "Математика", icon: Calculator, value: "Математика" },
  { label: "Фізика", icon: FlaskConical, value: "Фізика" },
  { label: "Мови", icon: Languages, value: "Англійська мова" },
  { label: "Історія", icon: BookOpen, value: "Історія України" },
  { label: "Хімія", icon: FlaskConical, value: "Хімія" },
  { label: "Біологія", icon: Lightbulb, value: "Біологія" },
  { label: "Інформатика", icon: BrainCircuit, value: "Інформатика" },
];

const QUICK_PROMPTS = [
  { text: "Розв'яжи рівняння x² - 5x + 6 = 0", icon: Calculator },
  { text: "Поясни закон Ома простими словами", icon: Zap },
  { text: "Що таке метафора? Наведи приклади", icon: BookOpen },
  { text: "Допоможи написати есе англійською", icon: Languages },
];

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY ?? "";

async function callAI(
  messages: { role: string; text: string }[],
  context: string,
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: context },
        ...messages.map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.text,
        })),
      ],
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Порожня відповідь від AI");
  return text;
}

function formatAIText(text: string) {
  // Split into segments: code blocks vs normal text
  const parts = text.split(/(```[\s\S]*?```)/g);

  return parts.map((part, i) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const inner = part.slice(3, -3);
      const newlineIdx = inner.indexOf("\n");
      const code = newlineIdx >= 0 ? inner.slice(newlineIdx + 1) : inner;
      return (
        <pre
          key={i}
          className="my-2 p-3 rounded-xl bg-black/30 border border-white/5 overflow-x-auto text-xs font-mono text-emerald-400 leading-relaxed"
        >
          <code>{code}</code>
        </pre>
      );
    }

    // Process inline formatting
    return part.split("\n").map((line, j) => {
      // Bold
      const formatted = line.split(/(\*\*.*?\*\*)/g).map((seg, k) => {
        if (seg.startsWith("**") && seg.endsWith("**")) {
          return (
            <strong key={k} className="font-bold text-white">
              {seg.slice(2, -2)}
            </strong>
          );
        }
        return seg;
      });

      return (
        <React.Fragment key={`${i}-${j}`}>
          {j > 0 && <br />}
          {formatted}
        </React.Fragment>
      );
    });
  });
}

export default function AiChatPage() {
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const userDocRef = React.useMemo(
    () => (user ? doc(db, "users", user.uid) : null),
    [db, user],
  );
  const { data: profile } = useDoc(userDocRef);

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [selectedSubject, setSelectedSubject] = React.useState<string | null>(
    null,
  );
  const [timeLeft, setTimeLeft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const gradeLevel = (profile as any)?.gradeLevel || "10";

  // Load messages from localStorage on mount, auto-clear if 24h passed
  React.useEffect(() => {
    setMessages(loadChat());
  }, []);

  // Save messages to localStorage on change
  React.useEffect(() => {
    if (messages.length > 0) saveChat(messages);
  }, [messages]);

  // Update countdown timer
  React.useEffect(() => {
    setTimeLeft(getTimeUntilClear());
    const interval = setInterval(() => {
      const t = getTimeUntilClear();
      setTimeLeft(t);
      if (!t && messages.length > 0) {
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [messages.length]);

  const systemContext = React.useMemo(() => {
    return `Ти — розумний ШІ-помічник для українських школярів під назвою "Нексус". Учень навчається у ${gradeLevel} класі.${selectedSubject ? ` Поточний предмет: ${selectedSubject}.` : ""} Відповідай українською мовою, зрозуміло та структуровано. Допомагай з домашніми завданнями, пояснюй теми, давай приклади. Використовуй форматування: **жирний** для ключових термінів. Якщо задають задачу — показуй покрокове розв'язання. Будь дружелюбним та мотивуючим.`;
  }, [gradeLevel, selectedSubject]);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "0";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: msg,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "44px";
    setLoading(true);

    try {
      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        text: m.text,
      }));
      const response = await callAI(allMessages, systemContext);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: response,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "ai",
          text: "Вибач, сталася помилка. Спробуй ще раз пізніше.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const hasMessages = messages.length > 0 || loading;

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden relative">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-violet-500/[0.04] blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-15%] w-[50%] h-[50%] bg-blue-500/[0.03] blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 py-3 flex items-center justify-between shrink-0 border-b border-white/[0.04] bg-background/60 backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-xl hover:bg-white/5 shrink-0 md:hidden"
            onClick={() => router.back()}
          >
            <ChevronLeft className="size-5 text-white/60" />
          </Button>
          <div className="relative">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
              <BrainCircuit className="size-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2 border-background" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white leading-tight">
              Нексус AI
            </h1>
            <div className="flex items-center gap-1.5">
              <div className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-white/40 font-medium">
                Llama 3.3 70B
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {timeLeft && (
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.04]">
              <Clock className="size-3 text-white/30" />
              <span className="text-[10px] text-white/30 font-medium">
                {timeLeft}
              </span>
            </div>
          )}
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl hover:bg-red-500/10 hover:text-red-400 text-white/30 transition-colors"
              onClick={handleClear}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Subject pills */}
      <div className="relative z-10 px-4 py-2.5 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {SUBJECTS.map((s) => {
          const Icon = s.icon;
          const isActive = selectedSubject === s.value;
          return (
            <button
              key={s.label}
              onClick={() => setSelectedSubject(s.value)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200",
                isActive
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]"
                  : "bg-white/[0.03] text-white/35 border border-white/[0.04] hover:bg-white/[0.06] hover:text-white/50",
              )}
            >
              <Icon className="size-3" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-none relative z-10"
      >
        {!hasMessages ? (
          /* Empty state */
          <div className="h-full flex flex-col items-center justify-center px-6 pb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center"
            >
              <div className="relative mb-8">
                <div className="size-24 rounded-[2rem] bg-gradient-to-br from-violet-500/20 to-blue-500/10 border border-violet-500/10 flex items-center justify-center">
                  <Wand2 className="size-10 text-violet-400/70" />
                </div>
                <div className="absolute -top-2 -right-2 size-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Zap className="size-4 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2 text-center">
                Чим допомогти?
              </h2>
              <p className="text-sm text-white/30 max-w-[280px] text-center leading-relaxed mb-8">
                Задавай питання, проси пояснити тему або розв'язати задачу
              </p>

              <div className="w-full max-w-sm space-y-2">
                {QUICK_PROMPTS.map((hint, i) => {
                  const Icon = hint.icon;
                  return (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.06 }}
                      onClick={() => handleSend(hint.text)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all duration-200 text-left group"
                    >
                      <div className="size-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 group-hover:bg-violet-500/10 transition-colors">
                        <Icon className="size-4 text-white/25 group-hover:text-violet-400 transition-colors" />
                      </div>
                      <span className="text-[13px] text-white/40 group-hover:text-white/60 transition-colors leading-snug">
                        {hint.text}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        ) : (
          /* Chat messages */
          <div className="p-4 space-y-5 pb-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "flex gap-2.5",
                    msg.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {msg.role === "ai" && (
                    <div className="size-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="size-3.5 text-violet-400" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[75%]",
                      msg.role === "user"
                        ? "px-4 py-2.5 rounded-2xl rounded-br-lg bg-gradient-to-r from-violet-600 to-violet-500 text-white text-[13.5px] leading-relaxed shadow-lg shadow-violet-500/10"
                        : "px-4 py-3 rounded-2xl rounded-bl-lg bg-white/[0.03] border border-white/[0.05] text-white/80 text-[13.5px] leading-relaxed",
                    )}
                  >
                    {msg.role === "ai" ? formatAIText(msg.text) : msg.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2.5"
              >
                <div className="size-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                  <Sparkles className="size-3.5 text-violet-400 animate-pulse" />
                </div>
                <div className="px-4 py-3.5 rounded-2xl rounded-bl-lg bg-white/[0.03] border border-white/[0.05] flex items-center gap-1">
                  <div className="size-1.5 rounded-full bg-violet-400/60 typing-dot" />
                  <div className="size-1.5 rounded-full bg-violet-400/60 typing-dot" />
                  <div className="size-1.5 rounded-full bg-violet-400/60 typing-dot" />
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="relative z-10 p-3 sm:p-4 shrink-0 safe-bottom">
        <div className="flex items-end gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] focus-within:border-violet-500/30 focus-within:bg-white/[0.04] transition-all duration-200">
          <textarea
            ref={inputRef}
            placeholder={
              selectedSubject
                ? `Запитай про ${selectedSubject}...`
                : "Напиши повідомлення..."
            }
            className="flex-1 bg-transparent border-0 text-sm text-white placeholder:text-white/20 px-3 py-2.5 resize-none outline-none min-h-[44px] max-h-[120px] leading-relaxed"
            style={{ height: "44px" }}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={loading}
            rows={1}
          />
          <Button
            className={cn(
              "size-10 rounded-xl shrink-0 transition-all duration-200",
              input.trim()
                ? "bg-violet-500 hover:bg-violet-400 shadow-lg shadow-violet-500/20"
                : "bg-white/[0.05] hover:bg-white/[0.08]",
            )}
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            size="icon"
          >
            {loading ? (
              <Loader2 className="size-4 text-white animate-spin" />
            ) : (
              <ArrowUp
                className={cn(
                  "size-4",
                  input.trim() ? "text-white" : "text-white/20",
                )}
              />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
