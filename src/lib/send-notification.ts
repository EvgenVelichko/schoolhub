/**
 * Client-side helper to trigger push notifications via our API.
 * Fire-and-forget — never blocks the caller.
 */
export function notifyUser(data: {
  userId?: string;
  groupId?: string;
  excludeUserId?: string;
  title: string;
  body: string;
  link?: string;
  tag?: string;
}) {
  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {
    // Silent fail — push is best-effort
  });
}
