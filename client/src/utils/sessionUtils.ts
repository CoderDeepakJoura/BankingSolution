/**
 * Derives the fiscal year start date (Apr 1) from sessionInfo like "2025-2026".
 * Falls back to the provided default if sessionInfo is absent.
 */
export function getSessionFromDate(sessionInfo: string | undefined, fallback: string): string {
  if (!sessionInfo) return fallback;
  const year = sessionInfo.split("-")[0];
  return year ? `${year}-04-01` : fallback;
}
