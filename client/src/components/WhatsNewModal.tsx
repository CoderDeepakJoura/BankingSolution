import React from "react";
import { APP_VERSION, changelog, type ChangeType } from "../utils/changelog";

interface Props {
  onClose: () => void;
}

const typeBadge: Record<ChangeType, { label: string; className: string }> = {
  new:         { label: "New",         className: "bg-green-100 text-green-700 border border-green-200" },
  fix:         { label: "Fix",         className: "bg-red-100 text-red-700 border border-red-200" },
  improvement: { label: "Improvement", className: "bg-blue-100 text-blue-700 border border-blue-200" },
};

const WhatsNewModal: React.FC<Props> = ({ onClose }) => {
  const latestEntry = changelog[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h2 className="text-xl font-bold text-white">What's New</h2>
              <p className="text-indigo-200 text-sm">
                Version {APP_VERSION} &mdash; {latestEntry?.date}
              </p>
            </div>
          </div>
        </div>

        {/* Changes */}
        <div className="px-6 py-5 max-h-96 overflow-y-auto">
          {changelog.map((entry) => (
            <div key={entry.version} className="mb-4 last:mb-0">
              {changelog.length > 1 && (
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                  v{entry.version} — {entry.date}
                </p>
              )}
              <ul className="space-y-2">
                {entry.changes.map((change, i) => {
                  const badge = typeBadge[change.type];
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <span className={`mt-0.5 shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                      <span className="text-sm text-gray-700">{change.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
