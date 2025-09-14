// types/validation.ts
export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'length' | 'custom' | 'date';
  tab: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  errorsByField: Record<string, ValidationError[]>;
  errorsByTab: Record<string, ValidationError[]>;
}

export interface ValidationRule {
  required?: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: (value: any, formData?: any) => boolean;
  requiredMessage?: string;
  patternMessage?: string;
  customMessage?: string;
  tab: string;
}
