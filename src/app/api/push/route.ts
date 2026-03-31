import { NextRequest, NextResponse } from "next/server";
import { getAdminMessaging } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { tokens, notification, data } = await req.json();

    if (!tokens?.length || !notification) {
      return NextResponse.json(
        { error: "Missing tokens or notification" },
        { status: 400 },
      );
    }

    // Send to each token (FCM v1 doesn't support batch to multiple tokens directly via admin)
    const results = await Promise.allSettled(
      tokens.map((token: string) =>
        getAdminMessaging().send({
          token,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: data || {},
          webpush: {
            fcmOptions: {
              link: data?.link || "/",
            },
            notification: {
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              vibrate: [200, 100, 200] as any,
            },
          },
        }),
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return NextResponse.json({ sent, failed });
  } catch (e: any) {
    console.error("Push API error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
