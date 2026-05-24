import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { Users, Search, Printer, FileText, FileSpreadsheet } from "lucide-react";
import memberReportApi, { MemberReport, MemberReportRow } from "../../services/reports/memberReportApi";
import villageApi, { Village } from "../../services/location/village/villageapi";
import postOfficeApi, { PostOffice } from "../../services/location/PostOffice/postOfficeapi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt   = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate  = (iso: string) => iso.split("T")[0];
const localDt  = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtShort = (iso: string) => { try { return localDt(iso).toLocaleDateString("en-GB"); } catch { return iso; } };
const toInput  = (iso: string) => isoDate(iso);

const buildExportConfig = (report: MemberReport): ExportConfig => {
  // 16 columns — widthRatios must sum to exactly 1.00
  // Using A3 landscape so each column has ~25mm on average (400mm usable ÷ 16)
  const columns = [
    { header: "S.No.",        widthRatio: 0.03, align: "center" as const },
    { header: "Branch Code",  widthRatio: 0.05, align: "center" as const },
    { header: "Member Name",  widthRatio: 0.09, align: "left"   as const },
    { header: "Member No.",   widthRatio: 0.07, align: "center" as const },
    { header: "Ho No.",       widthRatio: 0.06, align: "center" as const },
    { header: "Relative",     widthRatio: 0.08, align: "left"   as const },
    { header: "Relation",     widthRatio: 0.05, align: "center" as const },
    { header: "DOB",          widthRatio: 0.06, align: "center" as const },
    { header: "Nominee",      widthRatio: 0.08, align: "left"   as const },
    { header: "Age",          widthRatio: 0.03, align: "center" as const },
    { header: "Address",      widthRatio: 0.10, align: "left"   as const },
    { header: "Post Office",  widthRatio: 0.08, align: "left"   as const },
    { header: "Tehsil",       widthRatio: 0.07, align: "left"   as const },
    { header: "Phone No.",    widthRatio: 0.07, align: "center" as const },
    { header: "Joining Date", widthRatio: 0.07, align: "center" as const },
    { header: "Share Bal.",   widthRatio: 0.06, align: "right"  as const },
  ]; // total = 1.00

  const rows: ExportRow[] = report.rows.map((r, i) => ({
    cells: [
      String(i + 1),
      r.branchCode,
      r.memberName,
      r.membershipNo,
      r.hoNo,
      r.relativeName,
      r.relation,
      fmtShort(r.dob),
      r.nomineeName,
      String(r.nomineeAge || ""),
      r.address,
      r.postOffice,
      r.tehsil,
      r.phoneNo,
      fmtShort(r.joiningDate),
      `${fmt(r.shareBalance)} ${r.shareBalType}`,
    ],
  }));

  return {
    meta: {
      title: report.branchName,
      subtitle: report.branchAddress,
      reportTitle: `Member Report | ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}`,
      fileName: `MemberReport_${toInput(report.fromDate)}_${toInput(report.toDate)}`,
      landscape: true,
      paperSize: "a3",
    },
    columns,
    rows,
  };
};

