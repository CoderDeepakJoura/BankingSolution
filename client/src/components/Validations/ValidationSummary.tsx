import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ValidationError } from '../../services/Validations/validation';

interface ValidationSummaryProps {
  errors: ValidationError[];
  errorsByTab: Record<string, ValidationError[]>;
  isVisible: boolean;
  onErrorClick?: (fieldName: string, tab: string) => void;
  onClose?: () => void;
  tabNames?: Record<string, string>; // Added optional tabNames prop
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  errorsByTab,
  isVisible,
  onErrorClick,
  onClose,
  tabNames: customTabNames, // Rename incoming tabNames prop
}) => {
  if (!isVisible || errors.length === 0) return null;

  const scrollToField = (fieldName: string, tab: string) => {
    const tabButtons = document.querySelectorAll('[data-tab-id]');
    const targetTab = Array.from(tabButtons).find(
      button => button.getAttribute('data-tab-id') === tab
    ) as HTMLButtonElement;

    if (targetTab) {
      targetTab.click();

      setTimeout(() => {
        const cleanFieldName = fieldName.replace(/\[|\]|\./g, '_');
        const element =
          document.getElementById(cleanFieldName) ||
          document.querySelector(`[name="${fieldName}"]`) ||
          document.querySelector(`input[placeholder*="${fieldName}"]`);

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        }
      }, 100);
    }
    onErrorClick?.(fieldName, tab);
  };

  // Use passed tabNames prop or fall back to defaults
  const tabNames = customTabNames ?? {
    basic: 'Basic Info',
    address: 'Address',
    contact: 'Contact',
    documents: 'Documents',
    nominees: 'Nominees'
  };

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-r-lg shadow-sm">
      <div className="flex items-start">
        <AlertTriangle className="text-red-500 mt-1 mr-3 flex-shrink-0" size={20} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-red-800 font-semibold">
              Please fix {errors.length} validation error{errors.length !== 1 ? 's' : ''}:
            </h3>
            {onClose && (
              <button
                onClick={onClose}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-3">
            {Object.entries(errorsByTab).map(([tab, tabErrors]) => (
              <div key={tab} className="border-l-2 border-red-300 pl-3">
                <h4 className="font-medium text-red-700 text-sm mb-1">
                  {tabNames[tab] || tab} ({tabErrors.length})
                </h4>
                <ul className="space-y-1">
                  {tabErrors.map((error, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => scrollToField(error.field, error.tab)}
                        className="text-red-600 hover:text-red-800 text-sm underline text-left hover:no-underline transition-colors"
                      >
                        • {error.message}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
