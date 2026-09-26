import { API_CONFIG } from "../constants/config";

const BASE = `${API_CONFIG.BASE_URL}/FDBond`;

export interface FdBondDetailDTO {
  fdDetailId: number;
  accountId: number;
  accountNo: string;
  fdAmount: number;
  fdDate: string;
  maturityDate: string;
  maturityAmount: number;
  intRate: number;
  periodMonths: number;
  periodDays: number;
  ltdNo: number;
  fdStatus: number;
}

export const fdBondApi = {
  async downloadBond(branchId: number, fdDetailId: number): Promise<void> {
    const res = await fetch(`${BASE}/${branchId}/${fdDetailId}`, {
      credentials: "include",
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `FD-Bond-${fdDetailId}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  async listFdDetails(branchId: number, accountId: number): Promise<FdBondDetailDTO[]> {
    const res = await fetch(`${BASE}/list/${branchId}/${accountId}`, {
      credentials: "include",
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  },
};
