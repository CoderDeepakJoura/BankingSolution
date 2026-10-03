import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_CONFIG } from "../../constants/config";
import { ArrowLeft, Send, CheckCircle, AlertCircle, User, Mail, Phone, Building2, GitBranch, Tag, MessageSquare, ChevronDown } from "lucide-react";

const SUPPORT_EMAIL = "sicswave@gmail.com";

const CATEGORIES = [
  "Technical Error / Bug",
  "Login or Access Issue",
  "Voucher / Transaction Issue",
  "Account Master Issue",
  "Inter-Branch Transaction",
  "Reports / Ledger Issue",
  "Receipt / Printing Issue",
  "Settings / Configuration",
  "Feature Request",
  "General Query",
  "Other",
];

const PRIORITIES = [
  { value: "Low", label: "Low", desc: "General query, no urgency", color: "text-gray-600 bg-gray-50 border-gray-200" },
  { value: "Medium", label: "Medium", desc: "Affecting workflow but workaround exists", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { value: "High", label: "High", desc: "Blocking daily operations", color: "text-orange-700 bg-orange-50 border-orange-200" },
  { value: "Urgent", label: "Urgent", desc: "Critical — data loss or complete outage", color: "text-red-700 bg-red-50 border-red-200" },
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  society: string;
  branch: string;
  category: string;
  subject: string;
  description: string;
  priority: string;
}

const EMPTY: FormData = {
  name: "", email: "", phone: "", society: "", branch: "",
  category: "", subject: "", description: "", priority: "Medium",
};

const Field: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, required, error, icon, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative">
      {icon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 [&>svg]:w-4 [&>svg]:h-4">
          {icon}
        </span>
      )}
      <div className={icon ? "[&>input]:pl-9 [&>select]:pl-9 [&>textarea]:pl-9" : ""}>{children}</div>
    </div>
    {error && (
      <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" /> {error}
      </p>
    )}
  </div>
);

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors";
const errorInputClass = "border-red-300 bg-red-50 focus:ring-red-400";

