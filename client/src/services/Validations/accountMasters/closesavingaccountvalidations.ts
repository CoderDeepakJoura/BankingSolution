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
    savingProduct: {
      required: true,
      requiredMessage: "Saving Product selection is required.",
      tab: "basic",
    },
    accountId: {
      required: true,
      requiredMessage: "Account selection is required.",
      tab: "basic",
    },
    // balance: {
    //   required: true,
    //   pattern: /^\d+(\.\d{1,2})?$/,
    //   requiredMessage: "Balance/Withdrawal Amount is required.",
    //   patternMessage:
    //     "Amount must be a valid number with up to 2 decimal places.",
    //   custom: (value: string) => {
    //     if (!value || value.trim() === "") return false;
    //     const numValue = parseFloat(value);
    //     return numValue > 0;
    //   },
    //   customMessage: "Amount must be greater than 0.",
    //   tab: "basic",
    // },
    // Interest Paid - OPTIONAL field
    interestPaid: {
      required: false,
      pattern: /^\d*\.?\d{0,2}$/,
      patternMessage:
        "Interest Paid must be a valid number with up to 2 decimal places.",
      custom: (value: string) => {
        if (!value || value.trim() === "") return true; // Allow empty
        const numValue = parseFloat(value);
        return numValue >= 0;
      },
      customMessage: "Interest Paid must be 0 or greater.",
      tab: "basic",
    },
    // Closing Charges - OPTIONAL but depends on balance/interest
    closingCharges: {
      required: false,
      pattern: /^\d*\.?\d{0,2}$/,
      patternMessage:
        "Closing Charges must be a valid number with up to 2 decimal places.",
      custom: (value: string, formData?: any) => {
        if (!value || value.trim() === "") return true; // Allow empty
        
        const numValue = parseFloat(value);
        if (numValue < 0) return false;

        // NEW RULE: Check if balance or interest paid has been entered
        const hasBalance = formData?.balance && 
          !isNaN(parseFloat(formData.balance)) && 
          parseFloat(formData.balance) > 0;
        
        const hasInterest = formData?.interestPaid && 
          !isNaN(parseFloat(formData.interestPaid)) && 
          parseFloat(formData.interestPaid) > 0;

        // If user entered closing charges but no balance or interest, fail
        if (numValue > 0 && !hasBalance && !hasInterest) {
          return false;
        }

        return true;
      },
      customMessage: "Closing Charges cannot be entered without Balance or Interest Paid.",
      tab: "basic",
    },
    // Income Account - CONDITIONALLY REQUIRED (when closingCharges > 0)
    incomeAccount: {
      required: false,
      requiredMessage:
        "Income Account is required when Closing Charges are specified.",
      custom: (value: string, formData?: any) => {
        // NEW RULE: Check if balance or interest paid has been entered
        const hasBalance = formData?.balance && 
          !isNaN(parseFloat(formData.balance)) && 
          parseFloat(formData.balance) > 0;
        
        const hasInterest = formData?.interestPaid && 
          !isNaN(parseFloat(formData.interestPaid)) && 
          parseFloat(formData.interestPaid) > 0;

        // If income account is selected but no balance or interest, fail
        if (value && value.toString().trim() !== "" && value !== "0") {
          if (!hasBalance && !hasInterest) {
            return false;
          }
        }

        // If closing charges has value > 0, income account is required
        const hasClosingCharges =
          formData?.closingCharges &&
          !isNaN(parseFloat(formData.closingCharges)) &&
          parseFloat(formData.closingCharges) > 0;

        if (hasClosingCharges) {
          return value && value.toString().trim() !== "" && value !== "0";
        }
        
        return true; // Valid if no closing charges
      },
      customMessage:
        "Income Account requires Balance or Interest Paid to be entered, and is required when Closing Charges are specified.",
      tab: "basic",
    },
    creditAccount: {
      required: true,
      requiredMessage: "Credit Account selection is required.",
      tab: "basic",
    },
    // Narration - OPTIONAL
    narration: {
      required: false,
      minLength: 2,
      maxLength: 500,
      tab: "basic",
    },
  };

  const validateField = useCallback(
    (fieldName: string, value: any, formData?: any): ValidationError[] => {
      const fieldErrors: ValidationError[] = [];
      const rules = validationRules[fieldName];

      if (!rules) return fieldErrors;

      // Handle conditional requirement for incomeAccount
      if (fieldName === "incomeAccount") {
        const hasBalance =
          formData?.balance &&
          !isNaN(parseFloat(formData.balance)) &&
          parseFloat(formData.balance) > 0;

        const hasInterest =
          formData?.interestPaid &&
          !isNaN(parseFloat(formData.interestPaid)) &&
          parseFloat(formData.interestPaid) > 0;

        const hasClosingCharges =
          formData?.closingCharges &&
          !isNaN(parseFloat(formData.closingCharges)) &&
          parseFloat(formData.closingCharges) > 0;

        // If income account is selected but no balance or interest
        if (value && value.toString().trim() !== "" && value !== "0") {
          if (!hasBalance && !hasInterest) {
            fieldErrors.push({
              field: fieldName,
              message:
                "Income Account cannot be selected without Balance or Interest Paid.",
              type: "custom",
              tab: rules.tab,
            });
            return fieldErrors;
          }
        }

        // Income account is required when closing charges exist
        if (hasClosingCharges) {
          if (!value || value.toString().trim() === "" || value === "0") {
            fieldErrors.push({
              field: fieldName,
              message:
                "Income Account is required when Closing Charges are specified.",
              type: "required",
              tab: rules.tab,
            });
            return fieldErrors;
          }
        } else {
          // Income account is optional when no closing charges
          if (!value || value.toString().trim() === "") {
            return fieldErrors; // No error, field is optional
          }
        }
      }

      // Handle conditional validation for closingCharges
      if (fieldName === "closingCharges") {
        if (value && value.toString().trim() !== "") {
          const numValue = parseFloat(value);
          
          if (numValue > 0) {
            const hasBalance =
              formData?.balance &&
              !isNaN(parseFloat(formData.balance)) &&
              parseFloat(formData.balance) > 0;

            const hasInterest =
              formData?.interestPaid &&
              !isNaN(parseFloat(formData.interestPaid)) &&
              parseFloat(formData.interestPaid) > 0;

            if (!hasBalance && !hasInterest) {
              fieldErrors.push({
                field: fieldName,
                message:
                  "Closing Charges cannot be entered without Balance or Interest Paid.",
                type: "custom",
                tab: rules.tab,
              });
              return fieldErrors;
            }
          }
        }
      }

      // Standard required validation
      if (rules.required && (!value || value.toString().trim() === "")) {
        fieldErrors.push({
          field: fieldName,
          message: rules.requiredMessage || `${fieldName} is required`,
          type: "required",
          tab: rules.tab,
        });
        return fieldErrors;
      }

      if (!value || value.toString().trim() === "") {
        return fieldErrors;
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

  const validateForm = useCallback(
    (formData: any): ValidationResult => {
      const allErrors: ValidationError[] = [];

      // Validate main form fields
      Object.keys(validationRules).forEach((fieldName) => {
        const fieldErrors = validateField(
          fieldName,
          formData[fieldName],
          formData
        );
        allErrors.push(...fieldErrors);
      });

      // Additional cross-field validation
      const hasBalance =
        formData.balance &&
        !isNaN(parseFloat(formData.balance)) &&
        parseFloat(formData.balance) > 0;

      const hasInterest =
        formData.interestPaid &&
        !isNaN(parseFloat(formData.interestPaid)) &&
        parseFloat(formData.interestPaid) > 0;

      // Check closing charges without balance/interest
      if (formData.closingCharges && parseFloat(formData.closingCharges) > 0) {
        if (!hasBalance && !hasInterest) {
          const closingChargesError: ValidationError = {
            field: "closingCharges",
            message:
              "Closing Charges cannot be entered without Balance or Interest Paid.",
            type: "custom",
            tab: "basic",
          };

          const errorExists = allErrors.some(
            (err) =>
              err.field === "closingCharges" && err.type === "custom"
          );

          if (!errorExists) {
            allErrors.push(closingChargesError);
          }
        }

        // If closing charges exist, ensure income account is selected
        if (
          !formData.incomeAccount ||
          formData.incomeAccount === "0" ||
          formData.incomeAccount.toString().trim() === ""
        ) {
          const incomeAccountError: ValidationError = {
            field: "incomeAccount",
            message:
              "Income Account is required when Closing Charges are specified.",
            type: "required",
            tab: "basic",
          };

          const errorExists = allErrors.some(
            (err) => err.field === "incomeAccount" && err.type === "required"
          );

          if (!errorExists) {
            allErrors.push(incomeAccountError);
          }
        }
      }

      // Check income account selected without balance/interest
      if (
        formData.incomeAccount &&
        formData.incomeAccount !== "0" &&
        formData.incomeAccount.toString().trim() !== ""
      ) {
        if (!hasBalance && !hasInterest) {
          const incomeAccountError: ValidationError = {
            field: "incomeAccount",
            message:
              "Income Account cannot be selected without Balance or Interest Paid.",
            type: "custom",
            tab: "basic",
          };

          const errorExists = allErrors.some(
            (err) => err.field === "incomeAccount" && err.type === "custom"
          );

          if (!errorExists) {
            allErrors.push(incomeAccountError);
          }
        }
      }

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
    [validateField]
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
