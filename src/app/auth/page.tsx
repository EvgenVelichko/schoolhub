"use client";

import * as React from "react";
import { Zap, Mail, Lock, User, ShieldCheck, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, useUser, useFirestore } from "@/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";

export default function AuthPage() {
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { user } = useUser();
  const [isPending, setIsPending] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");

  const initUserProfile = async (
    uid: string,
    displayName: string | null,
    photoURL: string | null,
  ): Promise<{ isNew: boolean; isNzConnected: boolean }> => {
    const userRef = doc(db, "users", uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      await setDoc(
        userRef,
        {
          uid,
          displayName: displayName || "Новий учень",
          photoURL: photoURL || `https://picsum.photos/seed/${uid}/200/200`,
          coins: 200,
          level: 1,
          xp: 0,
          academicStatus: "Новачок",
          role: "user",
          isBanned: false,
          isMuted: false,
          isNzConnected: false,
          purchasedItems: [],
          settings: {
            notificationsEnabled: true,
            privateProfile: false,
          },
        },
        { merge: true },
      );
      return { isNew: true, isNzConnected: false };
    }
    return {
      isNew: false,
      isNzConnected: docSnap.data()?.isNzConnected ?? false,
    };
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const { isNew, isNzConnected } = await initUserProfile(
        result.user.uid,
        result.user.displayName,
        result.user.photoURL,
      );
      toast({
        title: "Вітаємо!",
        description: `Ви увійшли як ${result.user.displayName}`,
      });

      if (isNew || !isNzConnected) {
        router.push("/sync");
      } else {
        router.push("/");
      }
    } catch (e: any) {
      toast({
        title: "Помилка входу",
        description: e.message,
        variant: "destructive",
      });
    }
  };

  const handleEmailAction = async (action: "login" | "register") => {
    if (!email || !password || (action === "register" && !name)) {
      toast({
        title: "Увага",
        description: "Заповніть всі необхідні поля",
        variant: "destructive",
      });
      return;
    }
    setIsPending(true);
    try {
      if (action === "register") {
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        await updateProfile(result.user, { displayName: name });
        await initUserProfile(result.user.uid, name, null);
        toast({ title: "Успіх", description: `Аккаунт створено для ${name}` });
        router.push("/sync");
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const { isNzConnected } = await initUserProfile(
          result.user.uid,
          result.user.displayName,
          result.user.photoURL,
        );
        toast({
          title: "З поверненням!",
          description: "Вхід виконано успішно.",
        });
        if (!isNzConnected) {
          router.push("/sync");
        } else {
          router.push("/");
        }
      }
    } catch (e: any) {
      toast({
        title: "Помилка",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 bg-background relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/20 blur-[150px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-secondary/20 blur-[150px] rounded-full animate-pulse-slow" />
      </div>

      <div className="w-full max-w-lg relative z-10 animate-reveal">
        <div className="mb-8 sm:mb-12 flex flex-col items-center">
          <Link href="/" className="group mb-4 sm:mb-6">
            <div className="size-16 sm:size-20 rounded-[1.25rem] sm:rounded-[1.75rem] cyber-gradient flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
              <Zap className="text-white size-8 sm:size-10" />
            </div>
          </Link>
          <h1 className="text-3xl sm:text-5xl font-headline font-bold text-white tracking-tighter text-glow text-center">
            School <span className="text-primary">Hub</span>
          </h1>
          <p className="text-muted-foreground mt-2 sm:mt-4 text-sm sm:text-lg font-medium text-center max-w-xs">
            Увійдіть, щоб продовжити свою академічну подорож
          </p>
        </div>

        <Card className="glass-panel border-white/5 border-0 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 p-1.5 sm:p-2 rounded-t-[2rem] sm:rounded-t-[2.5rem] rounded-b-none h-12 sm:h-16">
              <TabsTrigger
                value="login"
                className="rounded-xl sm:rounded-2xl py-2 sm:py-3 text-xs sm:text-sm font-bold data-[state=active]:cyber-gradient data-[state=active]:text-white"
              >
                ВХІД
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="rounded-xl sm:rounded-2xl py-2 sm:py-3 text-xs sm:text-sm font-bold data-[state=active]:cyber-gradient data-[state=active]:text-white"
              >
                РЕЄСТРАЦІЯ
              </TabsTrigger>
            </TabsList>

            <CardContent className="p-5 sm:p-10">
              <TabsContent
                value="login"
                className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500"
              >
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >
                      Електронна пошта
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@school.com"
                        className="pl-12 bg-white/5 border-white/10 h-14 rounded-2xl focus:ring-primary/30 transition-all text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <Label
                        htmlFor="password"
                        className="text-xs font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Пароль
                      </Label>
                      <button className="text-[10px] font-bold text-primary hover:underline">
                        Забули пароль?
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-12 bg-white/5 border-white/10 h-14 rounded-2xl focus:ring-primary/30 transition-all text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full cyber-gradient border-0 h-16 rounded-[1.25rem] font-black text-lg mt-4 group"
                    onClick={() => handleEmailAction("login")}
                    disabled={isPending}
                  >
                    {isPending ? (
                      "ЗАВАНТАЖЕННЯ..."
                    ) : (
                      <>
                        УВІЙТИ{" "}
                        <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent
                value="register"
                className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500"
              >
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >
                      Повне ім'я
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="name"
                        placeholder="Олександр Шевченко"
                        className="pl-12 bg-white/5 border-white/10 h-14 rounded-2xl focus:ring-primary/30 transition-all text-white"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="reg-email"
                      className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >
                      Електронна пошта
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="student@school.com"
                        className="pl-12 bg-white/5 border-white/10 h-14 rounded-2xl focus:ring-primary/30 transition-all text-white"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="reg-password"
                      className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1"
                    >
                      Пароль
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-12 bg-white/5 border-white/10 h-14 rounded-2xl focus:ring-primary/30 transition-all text-white"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full cyber-gradient border-0 h-16 rounded-[1.25rem] font-black text-lg mt-4 group"
                    onClick={() => handleEmailAction("register")}
                    disabled={isPending}
                  >
                    {isPending ? (
                      "ЗАЧЕКАЙТЕ..."
                    ) : (
                      <>
                        СТВОРИТИ АККАУНТ{" "}
                        <ArrowRight className="ml-2 size-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/5"></span>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-black">
                  <span className="bg-[#1a1226] px-4 rounded-full">
                    АБО ЧЕРЕЗ
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full bg-white/5 border-white/10 hover:bg-white/10 h-16 rounded-[1.25rem] text-white font-bold flex items-center justify-center gap-3 transition-all"
                onClick={handleGoogleLogin}
              >
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Продовжити з Google
              </Button>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
