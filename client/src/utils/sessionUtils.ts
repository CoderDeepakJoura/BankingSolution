/**
 * Derives the fiscal year start date (Apr 1) from sessionInfo like "2025-2026".
 * Falls back to the provided default if sessionInfo is absent.
 */
export function getSessionFromDate(sessionInfo: string | undefined, fallback: string): string {
  if (!sessionInfo) return fallback;
  const year = sessionInfo.split("-")[0];
  return year ? `${year}-04-01` : fallback;
}

/**
 * Derives the fiscal year end date (Mar 31) from sessionInfo like "2025-2026".
 * Falls back to the provided default if sessionInfo is absent.
 */
export function getSessionToDate(sessionInfo: string | undefined, fallback: string): string {
  if (!sessionInfo) return fallback;
  const parts = sessionInfo.split("-");
  const year = parts[1];
  return year ? `${year}-03-31` : fallback;
}
