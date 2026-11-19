import { useState, useEffect } from "react";
import dayBookApi from "../services/reports/dayBookApi";
import { getSessionFromDate } from "../utils/sessionUtils";

/**
 * Returns the start date of the very first (oldest) session in the branch,
 * falling back to the current session start while the fetch is in progress.
 * Used by ledger pages to pre-fill fromDate with the full account history range.
 */
export function useFirstSessionDate(branchId: number, workingDate: string, sessionInfo: string): string {
  const fallback = getSessionFromDate(sessionInfo, workingDate);
  const [firstDate, setFirstDate] = useState(fallback);

  useEffect(() => {
    if (!branchId) return;
    dayBookApi.getSessionDates(branchId).then((res) => {
      if (res.success && res.data?.fromDate) {
        setFirstDate(res.data.fromDate.split("T")[0]);
      }
    }).catch(() => {});
  }, [branchId]);

  return firstDate;
}