const ContactSupport: React.FC = () => {
  const navigate = useNavigate();
  const [backTo, setBackTo] = useState("/");
  const [form, setForm] = useState<FormData>(EMPTY);

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/auth/me`, { method: "GET", credentials: "include" })
      .then((res) => { if (res.ok) setBackTo("/dashboard"); })
      .catch(() => {});
  }, []);

  const backLabel = backTo === "/dashboard" ? "Dashboard" : "Back to Login";
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  };

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    if (!form.email.trim()) e.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email address.";
    if (!form.society.trim()) e.society = "Society name is required.";
    if (!form.branch.trim()) e.branch = "Branch name is required.";
    if (!form.category) e.category = "Please select an issue category.";
    if (!form.subject.trim()) e.subject = "Subject is required.";
    if (!form.description.trim()) e.description = "Please describe your issue.";
    else if (form.description.trim().length < 20) e.description = "Please provide more detail (at least 20 characters).";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const body = [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      form.phone ? `Phone: ${form.phone}` : null,
      `Society: ${form.society}`,
      `Branch: ${form.branch}`,
      `Category: ${form.category}`,
      `Priority: ${form.priority}`,
      ``,
      `Description:`,
      form.description,
    ].filter((l) => l !== null).join("\n");

    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[${form.priority}] ${form.subject}`)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setSubmitted(true);
  };

  const handleReset = () => {
    setForm(EMPTY);
    setErrors({});
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">

      {/* Brand Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200/60 shadow-sm">
        <div className="w-full px-8 py-3.5 flex items-center gap-4">
          <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M3 17l6-6 4 4 8-8" stroke="#16A34A" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="10" stroke="#FBBF24" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent leading-tight">
              Sicswave FinCore
            </h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide leading-tight">
              Cloud-Ready, Enterprise Banking Platform
            </p>
          </div>
          <button
            onClick={() => navigate(backTo)}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-md hover:bg-blue-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {backLabel}
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 w-full">
        <div className="w-full px-8 py-12 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20 shadow-lg">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-blue-200 text-[11px] font-semibold uppercase tracking-widest mb-1.5">Support · Contact Us</p>
            <h2 className="text-3xl font-bold text-white tracking-tight">Contact Support</h2>
            <p className="text-blue-300 text-xs mt-2">We respond within 1 business day · Mon–Sat, 9 AM–6 PM IST</p>
          </div>
          <div className="ml-auto text-right">
            <span className="inline-block bg-white/10 border border-white/20 text-blue-100 text-xs px-4 py-2 rounded-full">
              {SUPPORT_EMAIL}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="w-full px-8 py-10 flex gap-8 items-start">

        {/* Sidebar info */}
        <aside className="flex-shrink-0 w-64 sticky top-[61px] self-start space-y-4">

          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
              <p className="text-white text-[11px] font-semibold uppercase tracking-widest">Before You Write</p>
            </div>
            <div className="p-4 space-y-3">
              {[
                { icon: "📖", text: "Check the Help Center — most questions are answered there." },
                { icon: "📸", text: "Include a screenshot if you see an error message." },
                { icon: "🏢", text: "Mention your society name and branch so we can look up your account." },
                { icon: "📅", text: "Tell us the working date when the issue occurred." },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
                  <span className="flex-shrink-0 mt-0.5">{item.icon}</span>
                  <span className="leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
              <p className="text-white text-[11px] font-semibold uppercase tracking-widest">Response Times</p>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: "Low / Medium", time: "Within 1 business day" },
                { label: "High", time: "Within 4 hours" },
                { label: "Urgent", time: "Within 1 hour" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-xs">
                  <span className="text-gray-500">{item.label}</span>
                  <span className="text-gray-700 font-medium">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          <a
            href="/help-center"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-all shadow-sm"
          >
            <span className="text-base">📖</span>
            Browse Help Center
            <span className="ml-auto text-gray-400 text-xs">→</span>
          </a>
        </aside>

        {/* Form card */}
        <main className="flex-1 min-w-0">
          {submitted ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-12 py-16 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Request Submitted</h3>
              <p className="text-sm text-gray-500 mb-1">Your email client should have opened with the details pre-filled.</p>
              <p className="text-sm text-gray-500 mb-8">
                Send it to <strong className="text-gray-700">{SUPPORT_EMAIL}</strong> and we'll get back to you.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Submit Another Request
                </button>
                <button
                  onClick={() => navigate(backTo)}
                  className="px-5 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {backLabel}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-10 py-8 space-y-8">

                {/* Contact details */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Your Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Full Name" required error={errors.name} icon={<User />}>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="e.g. Rajesh Kumar"
                        className={`${inputClass} ${errors.name ? errorInputClass : ""}`}
                      />
                    </Field>
                    <Field label="Email Address" required error={errors.email} icon={<Mail />}>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        placeholder="you@example.com"
                        className={`${inputClass} ${errors.email ? errorInputClass : ""}`}
                      />
                    </Field>
                    <Field label="Phone Number" error={errors.phone} icon={<Phone />}>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => set("phone", e.target.value)}
                        placeholder="Optional"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Society Name" required error={errors.society} icon={<Building2 />}>
                      <input
                        type="text"
                        value={form.society}
                        onChange={(e) => set("society", e.target.value)}
                        placeholder="e.g. Shri Ram Co-operative Society"
                        className={`${inputClass} ${errors.society ? errorInputClass : ""}`}
                      />
                    </Field>
                    <Field label="Branch Name" required error={errors.branch} icon={<GitBranch />}>
                      <input
                        type="text"
                        value={form.branch}
                        onChange={(e) => set("branch", e.target.value)}
                        placeholder="e.g. Head Office"
                        className={`${inputClass} ${errors.branch ? errorInputClass : ""}`}
                      />
                    </Field>
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                {/* Issue details */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Issue Details</h3>
                  <div className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Issue Category" required error={errors.category} icon={<Tag />}>
                        <div className="relative">
                          <select
                            value={form.category}
                            onChange={(e) => set("category", e.target.value)}
                            className={`${inputClass} pl-9 appearance-none cursor-pointer ${errors.category ? errorInputClass : ""}`}
                          >
                            <option value="">Select a category…</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </Field>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          Priority <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {PRIORITIES.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => set("priority", p.value)}
                              className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                                form.priority === p.value
                                  ? p.color + " border-current font-semibold"
                                  : "text-gray-500 bg-white border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="font-semibold">{p.label}</div>
                              <div className={`text-[10px] mt-0.5 leading-tight ${form.priority === p.value ? "opacity-80" : "text-gray-400"}`}>
                                {p.desc}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Field label="Subject" required error={errors.subject}>
                      <input
                        type="text"
                        value={form.subject}
                        onChange={(e) => set("subject", e.target.value)}
                        placeholder="Brief summary of the issue"
                        className={`${inputClass} ${errors.subject ? errorInputClass : ""}`}
                      />
                    </Field>

                    <Field label="Description" required error={errors.description}>
                      <textarea
                        value={form.description}
                        onChange={(e) => set("description", e.target.value)}
                        rows={6}
                        placeholder="Describe the issue in detail. Include: what you were doing, what happened, any error messages you saw, and the working date at the time."
                        className={`${inputClass} resize-none leading-relaxed ${errors.description ? errorInputClass : ""}`}
                      />
                      <p className="mt-1 text-[10px] text-gray-400 text-right">{form.description.length} characters</p>
                    </Field>
                  </div>
                </div>

                <div className="border-t border-gray-100" />

                {/* Submit */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">
                    Submitting opens your email client with the details pre-filled.<br />
                    Send the email to complete your request.
                  </p>
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <Send className="w-4 h-4" />
                    Send Request
                  </button>
                </div>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-6 pb-4">
            © {new Date().getFullYear()} Sicswave FinCore Ltd. · All rights reserved.
          </p>
        </main>
      </div>
    </div>
  );
};

export default ContactSupport;
