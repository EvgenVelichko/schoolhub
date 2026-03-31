import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

const CHUNK = 400;

export const maxDuration = 60; // allow up to 60s on Vercel

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, grades, lessons, profile, classroom } = body;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const db = getAdminDb();

    // 1. Delete old grades + lessons in parallel
    const [oldGrades, oldLessons] = await Promise.all([
      db.collection("users").doc(userId).collection("grades").listDocuments(),
      db.collection("users").doc(userId).collection("lessons").listDocuments(),
    ]);

    const allDeletes = [...oldGrades, ...oldLessons];
    for (let i = 0; i < allDeletes.length; i += CHUNK) {
      const batch = db.batch();
      allDeletes.slice(i, i + CHUNK).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }

    // 2. Write grades
    if (grades?.length) {
      for (let i = 0; i < grades.length; i += CHUNK) {
        const batch = db.batch();
        grades.slice(i, i + CHUNK).forEach((g: any) => {
          const rawId = g.sourceKey || `${g.subject}_${g.date}_${g.type}_${g.score}`;
          const safeId = "grd_" + rawId.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").toLowerCase();
          const ref = db.collection("users").doc(userId).collection("grades").doc(safeId);
          batch.set(ref, { ...g, syncedAt: new Date() });
        });
        await batch.commit();
      }
    }

    // 3. Write lessons
    if (lessons?.length) {
      for (let i = 0; i < lessons.length; i += CHUNK) {
        const batch = db.batch();
        lessons.slice(i, i + CHUNK).forEach((l: any) => {
          const rawId = `${l.date}_${l.order}_${l.subject}`;
          const safeId = "lsn_" + rawId.replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, "_").replace(/_+/g, "_").toLowerCase();
          const ref = db.collection("users").doc(userId).collection("lessons").doc(safeId);
          batch.set(ref, { ...l, syncedAt: new Date() }, { merge: true });
        });
        await batch.commit();
      }
    }

    // 4. Classroom + profile + notification in parallel
    const writes: Promise<any>[] = [];

    if (classroom?.groupId) {
      const batch = db.batch();
      batch.set(
        db.collection("groups").doc(classroom.groupId),
        classroom.groupData,
        { merge: true },
      );
      batch.set(
        db.collection("users").doc(userId).collection("memberships").doc(classroom.groupId),
        classroom.memberData,
        { merge: true },
      );
      writes.push(batch.commit());
    }

    if (profile) {
      writes.push(
        db.collection("users").doc(userId).update({
          ...profile,
          lastSync: new Date().toISOString(),
          syncEnabled: true,
        })
      );
    }

    writes.push(
      db.collection("users").doc(userId).collection("notifications").add({
        type: "grade",
        title: "Нові оцінки",
        body: `Синхронізовано ${grades?.length || 0} оцінок з NZ.ua`,
        link: "/grades",
        isRead: false,
        createdAt: new Date(),
      })
    );

    await Promise.all(writes);

    return NextResponse.json({ success: true, grades: grades?.length || 0, lessons: lessons?.length || 0 });
  } catch (e: any) {
    console.error("sync-save error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
