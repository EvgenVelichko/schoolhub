import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminMessaging } from "@/lib/firebase-admin";

/**
 * Sends push notification to a specific user by userId
 * Body: { userId, title, body, link?, tag? }
 *
 * Also supports notifying all members of a group:
 * Body: { groupId, title, body, link?, tag?, excludeUserId? }
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { title, body, link, tag } = data;

    if (!title || !body) {
      return NextResponse.json(
        { error: "Missing title or body" },
        { status: 400 },
      );
    }

    let targetTokens: string[] = [];

    if (data.userId) {
      // Send to specific user
      const userDoc = await getAdminDb().collection("users").doc(data.userId).get();
      targetTokens = userDoc.data()?.fcmTokens || [];
    } else if (data.groupId) {
      // Send to all members of group (find users with matching membership)
      const membershipsSnap = await getAdminDb()
        .collectionGroup("memberships")
        .where("id", "==", data.groupId)
        .get();

      const userIds = new Set<string>();
      for (const memberDoc of membershipsSnap.docs) {
        // memberships path: users/{userId}/memberships/{groupId}
        const userId = memberDoc.ref.parent.parent?.id;
        if (userId && userId !== data.excludeUserId) {
          userIds.add(userId);
        }
      }

      // Get all tokens
      for (const uid of userIds) {
        const userDoc = await getAdminDb().collection("users").doc(uid).get();
        const tokens: string[] = userDoc.data()?.fcmTokens || [];
        targetTokens.push(...tokens);
      }
    }

    if (!targetTokens.length) {
      return NextResponse.json({ sent: 0 });
    }

    const results = await Promise.allSettled(
      targetTokens.map((token) =>
        getAdminMessaging().send({
          token,
          notification: { title, body },
          data: {
            link: link || "/",
            tag: tag || "default",
          },
          webpush: {
            fcmOptions: { link: link || "/" },
            notification: {
              icon: "/icon-192.png",
              badge: "/icon-192.png",
            },
          },
        }),
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ sent });
  } catch (e: any) {
    console.error("Notify API error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
