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
    // ... (keep all your existing rules for general, account, voucher settings)
    
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
      required: false,
      requiredMessage: "Bank FD Maturity Reminder Days is required when reminder is enabled",
      tab: "general",
      custom: (value: any, formData?: any) => {
        if (!formData?.bankFDMaturityReminder) return true;
        if (value === "" || value === null || value === undefined) return false;
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 365;
      },
      customMessage: "Bank FD Maturity Reminder Days must be between 1 and 365",
    },
    accountVerification: {
      tab: "account",
    },
    memberKYC: {
      tab: "account",
    },
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

    // ============= TDS SETTINGS (COMPLETELY FIXED) =============
    bankFDTDSApplicability: {
      tab: "tds",
    },
    bankFDTDSRate: {
      required: false, // Conditionally required
      requiredMessage: "TDS Rate is required when TDS is enabled",
      tab: "tds",
      custom: (value: any, formData?: any) => {
        // ✅ If TDS is NOT enabled, skip validation
        if (!formData?.bankFDTDSApplicability) return true;
        
        // ✅ If TDS IS enabled, value must be provided and valid
        if (value === "" || value === null || value === undefined) return false;
        const num = parseFloat(value);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      customMessage: "TDS Rate must be between 0 and 100",
    },
    bankFDTDSDeductionFrequency: {
      required: false, // Conditionally required
      requiredMessage: "TDS Deduction Frequency is required when TDS is enabled",
      tab: "tds",
      custom: (value: any, formData?: any) => {
        // ✅ If TDS is NOT enabled, skip validation
        if (!formData?.bankFDTDSApplicability) return true;
        
        // ✅ If TDS IS enabled, value must be provided and valid
        // Check for 0 because dropdowns default to 0
        if (value === "" || value === null || value === undefined || value === 0) return false;
        const num = Number(value);
        return !isNaN(num) && num >= 1 && num <= 5;
      },
      customMessage: "Please select a valid TDS deduction frequency",
    },
    bankFDTDSLedgerAccount: {
      required: false, // Conditionally required
      requiredMessage: "TDS Ledger Account is required when TDS is enabled",
      tab: "tds",
      custom: (value: any, formData?: any) => {
        // ✅ If TDS is NOT enabled, skip validation
        if (!formData?.bankFDTDSApplicability) return true;
        
        // ✅ If TDS IS enabled, value must be provided and valid
        // Check for 0 because dropdowns default to 0
        if (value === "" || value === null || value === undefined || value === 0) return false;
        const num = Number(value);
        return !isNaN(num) && num > 0;
      },
      customMessage: "Please select a valid TDS Ledger Account",
    },

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

      console.log('🔍 Validating:', fieldName);
      console.log('📦 Value:', value);
      console.log('📋 FormData:', formData);
      console.log('✅ TDS Checkbox:', formData?.bankFDTDSApplicability);

      // ✅ Define TDS conditional fields
      const tdsConditionalFields = [
        "bankFDTDSRate",
        "bankFDTDSDeductionFrequency",
        "bankFDTDSLedgerAccount",
      ];

      // ✅ For TDS fields, check if they should be validated
      if (tdsConditionalFields.includes(fieldName)) {
        console.log('🎯 TDS Field detected:', fieldName);
        
        // If TDS is NOT enabled, skip ALL validation
        if (!formData?.bankFDTDSApplicability) {
          console.log('⏭️ Skipping validation - TDS checkbox unchecked');
          return fieldErrors; // Return empty array - no errors
        }
        
        console.log('✅ TDS is enabled - proceeding with validation');
        
        // ✅ If TDS IS enabled, these fields are REQUIRED
        // Check for empty string, null, undefined, OR 0 (for dropdowns)
        const isEmpty = value === "" || value === null || value === undefined || value === 0;
        
        if (isEmpty) {
          console.log('❌ Field is empty or 0');
          fieldErrors.push({
            field: fieldName,
            message: rules.requiredMessage || `${fieldName} is required`,
            type: "required",
            tab: rules.tab,
          });
          return fieldErrors;
        }
      }

      // ✅ For reminder days field
      if (fieldName === "bankFDMaturityReminderDays") {
        if (!formData?.bankFDMaturityReminder) {
          return fieldErrors; // Skip if reminder not enabled
        }
      }

      // Regular required validation for non-conditional fields
      if (rules.required && (!value || value.toString().trim() === "")) {
        if (typeof value === "number" && value === 0) {
          fieldErrors.push({
            field: fieldName,
            message: rules.requiredMessage || `${fieldName} is required`,
            type: "required",
            tab: rules.tab,
          });
          return fieldErrors;
        }

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
        return fieldErrors;
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

      console.log('=== VALIDATING ENTIRE FORM ===');
      console.log('Form Data:', formData);

      // Validate all fields
      Object.keys(validationRules).forEach((fieldName) => {
        const fieldErrors = validateField(fieldName, formData[fieldName], formData);
        allErrors.push(...fieldErrors);
      });

      console.log('=== VALIDATION COMPLETE ===');
      console.log('Total Errors:', allErrors.length);
      console.log('Errors:', allErrors);

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
