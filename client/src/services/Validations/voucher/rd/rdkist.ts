// services/Validations/voucher/rd/rdkist.ts
import { useState } from "react";
import { ValidationError } from "../../validation";
import {
  RDKistFormData,
  rdKistValidationSchema,
  validateRDKistField,
  validateRDKistForm,
} from "./rdKistValidation";

// ─── Re-export everything the component needs from one place ──────────────────
export type { RDKistFormData };
export {
  rdKistValidationSchema,
  validateRDKistField,
  validateRDKistForm,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
interface FormValidationState {
  errors: ValidationError[];
  touchedFields: Set<string>;
}

export function useFormValidation() {
  const [state, setState] = useState<FormValidationState>({
    errors: [],
    touchedFields: new Set(),
  });

  /**
   * Validate a single field and return its errors.
   * Does NOT update state — caller decides whether to merge.
   */
  const validateField = (
    fieldName: string,
    value: any,
    formData: RDKistFormData
  ): ValidationError[] => {
    return validateRDKistField(fieldName, value, formData);
  };

  /**
   * Validate the entire form. Returns result AND syncs error state.
   */
  const validateForm = (
    formData: RDKistFormData
  ): { isValid: boolean; errors: ValidationError[] } => {
    const result = validateRDKistForm(formData);
    setState((prev) => ({ ...prev, errors: result.errors }));
    return result;
  };

  /**
   * Mark a field as touched (used to show errors only after blur).
   */
  const markFieldTouched = (fieldName: string) => {
    setState((prev) => ({
      ...prev,
      touchedFields: new Set(prev.touchedFields).add(fieldName),
    }));
  };

  /**
   * Clear all errors and touched state.
   */
  const clearErrors = () => {
    setState({ errors: [], touchedFields: new Set() });
  };

  return {
    errors: state.errors,
    touchedFields: state.touchedFields,
    validateField,
    validateForm,
    markFieldTouched,
    clearErrors,
  };
}