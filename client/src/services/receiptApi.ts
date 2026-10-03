import { API_CONFIG } from "../constants/config";

const BASE = `${API_CONFIG.BASE_URL}/Receipt`;

async function fetchAndDownload(endpoint: string, fallbackNo: number | string): Promise<void> {
  const res = await fetch(endpoint, { credentials: "include" });
  if (!res.ok) return;
  const receiptNo = res.headers.get("X-Receipt-No") ?? String(fallbackNo);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Receipt-${receiptNo}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const receiptApi = {
  async downloadReceipt(
    branchId: number,
    voucherType: number,
    voucherSubType: number,
    voucherNo: number
  ): Promise<void> {
    await fetchAndDownload(
      `${BASE}/${branchId}/${voucherType}/${voucherSubType}/${voucherNo}`,
      voucherNo
    );
  },

  async downloadReceiptForAccount(
    branchId: number,
    voucherType: number,
    voucherSubType: number,
    voucherNo: number,
    accountId: number
  ): Promise<void> {
    await fetchAndDownload(
      `${BASE}/${branchId}/${voucherType}/${voucherSubType}/${voucherNo}?accountId=${accountId}`,
      voucherNo
    );
  },

  async downloadLoanReceipt(
    branchId: number,
    voucherNo: number,
    principalAmount?: number,
    intAmount?: number
  ): Promise<void> {
    const params = new URLSearchParams();
    if (principalAmount !== undefined) params.set("principalAmount", principalAmount.toFixed(2));
    if (intAmount !== undefined) params.set("intAmount", intAmount.toFixed(2));
    const qs = params.toString() ? `?${params.toString()}` : "";
    await fetchAndDownload(`${BASE}/${branchId}/5/10/${voucherNo}${qs}`, voucherNo);
  },
};
