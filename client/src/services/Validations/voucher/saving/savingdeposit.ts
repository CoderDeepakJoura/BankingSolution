// hooks/useFormValidation.ts
import { useState, useCallback } from "react";
import {
  ValidationError,
  ValidationResult,
  ValidationRule,
} from "../../validation";
export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validation rules for all fields
  const validationRules: Record<string, ValidationRule> = {
    savingProduct: {
      required: true,
      requiredMessage: "Saving Product selection is required.",
      tab: "basic",
    },
    accountId: {
      required: true,
      requiredMessage: "Saving Account selection is required.",
      tab: "basic",
    },
    depositAmount: {
      required: true,
      pattern: /^\d+(\.\d{1,2})?$/,
      requiredMessage: "Deposit Amount is required.",
      patternMessage: "Deposit Amount must be a valid number with up to 2 decimal places.",
      custom: (value: string) => {
        const numValue = parseFloat(value);
        return numValue > 0;
      },
      customMessage: "Deposit Amount must be greater than 0.",
      tab: "basic",
    },
    debitAccount: {
      required: true,
      requiredMessage: "Debit Account selection is required.",
      tab: "basic",
    }
    // ,
    // narration: {
    //   required: true,
    //   minLength: 2,
    //   maxLength: 255,
    //   requiredMessage: "Narration is required.",
    //   tab: "basic",
    // },
    
  };

  const validateField = useCallback(
    (fieldName: string, value: any, formData?: any): ValidationError[] => {
      const fieldErrors: ValidationError[] = [];
      const rules = validationRules[fieldName];

      if (!rules) return fieldErrors;

      // Required validation
      if (rules.required && (!value || value.toString().trim() === "")) {
        fieldErrors.push({
          field: fieldName,
          message: rules.requiredMessage || `${fieldName} is required`,
          type: "required",
          tab: rules.tab,
        });
        return fieldErrors; // Return early for required fields
      }

      if (!value || value.toString().trim() === "") {
        return fieldErrors; // Skip other validations if field is empty and not required
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        fieldErrors.push({
          field: fieldName,
          message: rules.patternMessage || `Invalid format for ${fieldName}`,
          type: "format",
          tab: rules.tab,
        });
      }

      // Length validation
      if (rules.minLength && value.length < rules.minLength) {
        fieldErrors.push({
          field: fieldName,
          message: `${fieldName} must be at least ${rules.minLength} characters`,
          type: "length",
          tab: rules.tab,
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        fieldErrors.push({
          field: fieldName,
          message: `${fieldName} cannot exceed ${rules.maxLength} characters`,
          type: "length",
          tab: rules.tab,
        });
      }

      // Custom validation
      if (rules.custom && !rules.custom(value, formData)) {
        fieldErrors.push({
          field: fieldName,
          message: rules.customMessage || `Invalid ${fieldName}`,
          type: "custom",
          tab: rules.tab,
        });
      }

      return fieldErrors;
    },
    []
  );
const validateForm = useCallback((formData: any): ValidationResult => {
    const allErrors: ValidationError[] = [];
    
    // Validate main form fields
    Object.keys(validationRules).forEach(fieldName => {
      const fieldErrors = validateField(fieldName, formData[fieldName], formData);
      allErrors.push(...fieldErrors);
    });
    // Group errors by field
    const errorsByField = allErrors.reduce((acc, error) => {
      if (!acc[error.field]) acc[error.field] = [];
      acc[error.field].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);

    // Group errors by tab
    const errorsByTab = allErrors.reduce((acc, error) => {
      if (!acc[error.tab]) acc[error.tab] = [];
      acc[error.tab].push(error);
      return acc;
    }, {} as Record<string, ValidationError[]>);

    setErrors(allErrors);
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      errorsByField,
      errorsByTab
    };
  }, [validateField]);
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const markFieldTouched = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  return {
    errors,
    touched,
    validateField,
    clearErrors,
    validateForm,
    markFieldTouched,
    validationRules,
  };
};
