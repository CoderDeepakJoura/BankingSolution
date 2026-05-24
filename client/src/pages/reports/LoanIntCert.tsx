import React, { useEffect, useState } from "react";
import DashboardLayout from "../../Common/Layout";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { FileText, FileSpreadsheet, Printer, Search } from "lucide-react";
import loanIntCertApi, { LoanIntCert, LoanIntCertAccount, LoanIntCertProduct } from "../../services/reports/loanIntCertApi";
import commonservice from "../../services/common/commonservice";
import { exportToPdf, exportToExcel, ExportConfig, ExportRow } from "../../utils/reportExport";

const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const isoDate = (iso: string) => iso.split("T")[0];
const localDate = (iso: string) => { const [y, m, d] = isoDate(iso).split("-").map(Number); return new Date(y, m - 1, d); };
const fmtShort = (iso: string) => localDate(iso).toLocaleDateString("en-GB");
const fmtLong = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
const toInput = (iso: string) => isoDate(iso);
const periodLabel = (iso: string) => localDate(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

// Number to words (Indian system)
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
}
function numberToWords(n: number): string {
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  let words = "";
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = Math.floor((rupees % 1000) / 100);
  const rest = rupees % 100;
  if (crore) words += twoDigits(crore) + " Crore ";
  if (lakh) words += twoDigits(lakh) + " Lakh ";
  if (thousand) words += twoDigits(thousand) + " Thousand ";
  if (hundred) words += ones[hundred] + " Hundred ";
  if (rest) words += twoDigits(rest) + " ";
  words += "Rupees";
  if (paise) words += " and " + twoDigits(paise) + " Paise";
  return words.trim() + " Only";
}

