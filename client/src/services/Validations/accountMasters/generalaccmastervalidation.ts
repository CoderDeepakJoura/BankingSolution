// hooks/useFormValidation.ts
import { useState, useCallback } from "react";
import {
  ValidationError,
  ValidationResult,
  ValidationRule,
} from "../validation";
export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validation rules for all fields
  const validationRules: Record<string, ValidationRule> = {
    accounthead: { 
      required: true, 
      requiredMessage: "Account head selection is required.", 
      tab: 'basic' 
    },
    accountNumber: {
      required: true,
      minLength: 2,
      maxLength: 20,
      pattern: /^\d+$/,
      requiredMessage: "Account Number is required.",
      patternMessage: "Account Number can only contain letters and spaces.",
      tab: "basic",
    },
    firstName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s]+$/,
      requiredMessage: "First name is required.",
      patternMessage: "First name can only contain letters and spaces.",
      tab: "basic",
    },
    firstNameSL: {
      maxLength: 100,
      pattern: /^[\u0900-\u097F\s]*$/,
      patternMessage: "Please enter valid Hindi/Devanagari characters only.",
      tab: "basic",
    },
    lastNameSL: {
      maxLength: 100,
      pattern: /^[\u0900-\u097F\s]*$/,
      patternMessage: "Please enter valid Hindi/Devanagari characters only.",
      tab: "basic",
    },
    statecode: {
      pattern: /^[0-9][0-9]*$/,
      patternMessage: "State code can contain only numbers.",
      tab: "GSTInfo",
      minLength: 1,
      maxLength: 4
    },
    gstiNo: {
      pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      patternMessage: "Please enter a valid GSTIN format.",
      tab: "GSTInfo",
    }
    
    
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
