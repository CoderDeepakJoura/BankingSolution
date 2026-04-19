// services/Validations/ProductMasters/RD/useFormValidation.ts
import { useState, useCallback } from "react";
import {
  ValidationError,
  ValidationResult,
  ValidationRule,
} from "../../validation";

export const useFormValidation = () => {
  const [errors, setErrors]   = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // ─── Validation Rules ──────────────────────────────────────────────────────
  const validationRules: Record<string, ValidationRule> = {

    // ── Header Tab ────────────────────────────────────────────────────────────
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
      requiredMessage: "Product Code is required",
      customMessage: "Product Code cannot exceed 10 characters",
      tab: "header",
    },
    effectiveFrom: {
      required: true,
      requiredMessage: "Effective From date is required",
      custom: (value: any) => {
        if (!value) return false;
        const d = new Date(value);
        return !isNaN(d.getTime());
      },
      customMessage: "Please enter a valid Effective From date",
      tab: "header",
    },

    // ── Rules Tab ─────────────────────────────────────────────────────────────
    documentPlan: {
      required: true,
      requiredMessage: "Document Plan is required",
      custom: (value: any) => typeof value === "number" && value > 0,
      customMessage: "Please select a valid Document Plan",
      tab: "rules",
    },
    periodLimitMin: {
      required: true,
      requiredMessage: "Period Limit Min is required",
      custom: (value: any) => {
        const n = parseInt(value);
        return !isNaN(n) && n >= 0 && n <= 9999;
      },
      customMessage: "Period Limit Min must be between 0 and 9999",
      tab: "rules",
    },
    periodLimitMax: {
      required: true,
      requiredMessage: "Period Limit Max is required",
      custom: (value: any, formData: any) => {
        const max = parseInt(value);
        const min = parseInt(formData?.periodLimitMin ?? 0);
        if (isNaN(max) || max <= 0 || max > 9999) return false;
        if (!isNaN(min) && max < min) return false;
        return true;
      },
      customMessage: "Period Limit Max must be > 0, ≤ 9999, and ≥ Period Limit Min",
      tab: "rules",
    },

    // ── Posting Tab ───────────────────────────────────────────────────────────
    principalBalHeadCode: {
      required: true,
      requiredMessage: "Principal Balance Head is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a valid Principal Balance Head",
      tab: "posting",
    },
    intPayableHeadCode: {
      required: true,
      requiredMessage: "Interest Payable Head is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a valid Interest Payable Head",
      tab: "posting",
    },

    // ── Interest Rules Tab (per-row fields validated in validateInterestRows) ──
    // These are placeholders so validateField can be reused for row fields
    interestRateFrom: {
      required: true,
      requiredMessage: "Interest Rate From is required",
      custom: (value: any) => {
        const n = parseFloat(value);
        return !isNaN(n) && n >= 0 && n <= 100;
      },
      customMessage: "Interest Rate From must be between 0% and 100%",
      tab: "interest",
    },
    interestRateTo: {
      required: true,
      requiredMessage: "Interest Rate To is required",
      custom: (value: any, formData: any) => {
        const max = parseFloat(value);
        const min = parseFloat(formData?.interestRateFrom ?? 0);
        if (isNaN(max) || max <= 0 || max > 100) return false;
        if (!isNaN(min) && max < min) return false;
        return true;
      },
      customMessage: "Interest Rate To must be > 0%, ≤ 100%, and ≥ Interest Rate From",
      tab: "interest",
    },
    postingInterval: {
      required: true,
      requiredMessage: "Posting Interval is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a valid Posting Interval",
      tab: "interest",
    },
    compoundingInterval: {
      required: true,
      requiredMessage: "Compounding Interval is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a valid Compounding Interval",
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

  // ─── validateField ─────────────────────────────────────────────────────────
  const validateField = useCallback(
    (fieldName: string, value: any, formData?: any): ValidationError[] => {
      const fieldErrors: ValidationError[] = [];
      const rules = validationRules[fieldName];

      if (!rules) return fieldErrors;

      // Required check
      if (rules.required) {
        if (typeof value === "string" && value.trim() === "") {
          fieldErrors.push({ field: fieldName, message: rules.requiredMessage || `${fieldName} is required`, type: "required", tab: rules.tab });
          return fieldErrors;
        }
        if (value === undefined || value === null || value === "") {
          fieldErrors.push({ field: fieldName, message: rules.requiredMessage || `${fieldName} is required`, type: "required", tab: rules.tab });
          return fieldErrors;
        }

        // Numeric select fields — 0 means unselected
        const numericSelectFields = [
          "principalBalHeadCode",
          "intPayableHeadCode",
          "postingInterval",
          "compoundingInterval",
          "actionOnIntPosting",
        ];
        if (numericSelectFields.includes(fieldName) && value === 0) {
          fieldErrors.push({ field: fieldName, message: rules.requiredMessage || `${fieldName} is required`, type: "required", tab: rules.tab });
          return fieldErrors;
        }
      }

      // Skip further checks for optional empty fields
      if (!rules.required && (value === undefined || value === null || value === "")) {
        return fieldErrors;
      }

      // Pattern
      if (rules.pattern && !rules.pattern.test(value.toString())) {
        fieldErrors.push({ field: fieldName, message: rules.patternMessage || `Invalid format for ${fieldName}`, type: "format", tab: rules.tab });
      }

      // Min/Max length
      if (rules.minLength && value.toString().length < rules.minLength) {
        fieldErrors.push({ field: fieldName, message: `${fieldName} must be at least ${rules.minLength} characters`, type: "length", tab: rules.tab });
      }
      if (rules.maxLength && value.toString().length > rules.maxLength) {
        fieldErrors.push({ field: fieldName, message: `${fieldName} cannot exceed ${rules.maxLength} characters`, type: "length", tab: rules.tab });
      }

      // Custom
      if (rules.custom && !rules.custom(value, formData)) {
        fieldErrors.push({ field: fieldName, message: rules.customMessage || `Invalid ${fieldName}`, type: "custom", tab: rules.tab });
      }

      return fieldErrors;
    },
    [validationRules]
  );

  // ─── Posting Heads Uniqueness ──────────────────────────────────────────────
  const validatePostingHeadsUniqueness = useCallback((formData: any): ValidationError[] => {
    const errs: ValidationError[] = [];
    const principal  = formData.principalBalHeadCode;
    const intPayable = formData.intPayableHeadCode;

    const heads      = [principal, intPayable].filter((h) => h && h > 0);
    const uniqueHeads = new Set(heads);

    if (heads.length !== uniqueHeads.size) {
      errs.push({
        field: "postingHeads",
        message: "Principal Balance Head and Interest Payable Head must be different accounts.",
        type: "custom",
        tab: "posting",
      });
    }

    return errs;
  }, []);

  // ─── Interest Rows Validation ──────────────────────────────────────────────
  const validateInterestRows = useCallback((rows: any[]): ValidationError[] => {
    const errs: ValidationError[] = [];

    if (!rows || rows.length === 0) {
      errs.push({
        field: "rdProductInterestRulesDetails",
        message: "At least one Interest Rule row is required.",
        type: "required",
        tab: "interest",
      });
      return errs;
    }

    rows.forEach((row, i) => {
      const push = (field: string, message: string) =>
        errs.push({ field: `${field}_${i}`, message: `Row ${i + 1}: ${message}`, type: "custom", tab: "interest" });

      if (!row.applicableDate) {
        push("applicableDate", "Date is required.");
      } else {
        const d = new Date(row.applicableDate);
        if (isNaN(d.getTime())) push("applicableDate", "Please enter a valid date.");
      }

      if (!row.postingInterval || row.postingInterval === 0) {
        push("postingInterval", "Posting Interval is required.");
      }

      if (!row.compoundingInterval || row.compoundingInterval === 0) {
        push("compoundingInterval", "Compounding Interval is required.");
      }

      const rateFrom = parseFloat(row.interestRateFrom);
      const rateTo   = parseFloat(row.interestRateTo);

      if (isNaN(rateFrom) || rateFrom < 0 || rateFrom > 100) {
        push("interestRateFrom", "Interest Rate From must be between 0% and 100%.");
      }

      if (isNaN(rateTo) || rateTo <= 0 || rateTo > 100) {
        push("interestRateTo", "Interest Rate To must be > 0% and ≤ 100%.");
      }

      if (!isNaN(rateFrom) && !isNaN(rateTo) && rateTo < rateFrom) {
        push("interestRateTo", "Interest Rate To must be ≥ Interest Rate From.");
      }

      if (!row.actionOnIntPosting || row.actionOnIntPosting === 0) {
        push("actionOnIntPosting", "Action on Interest Posting is required.");
      }
    });

    return errs;
  }, []);

  // ─── Main validateForm ─────────────────────────────────────────────────────
  const validateForm = useCallback(
    (formData: any): ValidationResult => {
      const allErrors: ValidationError[] = [];

      // Flatten the RD DTO structure for scalar field validation
      const flattenedData = {
        ...formData.rdProductDTO,
        ...formData.rdProductRulesDTO,
        ...formData.rdProductPostingHeadsDTO,
      };

      // Validate all scalar field rules
      Object.keys(validationRules).forEach((fieldName) => {
        // Skip per-row interest fields — handled by validateInterestRows
        const rowFields = ["interestRateFrom", "interestRateTo", "postingInterval", "compoundingInterval", "actionOnIntPosting"];
        if (rowFields.includes(fieldName)) return;

        const fieldValue  = flattenedData[fieldName];
        const fieldErrors = validateField(fieldName, fieldValue, flattenedData);
        allErrors.push(...fieldErrors);
      });

      // Validate posting heads uniqueness
      allErrors.push(...validatePostingHeadsUniqueness(flattenedData));

      // Validate interest rule rows
      allErrors.push(...validateInterestRows(formData.rdProductInterestRulesDetails || []));

      // Group errors
      const errorsByField = allErrors.reduce((acc, e) => {
        if (!acc[e.field]) acc[e.field] = [];
        acc[e.field].push(e);
        return acc;
      }, {} as Record<string, ValidationError[]>);

      const errorsByTab = allErrors.reduce((acc, e) => {
        if (!acc[e.tab]) acc[e.tab] = [];
        acc[e.tab].push(e);
        return acc;
      }, {} as Record<string, ValidationError[]>);

      setErrors(allErrors);

      return {
        isValid: allErrors.length === 0,
        errors:  allErrors,
        errorsByField,
        errorsByTab,
      };
    },
    [validateField, validatePostingHeadsUniqueness, validateInterestRows, validationRules]
  );

  // ─── Utilities ─────────────────────────────────────────────────────────────
  const clearErrors = useCallback(() => {
    setErrors([]);
    setTouched({});
  }, []);

  const markFieldTouched = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors((prev) => prev.filter((e) => e.field !== fieldName));
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
