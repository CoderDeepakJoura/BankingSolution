import { API_CONFIG } from "../constants/config";

export interface VoucherSummaryDTO {
  voucherId: number;
  voucherNo: number;
  voucherDate: string;
  voucherType: number;
  voucherSubType: number;
  typeLabel: string;
  prefix: string;
  amount: number;
  status: string;
}

export interface VoucherPrintSettingDTO {
  voucherType: number;
  voucherSubType: number;
  isEnabled: boolean;
  copies: number;
}

const BASE = `${API_CONFIG.BASE_URL}/VoucherPrint`;

function getVoucherPrefix(voucherType: number, voucherSubType: number): string {
  const key = `${voucherType}-${voucherSubType}`;
  const map: Record<string, string> = {
    "1-1": "SM", "2-2": "SD", "2-3": "SW", "2-29": "CA",
    "3-2": "FD", "3-4": "FI", "3-5": "FM", "3-6": "FR", "3-7": "FP",
    "4-8": "RK", "4-16": "RM",
    "5-9": "LA", "5-10": "LR", "5-14": "LE",
    "6-11": "CV", "7-12": "JV",
  };
  return map[key] ?? "VCH";
}

export const voucherPrintApi = {
  async getSettings(branchId: number): Promise<VoucherPrintSettingDTO[]> {
    if (!branchId) return [];
    const res = await fetch(`${BASE}/settings/${branchId}`, { credentials: "include" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.success ? (json.data as VoucherPrintSettingDTO[]) : [];
  },

  async saveSettings(branchId: number, settings: VoucherPrintSettingDTO[]): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE}/settings/${branchId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async searchVouchers(
    branchId: number,
    fromDate: string,
    toDate: string,
    voucherType: number = 0,
    voucherSubType: number = 0,
    voucherNo: number = 0
  ): Promise<VoucherSummaryDTO[]> {
    if (!branchId) return [];
    const params = new URLSearchParams({ fromDate, toDate });
    if (voucherType > 0) params.set("voucherType", voucherType.toString());
    if (voucherSubType > 0) params.set("voucherSubType", voucherSubType.toString());
    if (voucherNo > 0) params.set("voucherNo", voucherNo.toString());
    const res = await fetch(`${BASE}/search/${branchId}?${params}`, { credentials: "include" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.success ? (json.data as VoucherSummaryDTO[]) : [];
  },

  async downloadVoucherPdf(
    branchId: number,
    voucherType: number,
    voucherSubType: number,
    voucherNo: number,
    copies: number = 1,
    filename?: string,
    voucherDate?: string
  ): Promise<void> {
    const params = new URLSearchParams();
    if (copies > 1) params.set("copies", copies.toString());
    if (voucherDate) params.set("voucherDate", voucherDate);
    const qs = params.toString() ? `?${params}` : "";
    const res = await fetch(
      `${BASE}/${branchId}/${voucherType}/${voucherSubType}/${voucherNo}${qs}`,
      { credentials: "include" }
    );
    if (!res.ok) return;
    const prefix = getVoucherPrefix(voucherType, voucherSubType);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename ?? `${prefix}-${String(voucherNo).padStart(6, "0")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
