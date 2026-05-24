import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { FileText, FileSpreadsheet, Printer, Search } from "lucide-react";
import memberIntCertApi, { MemberIntCert, MemberSearchResult } from "../../services/reports/memberIntCertApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];
const localDate = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtShort = (iso: string) => localDate(iso).toLocaleDateString("en-GB");
const fmtLong = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput = (iso: string) => isoDate(iso);

const buildCertHTML = (c: MemberIntCert): string => {
  const rows = c.rows.map((r, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="text-align:center;font-family:monospace">${r.accountNo}</td>
      <td style="text-align:center">${r.accountType}</td>
      <td style="text-align:right">${fmt(r.interestAmount)}</td>
      <td style="text-align:right">${r.tdsAmount > 0 ? fmt(r.tdsAmount) : "-"}</td>
    </tr>`).join("");

  const totalRow = `<tr style="font-weight:bold;background:#f1f5f9;border-top:2px solid #334155">
    <td colspan="3" style="text-align:right">Total</td>
    <td style="text-align:right">${fmt(c.totalInterest)}</td>
    <td style="text-align:right">${c.totalTDS > 0 ? fmt(c.totalTDS) : "-"}</td>
  </tr>`;

  const address = [c.addressLine1, c.addressLine2, c.villageName].filter(Boolean).join(", ");
  const pinLine = c.pincode ? `PIN: ${c.pincode}` : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Interest Certificate</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:11px;padding:20px 30px;color:#1e293b;}
.soc{text-align:center;margin-bottom:12px;}
.soc h1{font-size:16px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;}
.soc p{font-size:10px;color:#475569;}
.divider{border-top:2px double #334155;margin:8px 0;}
.cert-header{display:flex;justify-content:space-between;align-items:flex-start;margin:10px 0;}
.member-info p{font-size:11px;line-height:1.6;}
.date-info{text-align:right;font-size:11px;font-style:italic;}
.cert-title{text-align:center;margin:12px 0 6px;font-size:13px;font-weight:bold;text-decoration:underline;text-transform:uppercase;letter-spacing:0.5px;}
.cert-body{font-size:11px;line-height:1.7;margin-bottom:10px;}
.cust-id{margin:6px 0;font-size:11px;}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11px;}
th{background:#1e293b;color:#fff;padding:5px 8px;font-size:10px;text-transform:uppercase;border:1px solid #334155;}
td{border:1px solid #cbd5e1;padding:4px 8px;}
.note{margin-top:10px;font-size:9.5px;color:#64748b;font-style:italic;border-top:1px dashed #cbd5e1;padding-top:6px;}
.sig{margin-top:30px;display:flex;justify-content:flex-end;}
.sig-box{text-align:center;font-size:10px;border-top:1px solid #1e293b;padding-top:4px;min-width:160px;}
@media print{body{padding:10px 15px;}@page{margin:8mm;size:A4 portrait;}}
</style></head><body>
<div class="soc">
  <h1>${c.branchName}</h1>
  ${c.branchAddress ? `<p>${c.branchAddress}</p>` : ""}
</div>
<div class="divider"></div>

<div class="cert-header">
  <div class="member-info">
    <p><strong>${c.memberName}</strong></p>
    <p>${c.relativeName}${c.relationName ? ` (${c.relationName})` : ""}</p>
    ${address ? `<p>${address}</p>` : ""}
    ${pinLine ? `<p>${pinLine}</p>` : ""}
  </div>
  <div class="date-info">
    <p>Date: ${fmtLong(c.toDate)}</p>
  </div>
</div>

<div class="cert-title">Interest Cum TDS Certificate for Deposit Accounts</div>

<div class="cert-body">
  This is to certify that the following interest / TDS has been credited/deducted from the account
  of the above named person during the Financial Year <strong>${c.financialYear}</strong>
  from <strong>${fmtShort(c.fromDate)}</strong> to <strong>${fmtShort(c.toDate)}</strong>.
</div>

<div class="cust-id">Cust. Id: <strong>${c.memberId}</strong> &nbsp;&nbsp; Membership No: <strong>${c.membershipNo}</strong></div>

<table>
  <thead>
    <tr>
      <th style="text-align:center;width:50px">Sr. No.</th>
      <th style="text-align:center">Account No.</th>
      <th style="text-align:center">Type</th>
      <th style="text-align:right">Interest Credited (Rs.)</th>
      <th style="text-align:right">TDS Deducted (Rs.)</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
    ${totalRow}
  </tbody>
</table>

<div class="note">
  Note: This certificate is issued for income tax purposes. Please verify with your passbook.
  TDS deducted as per the provisions of the Income Tax Act. Please consult your tax advisor for filing.
</div>

<div class="sig">
  <div class="sig-box">Authorized Signatory</div>
</div>
</body></html>`;
};

const buildExportConfig = (c: MemberIntCert): ExportConfig => {
  const address = [
    c.addressLine1,
    c.addressLine2,
    c.villageName,
    c.pincode ? `PIN: ${c.pincode}` : "",
  ].filter(Boolean).join(", ");

  const rows: ExportRow[] = [
    {
      style: "info",
      cells: [
        `Member: ${c.memberName}`,
        `Relative: ${c.relativeName}${c.relationName ? ` (${c.relationName})` : ""}`,
        `Membership No: ${c.membershipNo}`,
        `Cust. Id: ${c.memberId}`,
        `Financial Year: ${c.financialYear}`,
        `Period: ${fmtShort(c.fromDate)} to ${fmtShort(c.toDate)}`,
        `Address: ${address || "-"}`,
      ],
    },
    ...c.rows.map((row, idx) => ({
      cells: [
        String(idx + 1),
        row.accountNo,
        row.accountType,
        fmt(row.interestAmount),
        row.tdsAmount > 0 ? fmt(row.tdsAmount) : "",
      ],
    })),
    {
      style: "total",
      cells: ["Total", "", "", fmt(c.totalInterest), c.totalTDS > 0 ? fmt(c.totalTDS) : ""],
    },
  ];

  return {
    meta: {
      title: c.branchName,
      subtitle: c.branchAddress,
      reportTitle: "Member Interest Cum TDS Certificate",
      fileName: `member-interest-certificate-${c.memberId}-${isoDate(c.fromDate)}-to-${isoDate(c.toDate)}`,
      landscape: true,
    },
    columns: [
      { header: "Sr. No.", widthRatio: 0.08, align: "center" },
      { header: "Account No.", widthRatio: 0.2, align: "center" },
      { header: "Type", widthRatio: 0.2, align: "center" },
      { header: "Interest Credited", widthRatio: 0.26, align: "right" },
      { header: "TDS Deducted", widthRatio: 0.26, align: "right" },
    ],
    rows,
  };
};

const MemberIntCertPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const workingDate = user.workingdate ? toInput(commonservice.splitDate(user.workingdate)) : toInput(new Date().toISOString());

  const [members, setMembers]           = useState<MemberSearchResult[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<number | "">("");
  const [fromDate, setFromDate]         = useState(workingDate.slice(0, 4) + "-04-01");
  const [toDate, setToDate]             = useState(workingDate);
  const [loading, setLoading]           = useState(false);
  const [cert, setCert]                 = useState<MemberIntCert | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    memberIntCertApi.getAllMembers(user.branchid).then(res => {
      setMembers((res as any).data ?? []);
    }).catch(() => {});
  }, [user.branchid]);

  const handleLoad = async () => {
    if (!selectedMemberId) { Swal.fire("Validation", "Please select a member.", "warning"); return; }
    if (!fromDate || !toDate) { Swal.fire("Validation", "Select dates.", "warning"); return; }
    if (fromDate > toDate) { Swal.fire("Validation", "From date cannot be after To date.", "warning"); return; }
    setLoading(true); setCert(null);
    try {
      const res = await memberIntCertApi.getMemberIntCert(user.branchid, selectedMemberId as number, fromDate, toDate);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data.");
      setCert(data);
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Failed to load certificate.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!cert) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildCertHTML(cert));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="w-full space-y-5">

          {/* Filter card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Member Interest Certificate</h2>
                <p className="text-xs text-slate-500">Interest cum TDS certificate for deposit accounts</p>
              </div>
            </div>

            <div className="p-5 flex flex-wrap items-end gap-4">
              {/* Member dropdown */}
              <div className="flex-1 min-w-60">
                <label className={lbl}>Member</label>
                <select
                  value={selectedMemberId}
                  onChange={e => { setSelectedMemberId(e.target.value ? Number(e.target.value) : ""); setCert(null); }}
                  className={`${inp} w-full`}
                >
                  <option value="">-- Select Member --</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.displayName}</option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div>
                <label className={lbl}>From Date</label>
                <input type="date" value={fromDate} max={workingDate}
                  onChange={e => { setFromDate(e.target.value); setCert(null); }}
                  className={inp} />
              </div>

              {/* To Date */}
              <div>
                <label className={lbl}>To Date</label>
                <input type="date" value={toDate} max={workingDate}
                  onChange={e => { setToDate(e.target.value); setCert(null); }}
                  className={inp} />
              </div>

              <button onClick={handleLoad} disabled={loading || !selectedMemberId}
                className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                {loading ? "Loading…" : "Generate"}
              </button>

              {cert && (
                <>
                  <button onClick={handlePrint}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm">
                    <Printer size={15} /> Print
                  </button>
                  <button onClick={() => exportToPdf(buildExportConfig(cert))}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
                    <FileText size={15} /> PDF
                  </button>
                  <button onClick={() => exportToExcel(buildExportConfig(cert))}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
                    <FileSpreadsheet size={15} /> Excel
                  </button>
                </>
              )}
              <button onClick={() => navigate("/dashboard")}
                className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg border border-slate-300 hover:bg-slate-100 transition">
                Close
              </button>
            </div>
          </div>

          {/* Certificate preview */}
          {cert && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Certificate body */}
              <div className="p-8 sm:p-10 font-serif max-w-2xl mx-auto">
                {/* Society header */}
                <div className="text-center mb-6 pb-4 border-b-2 border-double border-slate-700">
                  <h1 className="text-xl font-extrabold uppercase tracking-wider text-slate-900">{cert.branchName}</h1>
                  {cert.branchAddress && <p className="text-xs text-slate-500 mt-1">{cert.branchAddress}</p>}
                </div>

                {/* Member info + date row */}
                <div className="flex justify-between items-start mb-6">
                  <div className="text-sm leading-relaxed">
                    <p className="font-bold text-slate-900">{cert.memberName}</p>
                    <p className="text-slate-700">{cert.relativeName}{cert.relationName ? ` (${cert.relationName})` : ""}</p>
                    {(cert.addressLine1 || cert.addressLine2 || cert.villageName) && (
                      <p className="text-slate-600">{[cert.addressLine1, cert.addressLine2, cert.villageName].filter(Boolean).join(", ")}</p>
                    )}
                    {cert.pincode && <p className="text-slate-600">PIN: {cert.pincode}</p>}
                  </div>
                  <div className="text-right text-sm text-slate-600 italic">
                    <p>Date: {fmtLong(cert.toDate)}</p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wide underline decoration-2 text-slate-900">
                    Interest Cum TDS Certificate for Deposit Accounts
                  </h2>
                </div>

                {/* Body text */}
                <p className="text-sm leading-relaxed text-slate-700 mb-4">
                  This is to certify that the following interest / TDS has been credited/deducted from the account
                  of the above named person during the Financial Year{" "}
                  <span className="font-bold">{cert.financialYear}</span>{" "}
                  from <span className="font-semibold">{fmtShort(cert.fromDate)}</span>{" "}
                  to <span className="font-semibold">{fmtShort(cert.toDate)}</span>.
                </p>

                {/* Cust Id */}
                <p className="text-sm mb-3 text-slate-700">
                  Cust. Id: <strong>{cert.memberId}</strong>
                  &nbsp;&nbsp; Membership No: <strong>{cert.membershipNo}</strong>
                </p>

                {/* Table */}
                {cert.rows.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 text-sm italic">No interest entries found for the selected period.</p>
                ) : (
                  <table className="w-full border-collapse text-sm mb-4">
                    <thead>
                      <tr>
                        <th className="bg-slate-800 text-white border border-slate-700 px-3 py-2 text-center w-12">Sr. No.</th>
                        <th className="bg-slate-800 text-white border border-slate-700 px-3 py-2 text-center">Account No.</th>
                        <th className="bg-slate-800 text-white border border-slate-700 px-3 py-2 text-center">Type</th>
                        <th className="bg-slate-800 text-white border border-slate-700 px-3 py-2 text-right">Interest Credited (Rs.)</th>
                        <th className="bg-slate-800 text-white border border-slate-700 px-3 py-2 text-right">TDS Deducted (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cert.rows.map((r, i) => (
                        <tr key={r.accountNo} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="border border-slate-200 px-3 py-2 text-center">{i + 1}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center font-mono">{r.accountNo}</td>
                          <td className="border border-slate-200 px-3 py-2 text-center">{r.accountType}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right">{fmt(r.interestAmount)}</td>
                          <td className="border border-slate-200 px-3 py-2 text-right">{r.tdsAmount > 0 ? fmt(r.tdsAmount) : "-"}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                        <td colSpan={3} className="border border-slate-300 px-3 py-2 text-right">Total</td>
                        <td className="border border-slate-300 px-3 py-2 text-right">{fmt(cert.totalInterest)}</td>
                        <td className="border border-slate-300 px-3 py-2 text-right">{cert.totalTDS > 0 ? fmt(cert.totalTDS) : "-"}</td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* Note */}
                <p className="text-xs text-slate-500 italic border-t border-dashed border-slate-300 pt-3 mt-3">
                  Note: This certificate is issued for income tax purposes. Please verify with your passbook.
                  TDS deducted as per the provisions of the Income Tax Act.
                </p>

                {/* Signature */}
                <div className="flex justify-end mt-10">
                  <div className="text-center text-xs text-slate-700 border-t border-slate-700 pt-1 min-w-40">
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    } />
  );
};

export default MemberIntCertPage;
