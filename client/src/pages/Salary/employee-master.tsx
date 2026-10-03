import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import Swal from "sweetalert2";
import {
  User, Users, Briefcase, Phone, Mail, MapPin, Calendar, Hash,
  CreditCard, BookOpen, ClipboardList, RotateCcw, Save, ArrowLeft,
  Plus, Trash2, AlertCircle,
} from "lucide-react";
import { RootState } from "../../redux";
import DashboardLayout from "../../Common/Layout";
import salaryApi, { EmployeeMaster, EmployeeDesignation, EmployeeLeaveAllotment } from "../../services/salary/salaryApi";
import { decryptId } from "../../utils/encryption";

// ── Constants ─────────────────────────────────────────────────────────────────
const GENDER_OPTIONS    = [{ id: 1, label: "Male" }, { id: 2, label: "Female" }, { id: 3, label: "Other" }];
const MARITAL_OPTIONS   = [{ id: 1, label: "Single" }, { id: 2, label: "Married" }, { id: 3, label: "Divorced" }, { id: 4, label: "Widowed" }];
const EMP_TYPE_OPTIONS  = [{ id: 1, label: "Permanent" }, { id: 2, label: "Contract" }, { id: 3, label: "Part-Time" }, { id: 4, label: "Daily Wages" }];
const RELATION_OPTIONS  = ["Son", "Daughter", "Wife", "Husband", "Father", "Mother", "Brother", "Sister", "Other"];
const EDUCATION_OPTIONS = ["Matric", "10+2 / Inter", "B.A", "B.Sc", "B.Com", "B.Tech / B.E", "M.A", "M.Sc", "M.Com", "MBA", "LLB", "Ph.D", "Other"];
const LEAVE_TYPES       = ["Earned Leave (EL)", "Casual Leave (CL)", "Medical / Sick Leave", "Maternity Leave", "Paternity Leave", "Compensatory Leave", "Study Leave", "Leave Without Pay (LWP)"];
const STATUS_OPTIONS    = [{ id: 1, label: "Active" }, { id: 0, label: "Inactive" }, { id: 2, label: "On Leave" }, { id: 3, label: "Resigned" }];

// ── Styles ────────────────────────────────────────────────────────────────────
const baseInp = "w-full border rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 transition-colors placeholder-gray-400";
const okInp   = baseInp + " border-gray-200 focus:ring-purple-400 focus:border-transparent";
const errInp  = baseInp + " border-red-400 focus:ring-red-300 bg-red-50";
const okSel   = okInp + " cursor-pointer";
const errSel  = errInp + " cursor-pointer";

// ── Empty form + validation state ────────────────────────────────────────────
type FormErrors = Partial<Record<keyof EmployeeMaster | "leaveType" | "leaveDays" | "leaveAllotDate", string>>;

const empty = (): Partial<EmployeeMaster> => ({
  code: "", firstName: "", lastName: "", relativeName: "", relation: "",
  station: "", genderId: 1, maritalStatus: 1, phone: "", address: "", hoAcNo: "",
  designationId: 0, empType: 1, joiningDate: "", dob: "", emailId: "",
  isLeave: false, leaveDate: "", status: 1, remarks: "",
  pfAccountNo: "", uanNo: "", esicAccountNo: "", lastIncrementDate: "",
  savingAccountId: 0, educationQual: [], leaveAllotments: [],
});

// ── Field wrapper ─────────────────────────────────────────────────────────────
const Field: React.FC<{
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  col2?: boolean;
  col3?: boolean;
}> = ({ label, icon, required, error, children, col2, col3 }) => (
  <div className={col3 ? "col-span-3" : col2 ? "col-span-2" : ""}>
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1.5">
      {icon && <span className={error ? "text-red-400" : "text-purple-500"}>{icon}</span>}
      {label}
      {required && <span className="text-red-500 text-xs ml-0.5">*</span>}
    </label>
    {children}
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
        <AlertCircle size={11} /> {error}
      </p>
    )}
  </div>
);

