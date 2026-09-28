import { API_CONFIG } from "../constants/config";

const BASE = `${API_CONFIG.BASE_URL}/Receipt`;

export const receiptApi = {
  async downloadReceipt(
    branchId: number,
    voucherType: number,
    voucherSubType: number,
    voucherNo: number
  ): Promise<void> {
    const endpoint = `${BASE}/${branchId}/${voucherType}/${voucherSubType}/${voucherNo}`;
    const res = await fetch(endpoint, { credentials: "include" });
    if (!res.ok) return;
    const receiptNo = res.headers.get("X-Receipt-No") ?? voucherNo.toString();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Receipt-${receiptNo}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