const buildPrintHTML = (report: MemberReport): string => {
  const headerRow = `
    <tr>
      <th>S.No.</th><th>Branch</th><th>Member Name</th><th>Membership No.</th>
      <th>Ho No.</th><th>Relative Name</th><th>Relation</th><th>DOB</th>
      <th>Nominee Name</th><th>Nom. Age</th><th>Address</th><th>Post Office</th>
      <th>Tehsil</th><th>Phone No.</th><th>Joining Date</th><th>Share Bal.</th>
    </tr>`;

  const dataRows = report.rows.map((r, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="text-align:center">${r.branchCode}</td>
      <td>${r.memberName}</td>
      <td style="text-align:center">${r.membershipNo}</td>
      <td style="text-align:center">${r.hoNo}</td>
      <td>${r.relativeName}</td>
      <td style="text-align:center">${r.relation}</td>
      <td style="text-align:center">${fmtShort(r.dob)}</td>
      <td>${r.nomineeName}</td>
      <td style="text-align:center">${r.nomineeAge || ""}</td>
      <td>${r.address}</td>
      <td>${r.postOffice}</td>
      <td>${r.tehsil}</td>
      <td style="text-align:center">${r.phoneNo}</td>
      <td style="text-align:center">${fmtShort(r.joiningDate)}</td>
      <td style="text-align:right">${fmt(r.shareBalance)} ${r.shareBalType}</td>
    </tr>`).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Member Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:9px;padding:10px 15px;color:#1e293b;}
.header{text-align:center;margin-bottom:8px;}
.header h1{font-size:13px;font-weight:bold;text-transform:uppercase;}
.header p{font-size:9px;color:#475569;}
.report-title{text-align:center;font-size:11px;font-weight:bold;margin:6px 0 8px;}
table{width:100%;border-collapse:collapse;font-size:8px;}
th{background:#1e293b;color:#fff;padding:3px 5px;font-size:7.5px;text-transform:uppercase;border:1px solid #334155;}
td{border:1px solid #cbd5e1;padding:2px 4px;}
tr:nth-child(even) td{background:#f8fafc;}
@media print{body{padding:5px;}@page{margin:8mm;size:A3 landscape;}}
</style></head><body>
<div class="header">
  <h1>${report.branchName}</h1>
  ${report.branchAddress ? `<p>${report.branchAddress}</p>` : ""}
</div>
<div class="report-title">Member Report &mdash; ${fmtShort(report.fromDate)} to ${fmtShort(report.toDate)}</div>
<table><thead>${headerRow}</thead><tbody>${dataRows}</tbody></table>
</body></html>`;
};

const MemberReportPage: React.FC = () => {
  const user     = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();

  const workingDate = user.workingdate
    ? toInput(commonservice.splitDate(user.workingdate))
    : toInput(new Date().toISOString());

  const [fromDate,     setFromDate]     = useState(workingDate.slice(0, 4) + "-04-01");
  const [toDate,       setToDate]       = useState(workingDate);
  const [gender,       setGender]       = useState<0 | 1 | 2>(0);
  const [memberType,   setMemberType]   = useState<0 | 1 | 2>(0);
  const [villageId,    setVillageId]    = useState(0);
  const [postOfficeId, setPostOfficeId] = useState(0);
  const [fromAmount,   setFromAmount]   = useState("");
  const [toAmount,     setToAmount]     = useState("");
  const [memberStatus, setMemberStatus] = useState<0 | 1>(1);

  const [villages,     setVillages]     = useState<Village[]>([]);
  const [postOffices,  setPostOffices]  = useState<PostOffice[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [report,       setReport]       = useState<MemberReport | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    villageApi.getAllVillages(user.branchid).then(res => {
      setVillages((res as any).data?.villages ?? (res as any).villages ?? []);
    }).catch(() => {});
    postOfficeApi.fetchPostOffices({ pageNumber: 1, pageSize: 1000 }, user.branchid).then(res => {
      setPostOffices((res as any).data?.postOffices ?? (res as any).postOffices ?? (res as any).data?.PostOffices ?? (res as any).PostOffices ?? []);
    }).catch(() => {});
  }, [user.branchid]);

  const handleGenerate = async () => {
    if (!fromDate || !toDate) { Swal.fire("Validation", "Please select date range.", "warning"); return; }
    if (fromDate > toDate) { Swal.fire("Validation", "From Date cannot be after To Date.", "warning"); return; }
    setLoading(true); setReport(null);
    try {
      const res = await memberReportApi.getMemberReport({
        branchId:     user.branchid,
        memberType,
        villageId,
        gender,
        fromDate,
        toDate,
        memberStatus,
        fromAmount:   fromAmount ? Number(fromAmount) : 0,
        toAmount:     toAmount   ? Number(toAmount)   : 0,
        postOfficeId,
      });
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data returned.");
      setReport(data);
      if (!data.rows?.length) Swal.fire("Info", "No members found for the selected filters.", "info");
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Failed to load report.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!report) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildPrintHTML(report));
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm";
  const radio = (checked: boolean) =>
    `w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-colors ${checked ? "border-indigo-600 bg-indigo-600" : "border-slate-400 bg-white"}`;

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
                <h2 className="text-base font-bold text-slate-800">Member Report</h2>
                <p className="text-xs text-slate-500">Filter members by joining date, location, gender and share balance</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Row 1: Dates + Village + Post Office */}
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className={lbl}>Joining From Date</label>
                  <input type="date" value={fromDate} max={workingDate}
                    onChange={e => { setFromDate(e.target.value); setReport(null); }}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>Joining To Date</label>
                  <input type="date" value={toDate} max={workingDate}
                    onChange={e => { setToDate(e.target.value); setReport(null); }}
                    className={inp} />
                </div>

                {/* Village */}
                <div className="min-w-48">
                  <label className={lbl}>Village</label>
                  <select value={villageId}
                    onChange={e => { setVillageId(Number(e.target.value)); setReport(null); }}
                    className={`${inp} w-full`}>
                    <option value={0}>All Villages</option>
                    {villages.map(v => (
                      <option key={v.villageId} value={v.villageId}>{v.villageName}</option>
                    ))}
                  </select>
                </div>

                {/* Post Office */}
                <div className="min-w-48">
                  <label className={lbl}>Post Office</label>
                  <select value={postOfficeId}
                    onChange={e => { setPostOfficeId(Number(e.target.value)); setReport(null); }}
                    className={`${inp} w-full`}>
                    <option value={0}>All Post Offices</option>
                    {postOffices.map(p => (
                      <option key={p.postOfficeId} value={p.postOfficeId}>{p.postOfficeName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Gender + Member Type + Share Balance + Status */}
              <div className="flex flex-wrap items-start gap-6">
                {/* Gender */}
                <div>
                  <label className={lbl}>Gender</label>
                  <div className="flex gap-4 mt-1">
                    {([["All", 0], ["Male", 1], ["Female", 2]] as [string, number][]).map(([label, val]) => (
                      <label key={val} className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-slate-700"
                        onClick={() => { setGender(val as 0 | 1 | 2); setReport(null); }}>
                        <span className={radio(gender === val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Member Type */}
                <div>
                  <label className={lbl}>Member Type</label>
                  <div className="flex gap-4 mt-1">
                    {([["Both", 0], ["Branch Members", 1], ["Ho Members", 2]] as [string, number][]).map(([label, val]) => (
                      <label key={val} className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-slate-700"
                        onClick={() => { setMemberType(val as 0 | 1 | 2); setReport(null); }}>
                        <span className={radio(memberType === val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Member Status */}
                <div>
                  <label className={lbl}>Member Status</label>
                  <div className="flex gap-4 mt-1">
                    {([["Active Only", 1], ["All", 0]] as [string, number][]).map(([label, val]) => (
                      <label key={val} className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-slate-700"
                        onClick={() => { setMemberStatus(val as 0 | 1); setReport(null); }}>
                        <span className={radio(memberStatus === val)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Share Balance Range */}
                <div>
                  <label className={lbl}>Share Money Balance</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="number" placeholder="From Amount" value={fromAmount} min={0}
                      onChange={e => { setFromAmount(e.target.value); setReport(null); }}
                      className={`${inp} w-36`} />
                    <span className="text-slate-400 text-sm">to</span>
                    <input type="number" placeholder="To Amount" value={toAmount} min={0}
                      onChange={e => { setToAmount(e.target.value); setReport(null); }}
                      className={`${inp} w-36`} />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button onClick={handleGenerate} disabled={loading}
                  className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Search size={15} />}
                  {loading ? "Loading…" : "Generate"}
                </button>

                {report && report.rows.length > 0 && (
                  <>
                    <button onClick={handlePrint}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition shadow-sm">
                      <Printer size={15} /> Print
                    </button>
                    <button onClick={() => exportToPdf(buildExportConfig(report))}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition shadow-sm">
                      <FileText size={15} /> PDF
                    </button>
                    <button onClick={() => exportToExcel(buildExportConfig(report))}
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
          </div>

          {/* Report table */}
          {report && report.rows.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{report.branchName}</h3>
                  {report.branchAddress && <p className="text-xs text-slate-500">{report.branchAddress}</p>}
                </div>
                <div className="text-xs text-slate-500 text-right">
                  <p>Joining Date: {fmtShort(report.fromDate)} to {fmtShort(report.toDate)}</p>
                  <p className="font-semibold text-slate-700">{report.rows.length} member(s)</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs min-w-[1600px]">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      {[
                        "S.No.", "Branch Code", "Member Name", "Membership No.", "Ho No.",
                        "Relative Name", "Relation", "DOB", "Nominee Name", "Nominee Age",
                        "Address", "Post Office", "Tehsil", "Phone No.", "Joining Date", "Share Bal.",
                      ].map(h => (
                        <th key={h} className="border border-slate-700 px-2 py-2 text-center font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50 hover:bg-slate-100"}>
                        <td className="border border-slate-200 px-2 py-1.5 text-center">{i + 1}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center">{row.branchCode}</td>
                        <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">{row.memberName}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center font-mono">{row.membershipNo}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center font-mono">{row.hoNo}</td>
                        <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">{row.relativeName}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center">{row.relation}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">{fmtShort(row.dob)}</td>
                        <td className="border border-slate-200 px-2 py-1.5">{row.nomineeName}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center">{row.nomineeAge || ""}</td>
                        <td className="border border-slate-200 px-2 py-1.5 max-w-40 truncate" title={row.address}>{row.address}</td>
                        <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">{row.postOffice}</td>
                        <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">{row.tehsil}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center">{row.phoneNo}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center whitespace-nowrap">{fmtShort(row.joiningDate)}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right font-mono">
                          {fmt(row.shareBalance)}{" "}
                          <span className={row.shareBalType === "Cr" ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                            {row.shareBalType}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    } />
  );
};

export default MemberReportPage;
