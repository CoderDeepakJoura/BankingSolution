import { useState, useCallback } from "react";
import { ValidationError, ValidationResult, ValidationRule } from "../../validation";

export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validationRules: Record<string, ValidationRule> = {
    // ── Header ───────────────────────────────────────────────────────────────
    productName: {
      required: true, minLength: 2, maxLength: 50,
      requiredMessage: "Loan Name is required",
      customMessage: "Loan Name must be 2–50 characters",
      tab: "header",
    },
    code: {
      required: true, minLength: 1, maxLength: 3,
      pattern: /^[A-Z0-9]+$/,
      requiredMessage: "Loan Code is required",
      patternMessage: "Loan Code must be uppercase letters/numbers only",
      tab: "header",
    },
    effectiveFrom: {
      required: true,
      requiredMessage: "Effective From date is required",
      custom: (v: any) => !!v && !isNaN(new Date(v).getTime()),
      customMessage: "Enter a valid date",
      tab: "header",
    },

    // ── Definition ───────────────────────────────────────────────────────────
    typeId: {
      required: true,
      requiredMessage: "Loan Type is required",
      custom: (v: any) => v > 0,
      customMessage: "Please select a Loan Type",
      tab: "definition",
    },
    secReviewFreqPeriod: {
      required: true,
      requiredMessage: "Security Review Freq Period is required",
      custom: (v: any) => parseInt(v) > 0,
      customMessage: "Security Review Freq Period must be greater than 0",
      tab: "definition",
    },
    docPlanId: {
      required: true,
      requiredMessage: "Document Plan is required",
      custom: (v: any) => v > 0,
      customMessage: "Please select a Document Plan",
      tab: "definition",
    },

    // ── Advancement ──────────────────────────────────────────────────────────
    disbursmentMode: {
      required: true,
      requiredMessage: "At least one Disbursement Mode is required",
      custom: (v: any) => v && v.trim() !== "",
      customMessage: "Please select at least one Disbursement Mode",
      tab: "definition",
    },
    maxNoofDisbursments: {
      required: true,
      requiredMessage: "Max No. of Disbursements is required",
      custom: (v: any) => parseInt(v) > 0,
      customMessage: "Max No. of Disbursements must be greater than 0",
      tab: "definition",
    },
    minLoanAmount: {
      required: true,
      requiredMessage: "Loan Amount (From) is required",
      custom: (v: any) => parseFloat(v) > 0,
      customMessage: "Loan Amount (From) must be greater than 0",
      tab: "definition",
    },
    maxLoanAmount: {
      required: true,
      requiredMessage: "Loan Amount (To) is required",
      custom: (v: any, fd: any) => {
        const max = parseFloat(v);
        const min = parseFloat(fd?.minLoanAmount ?? 0);
        return max > 0 && max >= min;
      },
      customMessage: "Loan Amount (To) must be ≥ Loan Amount (From)",
      tab: "definition",
    },

    // ── Recovery ─────────────────────────────────────────────────────────────
    intPostingInterval: {
      required: true,
      requiredMessage: "Int. Posting Interval is required",
      custom: (v: any) => v > 0,
      customMessage: "Please select Int. Posting Interval",
      tab: "recovery",
    },
    recoveryAdjustmentSeq: {
      required: true,
      requiredMessage: "Recovery Adjustment Seq. is required",
      custom: (v: any) => v > 0,
      customMessage: "Please select Recovery Adjustment Seq.",
      tab: "recovery",
    },

    // ── Posting Heads ────────────────────────────────────────────────────────
    principalBalHeadCode: {
      required: true,
      requiredMessage: "Principal Bal. Head is required",
      custom: (v: any) => v > 0,
      customMessage: "Please select Principal Bal. Head",
      tab: "recovery",
    },
    miscIncHeadCode: {
      required: true,
      requiredMessage: "Misc. Income Head is required",
      custom: (v: any) => v > 0,
      customMessage: "Please select Misc. Income Head",
      tab: "recovery",
    },
    expHeadCode: {
      required: true,
      requiredMessage: "Expenses A/C Head is required",
      custom: (v: any) => v > 0,
      customMessage: "Please select Expenses A/C Head",
      tab: "recovery",
    },
  };

  const validateField = useCallback(
    (fieldName: string, value: any, formData?: any): ValidationError[] => {
      const fieldErrors: ValidationError[] = [];
      const rules = validationRules[fieldName];
      if (!rules) return fieldErrors;

      const selectFields = [
        "typeId", "docPlanId", "intPostingInterval", "recoveryAdjustmentSeq",
        "principalBalHeadCode", "miscIncHeadCode", "expHeadCode",
      ];

      if (rules.required) {
        const isEmpty =
          value === undefined || value === null || value === "" ||
          (typeof value === "string" && value.trim() === "") ||
          (selectFields.includes(fieldName) && value === 0);
        if (isEmpty) {
          fieldErrors.push({ field: fieldName, message: rules.requiredMessage || `${fieldName} is required`, type: "required", tab: rules.tab });
          return fieldErrors;
        }
      }

      if (!rules.required && (value === undefined || value === null || value === "")) return fieldErrors;

      if (rules.pattern && !rules.pattern.test(value.toString())) {
        fieldErrors.push({ field: fieldName, message: rules.patternMessage || `Invalid format`, type: "format", tab: rules.tab });
      }
      if (rules.minLength && value.toString().length < rules.minLength) {
        fieldErrors.push({ field: fieldName, message: `${fieldName} must be at least ${rules.minLength} characters`, type: "length", tab: rules.tab });
      }
      if (rules.maxLength && value.toString().length > rules.maxLength) {
        fieldErrors.push({ field: fieldName, message: `${fieldName} cannot exceed ${rules.maxLength} characters`, type: "length", tab: rules.tab });
      }
      if (rules.custom && !rules.custom(value, formData)) {
        fieldErrors.push({ field: fieldName, message: rules.customMessage || `Invalid ${fieldName}`, type: "custom", tab: rules.tab });
      }
      return fieldErrors;
    },
    []
  );

  const validateForm = useCallback(
    (formData: any): ValidationResult => {
      const allErrors: ValidationError[] = [];

      const flat = {
        ...formData.loanProductDTO,
        ...formData.loanProductDefinitionDTO,
        ...formData.loanProductAdvancementDTO,
        ...formData.loanProductMarginMoneyRuleDTO,
        ...formData.loanProductPostingDTO,
        ...formData.loanProductRecoveryDTO,
      };

      Object.keys(validationRules).forEach((field) => {
        allErrors.push(...validateField(field, flat[field], flat));
      });

      // Recovery sequence uniqueness
      const seqs = [flat.overDueInterestSeq, flat.standardInterestSeq, flat.overDueBalanceSeq, flat.standardBalanceSeq].filter(Boolean);
      if (new Set(seqs).size !== 4) {
        allErrors.push({ field: "recoverySeq", message: "Recovery sequence priorities must be unique (1–4)", type: "custom", tab: "recovery" });
      }

      const errorsByField = allErrors.reduce((acc, e) => { if (!acc[e.field]) acc[e.field] = []; acc[e.field].push(e); return acc; }, {} as Record<string, ValidationError[]>);
      const errorsByTab = allErrors.reduce((acc, e) => { if (!acc[e.tab]) acc[e.tab] = []; acc[e.tab].push(e); return acc; }, {} as Record<string, ValidationError[]>);

      setErrors(allErrors);
      return { isValid: allErrors.length === 0, errors: allErrors, errorsByField, errorsByTab };
    },
    [validateField]
  );

  const clearErrors = useCallback(() => { setErrors([]); setTouched({}); }, []);
  const markFieldTouched = useCallback((f: string) => setTouched((p) => ({ ...p, [f]: true })), []);
  const clearFieldError = useCallback((f: string) => setErrors((p) => p.filter((e) => e.field !== f)), []);

  return { errors, touched, validateField, validateForm, clearErrors, clearFieldError, markFieldTouched, validationRules };
};
