// services/Validations/settings/settingsValidations.ts
import { useState, useCallback } from "react";
import {
  ValidationError,
  ValidationResult,
  ValidationRule,
} from "../validation";

export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ============= VALIDATION RULES FOR ALL SETTINGS FIELDS =============
  const validationRules: Record<string, ValidationRule> = {
    // ============= GENERAL SETTINGS =============
    admissionFeeAccount: {
      required: true,
      requiredMessage: "Admission Fee Account is required",
      tab: "general",
      custom: (value: any) => {
        const num = Number(value);
        return !isNaN(num) && num > 0;
      },
      customMessage: "Please select a valid Admission Fee Account",
    },
    admissionFeeAmount: {
      required: true,
      requiredMessage: "Admission Fee Amount is required",
      tab: "general",
      custom: (value: any) => {
        if (value === "" || value === null || value === undefined) return false;
        const num = parseFloat(value);
        return !isNaN(num) && num > 0;
      },
      customMessage: "Admission Fee Amount must be greater than 0",
    },
    defaultCashAccount: {
      required: true,
      requiredMessage: "Default Cash Account is required",
      tab: "general",
      custom: (value: any) => {
        const num = Number(value);
        return !isNaN(num) && num > 0;
      },
      customMessage: "Please select a valid Default Cash Account",
    },
    minimumMemberAge: {
      required: true,
      requiredMessage: "Minimum Member Age is required",
      tab: "general",
      custom: (value: any) => {
        if (value === "" || value === null || value === undefined) return false;
        const num = parseInt(value);
        return !isNaN(num) && num >= 18 && num <= 100;
      },
      customMessage: "Minimum Member Age must be between 18 and 100",
    },
    shareMoneyPercentageForLoan: {
      required: true,
      requiredMessage: "Share Money Percentage for Loan is required",
      tab: "general",
      custom: (value: any) => {
        if (value === "" || value === null || value === undefined) return false;
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      customMessage: "Share Money Percentage must be between 0 and 100",
    },
    bankFDMaturityReminder: {
      tab: "general",
    },
    bankFDMaturityReminderDays: {
      required: false, // Conditionally required based on checkbox
      requiredMessage: "Bank FD Maturity Reminder Days is required when reminder is enabled",
      tab: "general",
      custom: (value: any, formData?: any) => {
        // Only required if checkbox is checked
        if (!formData?.bankFDMaturityReminder) return true;
        
        // If checkbox is checked, value must be provided
        if (value === "" || value === null || value === undefined) return false;
        
        // Must be a positive integer between 1 and 365
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 365;
      },
      customMessage: "Bank FD Maturity Reminder Days must be between 1 and 365",
    },


    // ============= ACCOUNT SETTINGS =============
    accountVerification: {
      tab: "account",
    },
    memberKYC: {
      tab: "account",
    },
    // savingAccountLength: {
    //   required: true,
    //   requiredMessage: "Saving Account Length is required",
    //   tab: "account",
    //   custom: (value: any) => {
    //     if (value === "" || value === null || value === undefined) return false;
    //     const num = parseInt(value);
    //     return !isNaN(num) && num >= 5 && num <= 20;
    //   },
    //   customMessage: "Saving Account Length must be between 5 and 20",
    // },
    // loanAccountLength: {
    //   required: true,
    //   requiredMessage: "Loan Account Length is required",
    //   tab: "account",
    //   custom: (value: any) => {
    //     if (value === "" || value === null || value === undefined) return false;
    //     const num = parseInt(value);
    //     return !isNaN(num) && num >= 5 && num <= 20;
    //   },
    //   customMessage: "Loan Account Length must be between 5 and 20",
    // },
    // fdAccountLength: {
    //   required: true,
    //   requiredMessage: "FD Account Length is required",
    //   tab: "account",
    //   custom: (value: any) => {
    //     if (value === "" || value === null || value === undefined) return false;
    //     const num = parseInt(value);
    //     return !isNaN(num) && num >= 5 && num <= 20;
    //   },
    //   customMessage: "FD Account Length must be between 5 and 20",
    // },
    // rdAccountLength: {
    //   required: true,
    //   requiredMessage: "RD Account Length is required",
    //   tab: "account",
    //   custom: (value: any) => {
    //     if (value === "" || value === null || value === undefined) return false;
    //     const num = parseInt(value);
    //     return !isNaN(num) && num >= 5 && num <= 20;
    //   },
    //   customMessage: "RD Account Length must be between 5 and 20",
    // },
    // shareAccountLength: {
    //   required: true,
    //   requiredMessage: "Share Account Length is required",
    //   tab: "account",
    //   custom: (value: any) => {
    //     if (value === "" || value === null || value === undefined) return false;
    //     const num = parseInt(value);
    //     return !isNaN(num) && num >= 5 && num <= 20;
    //   },
    //   customMessage: "Share Account Length must be between 5 and 20",
    // },

    // ============= VOUCHER SETTINGS =============
    voucherPrinting: {
      tab: "voucher",
    },
    singleVoucherEntry: {
      tab: "voucher",
    },
    voucherNumberSetting: {
      required: true,
      requiredMessage: "Voucher Number Setting is required",
      tab: "voucher",
      custom: (value: any) => {
        const num = Number(value);
        return !isNaN(num) && (num === 1 || num === 2);
      },
      customMessage: "Please select either Day Wise or Financial Year Wise",
    },
    autoPosting: {
      tab: "voucher",
    },
    receiptNoSetting: {
      tab: "voucher",
    },

    // ============= TDS SETTINGS =============
    bankFDTDSApplicability: {
      tab: "tds",
    },
    bankFDTDSRate: {
      required: true,
      requiredMessage: "TDS Rate is required when TDS is enabled",
      tab: "tds",
      custom: (value: any, formData?: any) => {
        // Only required if TDS is enabled
        if (!formData?.bankFDTDSApplicability) return true;
        if (value === "" || value === null || value === undefined) return false;
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      customMessage: "TDS Rate must be between 0 and 100",
    },
    bankFDTDSDeductionFrequency: {
      required: true,
      requiredMessage: "TDS Deduction Frequency is required when TDS is enabled",
      tab: "tds",
      custom: (value: any, formData?: any) => {
        // Only required if TDS is enabled
        if (!formData?.bankFDTDSApplicability) return true;
        const num = Number(value);
        return !isNaN(num) && num >= 1 && num <= 5;
      },
      customMessage: "Please select a valid TDS deduction frequency",
    },
    bankFDTDSLedgerAccount: {
      required: true,
      requiredMessage: "TDS Ledger Account is required when TDS is enabled",
      tab: "tds",
      custom: (value: any, formData?: any) => {
        // Only required if TDS is enabled
        if (!formData?.bankFDTDSApplicability) return true;
        const num = Number(value);
        return !isNaN(num) && num > 0;
      },
      customMessage: "Please select a valid TDS Ledger Account",
    },

    // ============= PRINTING SETTINGS =============
    fdReceiptSetting: {
      tab: "printing",
    },
    rdCertificateSetting: {
      tab: "printing",
    },
  };

  const validateField = useCallback(
    (fieldName: string, value: any, formData?: any): ValidationError[] => {
      const fieldErrors: ValidationError[] = [];
      const rules = validationRules[fieldName];

      if (!rules) return fieldErrors;
      const isConditionallyRequired = 
        fieldName === "bankFDMaturityReminderDays" && 
        formData?.bankFDMaturityReminder;
      // Required validation
      if ((rules.required || isConditionallyRequired) && (!value || value.toString().trim() === "")) {
        // Special handling for numeric fields (dropdowns)
        if (typeof value === "number" && value === 0) {
          fieldErrors.push({
            field: fieldName,
            message: rules.requiredMessage || `${fieldName} is required`,
            type: "required",
            tab: rules.tab,
          });
          return fieldErrors;
        }

        // String fields
        if (value === "" || value === null || value === undefined) {
          fieldErrors.push({
            field: fieldName,
            message: rules.requiredMessage || `${fieldName} is required`,
            type: "required",
            tab: rules.tab,
          });
          return fieldErrors;
        }
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
    [validationRules]
  );

  const validateForm = useCallback(
    (formData: any): ValidationResult => {
      const allErrors: ValidationError[] = [];

      // Validate all fields
      Object.keys(validationRules).forEach((fieldName) => {
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
        errorsByTab,
      };
    },
    [validateField, validationRules]
  );

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
