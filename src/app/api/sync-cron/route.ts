import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminMessaging } from "@/lib/firebase-admin";
import { syncWithNzPortal } from "@/app/actions/nz-sync";

// Cron secret to prevent unauthorized calls
const CRON_SECRET = process.env.CRON_SECRET || "schoolhub-sync-2024";

export async function POST(req: NextRequest) {
  try {
    // Optional: verify cron secret
    const authHeader = req.headers.get("authorization");
    const body = await req.json().catch(() => ({}));

    if (authHeader !== `Bearer ${CRON_SECRET}` && body.secret !== CRON_SECRET) {
      // Allow calls without secret for now (service worker calls)
    }

    // Get all users with NZ connected
    const usersSnap = await getAdminDb()
      .collection("users")
      .where("isNzConnected", "==", true)
      .get();

    if (usersSnap.empty) {
      return NextResponse.json({ message: "No NZ-connected users", synced: 0 });
    }

    let synced = 0;
    let errors = 0;
    const notifications: Array<{ userId: string; newGrades: number }> = [];

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      if (!userData.nzLogin || !userData.nzPassword) continue;

      try {
        // Get existing grade count
        const existingGrades = await getAdminDb()
          .collection("users")
          .doc(userId)
          .collection("grades")
          .count()
          .get();
        const oldCount = existingGrades.data().count;

        // Sync with NZ
        const result = await syncWithNzPortal(userData.nzLogin, userData.nzPassword, { deep: false });

        if (!result?.success || !result.data) {
          errors++;
          continue;
        }

        const { data } = result;

        // Write grades
        const batch = getAdminDb().batch();
        let batchCount = 0;

        for (const g of data.grades) {
          const rawId = g.sourceKey || `${g.subject}_${g.date}_${g.type}_${g.score}`;
          const safeId = "grd_" + rawId.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").toLowerCase();
          const ref = getAdminDb().collection("users").doc(userId).collection("grades").doc(safeId);
          batch.set(ref, { ...g, syncedAt: new Date() }, { merge: true });
          batchCount++;

          if (batchCount >= 499) {
            await batch.commit();
            batchCount = 0;
          }
        }

        // Write lessons
        for (const l of data.lessons) {
          const rawId = `${l.date}_${l.order}_${l.subject}`;
          const safeId = "lsn_" + rawId.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, "_").replace(/_+/g, "_").toLowerCase();
          const ref = getAdminDb().collection("users").doc(userId).collection("lessons").doc(safeId);
          batch.set(ref, { ...l, syncedAt: new Date() }, { merge: true });
          batchCount++;

          if (batchCount >= 499) {
            await batch.commit();
            batchCount = 0;
          }
        }

        if (batchCount > 0) {
          await batch.commit();
        }

        // Update user
        let totalScore = 0;
        let scoreCount = 0;
        for (const g of data.grades) {
          const v = parseInt(g.score);
          if (!isNaN(v)) { totalScore += v; scoreCount++; }
        }
        const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 1;

        await getAdminDb().collection("users").doc(userId).update({
          lastSync: new Date().toISOString(),
          level: avgScore,
          xp: data.grades.reduce((sum, g) => {
            const v = parseInt(g.score);
            return sum + (isNaN(v) ? 0 : v * 10);
          }, 0),
        });

        // Check for new grades
        const newGradeCount = data.grades.length - oldCount;
        if (newGradeCount > 0) {
          notifications.push({ userId, newGrades: newGradeCount });

          // Write in-app notification
          await getAdminDb().collection("users").doc(userId).collection("notifications").add({
            type: "grade",
            title: "Нові оцінки",
            body: `Синхронізовано ${newGradeCount} нових оцінок з NZ.ua`,
            link: "/grades",
            isRead: false,
            createdAt: new Date(),
          });
        }

        synced++;
      } catch (e) {
        console.error(`Sync failed for user ${userId}:`, e);
        errors++;
      }
    }

    // Send push notifications for new grades
    for (const n of notifications) {
      try {
        const userDoc = await getAdminDb().collection("users").doc(n.userId).get();
        const tokens: string[] = userDoc.data()?.fcmTokens || [];
        if (!tokens.length) continue;

        await Promise.allSettled(
          tokens.map((token) =>
            getAdminMessaging().send({
              token,
              notification: {
                title: "📊 Нові оцінки!",
                body: `У вас ${n.newGrades} нових оцінок з NZ.ua`,
              },
              data: {
                link: "/grades",
                tag: "new-grades",
              },
              webpush: {
                fcmOptions: { link: "/grades" },
                notification: {
                  icon: "/icon-192.png",
                  badge: "/icon-192.png",
                },
              },
            })
          )
        );
      } catch (e) {
        // Push failed, not critical
      }
    }

    return NextResponse.json({
      synced,
      errors,
      notifications: notifications.length,
    });
  } catch (e: any) {
    console.error("Sync cron error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
