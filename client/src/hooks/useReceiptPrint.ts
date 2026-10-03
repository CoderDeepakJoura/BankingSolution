import { useSelector } from "react-redux";
import { RootState } from "../redux";
import settingsapi from "../services/settings/settingsapi";
import { receiptApi } from "../services/receiptApi";

// Module-level cache: branchId → enabled flag
const _cache = new Map<number, boolean>();
let _loadingFor: number | null = null;

async function loadSetting(branchId: number): Promise<void> {
  if (_cache.has(branchId) || _loadingFor === branchId) return;
  _loadingFor = branchId;
  try {
    const res = await settingsapi.fetch_settings(branchId);
    const enabled = res?.data?.printingSettings?.printReceiptSetting ?? false;
    _cache.set(branchId, enabled);
  } catch {
    _cache.set(branchId, false);
  } finally {
    _loadingFor = null;
  }
}

export function invalidateReceiptCache(branchId: number): void {
  _cache.delete(branchId);
}

function parseVoucherNo(message: string): number | null {
  const match = message.match(/voucher no\.\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

export function useReceiptPrint() {
  const branchId = useSelector((state: RootState) => state.user.branchid);

  if (branchId && !_cache.has(branchId)) {
    loadSetting(branchId);
  }

  async function printReceiptAfterSave(
    successMessage: string,
    voucherType: number,
    voucherSubType: number
  ): Promise<void> {
    if (!branchId) return;

    if (!_cache.has(branchId)) {
      await loadSetting(branchId);
    }

    if (!_cache.get(branchId)) return;

    const voucherNo = parseVoucherNo(successMessage);
    if (!voucherNo) return;

    await receiptApi.downloadReceipt(branchId, voucherType, voucherSubType, voucherNo);
  }

  // Print one receipt per accountId — used for cash vouchers with multiple Cr entries
  async function printReceiptsForAccounts(
    successMessage: string,
    voucherType: number,
    voucherSubType: number,
    accountIds: number[]
  ): Promise<void> {
    if (!branchId || accountIds.length === 0) return;

    if (!_cache.has(branchId)) {
      await loadSetting(branchId);
    }

    if (!_cache.get(branchId)) return;

    const voucherNo = parseVoucherNo(successMessage);
    if (!voucherNo) return;

    for (const accountId of accountIds) {
      await receiptApi.downloadReceiptForAccount(branchId, voucherType, voucherSubType, voucherNo, accountId);
    }
  }

  // Loan recovery receipt: Add in Balance → no breakdown; Stand → pass principal + interest
  async function printLoanReceiptAfterSave(
    successMessage: string,
    principalAmount?: number,
    intAmount?: number
  ): Promise<void> {
    if (!branchId) return;

    if (!_cache.has(branchId)) {
      await loadSetting(branchId);
    }

    if (!_cache.get(branchId)) return;

    const voucherNo = parseVoucherNo(successMessage);
    if (!voucherNo) return;

    await receiptApi.downloadLoanReceipt(branchId, voucherNo, principalAmount, intAmount);
  }

  return { printReceiptAfterSave, printReceiptsForAccounts, printLoanReceiptAfterSave };
}
