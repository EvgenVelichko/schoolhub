"use client";

import * as React from "react";
import { BookOpen, GraduationCap, ExternalLink, Sparkles, Library } from "lucide-react";
import { motion } from "framer-motion";

const resources = [
  {
    title: "ГДЗ НА ВСЕ",
    subtitle: "Готові домашні завдання з усіх предметів",
    description: "Усі відповіді та розв'язки для 1-11 класів. Алгебра, геометрія, фізика, хімія, мови та інше.",
    href: "https://shkola.in.ua/hdz/#google_vignette",
    icon: BookOpen,
    gradient: "from-violet-600 via-purple-600 to-indigo-700",
    glowColor: "shadow-violet-500/30",
    borderColor: "border-violet-500/30",
    iconBg: "bg-violet-500/20",
    iconColor: "text-violet-300",
    tagColor: "bg-violet-500/20 text-violet-300",
    tag: "ГДЗ",
  },
  {
    title: "ВСІ ПІДРУЧНИКИ",
    subtitle: "Електронна бібліотека шкільних підручників",
    description: "Читай підручники онлайн безкоштовно. Усі предмети, усі класи, нова програма.",
    href: "https://pidruchnyk.com.ua/",
    icon: Library,
    gradient: "from-cyan-600 via-blue-600 to-indigo-700",
    glowColor: "shadow-cyan-500/30",
    borderColor: "border-cyan-500/30",
    iconBg: "bg-cyan-500/20",
    iconColor: "text-cyan-300",
    tagColor: "bg-cyan-500/20 text-cyan-300",
    tag: "КНИГИ",
  },
];

export default function MaterialsPage() {
  return (
    <div className="h-[100dvh] flex flex-col bg-background animate-reveal overflow-hidden">
      {/* Header */}
      <header className="mobile-header-blur p-4 sm:p-6 shrink-0">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">
              Навчальні матеріали
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-headline font-bold text-white tracking-tight">
            ГДЗ та Підручники
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
            Усе для навчання в одному місці
          </p>
        </motion.div>
      </header>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-4 sm:px-6 pb-28">
        <div className="max-w-lg mx-auto space-y-5 pt-2">
          {resources.map((res, i) => (
            <motion.a
              key={res.title}
              href={res.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.15, type: "spring", stiffness: 200, damping: 20 }}
              className={`block relative overflow-hidden rounded-[1.75rem] border ${res.borderColor} bg-gradient-to-br ${res.gradient} p-[1px] group cursor-pointer`}
            >
              {/* Inner card */}
              <div className="relative rounded-[calc(1.75rem-1px)] bg-background/90 backdrop-blur-xl p-6 sm:p-8 overflow-hidden">
                {/* Glow effect */}
                <div className={`absolute -top-20 -right-20 size-40 rounded-full bg-gradient-to-br ${res.gradient} opacity-20 blur-3xl group-hover:opacity-40 transition-opacity duration-500`} />
                <div className={`absolute -bottom-10 -left-10 size-32 rounded-full bg-gradient-to-br ${res.gradient} opacity-10 blur-2xl group-hover:opacity-25 transition-opacity duration-500`} />

                {/* Content */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`size-14 sm:size-16 rounded-2xl ${res.iconBg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                        <res.icon className={`size-7 sm:size-8 ${res.iconColor}`} />
                      </div>
                      <div>
                        <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${res.tagColor} mb-1.5`}>
                          {res.tag}
                        </span>
                        <h2 className="text-lg sm:text-xl font-headline font-bold text-white leading-tight">
                          {res.title}
                        </h2>
                      </div>
                    </div>
                    <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                      <ExternalLink className="size-4.5 text-white/50 group-hover:text-white/80 transition-colors" />
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-white/80 mb-1.5">
                    {res.subtitle}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {res.description}
                  </p>

                  {/* Bottom action hint */}
                  <div className="mt-5 flex items-center gap-2 text-xs font-bold text-white/40 group-hover:text-white/70 transition-colors">
                    <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${res.borderColor.replace('border-', 'via-')} to-transparent opacity-30`} />
                    <span className="uppercase tracking-widest text-[9px]">Відкрити сайт</span>
                    <div className={`h-px flex-1 bg-gradient-to-r from-transparent ${res.borderColor.replace('border-', 'via-')} to-transparent opacity-30`} />
                  </div>
                </div>
              </div>
            </motion.a>
          ))}

          {/* Info card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel rounded-2xl p-5 border border-white/5"
          >
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <GraduationCap className="size-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">Підказка</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Обирай свій клас та предмет на будь-якому з сайтів. Всі ГДЗ та підручники доступні безкоштовно та відповідають новій шкільній програмі.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
