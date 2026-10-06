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

/**
 * Builds a list of { value: "YYYY-MM-01", label: "Month Year" } options
 * covering the current fiscal session (Apr–Mar), up to the working date month.
 */
export function getSessionMonthOptions(
  sessionInfo: string | undefined,
  workingDate: string
): { value: string; label: string }[] {
  if (!sessionInfo) return [];
  const parts = sessionInfo.split("-");
  if (parts.length < 2) return [];
  const startYear = parseInt(parts[0], 10);
  const endYear   = parseInt(parts[1], 10);
  const [wy, wm]  = workingDate.split("-").map(Number);
  const opts: { value: string; label: string }[] = [];
  let y = startYear, m = 4;
  while (true) {
    if (y > wy || (y === wy && m > wm)) break;
    if (y > endYear || (y === endYear && m > 3)) break;
    const val   = `${y}-${String(m).padStart(2, "0")}-01`;
    const label = new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
    opts.push({ value: val, label });
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return opts;
}
