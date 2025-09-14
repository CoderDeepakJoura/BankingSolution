// hooks/useFormValidation.ts
import { useState, useCallback } from 'react';
import { ValidationError, ValidationResult, ValidationRule } from '../validation';
export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validation rules for all fields
  const validationRules: Record<string, ValidationRule> = {
    // Basic Info Tab
    accountNumber: { 
      required: true, 
      requiredMessage: "Account Number is required",
      maxLength: 100, 
      tab: 'basic' 
    },
    firstName: { 
      required: true, 
      minLength: 2, 
      maxLength: 100,
      pattern: /^[a-zA-Z\s]+$/,
      requiredMessage: "First name is required",
      patternMessage: "First name can only contain letters and spaces",
      tab: 'basic' 
    },
    lastName: { 
      required: true, 
      minLength: 2, 
      maxLength: 100,
      pattern: /^[a-zA-Z\s]+$/,
      requiredMessage: "Last name is required",
      patternMessage: "Last name can only contain letters and spaces",
      tab: 'basic' 
    },
    firstNameSL: { 
      maxLength: 100,
      pattern: /^[\u0900-\u097F\s]*$/,
      patternMessage: "Please enter valid Hindi/Devanagari characters only",
      tab: 'basic' 
    },
    lastNameSL: { 
      maxLength: 100,
      pattern: /^[\u0900-\u097F\s]*$/,
      patternMessage: "Please enter valid Hindi/Devanagari characters only",
      tab: 'basic' 
    },
    relFirstName: { 
      required: true, 
      minLength: 2, 
      maxLength: 100,
      pattern: /^[a-zA-Z\s]+$/,
      requiredMessage: "Relative first name is required",
      patternMessage: "Relative first name can only contain letters and spaces",
      tab: 'basic' 
    },
    gender: { 
      required: true, 
      requiredMessage: "Gender selection is required", 
      tab: 'basic' 
    },
    dob: { 
      required: true, 
      requiredMessage: "Date of birth is required",
      custom: (value: any) => {
        if (!value) return false;
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 18 && age <= 120;
      },
      customMessage: "Age must be between 18 and 120 years",
      tab: 'basic' 
    },
    joiningDate: { 
      required: true, 
      requiredMessage: "Joining date is required",
      custom: (value) => {
        if (!value) return false;
        const joinDate = new Date(value);
        const today = new Date();
        return joinDate <= today;
      },
      customMessage: "Joining date cannot be in the future",
      tab: 'basic' 
    },

    // Address Tab
    addressLine1: { 
      required: true, 
      minLength: 10, 
      maxLength: 150,
      requiredMessage: "Primary address is required",
      customMessage: "Address must be at least 10 characters long",
      tab: 'address' 
    },
    villageId1: { 
      required: true, 
      requiredMessage: "Primary village selection is required", 
      tab: 'address' 
    },
    addressLineSL1: { 
      maxLength: 150,
      pattern: /^[\u0900-\u097F\s\d\-,./]*$/,
      patternMessage: "Please enter valid Hindi/Devanagari characters only",
      tab: 'address' 
    },

    // Contact Tab
    phoneNo1: {
      pattern: /^[6-9]\d{9}$/,
      patternMessage: "Please enter a valid 10-digit mobile number starting with 6-9",
      tab: 'contact'
    },
    phoneNo2: {
      pattern: /^[6-9]\d{9}$/,
      patternMessage: "Please enter a valid 10-digit mobile number starting with 6-9",
      tab: 'contact'
    },

    // Documents Tab
    panCardNo: {
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      patternMessage: "PAN format should be ABCDE1234F",
      tab: 'documents'
    },
    aadhaarCardNo: {
      pattern: /^\d{4}\s\d{4}\s\d{4}$/,
      patternMessage: "Aadhaar format should be 1234 5678 9012",
      custom: (value: any) => {
        if (!value) return true; // Optional field
        const digits = value.replace(/\s/g, '');
        // Simple Luhn algorithm check for Aadhaar
        return digits.length === 12 && /^\d{12}$/.test(digits);
      },
      customMessage: "Please enter a valid 12-digit Aadhaar number",
      tab: 'documents'
    },
    gstiNo: {
      pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      patternMessage: "Please enter a valid GSTIN format",
      tab: 'documents'
    }
  };

  const validateField = useCallback((fieldName: string, value: any, formData?: any): ValidationError[] => {
    const fieldErrors: ValidationError[] = [];
    const rules = validationRules[fieldName];
    
    if (!rules) return fieldErrors;

    // Required validation
    if (rules.required && (!value || value.toString().trim() === '')) {
      fieldErrors.push({
        field: fieldName,
        message: rules.requiredMessage || `${fieldName} is required`,
        type: 'required',
        tab: rules.tab
      });
      return fieldErrors; // Return early for required fields
    }

    if (!value || value.toString().trim() === '') {
      return fieldErrors; // Skip other validations if field is empty and not required
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(value)) {
      fieldErrors.push({
        field: fieldName,
        message: rules.patternMessage || `Invalid format for ${fieldName}`,
        type: 'format',
        tab: rules.tab
      });
    }

    // Length validation
    if (rules.minLength && value.length < rules.minLength) {
      fieldErrors.push({
        field: fieldName,
        message: `${fieldName} must be at least ${rules.minLength} characters`,
        type: 'length',
        tab: rules.tab
      });
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      fieldErrors.push({
        field: fieldName,
        message: `${fieldName} cannot exceed ${rules.maxLength} characters`,
        type: 'length',
        tab: rules.tab
      });
    }

    // Custom validation
    if (rules.custom && !rules.custom(value, formData)) {
      fieldErrors.push({
        field: fieldName,
        message: rules.customMessage || `Invalid ${fieldName}`,
        type: 'custom',
        tab: rules.tab
      });
    }

    return fieldErrors;
  }, []);

  const validateNominee = useCallback((nominee: any, index: number): ValidationError[] => {
    const nomineeErrors: ValidationError[] = [];
    
    // Required fields for nominees
    if (!nominee.firstName?.trim()) {
      nomineeErrors.push({
        field: `nominees[${index}].firstName`,
        message: `Nominee ${index + 1}: First name is required`,
        type: 'required',
        tab: 'nominees'
      });
    }

    // Name pattern validation
    if (nominee.firstName && !/^[a-zA-Z\s]+$/.test(nominee.firstName)) {
      nomineeErrors.push({
        field: `nominees[${index}].firstName`,
        message: `Nominee ${index + 1}: First name can only contain letters and spaces`,
        type: 'format',
        tab: 'nominees'
      });
    }

    // Age validation
    if (nominee.age && (nominee.age < 0 || nominee.age > 120)) {
      nomineeErrors.push({
        field: `nominees[${index}].age`,
        message: `Nominee ${index + 1}: Age must be between 0 and 120`,
        type: 'custom',
        tab: 'nominees'
      });
    }

    // Minor validation
    if (nominee.isMinor && !nominee.nameOfGuardian?.trim()) {
      nomineeErrors.push({
        field: `nominees[${index}].nameOfGuardian`,
        message: `Nominee ${index + 1}: Guardian name is required for minors`,
        type: 'required',
        tab: 'nominees'
      });
    }

    // Aadhaar validation for nominees
    if (nominee.aadhaarCardNo && !/^\d{4}\s\d{4}\s\d{4}$/.test(nominee.aadhaarCardNo)) {
      nomineeErrors.push({
        field: `nominees[${index}].aadhaarCardNo`,
        message: `Nominee ${index + 1}: Invalid Aadhaar format (1234 5678 9012)`,
        type: 'format',
        tab: 'nominees'
      });
    }

    return nomineeErrors;
  }, []);

  const validateForm = useCallback((formData: any, nominees: any[]): ValidationResult => {
    const allErrors: ValidationError[] = [];
    
    // Validate main form fields
    Object.keys(validationRules).forEach(fieldName => {
      const fieldErrors = validateField(fieldName, formData[fieldName], formData);
      allErrors.push(...fieldErrors);
    });

    // Validate nominees
    nominees.forEach((nominee, index) => {
      const nomineeErrors = validateNominee(nominee, index);
      allErrors.push(...nomineeErrors);
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
  }, [validateField, validateNominee]);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  const markFieldTouched = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  return {
    errors,
    touched,
    validateField,
    validateForm,
    clearErrors,
    markFieldTouched,
    validationRules
  };
};
