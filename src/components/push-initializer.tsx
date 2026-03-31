"use client";

import React from "react";
import { useUser, useFirestore, useFirebaseApp } from "@/firebase";
import { requestNotificationPermission, onForegroundMessage } from "@/lib/push-notifications";
import { toast } from "@/hooks/use-toast";

const SYNC_INTERVAL = 10 * 60 * 1000; // 10 minutes

export function PushInitializer() {
  const { user } = useUser();
  const db = useFirestore();
  const app = useFirebaseApp();
  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    // Request push permission after short delay (don't block UI)
    const timer = setTimeout(async () => {
      await requestNotificationPermission(app, db, user.uid);

      // Register periodic background sync for NZ grades
      if ("serviceWorker" in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          // Try periodic sync (Chrome only) — every 10 minutes
          if ("periodicSync" in reg) {
            await (reg as any).periodicSync.register("nz-background-sync", {
              minInterval: SYNC_INTERVAL,
            });
          }
        } catch {
          // Periodic sync not available, will rely on setInterval fallback
        }
      }
    }, 3000);

    // Client-side fallback: sync every 10 minutes while page is open
    const intervalId = setInterval(async () => {
      try {
        await fetch("/api/sync-cron", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        // silent fail
      }
    }, SYNC_INTERVAL);

    // Also sync on visibility change (when user comes back to tab)
    const handleVisibility = async () => {
      if (document.visibilityState === "visible") {
        try {
          await fetch("/api/sync-cron", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          });
        } catch {
          // silent fail
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Listen for foreground messages
    onForegroundMessage(app, (payload) => {
      toast({
        title: payload.title,
        description: payload.body,
      });
    });

    return () => {
      clearTimeout(timer);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, db, app]);

  return null;
}
