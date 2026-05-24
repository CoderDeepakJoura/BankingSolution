import React, { useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { Users, Search, Printer, X, FileText, FileSpreadsheet } from "lucide-react";
import memberAccountsApi, {
  MemberAccountsListItem,
  MemberAccountsDetail,
} from "../../services/reports/memberAccountsApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt       = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate   = (iso: string) => iso.split("T")[0];
const localDt   = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtLong   = (iso: string) => { try { return localDt(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }); } catch { return iso; } };
const toInput   = (iso: string) => isoDate(iso);

const buildPrintHTML = (detail: MemberAccountsDetail): string => {
  const guarLine = detail.guarantorDetails.length > 0
    ? detail.guarantorDetails.map(g =>
        `Product Code ${g.productCode} Acc No. ${g.loanAccNo}-${g.loanAccName}`
      ).join(", ")
    : "";

  const accRows = detail.accounts.map((a, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
      <td style="text-align:center">${i + 1}</td>
      <td style="text-align:center;font-family:monospace">${a.accountNo}</td>
      <td>${a.accountName}</td>
      <td style="text-align:center">${a.accType}</td>
      <td>${a.productName}</td>
      <td style="text-align:right">${fmt(a.balance)} ${a.balType}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Member Accounts Detail</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:11px;padding:20px 30px;color:#1e293b;}
.header{text-align:center;margin-bottom:10px;}
.header h1{font-size:14px;font-weight:bold;text-decoration:underline;}
.header p{font-size:11px;font-weight:bold;margin-top:6px;}
.guar{font-size:10px;margin:10px 0;padding:8px;border:1px solid #e2e8f0;background:#f8fafc;}
table{width:100%;border-collapse:collapse;font-size:10px;margin-top:10px;}
th{background:#1e293b;color:#fff;padding:4px 6px;font-size:10px;border:1px solid #334155;}
td{border:1px solid #cbd5e1;padding:3px 6px;}
.pg{text-align:center;margin-top:14px;font-size:10px;color:#64748b;}
@media print{body{padding:10px 15px;}@page{margin:10mm;size:A4 portrait;}}
</style></head><body>
<div class="header">
  <h1>${detail.branchName}</h1>
  ${detail.branchAddress ? `<p style="font-weight:normal;font-size:10px">${detail.branchAddress}</p>` : ""}
  <p style="margin-top:10px">Member Accounts Detail for member: ${detail.memberName},
  Sharemoney acc no:${detail.smAccountNo}, Membership no:${detail.membershipNo}
  as on date:${fmtLong(detail.asOnDate)}</p>
</div>
${guarLine ? `<div class="guar"><strong>Details of ${detail.memberName} as a Guarantor :- </strong>${guarLine}</div>` : ""}
<table>
  <thead>
    <tr>
      <th style="text-align:center;width:45px">S.No.</th>
      <th style="text-align:center">Account No.</th>
      <th>Account Name</th>
      <th style="text-align:center">Acc Type</th>
      <th>Product</th>
      <th style="text-align:right">Balance</th>
    </tr>
  </thead>
  <tbody>${accRows}</tbody>
</table>
<div class="pg">Page : 1 of 1</div>
</body></html>`;
};

const COLUMNS = [
  { header: "S.No.",        widthRatio: 0.06, align: "center"  as const },
  { header: "Account No.",  widthRatio: 0.16, align: "center"  as const },
  { header: "Account Name", widthRatio: 0.28, align: "left"    as const },
  { header: "Acc Type",     widthRatio: 0.13, align: "center"  as const },
  { header: "Product",      widthRatio: 0.22, align: "left"    as const },
  { header: "Balance",      widthRatio: 0.15, align: "right"   as const },
];

const buildExportConfig = (detail: MemberAccountsDetail): ExportConfig => {
  const rows: ExportRow[] = [];

  // info block
  rows.push({ style: "info", cells: [
    `Member: ${detail.memberName} | SM Account No.: ${detail.smAccountNo} | Membership No.: ${detail.membershipNo} | As On Date: ${fmtLong(detail.asOnDate)}`,
  ]});

  // guarantor info
  if (detail.guarantorDetails.length > 0) {
    const guarText = detail.guarantorDetails
      .map(g => `Product Code ${g.productCode} Acc No. ${g.loanAccNo}-${g.loanAccName}`)
      .join(", ");
    rows.push({ style: "group", cells: [`Guarantor Details: ${guarText}`, "", "", "", "", ""] });
  }

  // account rows
  detail.accounts.forEach((a, i) => {
    rows.push({ style: "normal", cells: [
      String(i + 1),
      a.accountNo,
      a.accountName,
      a.accType,
      a.productName,
      `${fmt(a.balance)} ${a.balType}`,
    ]});
  });

  const safeFileName = `MemberAccounts_${detail.memberName.replace(/\s+/g, "_")}`;

  return {
    meta: {
      title: detail.branchName,
      subtitle: detail.branchAddress || undefined,
      reportTitle: "Member Accounts Detail",
      fileName: safeFileName,
      landscape: false,
      paperSize: "a4",
    },
    columns: COLUMNS,
    rows,
  };
};

const MemberAccountsPage: React.FC = () => {
  const user     = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();

  const workingDate = user.workingdate
    ? toInput(commonservice.splitDate(user.workingdate))
    : toInput(new Date().toISOString());

  const [asOnDate,    setAsOnDate]    = useState(workingDate);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [searching,   setSearching]   = useState(false);
  const [members,     setMembers]     = useState<MemberAccountsListItem[]>([]);
  const [searched,    setSearched]    = useState(false);

  // Detail modal state
  const [loadingId,   setLoadingId]   = useState<number | null>(null);
  const [detail,      setDetail]      = useState<MemberAccountsDetail | null>(null);
  const [detailName,  setDetailName]  = useState("");

  const handleSearch = async () => {
    setSearching(true); setMembers([]); setSearched(false); setDetail(null);
    try {
      const res = await memberAccountsApi.searchMembers(user.branchid, searchTerm.trim());
      const data: MemberAccountsListItem[] = (res as any).data ?? (res as any).Data ?? [];
      setMembers(data);
      setSearched(true);
      if (!data.length) Swal.fire("Info", "No members found.", "info");
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Search failed.", "error");
    } finally {
      setSearching(false);
    }
  };

  const handleShow = async (member: MemberAccountsListItem) => {
    setLoadingId(member.id); setDetail(null); setDetailName(member.memberName);
    try {
      const res = await memberAccountsApi.getMemberDetail(user.branchid, member.id, asOnDate);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error("No data returned.");
      setDetail(data);
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Failed to load detail.", "error");
    } finally {
      setLoadingId(null);
    }
  };

  const handlePrint = () => {
    if (!detail) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildPrintHTML(detail));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const handlePdf = () => { if (detail) exportToPdf(buildExportConfig(detail)); };
  const handleExcel = () => { if (detail) exportToExcel(buildExportConfig(detail)); };

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm";
  const th  = "bg-slate-700 text-white border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-center whitespace-nowrap";
  const td  = (extra = "") => `border border-slate-200 px-3 py-2 text-sm ${extra}`;

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="w-full space-y-5">

          {/* Filter card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Member Accounts Detail</h2>
                <p className="text-xs text-slate-500">Search by membership no., share money account no. or member name</p>
              </div>
            </div>

            <div className="p-5 flex flex-wrap items-end gap-4">
              <div>
                <label className={lbl}>Date</label>
                <input type="date" value={asOnDate} max={workingDate}
                  onChange={e => { setAsOnDate(e.target.value); setDetail(null); }}
                  className={inp} />
              </div>

              <div className="flex-1 min-w-60">
                <label className={lbl}>Search (Membership No. / SM Account No. / Name)</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Enter membership no., SM account no., or name..."
                  className={`${inp} w-full`}
                />
              </div>

              <button onClick={handleSearch} disabled={searching}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                {searching
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Search size={15} />}
                {searching ? "Searching…" : "Show"}
              </button>

              <button onClick={() => navigate("/dashboard")}
                className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition">
                Close
              </button>
            </div>
          </div>

          {/* Member grid */}
          {searched && members.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200">
                <span className="text-sm font-semibold text-slate-700">{members.length} member(s) found</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      {["S.No.", "Name", "Relative Name", "Station Name", "Membership No.", "SM Account No.", "Member Type", ""].map(h => (
                        <th key={h} className={th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, i) => (
                      <tr key={m.id} className={i % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50 hover:bg-slate-100"}>
                        <td className={td("text-center")}>{i + 1}</td>
                        <td className={td("font-medium")}>{m.memberName}</td>
                        <td className={td()}>{m.relativeName}</td>
                        <td className={td()}>{m.villageName}</td>
                        <td className={td("text-center font-mono")}>{m.membershipNo}</td>
                        <td className={td("text-center font-mono")}>{m.smAccountNo}</td>
                        <td className={td("text-center")}>{m.memberType}</td>
                        <td className={td("text-center")}>
                          <button
                            onClick={() => handleShow(m)}
                            disabled={loadingId === m.id}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition disabled:opacity-50 min-w-14">
                            {loadingId === m.id
                              ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              : "Show"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detail panel */}
          {detail && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
                <div>
                  <p className="text-sm font-bold text-slate-800">{detail.branchName}</p>
                  {detail.branchAddress && <p className="text-xs text-slate-500">{detail.branchAddress}</p>}
                  <p className="text-xs text-slate-700 mt-1">
                    Member Accounts Detail for member: <strong>{detail.memberName}</strong>,
                    Sharemoney acc no: <strong>{detail.smAccountNo}</strong>,
                    Membership no: <strong>{detail.membershipNo}</strong>,
                    as on date: <strong>{fmtLong(detail.asOnDate)}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition">
                    <Printer size={13} /> Print
                  </button>
                  <button onClick={handlePdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition">
                    <FileText size={13} /> PDF
                  </button>
                  <button onClick={handleExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition">
                    <FileSpreadsheet size={13} /> Excel
                  </button>
                  <button onClick={() => setDetail(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Guarantor section */}
              {detail.guarantorDetails.length > 0 && (
                <div className="px-5 py-3 border-b border-slate-200 bg-amber-50">
                  <p className="text-xs text-amber-900">
                    <strong>Details of {detail.memberName} as a Guarantor :-</strong>{" "}
                    {detail.guarantorDetails.map((g, i) => (
                      <span key={i}>
                        {i > 0 && ", "}
                        Product Code {g.productCode} Acc No. {g.loanAccNo}-{g.loanAccName}
                      </span>
                    ))}
                  </p>
                </div>
              )}

              {/* Accounts table */}
              <div className="overflow-x-auto">
                {detail.accounts.length === 0 ? (
                  <p className="text-center py-8 text-slate-400 text-sm italic">No accounts found.</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        {["S.No.", "Account No.", "Account Name", "Acc Type", "Product", "Balance"].map(h => (
                          <th key={h} className={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.accounts.map((a, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className={td("text-center")}>{i + 1}</td>
                          <td className={td("text-center font-mono")}>{a.accountNo}</td>
                          <td className={td()}>{a.accountName}</td>
                          <td className={td("text-center")}>{a.accType}</td>
                          <td className={td()}>{a.productName}</td>
                          <td className={td("text-right font-mono")}>
                            {fmt(a.balance)}{" "}
                            <span className={a.balType === "Cr" ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                              {a.balType}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    } />
  );
};

export default MemberAccountsPage;
