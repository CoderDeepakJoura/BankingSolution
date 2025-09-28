// hooks/useFormValidation.ts
import { useState, useCallback } from 'react';
import { ValidationError, ValidationResult, ValidationRule } from '../validation';

export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Enhanced validation rules with new requirements
  const validationRules: Record<string, ValidationRule> = {
    // Basic Info Tab - Updated rules
    accountNumber: { 
      maxLength: 100, 
      tab: 'basic',
      // Custom validation for either account number OR membership numbers
      customMessage: "Either Account Number, Nominal Membership No, or Permanent Membership No is required"
    },
    nominalMembershipNo: { 
      maxLength: 100, 
      tab: 'basic',
      customMessage: "Either Account Number, Nominal Membership No, or Permanent Membership No is required"
    },
    permanentMembershipNo: { 
      maxLength: 100, 
      tab: 'basic',
      customMessage: "Either Account Number, Nominal Membership No, or Permanent Membership No is required"
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
    // ✅ NEW: Caste is mandatory
    casteId: { 
      required: true, 
      requiredMessage: "Caste selection is required", 
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

    // Contact Tab - At least one contact is mandatory (handled in custom validation)
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

    // Documents Tab - ✅ NEW: Aadhaar is mandatory
    aadhaarCardNo: {
      required: true, // ✅ Now mandatory
      requiredMessage: "Aadhaar Card Number is required",
      pattern: /^\d{4}\s\d{4}\s\d{4}$/,
      patternMessage: "Aadhaar format should be 1234 5678 9012",
      custom: (value: any) => {
        if (!value) return false; // Required field
        const digits = value.replace(/\s/g, '');
        // Simple Luhn algorithm check for Aadhaar
        return digits.length === 12 && /^\d{12}$/.test(digits);
      },
      customMessage: "Please enter a valid 12-digit Aadhaar number",
      tab: 'documents'
    },
    panCardNo: {
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      patternMessage: "PAN format should be ABCDE1234F",
      tab: 'documents'
    },
    gstiNo: {
      pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      patternMessage: "Please enter a valid GSTIN format",
      tab: 'documents'
    },

    // ✅ NEW: Voucher Info Tab - All mandatory
    voucherNumber: {
      required: true,
      requiredMessage: "Voucher Number is required",
      maxLength: 50,
      tab: 'voucher'
    },
    voucherDate: {
      required: true,
      requiredMessage: "Voucher Date is required",
      custom: (value: any) => {
        if (!value) return false;
        const voucherDate = new Date(value);
        const today = new Date();
        return voucherDate <= today;
      },
      customMessage: "Voucher date cannot be in the future",
      tab: 'voucher'
    },
    voucherAmount: {
      required: true,
      requiredMessage: "Voucher Amount is required",
      custom: (value: any) => {
        if (!value) return false;
        const amount = parseFloat(value);
        return amount > 0;
      },
      customMessage: "Voucher amount must be greater than 0",
      tab: 'voucher'
    },
    voucherType: {
      required: true,
      requiredMessage: "Voucher Type is required",
      tab: 'voucher'
    },
    voucherDescription: {
      required: true,
      requiredMessage: "Voucher Description is required",
      minLength: 10,
      maxLength: 500,
      customMessage: "Voucher description must be at least 10 characters long",
      tab: 'voucher'
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

  // ✅ NEW: Custom validation for account/membership numbers
  const validateAccountOrMembership = useCallback((formData: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const hasAccountNumber = formData.accountNumber?.trim();
    const hasNominalMembership = formData.nominalMembershipNo?.trim();
    const hasPermanentMembership = formData.permanentMembershipNo?.trim();
    
    // At least one must be provided
    if (!hasAccountNumber && !hasNominalMembership && !hasPermanentMembership) {
      errors.push({
        field: 'accountNumber',
        message: "Either Account Number, Nominal Membership No, or Permanent Membership No is required",
        type: 'custom',
        tab: 'basic'
      });
    }
    
    return errors;
  }, []);

  // ✅ NEW: Custom validation for contact information
  const validateContactInfo = useCallback((formData: any): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    const hasPhone1 = formData.phoneNo1?.trim();
    const hasPhone2 = formData.phoneNo2?.trim();
    
    // At least one contact number is required
    if (!hasPhone1 && !hasPhone2) {
      errors.push({
        field: 'phoneNo1',
        message: "At least one contact number is required",
        type: 'custom',
        tab: 'contact'
      });
    }
    
    return errors;
  }, []);

  // ✅ NEW: Custom validation for document uploads
  const validateDocumentUploads = useCallback((documentUploads: any[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!documentUploads || documentUploads.length === 0) {
      errors.push({
        field: 'documentUploads',
        message: "At least one document image must be uploaded",
        type: 'custom',
        tab: 'documents'
      });
    }
    
    return errors;
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

  // ✅ UPDATED: Enhanced form validation with all new rules
  const validateForm = useCallback((
    formData: any, 
    nominees: any[], 
    voucherData: any, 
    documentUploads: any[]
  ): ValidationResult => {
    const allErrors: ValidationError[] = [];
    
    // Validate main form fields
    Object.keys(validationRules).forEach(fieldName => {
      let fieldValue = formData[fieldName];
      
      // Check if field is in voucher data
      if (fieldName.startsWith('voucher')) {
        fieldValue = voucherData[fieldName];
      }
      
      const fieldErrors = validateField(fieldName, fieldValue, formData);
      allErrors.push(...fieldErrors);
    });

    // ✅ NEW: Validate account/membership numbers (either one required)
    const accountErrors = validateAccountOrMembership(formData);
    allErrors.push(...accountErrors);

    // ✅ NEW: Validate contact information (at least one required)
    const contactErrors = validateContactInfo(formData);
    allErrors.push(...contactErrors);

    // ✅ NEW: Validate document uploads (mandatory)
    const documentErrors = validateDocumentUploads(documentUploads);
    allErrors.push(...documentErrors);

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
  }, [validateField, validateNominee, validateAccountOrMembership, validateContactInfo, validateDocumentUploads]);

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
