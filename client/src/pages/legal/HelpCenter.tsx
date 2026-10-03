import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API_CONFIG } from "../../constants/config";
import {
  ArrowLeft, Search, ChevronDown, ChevronUp,
  BookOpen, FileText, Users, ArrowLeftRight,
  Receipt, BarChart2, AlertCircle, HelpCircle,
} from "lucide-react";

// ── Data ─────────────────────────────────────────────────────────────────────

interface Article {
  q: string;
  a: React.ReactNode;
}

interface Category {
  id: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  articles: Article[];
}

const CATEGORIES: Category[] = [
  {
    id: "getting-started",
    icon: <BookOpen className="w-5 h-5" />,
    label: "Getting Started",
    color: "from-blue-500 to-blue-600",
    articles: [
      {
        q: "What is the Working Date?",
        a: (
          <>
            <p>The <strong>Working Date</strong> is the date the system currently operates under. All vouchers you enter are posted against this date — not today's calendar date.</p>
            <p className="mt-2">The working date advances when the branch manager runs the <strong>Day End</strong> process. Until Day End is run, new vouchers continue to post on the current working date.</p>
            <p className="mt-2">You can see the working date displayed in the header bar after login.</p>
          </>
        ),
      },
      {
        q: "How do I begin the day (Day Begin)?",
        a: (
          <>
            <p>Day Begin is run by a manager or super-user at the start of each working day. It advances the system to the new working date and opens the session for voucher entry.</p>
            <p className="mt-2">Navigate to <strong>Day Operations → Day Begin</strong> and confirm the new date. Regular operators cannot enter vouchers until Day Begin has been completed.</p>
          </>
        ),
      },
      {
        q: "How do I end the day (Day End)?",
        a: (
          <>
            <p>Day End closes the current working date. After Day End, no new vouchers can be posted for that date.</p>
            <p className="mt-2">Navigate to <strong>Day Operations → Day End</strong>. The system will validate that all required processes (interest postings, pending verifications) are complete before allowing Day End to proceed.</p>
          </>
        ),
      },
      {
        q: "What is a Session, and what are Session Dates?",
        a: (
          <>
            <p>A <strong>Session</strong> corresponds to a financial year (e.g. 2025–2026). Session dates run from <strong>1 April</strong> to <strong>31 March</strong> of the following year, following the Indian financial calendar.</p>
            <p className="mt-2">Reports default to the start of the current session as their "From Date". You can always change the date range manually on any report.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "vouchers",
    icon: <FileText className="w-5 h-5" />,
    label: "Vouchers",
    color: "from-indigo-500 to-indigo-600",
    articles: [
      {
        q: "How do I enter a Saving Deposit?",
        a: (
          <>
            <p>Go to <strong>Transactions → Saving → Deposit</strong>. Select the member's account, enter the amount, narration, and confirm. The system will assign a voucher number automatically.</p>
            <p className="mt-2">If Maker-Checker is enabled, the voucher will remain in a <em>pending</em> state until a second operator verifies it.</p>
          </>
        ),
      },
      {
        q: "How do I enter a Saving Withdrawal?",
        a: (
          <>
            <p>Go to <strong>Transactions → Saving → Withdrawal</strong>. Select the account and enter the withdrawal amount. The system checks the available balance (including any opening balance) before allowing the transaction.</p>
            <p className="mt-2">To withdraw from a member's account in a different branch, use the <strong>Inter-Branch Withdrawal</strong> flow by selecting a Destination Branch on the withdrawal screen.</p>
          </>
        ),
      },
      {
        q: "What is Maker-Checker verification?",
        a: (
          <>
            <p><strong>Maker-Checker</strong> is a two-operator control. The operator who enters a voucher (the <em>maker</em>) saves it in a pending state. A second operator with verification rights (the <em>checker</em>) must then review and approve it.</p>
            <p className="mt-2">Key rules:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>A maker cannot verify their own voucher.</li>
              <li>Unverified vouchers are not counted in balances until approved.</li>
              <li>You can find pending vouchers under <strong>Voucher Verification</strong>.</li>
            </ul>
          </>
        ),
      },
      {
        q: "How do I search for or delete a voucher?",
        a: (
          <>
            <p>Go to <strong>Voucher Search</strong>. You can search by voucher number or account. Vouchers can only be deleted for the <strong>current working date</strong> — past-date vouchers are locked.</p>
            <p className="mt-2">Some voucher types have deletion restrictions (e.g. Inter-Branch vouchers where a later step already exists). The system will show a specific reason if deletion is blocked.</p>
          </>
        ),
      },
      {
        q: "Why can't I modify this voucher?",
        a: (
          <>
            <p>Not all voucher types support modification. Modifiable types include: Saving Deposit, Saving Withdrawal, RD Kist, Loan Advancement, Loan Recovery, Loan Expense, Cash Voucher, and Journal Voucher.</p>
            <p className="mt-2">Interest postings, maturity vouchers, and Inter-Branch vouchers cannot be modified — they must be deleted and re-entered if incorrect. Voucher Search will show a specific reason for each blocked type.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "accounts",
    icon: <Users className="w-5 h-5" />,
    label: "Accounts",
    color: "from-violet-500 to-violet-600",
    articles: [
      {
        q: "How do I open a new Saving account?",
        a: (
          <>
            <p>Go to <strong>Masters → Saving Account</strong> and click <em>New</em>. Fill in the member details, select the saving product, assign an account number, and save. The account is immediately active for transactions.</p>
          </>
        ),
      },
      {
        q: "How do I open an RD (Recurring Deposit) account?",
        a: (
          <>
            <p>Go to <strong>Masters → RD Account</strong>. Select the RD product, set the kist installment amount, choose the kist interval (Monthly, Quarterly, or Daily), and enter the account opening date. The system calculates the maturity date and amount automatically.</p>
          </>
        ),
      },
      {
        q: "How do I open an FD (Fixed Deposit) account?",
        a: (
          <>
            <p>Go to <strong>Masters → FD Account</strong>. Select the FD product, enter the principal amount, FD date, and tenure. The system calculates the maturity amount using compound interest based on the product's configuration. You can add multiple FD details under one account.</p>
          </>
        ),
      },
      {
        q: "What is an Opening Balance Entry?",
        a: (
          <>
            <p>An <strong>Opening Balance Entry</strong> is used when migrating existing account data into the system. It records a member's balance as of the first day of the session without creating an actual financial voucher.</p>
            <p className="mt-2">Opening balance fields are only visible during the first session (before Day Begin of the first working day). Once normal operations begin, these fields are hidden and opening balances can no longer be edited.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "inter-branch",
    icon: <ArrowLeftRight className="w-5 h-5" />,
    label: "Inter-Branch",
    color: "from-cyan-500 to-cyan-600",
    articles: [
      {
        q: "What is an Inter-Branch (IB) transaction?",
        a: (
          <>
            <p>An <strong>Inter-Branch transaction</strong> allows a member to deposit into or withdraw from their account at a branch other than the one where the account is held.</p>
            <p className="mt-2">There are two flow types:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li><strong>HO to Branch</strong>: Head Office initiates (Step 1); the destination branch completes (Step 3). 2 steps total.</li>
              <li><strong>Branch to Branch</strong>: Source branch initiates (Step 1); HO settles (Step 2); destination branch completes (Step 3). 3 steps total.</li>
            </ul>
          </>
        ),
      },
      {
        q: "What do the IB statuses mean?",
        a: (
          <>
            <p>Each IB voucher moves through these statuses:</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li><span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded font-medium">Pending</span> — Step 1 done; waiting for HO settlement (Step 2) and/or destination branch approval (Step 3).</li>
              <li><span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">HOConfirmed</span> — HO has completed Step 2; waiting for destination branch (Step 3).</li>
              <li><span className="inline-block bg-violet-100 text-violet-800 text-xs px-2 py-0.5 rounded font-medium">BranchCompleted</span> — Destination branch completed Step 3 before HO did Step 2; waiting for HO settlement.</li>
              <li><span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-medium">Completed</span> — Both Step 2 and Step 3 are done. Transaction is fully settled.</li>
            </ul>
          </>
        ),
      },
      {
        q: "How do I approve an incoming IB voucher (destination branch)?",
        a: (
          <>
            <p>Go to <strong>IB Transactions → Incoming Vouchers</strong>. The list shows vouchers where your branch is the destination. Review the amount, member account, and HO reference account, then click <em>Confirm</em>.</p>
            <p className="mt-2">You do not need to wait for HO to complete Step 2 before approving — you can act as soon as the voucher appears in your incoming list.</p>
          </>
        ),
      },
      {
        q: "How does the HO settle a pending IB voucher (Step 2)?",
        a: (
          <>
            <p>Go to <strong>IB Transactions → Pending (HO)</strong>. The list shows vouchers where your branch is the Head Office intermediary. Review the pre-filled debit/credit account names, edit the narration if needed, and click <em>Confirm Settlement</em>.</p>
            <p className="mt-2">The narration is auto-filled with a standard settlement description but can be edited before confirming.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "receipts",
    icon: <Receipt className="w-5 h-5" />,
    label: "Receipts",
    color: "from-emerald-500 to-emerald-600",
    articles: [
      {
        q: "How do I print a receipt after a transaction?",
        a: (
          <>
            <p>After saving a voucher successfully, a <strong>Print Receipt</strong> button appears on the confirmation screen. Click it to generate and download a PDF receipt. The receipt is numbered sequentially — separate from the voucher number.</p>
          </>
        ),
      },
      {
        q: "How do I re-print a receipt?",
        a: (
          <>
            <p>Go to <strong>Voucher Re-print</strong> (under Transactions or Utilities). Enter the voucher number and type, then click <em>Print Receipt</em>. The system retrieves the original transaction details and generates a fresh receipt PDF.</p>
          </>
        ),
      },
      {
        q: "What are receipt numbers and how are they assigned?",
        a: (
          <>
            <p>Receipt numbers are a <strong>sequential counter</strong> maintained per branch, separate from voucher numbers. They are assigned at print time, not at voucher entry time.</p>
            <p className="mt-2">The starting receipt number can be configured under <strong>Settings → Printing Settings → Start Receipt No From</strong>. This is useful when migrating from a previous system and you want continuity with existing receipt books.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "reports",
    icon: <BarChart2 className="w-5 h-5" />,
    label: "Reports",
    color: "from-orange-500 to-orange-600",
    articles: [
      {
        q: "How do I run a Saving Account Ledger?",
        a: (
          <>
            <p>Go to <strong>Reports → Saving Ledger</strong>. Select the account and the date range. The report defaults to the start of the current financial year as the From Date. Click <em>Generate</em> to view the full transaction history with running balance.</p>
          </>
        ),
      },
      {
        q: "How do I run the RD or FD Financial Report?",
        a: (
          <>
            <p>Go to <strong>Reports → RD Financial Report</strong> or <strong>FD Financial Report</strong>. Choose a date range and click <em>Generate</em>.</p>
            <p className="mt-2">The RD Financial Report has two display formats: <em>Standard</em> (debit/credit columns) and <em>With Balance</em> (opening balance, debit, credit, closing balance). Switch between them using the format dropdown — no re-fetch is needed.</p>
          </>
        ),
      },
      {
        q: "Why does the report From Date appear blank or wrong?",
        a: (
          <>
            <p>All reports default their From Date to <strong>1 April of the current financial year</strong>. If the date appears blank or shows an unexpected value, check that your session information is correctly set in the system.</p>
            <p className="mt-2">You can always type in a date manually in the From Date field regardless of the default.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "errors",
    icon: <AlertCircle className="w-5 h-5" />,
    label: "Common Errors",
    color: "from-rose-500 to-rose-600",
    articles: [
      {
        q: "\"Failed to load required data\" — what does this mean?",
        a: (
          <>
            <p>This error usually means the system could not fetch the settings or reference data needed to load a screen. Common causes:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Your session has expired — try logging out and back in.</li>
              <li>The server is temporarily unreachable — wait a moment and refresh.</li>
              <li>Your branch data has not been fully configured — contact your administrator.</li>
            </ul>
          </>
        ),
      },
      {
        q: "\"Session expired\" — what should I do?",
        a: (
          <>
            <p>Your login session expires automatically after a period of inactivity. You will be redirected to the login screen.</p>
            <p className="mt-2">Simply log in again with your credentials. Any unsaved work will be lost — save frequently when entering large amounts of data.</p>
          </>
        ),
      },
      {
        q: "\"This voucher cannot be deleted\" — why?",
        a: (
          <>
            <p>Vouchers can only be deleted for the <strong>current working date</strong>. Past-date vouchers are locked.</p>
            <p className="mt-2">For Inter-Branch vouchers, you cannot delete an earlier step if a later step already exists. For example, you cannot delete Step 1 if Step 2 or Step 3 has already been recorded. Delete the later steps first.</p>
          </>
        ),
      },
      {
        q: "The account balance shown is lower than expected — why?",
        a: (
          <>
            <p>The balance shown on withdrawal and ledger screens reflects all <strong>verified and posted</strong> transactions. Common reasons for a lower-than-expected balance:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>A recent deposit voucher is still pending Maker-Checker verification.</li>
              <li>An opening balance has not been entered for a migrated account.</li>
              <li>A previous withdrawal or interest debit has been posted that you may not have seen.</li>
            </ul>
            <p className="mt-2">Run the account's ledger report to see the full transaction history and identify the discrepancy.</p>
          </>
        ),
      },
    ],
  },
  {
    id: "faq",
    icon: <HelpCircle className="w-5 h-5" />,
    label: "FAQs",
    color: "from-slate-500 to-slate-600",
    articles: [
      {
        q: "Can I enter or delete a voucher for a previous date?",
        a: (
          <>
            <p>No. The system only allows voucher entry and deletion for the <strong>current working date</strong>. Backdated entries are not permitted to maintain the integrity of the audit trail.</p>
            <p className="mt-2">If a transaction was missed on a previous date, contact your branch manager. Corrections must follow the Society's internal approval process.</p>
          </>
        ),
      },
      {
        q: "What is the difference between RD and FD?",
        a: (
          <>
            <p><strong>RD (Recurring Deposit)</strong>: A member makes regular periodic installments (kists) over a fixed tenure. Interest is calculated on the accumulating balance using an annuity formula. Suitable for members who want to save a fixed amount each period.</p>
            <p className="mt-2"><strong>FD (Fixed Deposit)</strong>: A member deposits a lump sum for a fixed period. Interest accrues on the full principal using compound interest. Suitable for members with a larger one-time amount to invest.</p>
          </>
        ),
      },
      {
        q: "What does a \"Pending\" IB status mean for my branch?",
        a: (
          <>
            <p>If your branch is the <strong>destination branch</strong>, a Pending voucher means a deposit or withdrawal for one of your accounts has been initiated at another branch and is waiting for your approval (Step 3). Check <em>IB Incoming Vouchers</em>.</p>
            <p className="mt-2">If your branch is the <strong>HO branch</strong>, a Pending voucher means a Branch-to-Branch transaction needs your settlement (Step 2). Check <em>IB Pending (HO)</em>.</p>
          </>
        ),
      },
      {
        q: "Can I use this platform on a mobile phone or tablet?",
        a: (
          <>
            <p>The platform is designed for <strong>desktop and laptop use only</strong>. It requires a screen width of at least 1024 pixels for proper display. Access from mobile phones or small tablets will show a "Desktop Only" message.</p>
          </>
        ),
      },
      {
        q: "How do I contact support if I can't find my answer here?",
        a: (
          <>
            <p>Email the support team at{" "}
              <a href="mailto:support@sicswave.com" className="text-blue-600 hover:underline font-medium">support@sicswave.com</a>.
              Include your society name, branch name, a description of the issue, and screenshots if possible.
            </p>
            <p className="mt-2">Support is available Monday–Saturday, 9 AM–6 PM IST. You can expect a response within 1 business day.</p>
          </>
        ),
      },
    ],
  },
];

// ── Accordion Item ─────────────────────────────────────────────────────────────

const ArticleItem: React.FC<{ article: Article; open: boolean; onToggle: () => void }> = ({
  article, open, onToggle,
}) => (
  <div className={`border rounded-xl transition-all ${open ? "border-blue-200 shadow-sm" : "border-gray-100 hover:border-gray-200"}`}>
    <button
      onClick={onToggle}
      className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 cursor-pointer"
    >
      <span className={`text-sm font-medium leading-snug ${open ? "text-blue-700" : "text-gray-700"}`}>
        {article.q}
      </span>
      {open
        ? <ChevronUp className="flex-shrink-0 w-4 h-4 text-blue-500 mt-0.5" />
        : <ChevronDown className="flex-shrink-0 w-4 h-4 text-gray-400 mt-0.5" />}
    </button>
    {open && (
      <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed space-y-1 border-t border-blue-50 pt-4">
        {article.a}
      </div>
    )}
  </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();
  const [backTo, setBackTo] = useState("/");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/auth/me`, { method: "GET", credentials: "include" })
      .then((res) => { if (res.ok) setBackTo("/dashboard"); })
      .catch(() => {});
  }, []);

  const handleBack = () => navigate(backTo);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const toggle = (key: string) =>
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((cat) => ({
      ...cat,
      articles: cat.articles.filter(
        (a) => a.q.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.articles.length > 0);
  }, [query]);

  const displayed = activeCategory && !query
    ? filtered.filter((c) => c.id === activeCategory)
    : filtered;

  const totalArticles = CATEGORIES.reduce((sum, c) => sum + c.articles.length, 0);

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
            onClick={handleBack}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-md hover:bg-blue-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {backTo === "/dashboard" ? "Dashboard" : "Login"}
          </button>
        </div>
      </header>

      {/* Hero + Search */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 w-full">
        <div className="w-full px-8 py-14 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-blue-100 text-xs px-4 py-1.5 rounded-full mb-5">
            <HelpCircle className="w-3.5 h-3.5" />
            Help Center · {CATEGORIES.length} categories · {totalArticles} articles
          </div>
          <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">How can we help you?</h2>
          <p className="text-blue-300 text-sm mb-8">Search across all guides, or browse by category below.</p>

          {/* Search */}
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveCategory(null); }}
              placeholder={'Search articles… e.g. "voucher", "IB status", "receipt"'}
              className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm bg-white shadow-lg border-0 focus:outline-none focus:ring-2 focus:ring-white/60 text-gray-700 placeholder-gray-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
              >×</button>
            )}
          </div>
        </div>
      </div>

      {/* Category pill bar */}
      {!query && (
        <div className="w-full px-8 py-5 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                !activeCategory
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              All Categories
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  activeCategory === cat.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                <span className={`[&>svg]:w-3 [&>svg]:h-3 ${activeCategory === cat.id ? "text-white" : "text-gray-400"}`}>
                  {cat.icon}
                </span>
                {cat.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-0.5 ${
                  activeCategory === cat.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {cat.articles.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="w-full px-8 py-10">

        {/* Search results label */}
        {query && (
          <p className="text-sm text-gray-500 mb-6">
            {filtered.reduce((s, c) => s + c.articles.length, 0) === 0
              ? `No articles found for "${query}"`
              : `${filtered.reduce((s, c) => s + c.articles.length, 0)} result${filtered.reduce((s, c) => s + c.articles.length, 0) === 1 ? "" : "s"} for "${query}"`}
          </p>
        )}

        {/* Category grid (all categories, no filter active) */}
        {!query && !activeCategory && (
          <div className="grid grid-cols-4 gap-4 mb-10">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all p-5 text-left group cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white mb-3 shadow-sm`}>
                  {cat.icon}
                </div>
                <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{cat.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{cat.articles.length} articles</p>
              </button>
            ))}
          </div>
        )}

        {/* Articles */}
        <div className={displayed.length > 1 ? "grid grid-cols-2 gap-8" : ""}>
          {displayed.map((cat) => (
            <div key={cat.id}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center text-white flex-shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5`}>
                  {cat.icon}
                </div>
                <h3 className="text-sm font-bold text-gray-800">{cat.label}</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {cat.articles.length} articles
                </span>
              </div>
              <div className="space-y-2">
                {cat.articles.map((article, idx) => {
                  const key = `${cat.id}-${idx}`;
                  return (
                    <ArticleItem
                      key={key}
                      article={article}
                      open={!!openItems[key]}
                      onToggle={() => toggle(key)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No articles matched your search.</p>
            <p className="text-gray-400 text-xs mt-1">Try a different keyword, or{" "}
              <a href="mailto:support@sicswave.com" className="text-blue-600 hover:underline">contact support</a>.
            </p>
          </div>
        )}

        {/* Contact support nudge */}
        {!query && (
          <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl px-8 py-7 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Still need help?</p>
              <p className="text-blue-200 text-xs mt-1">Our support team responds within 1 business day.</p>
            </div>
            <a
              href="mailto:support@sicswave.com"
              className="flex-shrink-0 bg-white text-blue-700 text-xs font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
            >
              Email Support →
            </a>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-10 pb-4">
          © {new Date().getFullYear()} Sicswave FinCore Ltd. · All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default HelpCenter;
