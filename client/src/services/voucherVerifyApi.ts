const BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export interface UnverifiedVoucherDTO {
  voucherId: number;
  voucherNo: number;
  voucherDate: string;
  voucherType: number;
  voucherSubType: number;
  narration: string | null;
  addedBy: number | null;
  addedByName: string;
  amount: number;
}

async function handleResponse<T>(res: Response): Promise<T> {
  let json: any;
  try {
    json = await res.json();
  } catch {
    if (!res.ok) throw new Error(`Server error (HTTP ${res.status}). Make sure the backend is running and restarted.`);
    throw new Error("Invalid response from server.");
  }
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  return json as T;
}

export const voucherVerifyApi = {
  getUnverified: async (branchId: number, date: string): Promise<UnverifiedVoucherDTO[]> => {
    const res = await fetch(
      `${BASE}/VoucherOperations/unverified/${branchId}?date=${encodeURIComponent(date)}`,
      { credentials: "include" }
    );
    const data = await handleResponse<{ success: boolean; data: UnverifiedVoucherDTO[] }>(res);
    return data.data ?? [];
  },

  verify: async (branchId: number, voucherId: number): Promise<string> => {
    const res = await fetch(`${BASE}/VoucherOperations/verify/${branchId}/${voucherId}`, {
      method: "POST",
      credentials: "include",
    });
    const data = await handleResponse<{ success: boolean; message: string }>(res);
    return data.message ?? "";
  },
};
