/**
 * Admin allow-list. Configure via the `ADMIN_EMAILS` env var as a
 * comma-separated list (e.g. "you@example.com,grader@example.com"). Empty
 * string or unset means no admins (everything denied).
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = getAdminEmails();
  return list.includes(email.toLowerCase());
}