// ── Section divider ───────────────────────────────────────────────────────────
const Section: React.FC<{ title: string }> = ({ title }) => (
  <div className="col-span-3 pt-2 pb-1 border-b border-gray-100">
    <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">{title}</p>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
export default function EmployeeMasterForm() {
  const navigate = useNavigate();
  const { id: encId } = useParams<{ id?: string }>();
  const user = useSelector((s: RootState) => s.user);
  const branchId = user.branchid;

  const editId = encId ? (decryptId(encId) ?? 0) : 0;
  const isEdit = editId > 0;

  const [step, setStep]             = useState<1 | 2>(1);
  const [savedEmpId, setSavedEmpId] = useState(0);
  const [form, setForm]             = useState<Partial<EmployeeMaster>>(empty());
  const [designations, setDesigs]   = useState<EmployeeDesignation[]>([]);
  const [saving, setSaving]         = useState(false);
  const [errors, setErrors]         = useState<FormErrors>({});
  const [touched, setTouched]       = useState<Set<string>>(new Set());

  // Leave row inputs
  const [leaveType, setLeaveType]           = useState("");
  const [leaveDays, setLeaveDays]           = useState("");
  const [leaveAllotDate, setLeaveAllotDate] = useState("");
  const [leaveErrors, setLeaveErrors]       = useState<FormErrors>({});

  useEffect(() => {
    salaryApi.getDesignationDropdown(branchId).then(r => setDesigs(r.items ?? []));
    if (isEdit) {
      salaryApi.getEmployeeById(editId, branchId)
        .then(r => { if (r.data) { setForm({ ...r.data }); setSavedEmpId(r.data.id); } })
        .catch(() => Swal.fire("Error", "Failed to load employee.", "error"));
    }
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const set = (key: keyof EmployeeMaster, val: any) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  };

  const touch = (key: string) => setTouched(t => new Set([...t, key]));

  const handleReset = () => {
    if (step === 1) { setForm(f => ({ ...empty(), id: f.id })); setErrors({}); setTouched(new Set()); }
    else { setForm(f => ({ ...f, pfAccountNo: "", uanNo: "", esicAccountNo: "", lastIncrementDate: "", educationQual: [], leaveAllotments: [] })); }
    setLeaveType(""); setLeaveDays(""); setLeaveAllotDate(""); setLeaveErrors({});
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validateStep1 = (): FormErrors => {
    const e: FormErrors = {};
    if (!form.firstName?.trim())   e.firstName    = "First name is required.";
    if (!form.code?.trim())        e.code         = "Employee code is required.";
    if (!form.designationId)       e.designationId = "Please select a designation.";
    if (!form.joiningDate)         e.joiningDate  = "Date of joining is required.";
    if (form.phone && !/^\d{10,15}$/.test(form.phone)) e.phone = "Phone must be 10–15 digits.";
    if (form.emailId && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailId)) e.emailId = "Enter a valid email address.";
    if (form.isLeave && !form.leaveDate) e.leaveDate = "Leave date is required when on leave.";
    return e;
  };

  const validateLeaveRow = (): FormErrors => {
    const e: FormErrors = {};
    if (!leaveType)                             e.leaveType      = "Select a leave type.";
    if (!leaveDays || parseInt(leaveDays) <= 0) e.leaveDays      = "Enter valid days.";
    if (!leaveAllotDate)                        e.leaveAllotDate = "Allotment date is required.";
    return e;
  };

  // ── Step 1 save ───────────────────────────────────────────────────────────
  const handleStep1 = async () => {
    const errs = validateStep1();
    setErrors(errs);
    // mark all required fields touched
    setTouched(new Set(["firstName", "code", "designationId", "joiningDate", "phone", "emailId", "leaveDate"]));
    if (Object.keys(errs).length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the errors", text: `${Object.keys(errs).length} field(s) need attention.`, confirmButtonColor: "#7c3aed" });
      return;
    }
    setSaving(true);
    try {
      if (!isEdit && savedEmpId === 0) {
        const res = await salaryApi.createEmployee({ ...form, branchId });
        if (!res.success) throw new Error(res.message);
        setSavedEmpId(res.empId);
        setForm(f => ({ ...f, id: res.empId }));
      } else {
        const res = await salaryApi.updateEmployee({ ...form, branchId, id: savedEmpId || editId });
        if (!res.success) throw new Error(res.message);
      }
      setStep(2);
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Failed to save.", "error");
    } finally { setSaving(false); }
  };

  // ── Step 2 save ───────────────────────────────────────────────────────────
  const handleStep2 = async () => {
    setSaving(true);
    try {
      const res = await salaryApi.saveEmployeePayroll({ ...form, branchId, id: savedEmpId || editId });
      if (!res.success) throw new Error(res.message);
      Swal.fire({ icon: "success", title: "Employee Saved!", text: "Employee record has been saved successfully.", confirmButtonColor: "#7c3aed" });
      navigate("/employee-master-data");
    } catch (err: any) {
      Swal.fire("Error", err.message ?? "Failed to save.", "error");
    } finally { setSaving(false); }
  };

  // ── Leave allotment ───────────────────────────────────────────────────────
  const addLeave = () => {
    const errs = validateLeaveRow();
    setLeaveErrors(errs);
    if (Object.keys(errs).length > 0) return;
    set("leaveAllotments", [...(form.leaveAllotments ?? []), {
      id: 0, employeeId: savedEmpId || editId, branchId,
      leaveType, noOfDays: parseInt(leaveDays), allotmentDate: leaveAllotDate,
    } as EmployeeLeaveAllotment]);
    setLeaveType(""); setLeaveDays(""); setLeaveAllotDate(""); setLeaveErrors({});
  };

  const removeLeave = (i: number) =>
    set("leaveAllotments", (form.leaveAllotments ?? []).filter((_, idx) => idx !== i));

  const e = errors; // shorthand

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const step2Locked = savedEmpId === 0 && !isEdit;
  const tabs = [
    { n: 1 as const, label: "Personal Detail",  icon: <User size={14} /> },
    { n: 2 as const, label: "Payroll & Leave",   icon: <CreditCard size={14} /> },
  ];

  return (
    <DashboardLayout enableScroll={true} mainContent={
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-50 p-6 space-y-5">

        {/* ── Title card ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {isEdit ? "Edit Employee" : "Add New Employee"}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">Fields marked with <span className="text-red-500">*</span> are mandatory</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/employee-master")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={16} /> Back to Operations
          </button>
        </div>

        {/* ── Form card ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-6">
            {tabs.map(t => (
              <button
                key={t.n}
                onClick={() => { if (t.n === 2 && step2Locked) return; setStep(t.n); }}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-semibold border-b-2 transition-colors ${
                  step === t.n
                    ? "border-purple-600 text-purple-600"
                    : t.n === 2 && step2Locked
                    ? "border-transparent text-gray-300 cursor-not-allowed"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.icon} {t.label}
                {t.n === 2 && step2Locked && <span className="text-xs font-normal text-gray-300">(complete step 1 first)</span>}
              </button>
            ))}
          </div>

          {/* ── STEP 1 ── */}
          {step === 1 && (
            <div className="p-6">
              <div className="grid grid-cols-3 gap-x-6 gap-y-5">

                <Section title="Personal Detail" />

                <Field label="First Name" icon={<User size={13} />} required error={e.firstName}>
                  <input className={e.firstName ? errInp : okInp}
                    value={form.firstName ?? ""} onChange={e2 => set("firstName", e2.target.value)}
                    onBlur={() => touch("firstName")} placeholder="First Name" />
                </Field>
                <Field label="Last Name" icon={<User size={13} />}>
                  <input className={okInp} value={form.lastName ?? ""} onChange={e2 => set("lastName", e2.target.value)} placeholder="Last Name" />
                </Field>
                <Field label="HO A/C No." icon={<Hash size={13} />}>
                  <input className={okInp} value={form.hoAcNo ?? ""} onChange={e2 => set("hoAcNo", e2.target.value)} placeholder="Head Office Account No." />
                </Field>

                <Field label="Relative Name" icon={<Users size={13} />}>
                  <input className={okInp} value={form.relativeName ?? ""} onChange={e2 => set("relativeName", e2.target.value)} placeholder="Father / Husband Name" />
                </Field>
                <Field label="Relation" icon={<Users size={13} />}>
                  <select className={okSel} value={form.relation ?? ""} onChange={e2 => set("relation", e2.target.value)}>
                    <option value="">— Select —</option>
                    {RELATION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="Station" icon={<MapPin size={13} />}>
                  <input className={okInp} value={form.station ?? ""} onChange={e2 => set("station", e2.target.value)} placeholder="Posting station / village" />
                </Field>

                <Field label="Gender" icon={<User size={13} />}>
                  <select className={okSel} value={form.genderId ?? 1} onChange={e2 => set("genderId", parseInt(e2.target.value))}>
                    {GENDER_OPTIONS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </Field>
                <Field label="Marital Status" icon={<User size={13} />}>
                  <select className={okSel} value={form.maritalStatus ?? 1} onChange={e2 => set("maritalStatus", parseInt(e2.target.value))}>
                    {MARITAL_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </Field>
                <Field label="Phone No." icon={<Phone size={13} />} error={e.phone}>
                  <input className={e.phone ? errInp : okInp}
                    value={form.phone ?? ""} onChange={e2 => set("phone", e2.target.value.replace(/\D/g, ""))}
                    onBlur={() => touch("phone")} placeholder="10-digit mobile" maxLength={15} />
                </Field>

                <Field label="Address" icon={<MapPin size={13} />} col2>
                  <input className={okInp} value={form.address ?? ""} onChange={e2 => set("address", e2.target.value)} placeholder="Full address" />
                </Field>
                <Field label="Email Id" icon={<Mail size={13} />} error={e.emailId}>
                  <input type="email" className={e.emailId ? errInp : okInp}
                    value={form.emailId ?? ""} onChange={e2 => set("emailId", e2.target.value)}
                    onBlur={() => touch("emailId")} placeholder="email@example.com" />
                </Field>

                <Section title="Employment Detail" />

                <Field label="Employee Code" icon={<Hash size={13} />} required error={e.code}>
                  <input className={e.code ? errInp : okInp}
                    value={form.code ?? ""} onChange={e2 => set("code", e2.target.value)}
                    onBlur={() => touch("code")} placeholder="e.g. CDP 107" />
                </Field>
                <Field label="Designation" icon={<Briefcase size={13} />} required error={e.designationId}>
                  <select className={e.designationId ? errSel : okSel}
                    value={form.designationId ?? 0} onChange={e2 => set("designationId", parseInt(e2.target.value))}
                    onBlur={() => touch("designationId")}>
                    <option value={0}>— Select Designation —</option>
                    {designations.map(d => <option key={d.id} value={d.id}>{d.description}</option>)}
                  </select>
                </Field>
                <Field label="Date of Joining" icon={<Calendar size={13} />} required error={e.joiningDate}>
                  <input type="date" className={e.joiningDate ? errInp : okInp}
                    value={form.joiningDate ?? ""} onChange={e2 => set("joiningDate", e2.target.value)}
                    onBlur={() => touch("joiningDate")} />
                </Field>

                <Field label="Date of Birth" icon={<Calendar size={13} />}>
                  <input type="date" className={okInp} value={form.dob ?? ""} onChange={e2 => set("dob", e2.target.value)} />
                </Field>
                <Field label="Status" icon={<ClipboardList size={13} />}>
                  <select className={okSel} value={form.status ?? 1} onChange={e2 => set("status", parseInt(e2.target.value))}>
                    {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </Field>
                <div /> {/* spacer */}

                {/* Is Leave */}
                <div className="col-span-3 flex items-start gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 select-none mt-0.5">
                    <input type="checkbox" checked={form.isLeave ?? false}
                      onChange={e2 => set("isLeave", e2.target.checked)}
                      className="w-4 h-4 rounded accent-purple-600" />
                    Employee is currently on Leave
                  </label>
                  {form.isLeave && (
                    <Field label="Leave Start Date" icon={<Calendar size={13} />} required error={e.leaveDate}>
                      <input type="date" className={e.leaveDate ? errInp : okInp}
                        value={form.leaveDate ?? ""} onChange={e2 => set("leaveDate", e2.target.value)} />
                    </Field>
                  )}
                </div>

                <Field label="Remarks" icon={<ClipboardList size={13} />} col2>
                  <input className={okInp} value={form.remarks ?? ""} onChange={e2 => set("remarks", e2.target.value)} placeholder="Any remarks" />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 2 && (
            <div className="p-6 space-y-7">

              {/* Payroll */}
              <div>
                <p className="text-xs font-bold text-purple-600 uppercase tracking-widest border-b border-gray-100 pb-1 mb-5">Payroll Detail</p>
                <div className="grid grid-cols-3 gap-x-6 gap-y-5">
                  <Field label="PF Account No." icon={<CreditCard size={13} />}>
                    <input className={okInp} value={form.pfAccountNo ?? ""} onChange={e2 => set("pfAccountNo", e2.target.value)} placeholder="PF Account No." />
                  </Field>
                  <Field label="UAN No." icon={<Hash size={13} />}>
                    <input className={okInp} value={form.uanNo ?? ""} onChange={e2 => set("uanNo", e2.target.value)} placeholder="Universal Account No." />
                  </Field>
                  <Field label="ESIC Account No." icon={<CreditCard size={13} />}>
                    <input className={okInp} value={form.esicAccountNo ?? ""} onChange={e2 => set("esicAccountNo", e2.target.value)} placeholder="ESIC Account No." />
                  </Field>
                  <Field label="Employee Type" icon={<Briefcase size={13} />}>
                    <select className={okSel} value={form.empType ?? 1} onChange={e2 => set("empType", parseInt(e2.target.value))}>
                      {EMP_TYPE_OPTIONS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Last Increment Date" icon={<Calendar size={13} />}>
                    <input type="date" className={okInp} value={form.lastIncrementDate ?? ""} onChange={e2 => set("lastIncrementDate", e2.target.value)} />
                  </Field>
                </div>
              </div>

              {/* Education */}
              <div>
                <p className="text-xs font-bold text-purple-600 uppercase tracking-widest border-b border-gray-100 pb-1 mb-4">Education Qualification</p>
                <div className="grid grid-cols-4 gap-3">
                  {EDUCATION_OPTIONS.map(eq => (
                    <label key={eq} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-purple-700 select-none">
                      <input type="checkbox"
                        checked={(form.educationQual ?? []).includes(eq)}
                        onChange={e2 => {
                          const cur = form.educationQual ?? [];
                          set("educationQual", e2.target.checked ? [...cur, eq] : cur.filter(q => q !== eq));
                        }}
                        className="w-4 h-4 rounded accent-purple-600" />
                      {eq}
                    </label>
                  ))}
                </div>
              </div>

              {/* Leave Allotment */}
              <div>
                <p className="text-xs font-bold text-purple-600 uppercase tracking-widest border-b border-gray-100 pb-1 mb-4">Leave Allotment</p>

                <div className="flex gap-3 mb-4 items-end bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      Leave Type {leaveErrors.leaveType && <span className="text-red-400 font-normal">— {leaveErrors.leaveType}</span>}
                    </label>
                    <select className={leaveErrors.leaveType ? errSel : okSel}
                      value={leaveType} onChange={e2 => { setLeaveType(e2.target.value); setLeaveErrors(le => ({ ...le, leaveType: undefined })); }}>
                      <option value="">— Select —</option>
                      {LEAVE_TYPES.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      Days {leaveErrors.leaveDays && <span className="text-red-400 font-normal">— {leaveErrors.leaveDays}</span>}
                    </label>
                    <input type="text" inputMode="numeric"
                      className={leaveErrors.leaveDays ? errInp : okInp}
                      value={leaveDays} onChange={e2 => { setLeaveDays(e2.target.value.replace(/\D/g, "")); setLeaveErrors(le => ({ ...le, leaveDays: undefined })); }}
                      placeholder="e.g. 12" />
                  </div>
                  <div className="w-44">
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                      Allotment Date {leaveErrors.leaveAllotDate && <span className="text-red-400 font-normal">— {leaveErrors.leaveAllotDate}</span>}
                    </label>
                    <input type="date"
                      className={leaveErrors.leaveAllotDate ? errInp : okInp}
                      value={leaveAllotDate} onChange={e2 => { setLeaveAllotDate(e2.target.value); setLeaveErrors(le => ({ ...le, leaveAllotDate: undefined })); }} />
                  </div>
                  <button onClick={addLeave}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap shadow-sm">
                    <Plus size={15} /> Add
                  </button>
                </div>

                {(form.leaveAllotments ?? []).length > 0 ? (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Leave Type</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Days</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Allotment Date</th>
                          <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Del</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {(form.leaveAllotments ?? []).map((l, i) => (
                          <tr key={i} className="hover:bg-purple-50/20 transition-colors">
                            <td className="px-4 py-2.5 text-gray-700">{l.leaveType}</td>
                            <td className="px-4 py-2.5 text-gray-700">{l.noOfDays}</td>
                            <td className="px-4 py-2.5 text-gray-700">{l.allotmentDate}</td>
                            <td className="px-4 py-2.5 text-center">
                              <button onClick={() => removeLeave(i)}
                                className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic py-2">No leave allotments added yet.</p>
                )}
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
            <button onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
              <RotateCcw size={15} /> Reset Form
            </button>
            {step === 1 ? (
              <button onClick={handleStep1} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 shadow-md transition-all">
                <Save size={15} />
                {saving ? "Saving…" : "Save & Next →"}
              </button>
            ) : (
              <button onClick={handleStep2} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-60 shadow-md transition-all">
                <Save size={15} />
                {saving ? "Saving…" : "Save Employee"}
              </button>
            )}
          </div>
        </div>
      </div>
    } />
  );
}
