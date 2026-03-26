import { collection, getDocs, writeBatch, Firestore } from "firebase/firestore"

/**
 * Batch-deletes all messages in a report's messages subcollection.
 * Must be called BEFORE deleting the parent report doc to prevent orphaned docs.
 */
export async function deleteReportMessages(db: Firestore, reportId: string): Promise<void> {
  const messagesRef = collection(db, "reports", reportId, "messages")
  const snapshot = await getDocs(messagesRef)
  if (snapshot.empty) return

  const batchSize = 499
  const docs = snapshot.docs
  for (let i = 0; i < docs.length; i += batchSize) {
    const chunk = docs.slice(i, i + batchSize)
    const batch = writeBatch(db)
    chunk.forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
}
