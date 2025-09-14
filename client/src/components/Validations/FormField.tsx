// components/FormField.tsx
import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ValidationError } from '../../services/Validations/validation';
interface FormFieldProps {
  label: string;
  name: string;
  errors: ValidationError[];
  children: React.ReactNode;
  required?: boolean;
  icon?: React.ReactNode;
  description?: string;
}

export const FormField: React.FC<FormFieldProps> = ({ 
  label, 
  name, 
  errors, 
  children, 
  required,
  icon,
  description 
}) => {
  const hasErrors = errors.length > 0;
  const cleanName = name.replace(/\[|\]|\./g, '_');

  return (
    <div className="flex flex-col">
      <label htmlFor={cleanName} className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
        {icon}
        {label}
        {required && <span className="text-red-500 text-xs">*</span>}
      </label>
      
      <div className="relative">
        {React.cloneElement(children as React.ReactElement, {
          id: cleanName,
          name: name,
          className: `${(children as any)?.props?.className || ''} ${
            hasErrors 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50' 
              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
          }`.trim()
        })}
      </div>

      {description && !hasErrors && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <AlertCircle size={12} />
          {description}
        </p>
      )}

      {hasErrors && (
        <div className="mt-1 space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-red-600 text-sm flex items-center gap-1">
              <AlertCircle size={14} />
              {error.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
