import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { API_CONFIG } from "../../constants/config";

// ── Section component ──────────────────────────────────────────────────────────
interface SectionProps {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}

export const LegalSection: React.FC<SectionProps> = ({ id, number, title, children }) => (
  <div id={id} className="mb-12 scroll-mt-6">
    <div className="flex items-center gap-3 mb-4">
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
        {number}
      </span>
      <h2 className="text-[15px] font-semibold text-gray-800">{title}</h2>
    </div>
    <div className="pl-11 text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
    <div className="mt-10 border-b border-gray-100" />
  </div>
);

export const LegalList: React.FC<{ items: React.ReactNode[] }> = ({ items }) => (
  <ul className="space-y-2 mt-2">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2.5">
        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-[7px]" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

// ── Layout ─────────────────────────────────────────────────────────────────────
interface LegalLayoutProps {
  title: string;
  subtitle: string;
  effectiveDate: string;
  icon: React.ReactNode;
  accentColor: string;
  sections: { id: string; title: string }[];
  children: React.ReactNode;
}

const LegalLayout: React.FC<LegalLayoutProps> = ({
  title,
  subtitle,
  effectiveDate,
  icon,
  sections,
  children,
}) => {
  const navigate = useNavigate();
  const [backTo, setBackTo] = useState<string>("/");
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    fetch(`${API_CONFIG.BASE_URL}/auth/me`, { method: "GET", credentials: "include" })
      .then((res) => { if (res.ok) setBackTo("/dashboard"); })
      .catch(() => {});
  }, []);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Highlight active TOC entry as user scrolls
  useEffect(() => {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, [sections]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">

      {/* ── Brand Header ── */}
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
            {backTo === "/dashboard" ? "Dashboard" : "Login"}
          </button>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 w-full">
        <div className="w-full px-8 py-12 flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/20 shadow-lg">
            <span className="text-white [&>svg]:w-8 [&>svg]:h-8">{icon}</span>
          </div>
          <div>
            <p className="text-blue-200 text-[11px] font-semibold uppercase tracking-widest mb-1.5">{subtitle}</p>
            <h2 className="text-3xl font-bold text-white tracking-tight">{title}</h2>
            <p className="text-blue-300 text-xs mt-2">Effective {effectiveDate}</p>
          </div>
          {/* Section count badge */}
          <div className="ml-auto text-right">
            <span className="inline-block bg-white/10 border border-white/20 text-blue-100 text-xs px-4 py-2 rounded-full">
              {sections.length} Sections
            </span>
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="w-full px-8 py-10 flex gap-8 items-start">

        {/* Sticky TOC sidebar */}
        <aside className="flex-shrink-0 w-64 sticky top-[61px] self-start">
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
              <p className="text-white text-[11px] font-semibold uppercase tracking-widest">Contents</p>
            </div>
            <nav className="py-2">
              {sections.map(({ id, title }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className={`w-full text-left px-4 py-2.5 text-xs transition-all flex items-center gap-2.5 ${
                    activeId === id
                      ? "text-blue-700 font-semibold bg-blue-50 border-l-2 border-blue-600"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50 border-l-2 border-transparent"
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      activeId === id
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {sections.findIndex((s) => s.id === id) + 1}
                  </span>
                  <span className="leading-tight">{title}</span>
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-12 py-10">
            {children}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6 pb-4">
            © {new Date().getFullYear()} Sicswave FinCore Ltd. · All rights reserved.
          </p>
        </main>
      </div>
    </div>
  );
};

export default LegalLayout;
