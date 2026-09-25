import { useSelector } from "react-redux";
import { RootState } from "../redux";
import { voucherPrintApi, VoucherPrintSettingDTO } from "../services/voucherPrintApi";

// Module-level cache: branchId → Map of "type:subtype" → copies count (only enabled entries stored)
const _cache = new Map<number, Map<string, number>>();
let _loadingFor: number | null = null;

async function loadSettings(branchId: number): Promise<void> {
  if (_cache.has(branchId) || _loadingFor === branchId) return;
  _loadingFor = branchId;
  try {
    const rows = await voucherPrintApi.getSettings(branchId);
    const enabledMap = new Map<string, number>(
      rows
        .filter((r) => r.isEnabled)
        .map((r) => [`${r.voucherType}:${r.voucherSubType}`, r.copies > 0 ? r.copies : 1])
    );
    _cache.set(branchId, enabledMap);
  } catch {
    // silently ignore — print is optional
  } finally {
    _loadingFor = null;
  }
}

/** Call once after save settings so the hook re-fetches on next use. */
export function invalidateVoucherPrintCache(branchId: number): void {
  _cache.delete(branchId);
}

/**
 * Parse voucher number from success message.
 * Message format: "Voucher saved successfully with voucher no. 125"
 */
function parseVoucherNo(message: string): number | null {
  const match = message.match(/voucher no\.\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function parseWorkingDateToISO(wd: string): string | undefined {
  const parts = wd.split("-");
  if (parts.length !== 3) return undefined;
  const months: Record<string, string> = {
    january:"01", february:"02", march:"03", april:"04", may:"05", june:"06",
    july:"07", august:"08", september:"09", october:"10", november:"11", december:"12",
  };
  const m = months[parts[1].toLowerCase()];
  if (!m) return undefined;
  return `${parts[2]}-${m}-${parts[0].padStart(2, "0")}`;
}

export function useVoucherPrint() {
  const branchId = useSelector((state: RootState) => state.user.branchid);
  const workingdate = useSelector((state: RootState) => state.user.workingdate);

  // Pre-load settings in background when the hook is first used
  if (branchId && !_cache.has(branchId)) {
    loadSettings(branchId);
  }

  /**
   * Call after a successful voucher save.
   * @param successMessage  The res.message string from the save response
   * @param voucherType     Numeric VoucherType (e.g. 6 for Cash)
   * @param voucherSubType  Numeric VoucherSubType (e.g. 11 for Payment/Receipt)
   */
  async function printAfterSave(
    successMessage: string,
    voucherType: number,
    voucherSubType: number
  ): Promise<void> {
    if (!branchId) return;

    if (!_cache.has(branchId)) {
      await loadSettings(branchId);
    }

    const enabledMap = _cache.get(branchId);
    const copies = enabledMap?.get(`${voucherType}:${voucherSubType}`);
    if (!copies) return;

    const voucherNo = parseVoucherNo(successMessage);
    if (!voucherNo) return;

    const voucherDate = workingdate ? parseWorkingDateToISO(workingdate) : undefined;
    await voucherPrintApi.downloadVoucherPdf(branchId, voucherType, voucherSubType, voucherNo, copies, undefined, voucherDate);
  }

  return { printAfterSave };
}