const buildCertHTML = (c: LoanIntCert): string => {
  const address = [
    c.villageName ? `Vill. ${c.villageName}` : "",
    c.addressLine1,
    c.addressLine2,
    c.pincode ? `PIN: ${c.pincode}` : "",
  ].filter(Boolean).join(", ");

  const totalWords = numberToWords(Number(c.totalRepaid));
  const fromPeriod = periodLabel(c.fromDate);
  const toPeriod = periodLabel(c.toDate);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Loan Interest Certificate</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;font-size:11px;padding:20px 30px;color:#111;}
.soc{text-align:center;margin-bottom:6px;}
.soc h1{font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;}
.soc p{font-size:10px;}
.title{text-align:center;font-weight:bold;font-size:12px;text-decoration:underline;letter-spacing:1px;margin:10px 0 14px;}
.cert-text{font-size:11px;margin-bottom:14px;line-height:1.6;}
.field{display:flex;margin:6px 0;}
.field-label{font-weight:bold;min-width:220px;font-size:11px;}
.field-sep{min-width:14px;}
.field-value{font-size:11px;}
.divider{border-top:1px solid #555;margin:10px 0;}
.footer{text-align:center;font-size:10px;margin-top:30px;font-style:italic;}
.sig{display:flex;justify-content:flex-end;margin-top:40px;}
.sig-box{text-align:center;font-size:11px;border-top:1px solid #111;padding-top:4px;min-width:160px;}
@media print{body{padding:10px 20px;}@page{margin:10mm;size:A4 portrait;}}
</style></head><body>
<div class="soc">
  <h1>${c.branchName}</h1>
  ${c.branchAddress ? `<p>${c.branchAddress}</p>` : ""}
</div>
<div class="divider"></div>
<div class="title">INTEREST CERTIFICATE</div>
<div class="cert-text">This is to certify that we have sanctioned a${c.productName ? " " + c.productName : " Loan"} to the under mentioned borrower(s),</div>

<div class="field">
  <div class="field-label">Name(s)</div>
  <div class="field-sep">:</div>
  <div class="field-value">
    ${c.memberName}<br/>
    ${c.relativeName}${c.relationName ? `(${c.relationName})` : ""}<br/>
    ${address || "&nbsp;"}
  </div>
</div>

<div class="divider"></div>

<div class="field"><div class="field-label">Account No</div><div class="field-sep">:</div><div class="field-value">${c.accountNo}</div></div>
<div class="field"><div class="field-label">Limit Sanctioned (Rs)</div><div class="field-sep">:</div><div class="field-value">${fmt(c.limitSanctioned)}</div></div>
<div class="field"><div class="field-label">Present Rate Of Interest</div><div class="field-sep">:</div><div class="field-value">${c.interestRate} p.a.</div></div>
<div class="field"><div class="field-label">Interest Debited During The Year (Rs)</div><div class="field-sep">:</div><div class="field-value">${fmt(c.interestDebited)}</div></div>

<div class="divider"></div>

<div class="cert-text">
  As on ${fmtLong(c.toDate)} the borrower has repaid a sum of Rs. ${fmt(c.totalRepaid)} (in words): ${totalWords} during the period from ${fromPeriod} to ${toPeriod}
</div>
<div class="cert-text">The break up towards the principal and interest is given below:</div>

<div class="field"><div class="field-label">Repayment towards Principal Rs.</div><div class="field-sep">:</div><div class="field-value">${fmt(c.principalRepaid)}</div></div>
<div class="field"><div class="field-label">Repayment towards Interest Rs.</div><div class="field-sep">:</div><div class="field-value">${fmt(c.interestRepaid)}</div></div>
<div class="field"><div class="field-label">Repayment towards Charges Rs.</div><div class="field-sep">:</div><div class="field-value">${fmt(c.chargesRepaid)}</div></div>

<div class="divider"></div>

<div class="field"><div class="field-label">Total Repayment Rs.</div><div class="field-sep">:</div><div class="field-value"><strong>${fmt(c.totalRepaid)}</strong></div></div>

<div class="sig"><div class="sig-box">Branch Manager</div></div>
<div class="footer">** This is a system generated certificate and does not require a signature **</div>
</body></html>`;
};

const buildExportConfig = (c: LoanIntCert): ExportConfig => {
  const address = [
    c.villageName ? `Vill. ${c.villageName}` : "",
    c.addressLine1,
    c.addressLine2,
    c.pincode ? `PIN: ${c.pincode}` : "",
  ].filter(Boolean).join(", ");

  const rows: ExportRow[] = [
    {
      style: "info",
      cells: [
        `Member: ${c.memberName}`,
        `Relative: ${c.relativeName}${c.relationName ? ` (${c.relationName})` : ""}`,
        `Address: ${address || "-"}`,
        `Period: ${fmtLong(c.fromDate)} to ${fmtLong(c.toDate)}`,
      ],
    },
    { cells: ["Product", c.productName || "Loan"] },
    { cells: ["Account No", c.accountNo] },
    { cells: ["Limit Sanctioned", fmt(c.limitSanctioned)] },
    { cells: ["Present Rate Of Interest", `${c.interestRate} p.a.`] },
    { cells: ["Interest Debited During The Year", fmt(c.interestDebited)] },
    { cells: ["Principal Repaid", fmt(c.principalRepaid)] },
    { cells: ["Interest Repaid", fmt(c.interestRepaid)] },
    { cells: ["Charges Repaid", fmt(c.chargesRepaid)] },
    { style: "total", cells: ["Total Repayment", fmt(c.totalRepaid)] },
    { style: "info", cells: [`Amount In Words: ${numberToWords(Number(c.totalRepaid))}`] },
  ];

  return {
    meta: {
      title: c.branchName,
      subtitle: c.branchAddress,
      reportTitle: "Loan Interest Certificate",
      fileName: `loan-interest-certificate-${c.accountNo}-${isoDate(c.fromDate)}-to-${isoDate(c.toDate)}`,
    },
    columns: [
      { header: "Particulars", widthRatio: 0.42, align: "left" },
      { header: "Value", widthRatio: 0.58, align: "left" },
    ],
    rows,
  };
};

const LoanIntCertPage: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const workingDate = user.workingdate ? toInput(commonservice.splitDate(user.workingdate)) : toInput(new Date().toISOString());

  const [products, setProducts] = useState<LoanIntCertProduct[]>([]);
  const [productId, setProductId] = useState(0);
  const [accounts, setAccounts] = useState<LoanIntCertAccount[]>([]);
  const [accountId, setAccountId] = useState(0);
  const [fromDate, setFromDate] = useState(workingDate.slice(0, 4) + "-04-01");
  const [toDate, setToDate] = useState(workingDate);
  const [loading, setLoading] = useState(false);
  const [cert, setCert] = useState<LoanIntCert | null>(null);

  useEffect(() => {
    if (!user.branchid) return;
    loanIntCertApi.getLoanProducts(user.branchid).then(res => {
      setProducts((res as any).data ?? (res as any).Data ?? []);
    }).catch(() => {});
  }, [user.branchid]);

  useEffect(() => {
    if (!user.branchid) return;
    setAccountId(0); setCert(null);
    loanIntCertApi.getLoanAccounts(user.branchid, productId).then(res => {
      setAccounts((res as any).data ?? (res as any).Data ?? []);
    }).catch(() => {});
  }, [user.branchid, productId]);

  const handleLoad = async () => {
    if (!accountId) { Swal.fire("Validation", "Please select a loan account.", "warning"); return; }
    if (!fromDate || !toDate) { Swal.fire("Validation", "Select dates.", "warning"); return; }
    if (fromDate > toDate) { Swal.fire("Validation", "From date cannot be after To date.", "warning"); return; }
    setLoading(true); setCert(null);
    try {
      const res = await loanIntCertApi.getLoanIntCert(user.branchid, accountId, fromDate, toDate);
      const data = (res as any).data ?? (res as any).Data;
      if (!data) throw new Error((res as any).message ?? "No data.");
      setCert(data);
    } catch (e: any) {
      Swal.fire("Error", e?.message || "Failed to load certificate.", "error");
    } finally { setLoading(false); }
  };

  const handlePrint = () => {
    if (!cert) return;
    const win = window.open("", "_blank"); if (!win) return;
    win.document.write(buildCertHTML(cert)); win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const lbl = "block text-xs uppercase tracking-wide font-semibold text-slate-500 mb-1.5";
  const inp = "px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm";

  const totalWords = cert ? numberToWords(Number(cert.totalRepaid)) : "";

  return (
    <DashboardLayout enableScroll mainContent={
      <div className="min-h-screen bg-slate-100 p-4 sm:p-6">
        <div className="w-full space-y-5">

          {/* Filter card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200">
              <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Loan Interest Certificate</h2>
                <p className="text-xs text-slate-500">Interest certificate for loan accounts</p>
              </div>
            </div>

            <div className="p-5 flex flex-wrap items-end gap-4">
              <div>
                <label className={lbl}>Loan Product</label>
                <select value={productId} onChange={e => setProductId(Number(e.target.value))} className={inp}>
                  <option value={0}>All Products</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.productName}</option>)}
                </select>
              </div>
              <div className="min-w-52">
                <label className={lbl}>Loan Account</label>
                <select value={accountId} onChange={e => { setAccountId(Number(e.target.value)); setCert(null); }} className={`${inp} w-full`}>
                  <option value={0}>-- Select Account --</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.accountNumber} - {a.accountName}</option>
                  ))}
                </select>
              </div>
              <div><label className={lbl}>From Date</label><input type="date" value={fromDate} max={workingDate} onChange={e => { setFromDate(e.target.value); setCert(null); }} className={inp} /></div>
              <div><label className={lbl}>To Date</label><input type="date" value={toDate} max={workingDate} onChange={e => { setToDate(e.target.value); setCert(null); }} className={inp} /></div>

              <button onClick={handleLoad} disabled={loading || !accountId}
                className="flex items-center gap-1.5 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium rounded-lg transition shadow-sm disabled:opacity-50">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={15} />}
                {loading ? "Loading…" : "Show"}
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
              <div className="p-8 sm:p-10 max-w-2xl mx-auto font-serif">
                {/* Header */}
                <div className="text-center mb-4 pb-4 border-b-2 border-slate-700">
                  <h1 className="text-lg font-extrabold uppercase tracking-wide text-slate-900">{cert.branchName}</h1>
                  {cert.branchAddress && <p className="text-xs text-slate-500 mt-0.5">{cert.branchAddress}</p>}
                </div>

                <h2 className="text-center text-sm font-bold uppercase underline decoration-2 tracking-widest text-slate-900 mb-4">
                  Interest Certificate
                </h2>

                <p className="text-sm text-slate-700 mb-5 leading-relaxed">
                  This is to certify that we have sanctioned a{cert.productName ? ` ${cert.productName}` : " Loan"} to the under mentioned borrower(s),
                </p>

                {/* Name block */}
                <div className="flex gap-4 mb-4">
                  <span className="font-bold text-sm min-w-48 text-slate-800">Name(s)</span>
                  <span className="text-sm text-slate-500">:</span>
                  <div className="text-sm text-slate-800 leading-relaxed">
                    <div className="font-semibold">{cert.memberName}</div>
                    <div>{cert.relativeName}{cert.relationName ? ` (${cert.relationName})` : ""}</div>
                    {cert.villageName && <div>Vill. {cert.villageName}</div>}
                    {cert.addressLine1 && <div>{cert.addressLine1}</div>}
                    {cert.addressLine2 && <div>{cert.addressLine2}</div>}
                    {cert.pincode && <div>PIN: {cert.pincode}</div>}
                  </div>
                </div>

                <div className="border-t border-slate-300 my-4" />

                {/* Fields */}
                {[
                  ["Account No", cert.accountNo],
                  ["Limit Sanctioned (Rs)", fmt(cert.limitSanctioned)],
                  ["Present Rate Of Interest", `${cert.interestRate} p.a.`],
                  ["Interest Debited During The Year (Rs)", fmt(cert.interestDebited)],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4 mb-2">
                    <span className="text-sm font-bold text-slate-800 min-w-48">{label}</span>
                    <span className="text-sm text-slate-500">:</span>
                    <span className="text-sm text-slate-800">{value}</span>
                  </div>
                ))}

                <div className="border-t border-slate-300 my-4" />

                <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                  As on <strong>{fmtLong(cert.toDate)}</strong> the borrower has repaid a sum of
                  Rs. <strong>{fmt(cert.totalRepaid)}</strong> (in words): {totalWords} during the
                  period from <strong>{periodLabel(cert.fromDate)}</strong> to <strong>{periodLabel(cert.toDate)}</strong>
                </p>
                <p className="text-sm text-slate-700 mb-3">The break up towards the principal and interest is given below:</p>

                {[
                  ["Repayment towards Principal Rs.", fmt(cert.principalRepaid)],
                  ["Repayment towards Interest Rs.", fmt(cert.interestRepaid)],
                  ["Repayment towards Charges Rs.", fmt(cert.chargesRepaid)],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-4 mb-1.5">
                    <span className="text-sm font-semibold text-slate-700 min-w-48">{label}</span>
                    <span className="text-sm text-slate-500">:</span>
                    <span className="text-sm text-slate-800">{value}</span>
                  </div>
                ))}

                <div className="border-t border-slate-400 my-3 w-48 ml-48" />

                <div className="flex gap-4 mb-6">
                  <span className="text-sm font-bold text-slate-800 min-w-48">Total Repayment Rs.</span>
                  <span className="text-sm text-slate-500">:</span>
                  <span className="text-sm font-bold text-slate-900">{fmt(cert.totalRepaid)}</span>
                </div>

                {/* Signature */}
                <div className="flex justify-end mt-10">
                  <div className="text-center text-sm text-slate-700 border-t border-slate-700 pt-1 min-w-40">
                    Branch Manager
                  </div>
                </div>

                <p className="text-center text-xs text-slate-400 italic mt-6">
                  ** This is a system generated certificate and does not require a signature **
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    } />
  );
};

export default LoanIntCertPage;
