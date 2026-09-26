import React, { useState, useEffect } from "react";
import { FileText, ArrowLeft, Search, Download, AlertCircle, Printer } from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import commonservice from "../../../services/common/commonservice";
import { fdBondApi, FdBondDetailDTO } from "../../../services/fdBondApi";
import Select from "react-select";

const FD_ACCOUNT_TYPE = 6;

const fdStatusLabel = (s: number) => {
  if (s === 1) return { text: "Open", cls: "bg-green-100 text-green-700" };
  if (s === 2) return { text: "Matured", cls: "bg-blue-100 text-blue-700" };
  if (s === 3) return { text: "Renewed", cls: "bg-violet-100 text-violet-700" };
  if (s === 4) return { text: "Pre-Matured", cls: "bg-orange-100 text-orange-700" };
  if (s === 5) return { text: "Closed", cls: "bg-gray-100 text-gray-600" };
  return { text: "—", cls: "bg-gray-100 text-gray-500" };
};

const fmt = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

interface AccountOption {
  value: number;
  label: string;
}

const FDBondReprint: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AccountOption | null>(null);
  const [details, setDetails] = useState<FdBondDetailDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [printingId, setPrintingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user.branchid) return;
    commonservice.accounts_by_type(user.branchid, FD_ACCOUNT_TYPE)
      .then((res) => {
        setAccountOptions(
          (res.data ?? []).map((a: any) => ({
            value: a.accId ?? a.id ?? a.ID,
            label: a.accountName ?? a.AccountName ?? "",
          }))
        );
      })
      .catch(() => setError("Failed to load FD accounts."))
      .finally(() => setLoading(false));
  }, [user.branchid]);

  const handleLoad = async () => {
    if (!selectedAccount) return;
    setError("");
    setSearching(true);
    try {
      const data = await fdBondApi.listFdDetails(user.branchid, selectedAccount.value);
      setDetails(data);
      if (data.length === 0) setError("No FD details found for this account.");
    } catch (e: any) {
      setError(e.message || "Failed to load FD details.");
    } finally {
      setSearching(false);
    }
  };

  const handlePrint = async (fdDetailId: number) => {
    setPrintingId(fdDetailId);
    try {
      await fdBondApi.downloadBond(user.branchid, fdDetailId);
    } catch {
      setError("Failed to download FD Bond.");
    } finally {
      setPrintingId(null);
    }
  };

  const content = (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-slate-100">
      {/* Header */}
      <div className="w-full bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 px-6 py-4 flex items-center gap-3 shadow-lg">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/20 text-white transition">
          <ArrowLeft size={20} />
        </button>
        <FileText size={22} className="text-white" />
        <h1 className="text-lg font-bold text-white">FD Bond Re-Print</h1>
      </div>

      <div className="w-full p-6">
        {/* Search Panel */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-blue-100 p-5 mb-5">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search FD Account</label>
              <Select
                options={accountOptions}
                value={selectedAccount}
                onChange={(opt) => { setSelectedAccount(opt); setDetails([]); setError(""); }}
                placeholder="Select FD account..."
                isClearable
                isLoading={loading}
                noOptionsMessage={() => "No FD accounts found"}
                filterOption={(option, input) =>
                  option.label.toLowerCase().includes(input.toLowerCase())
                }
                styles={{
                  control: (base) => ({ ...base, cursor: "pointer", minHeight: "40px" }),
                }}
              />
            </div>
            <button
              onClick={handleLoad}
              disabled={!selectedAccount || searching}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white font-medium rounded-lg transition shadow-sm"
            >
              <Search size={16} />
              {searching ? "Loading..." : "Load FD Details"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Results Table */}
        {details.length > 0 && (
          <div className="w-full bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">
                {details.length} FD Detail{details.length > 1 ? "s" : ""} — {selectedAccount?.label}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Receipt No</th>
                    <th className="px-4 py-3 text-left font-medium">A/C FD No</th>
                    <th className="px-4 py-3 text-right font-medium">FD Amount</th>
                    <th className="px-4 py-3 text-left font-medium">FD Date</th>
                    <th className="px-4 py-3 text-left font-medium">Maturity Date</th>
                    <th className="px-4 py-3 text-right font-medium">Maturity Amount</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                    <th className="px-4 py-3 text-center font-medium">Print</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d, i) => {
                    const sl = fdStatusLabel(d.fdStatus);
                    return (
                      <tr key={d.fdDetailId} className={i % 2 === 0 ? "bg-white" : "bg-blue-50"}>
                        <td className="px-4 py-3 font-mono text-gray-700">{d.ltdNo}</td>
                        <td className="px-4 py-3 font-medium text-blue-700">{d.accountNo}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{fmt(d.fdAmount)}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(d.fdDate)}</td>
                        <td className="px-4 py-3 text-gray-600">{fmtDate(d.maturityDate)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{fmt(d.maturityAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sl.cls}`}>{sl.text}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handlePrint(d.fdDetailId)}
                            disabled={printingId === d.fdDetailId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 disabled:bg-gray-400 text-white text-xs font-medium rounded-lg transition shadow-sm"
                          >
                            {printingId === d.fdDetailId ? (
                              <Download size={13} className="animate-bounce" />
                            ) : (
                              <Printer size={13} />
                            )}
                            {printingId === d.fdDetailId ? "..." : "Print Bond"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return <DashboardLayout mainContent={content} />;
};

export default FDBondReprint;
