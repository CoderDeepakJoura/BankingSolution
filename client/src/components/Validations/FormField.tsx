// components/Validations/FormField.tsx
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
  required = false,
  icon,
  description 
}) => {
  const hasErrors = errors.length > 0;
  const cleanName = name.replace(/\[|\]|\./g, '_');

  // ✅ Enhanced children handling with validation
  const enhancedChildren = React.useMemo(() => {
    // Check if children is null or undefined
    if (children == null) {
      console.warn(`FormField "${name}": children is null or undefined`);
      return null;
    }

    // Check if children is a valid React element
    if (!React.isValidElement(children)) {
      // If it's a string, number, or other primitive, just return it
      if (typeof children === 'string' || typeof children === 'number') {
        return children;
      }
      
      console.warn(`FormField "${name}": children is not a valid React element`, typeof children);
      return children;
    }

    // Clone and enhance the element with proper error handling
    try {
      const childProps = (children as React.ReactElement).props;
      const existingClassName = childProps?.className || '';
      
      const errorClasses = hasErrors 
        ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50' 
        : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100';

      return React.cloneElement(children as React.ReactElement, {
        id: cleanName,
        name: name,
        'aria-invalid': hasErrors,
        'aria-describedby': hasErrors ? `${cleanName}-error` : undefined,
        className: `${existingClassName} ${errorClasses}`.trim()
      });
    } catch (error) {
      console.error(`FormField "${name}": Error cloning element`, error);
      return children;
    }
  }, [children, cleanName, name, hasErrors]);

  return (
    <div className="flex flex-col">
      <label 
        htmlFor={cleanName} 
        className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2"
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {label}
        {required && <span className="text-red-500 text-xs ml-1">*</span>}
      </label>
      
      <div className="relative">
        {enhancedChildren}
      </div>

      {description && !hasErrors && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <AlertCircle size={12} className="flex-shrink-0" />
          <span>{description}</span>
        </p>
      )}

      {hasErrors && (
        <div id={`${cleanName}-error`} className="mt-1 space-y-1" role="alert">
          {errors.map((error, index) => (
            <p 
              key={index} 
              className="text-red-600 text-sm flex items-center gap-1 bg-red-50 p-2 rounded border border-red-200"
            >
              <AlertCircle size={14} className="flex-shrink-0" />
              <span>{error.message}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default FormField;