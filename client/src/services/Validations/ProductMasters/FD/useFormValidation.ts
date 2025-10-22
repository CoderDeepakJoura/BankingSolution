// hooks/useFormValidation.ts (FD Product Master) - COMPLETE VERSION
import { useState, useCallback } from "react";
import {
  ValidationError,
  ValidationResult,
  ValidationRule,
} from "../../validation";

export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validation rules for FD Product
  const validationRules: Record<string, ValidationRule> = {
    // Header Information Tab
    productName: {
      required: true,
      minLength: 2,
      maxLength: 255,
      requiredMessage: "Product Name is required",
      customMessage: "Product Name must be between 2 and 255 characters",
      tab: "header",
    },
    productCode: {
      required: true,
      minLength: 1,
      maxLength: 10,
      pattern: /^[A-Z0-9]+$/,
      requiredMessage: "Product Code is required",
      patternMessage: "Product Code must contain only uppercase letters and numbers",
      tab: "header",
    },
    effectiveFrom: {
      required: true,
      requiredMessage: "Effective From date is required",
      custom: (value: any) => {
        if (!value) return false;
        const effectiveDate = new Date(value);
        return !isNaN(effectiveDate.getTime());
      },
      customMessage: "Please enter a valid date",
      tab: "header",
    },
    effectiveTill: {
      custom: (value: any, formData: any) => {
        if (!value) return true; // Optional field
        const effectiveFrom = new Date(formData?.effectiveFrom);
        const effectiveTill = new Date(value);
        return effectiveTill > effectiveFrom;
      },
      customMessage: "Effective Till date must be after Effective From date",
      tab: "header",
    },

    // Product Rules Tab - ✅ ALL REQUIRED with proper validation
    intAccountType: {
      required: true,
      requiredMessage: "Interest Account Type is required",
      custom: (value: any) => {
        return value > 0;
      },
      customMessage: "Please select a valid Interest Account Type",
      tab: "rules",
    },
    fdMaturityReminderInMonths: {
      required: true, // ✅ REQUIRED
      requiredMessage: "Maturity reminder in months is required",
      custom: (value: any, formData: any) => {
        const numValue = parseInt(value);
        
        // Check if it's a valid number
        if (isNaN(numValue)) {
          return false;
        }
        
        // Must be between 0 and 999
        if (numValue < 1 || numValue > 999) {
          return false;
        }
        
        return true;
      },
      customMessage: "Maturity reminder must be between 1-999 months",
      tab: "rules",
    },
    fdMaturityReminderInDays: {
      required: true, // ✅ REQUIRED
      requiredMessage: "Maturity reminder in days is required",
      custom: (value: any, formData: any) => {
        const numValue = parseInt(value);
        
        // Check if it's a valid number
        if (isNaN(numValue)) {
          return false;
        }
        
        // Must be between 0 and 365
        if (numValue < 1 || numValue > 365) {
          return false;
        }
        
        return true;
      },
      customMessage: "Maturity reminder must be between 1-365 days",
      tab: "rules",
    },

    // Posting Heads Tab
    principalBalHeadCode: {
      required: true,
      requiredMessage: "Principal Balance Head is required",
      custom: (value: any) => {
        return value > 0;
      },
      customMessage: "Please select a valid Principal Balance Head",
      tab: "posting",
    },
    suspendedBalHeadCode: {
      required: true,
      requiredMessage: "Suspended Balance Head is required",
      custom: (value: any) => {
        return value > 0;
      },
      customMessage: "Please select a valid Suspended Balance Head",
      tab: "posting",
    },
    intPayableHeadCode: {
      required: true,
      requiredMessage: "Interest Payable Head is required",
      custom: (value: any) => {
        return value > 0;
      },
      customMessage: "Please select a valid Interest Payable Head",
      tab: "posting",
    },

    // Interest Rules Tab - ✅ ALL REQUIRED with proper validation
    applicableDate: {
      required: true,
      requiredMessage: "Applicable Date is required",
      custom: (value: any) => {
        if (!value) return false;
        const applicableDate = new Date(value);
        return !isNaN(applicableDate.getTime());
      },
      customMessage: "Please enter a valid applicable date",
      tab: "interest",
    },
    interestApplicableOn: {
      required: true,
      requiredMessage: "Interest Applicable On is required",
      custom: (value: any) => {
        return value > 0;
      },
      customMessage: "Please select how interest should be applied",
      tab: "interest",
    },
    interestRateMinValue: {
      required: true,
      requiredMessage: "Minimum Interest Rate is required",
      custom: (value: any) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return false;
        return numValue > 0 && numValue <= 100;
      },
      customMessage: "Interest rate must be greater than 0% and not exceed 100%",
      tab: "interest",
    },
    interestRateMaxValue: {
      required: true,
      requiredMessage: "Maximum Interest Rate is required",
      custom: (value: any, formData: any) => {
        const minRate = parseFloat(formData?.interestRateMinValue) || 0;
        const maxRate = parseFloat(value);
        
        if (isNaN(maxRate)) return false;
        
        // Must be greater than 0 and <= 100
        if (maxRate <= 0 || maxRate > 100) {
          return false;
        }
        
        // Must be >= minimum rate
        if (maxRate < minRate) {
          return false;
        }
        
        return true;
      },
      customMessage: "Maximum interest rate must be greater than 0%, not exceed 100%, and be greater than or equal to minimum rate",
      tab: "interest",
    },
    
    // ✅ Interest Variation - BOTH REQUIRED with comparison
    interestVariationMinValue: {
      required: true, // ✅ REQUIRED
      requiredMessage: "Minimum Interest Variation is required",
      custom: (value: any) => {
        const numValue = parseFloat(value);
        
        // Check if it's a valid number
        if (isNaN(numValue)) {
          return false;
        }
        
        // Must be between -100 and 100
        return numValue >= 1 && numValue <= 100;
      },
      customMessage: "Interest variation must be between 1% and 100%",
      tab: "interest",
    },
    interestVariationMaxValue: {
      required: true, // ✅ REQUIRED
      requiredMessage: "Maximum Interest Variation is required",
      custom: (value: any, formData: any) => {
        const minVar = parseFloat(formData?.interestVariationMinValue);
        const maxVar = parseFloat(value);
        
        // Check if values are valid numbers
        if (isNaN(maxVar)) {
          return false;
        }
        
        // Must be between -100 and 100
        if (maxVar < 1 || maxVar > 100) {
          return false;
        }
        
        // ✅ Maximum must be >= Minimum (only if min is valid)
        if (!isNaN(minVar) && maxVar < minVar) {
          return false;
        }
        
        return true;
      },
      customMessage: "Maximum variation must be between 1% and 100%, and be greater than or equal to minimum variation",
      tab: "interest",
    },
    
    actionOnIntPosting: {
      required: true,
      requiredMessage: "Action on Interest Posting is required",
      custom: (value: any) => {
        return value > 0;
      },
      customMessage: "Please select an action for interest posting",
      tab: "interest",
    },
    postMaturityIntRateCalculationType: {
      required: true,
      requiredMessage: "Post Maturity Interest Rate Calculation Type is required",
      custom: (value: any) => {
        return value > 0;
      },
      customMessage: "Please select post maturity calculation type",
      tab: "interest",
    },
    prematurityCalculationType: {
      required: true,
      requiredMessage: "Pre-maturity Calculation Type is required",
      custom: (value: any) => {
        return value > 0;
      },
      customMessage: "Please select pre-maturity calculation type",
      tab: "interest",
    },
    maturityDueNoticeInDays: {
      required: true,
      requiredMessage: "Maturity Due Notice (in days) is required",
      custom: (value: any) => {
        const numValue = parseInt(value);
        if (isNaN(numValue)) return false;
        return numValue >= 1 && numValue <= 365;
      },
      customMessage: "Maturity notice must be between 1 and 365 days",
      tab: "interest",
    },
    intPostingInterval: {
      required: true,
      requiredMessage: "Interest Posting Interval is required",
      custom: (value: any) => {
        return value > 0;
      },
      customMessage: "Please select an interest posting interval",
      tab: "interest",
    },
    intPostingDate: {
      required: true,
      requiredMessage: "Interest Posting Date type is required",
      custom: (value: any) => {
        return value > 0;
      },
      customMessage: "Please select interest posting date type",
      tab: "interest",
    },
  };

  const validateField = useCallback(
    (fieldName: string, value: any, formData?: any): ValidationError[] => {
      const fieldErrors: ValidationError[] = [];
      const rules = validationRules[fieldName];

      if (!rules) return fieldErrors;

      // ✅ Required validation - properly handles numeric 0
      if (rules.required) {
        // For string fields (empty check)
        if (typeof value === "string" && value.trim() === "") {
          fieldErrors.push({
            field: fieldName,
            message: rules.requiredMessage || `${fieldName} is required`,
            type: "required",
            tab: rules.tab,
          });
          return fieldErrors;
        }
        
        // For undefined/null
        if (value === undefined || value === null) {
          fieldErrors.push({
            field: fieldName,
            message: rules.requiredMessage || `${fieldName} is required`,
            type: "required",
            tab: rules.tab,
          });
          return fieldErrors;
        }
        
        // For empty string
        if (value === "") {
          fieldErrors.push({
            field: fieldName,
            message: rules.requiredMessage || `${fieldName} is required`,
            type: "required",
            tab: rules.tab,
          });
          return fieldErrors;
        }
        
        // For select dropdowns (must be > 0)
        const selectFields = [
          "intAccountType",
          "interestApplicableOn",
          "actionOnIntPosting",
          "postMaturityIntRateCalculationType",
          "prematurityCalculationType",
          "intPostingInterval",
          "intPostingDate",
          "principalBalHeadCode",
          "suspendedBalHeadCode",
          "intPayableHeadCode"
        ];
        
        if (selectFields.includes(fieldName) && value === 0) {
          fieldErrors.push({
            field: fieldName,
            message: rules.requiredMessage || `${fieldName} is required`,
            type: "required",
            tab: rules.tab,
          });
          return fieldErrors;
        }
      }

      // Skip other validations if field is empty and not required
      if (!rules.required && (value === undefined || value === null || value === "")) {
        return fieldErrors;
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value.toString())) {
        fieldErrors.push({
          field: fieldName,
          message: rules.patternMessage || `Invalid format for ${fieldName}`,
          type: "format",
          tab: rules.tab,
        });
      }

      // Length validation
      if (rules.minLength && value.toString().length < rules.minLength) {
        fieldErrors.push({
          field: fieldName,
          message: `${fieldName} must be at least ${rules.minLength} characters`,
          type: "length",
          tab: rules.tab,
        });
      }

      if (rules.maxLength && value.toString().length > rules.maxLength) {
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
    [validationRules]
  );

  // Custom validation for posting heads uniqueness
  const validatePostingHeadsUniqueness = useCallback(
    (formData: any): ValidationError[] => {
      const errors: ValidationError[] = [];
      const principalHead = formData.principalBalHeadCode;
      const suspendedHead = formData.suspendedBalHeadCode;
      const intPayableHead = formData.intPayableHeadCode;

      const heads = [principalHead, suspendedHead, intPayableHead].filter(
        (h) => h && h > 0
      );
      const uniqueHeads = new Set(heads);

      if (heads.length !== uniqueHeads.size) {
        errors.push({
          field: "postingHeads",
          message: "All posting account heads must be unique. Please select different account heads.",
          type: "custom",
          tab: "posting",
        });
      }

      return errors;
    },
    []
  );

  // ✅ Validate maturity reminder - at least one must be > 0
  const validateMaturityReminder = useCallback(
    (formData: any): ValidationError[] => {
      const errors: ValidationError[] = [];
      const months = parseInt(formData.fdMaturityReminderInMonths);
      const days = parseInt(formData.fdMaturityReminderInDays);

      // Check if both are valid numbers
      if (isNaN(months) || isNaN(days)) {
        return errors; // Individual field validation will catch this
      }

      // At least one must be greater than 0
      if (months === 0 && days === 0) {
        errors.push({
          field: "maturityReminder",
          message: "At least one maturity reminder value (months or days) must be greater than 0",
          type: "custom",
          tab: "rules",
        });
      }

      return errors;
    },
    []
  );

  // Main form validation
  const validateForm = useCallback(
    (formData: any): ValidationResult => {
      const allErrors: ValidationError[] = [];

      // Flatten the nested DTO structure for validation
      const flattenedData = {
        ...formData.fdProductDTO,
        ...formData.fdProductRulesDTO,
        ...formData.fdProductPostingHeadsDTO,
        ...formData.fdProductInterestRulesDTO,
      };

      // Validate all fields
      Object.keys(validationRules).forEach((fieldName) => {
        const fieldValue = flattenedData[fieldName];
        const fieldErrors = validateField(fieldName, fieldValue, flattenedData);
        allErrors.push(...fieldErrors);
      });

      // Custom validation for posting heads uniqueness
      const postingHeadsErrors = validatePostingHeadsUniqueness(flattenedData);
      allErrors.push(...postingHeadsErrors);

      // ✅ Custom validation for maturity reminder
      const maturityReminderErrors = validateMaturityReminder(flattenedData);
      allErrors.push(...maturityReminderErrors);

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
        errorsByTab,
      };
    },
    [
      validateField,
      validatePostingHeadsUniqueness,
      validateMaturityReminder,
      validationRules,
    ]
  );

  const clearErrors = useCallback(() => {
    setErrors([]);
    setTouched({});
  }, []);

  const markFieldTouched = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => prev.filter((error) => error.field !== fieldName));
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError,
    markFieldTouched,
    validationRules,
  };
};
