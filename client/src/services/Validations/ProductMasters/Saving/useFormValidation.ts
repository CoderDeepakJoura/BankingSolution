// services/Validations/ProductMasters/Savings/useFormValidation.ts
import { useState, useCallback } from "react";
import {
  ValidationError,
  ValidationResult,
  ValidationRule,
} from "../../validation";

export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validationRules: Record<string, ValidationRule> = {
    // Header Information
    productName: {
      required: true,
      minLength: 2,
      maxLength: 255,
      requiredMessage: "Product Name is required",
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

    // Product Rules
    acStatementFrequency: {
      required: true,
      requiredMessage: "A/c Statement Frequency is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a valid statement frequency",
      tab: "rules",
    },
    acRetentionDays: {
      required: true,
      requiredMessage: "A/c Retention Days is required",
      custom: (value: any) => {
        const num = parseInt(value);
        return num > 0 && num <= 3650;
      },
      customMessage: "Retention days must be between 1 and 3650",
      tab: "rules",
    },
    minBalanceAmt: {
      required: true,
      requiredMessage: "Minimum Balance Amount is required",
      custom: (value: any) => {
        const num = parseFloat(value);
        return num > 0;
      },
      customMessage: "Minimum balance must greater than zero.",
      tab: "rules",
    },

    // Posting Heads
    principalBalHeadCode: {
      required: true,
      requiredMessage: "Principal Balance Head is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a valid Principal Balance Head",
      tab: "posting",
    },
    suspendedBalHeadCode: {
      required: true,
      requiredMessage: "Suspended Balance Head is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a valid Suspended Balance Head",
      tab: "posting",
    },
    intPayableHeadCode: {
      required: true,
      requiredMessage: "Interest Payable Head is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a valid Interest Payable Head",
      tab: "posting",
    },

    // Interest Rules
    applicableDate: {
      required: true,
      requiredMessage: "Applicable Date is required",
      tab: "interest",
    },
    rateAppliedMethod: {
      required: true,
      requiredMessage: "Rate Applied Method is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a rate applied method",
      tab: "interest",
    },
    intApplicableDate: {
      required: true,
      requiredMessage: "Int. Applicable Date is required",
      tab: "interest",
    },
    calculationMethod: {
      required: true,
      requiredMessage: "Calculation Method is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a calculation method",
      tab: "interest",
    },
    interestRateMinValue: {
      required: true,
      requiredMessage: "Minimum Interest Rate is required",
      custom: (value: any) => {
        const num = parseFloat(value);
        return num > 0 && num <= 100;
      },
      customMessage: "Interest rate must be between 0% and 100%",
      tab: "interest",
    },
    interestRateMaxValue: {
      required: true,
      requiredMessage: "Maximum Interest Rate is required",
      custom: (value: any, formData: any) => {
        const minRate = parseFloat(formData?.interestRateMinValue) || 0;
        const maxRate = parseFloat(value) || 0;
        return maxRate > 0 && maxRate <= 100 && maxRate >= minRate;
      },
      customMessage: "Maximum rate must be greater than minimum and not exceed 100%",
      tab: "interest",
    },
    interestVariationMinValue: {
      required: true,
      requiredMessage: "Minimum Interest Variation is required",
      custom: (value: any) => {
        const num = parseFloat(value);
        return !isNaN(num) && num > 0 && num <= 100;
      },
      customMessage: "Interest variation must be between 1% and 100%",
      tab: "interest",
    },
    interestVariationMaxValue: {
      required: true,
      requiredMessage: "Maximum Interest Variation is required",
      custom: (value: any, formData: any) => {
        const minVar = parseFloat(formData?.interestVariationMinValue);
        const maxVar = parseFloat(value);
        return !isNaN(maxVar) && maxVar > 0 && maxVar <= 100 && maxVar >= minVar;
      },
      customMessage: "Maximum variation must be >= minimum and between 1% to +100%",
      tab: "interest",
    },
    minPostingIntAmt: {
      required: true,
      requiredMessage: "Minimum Posting Interest Amount is required",
      custom: (value: any) => parseFloat(value) > 0,
      customMessage: "Minimum posting interest must be greater than zero.",
      tab: "interest",
    },
    minBalForPosting: {
      required: true,
      requiredMessage: "Minimum Balance For Posting is required",
      custom: (value: any) => parseFloat(value) > 0,
      customMessage: "Minimum balance for posting must greater than zero.",
      tab: "interest",
    },
    intPostingInterval: {
      required: true,
      requiredMessage: "Interest Posting Interval is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a posting interval",
      tab: "interest",
    },
    intPostingDate: {
      required: true,
      requiredMessage: "Interest Posting Date type is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a posting date type",
      tab: "interest",
    },
    compoundInterval: {
      required: true,
      requiredMessage: "Compound Interval is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a compound interval",
      tab: "interest",
    },
    intCompoundDate: {
      required: true,
      requiredMessage: "Interest Compound Date type is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a compound date type",
      tab: "interest",
    },
    actionOnIntPosting: {
      required: true,
      requiredMessage: "Action on Interest Posting is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select an action for interest posting",
      tab: "interest",
    },
  };

  const validateField = useCallback(
    (fieldName: string, value: any, formData?: any): ValidationError[] => {
      const fieldErrors: ValidationError[] = [];
      const rules = validationRules[fieldName];

      if (!rules) return fieldErrors;

      if (rules.required) {
        if (value === undefined || value === null || value === "") {
          fieldErrors.push({
            field: fieldName,
            message: rules.requiredMessage || `${fieldName} is required`,
            type: "required",
            tab: rules.tab,
          });
          return fieldErrors;
        }

        const selectFields = [
          "acStatementFrequency",
          "rateAppliedMethod",
          "calculationMethod",
          "intPostingInterval",
          "intPostingDate",
          "compoundInterval",
          "intCompoundDate",
          "actionOnIntPosting",
          "principalBalHeadCode",
          "suspendedBalHeadCode",
          "intPayableHeadCode",
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

      if (!rules.required && (value === undefined || value === null || value === "")) {
        return fieldErrors;
      }

      if (rules.pattern && !rules.pattern.test(value.toString())) {
        fieldErrors.push({
          field: fieldName,
          message: rules.patternMessage || `Invalid format for ${fieldName}`,
          type: "format",
          tab: rules.tab,
        });
      }

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

  const validatePostingHeadsUniqueness = useCallback((formData: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    const principalHead = formData.principalBalHeadCode;
    const suspendedHead = formData.suspendedBalHeadCode;
    const intPayableHead = formData.intPayableHeadCode;

    const heads = [principalHead, suspendedHead, intPayableHead].filter((h) => h && h > 0);
    const uniqueHeads = new Set(heads);

    if (heads.length !== uniqueHeads.size) {
      errors.push({
        field: "postingHeads",
        message: "All posting account heads must be unique",
        type: "custom",
        tab: "posting",
      });
    }

    return errors;
  }, []);

  const validateForm = useCallback(
    (formData: any): ValidationResult => {
      const allErrors: ValidationError[] = [];

      const flattenedData = {
        ...formData.savingsProductDTO,
        ...formData.savingsProductRulesDTO,
        ...formData.savingsProductPostingHeadsDTO,
        ...formData.savingsProductInterestRulesDTO,
      };

      Object.keys(validationRules).forEach((fieldName) => {
        const fieldValue = flattenedData[fieldName];
        const fieldErrors = validateField(fieldName, fieldValue, flattenedData);
        allErrors.push(...fieldErrors);
      });

      const postingHeadsErrors = validatePostingHeadsUniqueness(flattenedData);
      allErrors.push(...postingHeadsErrors);

      const errorsByField = allErrors.reduce((acc, error) => {
        if (!acc[error.field]) acc[error.field] = [];
        acc[error.field].push(error);
        return acc;
      }, {} as Record<string, ValidationError[]>);

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
    [validateField, validatePostingHeadsUniqueness, validationRules]
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
