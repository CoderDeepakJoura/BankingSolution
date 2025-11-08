// hooks/useFormValidation.ts - WITH MEMBER DETAILS VALIDATION
import { useState, useCallback } from "react";
import {
  ValidationError,
  ValidationResult,
  ValidationRule,
} from "../validation";
import commonservice from "../../common/commonservice";

export const useFormValidation = () => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Enhanced validation rules
  const validationRules: Record<string, ValidationRule> = {
    // Basic Info Tab
    savingProductId: {
      required: true,
      requiredMessage: "Saving Product is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a valid saving product",
      tab: "basic",
    },
    memberAccountNo: {
      required: true,
      minLength: 1,
      maxLength: 100,
      requiredMessage: "Member Account Number is required",
      tab: "basic",
    },
    membershipNo: {
      required: true,
      minLength: 1,
      maxLength: 100,
      requiredMessage: "Membership Number is required",
      tab: "basic",
    },
    accountOpeningDate: {
      required: true,
      requiredMessage: "Account Opening Date is required",
      custom: (value: any) => {
        if (!value) return false;
        const openingDate = new Date(value);
        const today = new Date();
        return openingDate <= new Date(commonservice.getTodaysDate());
      },
      customMessage: "Account opening date cannot be in the future",
      tab: "basic",
    },
    suffix: {
      required: true,
      requiredMessage: "Suffix is required",
      tab: "basic",
    },

    // Member Details Tab
    memberName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s]+$/,
      requiredMessage: "Name is required",
      patternMessage: "Name can only contain letters and spaces",
      tab: "basic",
    },
    gender: {
      required: true,
      requiredMessage: "Gender is required",
      tab: "basic",
    },
    dateOfBirth: {
      required: true,
      requiredMessage: "Date of Birth is required",
      custom: (value: any) => {
        if (!value) return false;
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 18 && age <= 120;
      },
      customMessage: "Age must be between 18 and 120 years",
      tab: "basic",
    },
    mobileNo: {
      pattern: /^[6-9]\d{9}$/,
      patternMessage: "Please enter a valid 10-digit mobile number starting with 6-9",
      tab: "basic",
    },
    emailId: {
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      patternMessage: "Please enter a valid email address",
      tab: "basic",
    },
     relativeName: {
      required: true,
      requiredMessage: "Relative Name is required",
      tab: "basic",
    },
    
    aadhaarCardNo: {
      pattern: /^\d{12}$/,
      patternMessage: "Aadhaar must be 12 digits",
      custom: (value: any) => {
        if (!value) return true; // Optional field
        return /^\d{12}$/.test(value);
      },
      customMessage: "Please enter a valid 12-digit Aadhaar number",
      tab: "basic",
    },
    panCardNo: {
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      patternMessage: "PAN format should be ABCDE1234F",
      tab: "basic",
    },
    addressLine1: {
      minLength: 10,
      maxLength: 150,
      customMessage: "Address must be at least 10 characters long",
      tab: "basic",
    },

    // // Voucher Tab
    // depositAmount: {
    //   required: true,
    //   requiredMessage: "Deposit Amount is required",
    //   custom: (value: any) => {
    //     if (!value) return false;
    //     const amount = parseFloat(value);
    //     return amount > 0;
    //   },
    //   customMessage: "Deposit amount must be greater than 0",
    //   tab: "voucher",
    // },
    // debitAccountId: {
    //   required: true,
    //   requiredMessage: "Debit Account is required",
    //   custom: (value: any) => {
    //     return value !== undefined && value !== null && value !== 0;
    //   },
    //   customMessage: "Please select a valid debit account",
    //   tab: "voucher",
    // },

    // Images Tab
    picture: {
      required: true,
      requiredMessage: "Picture is required",
      tab: "images",
    },
    signature: {
      required: true,
      requiredMessage: "Signature is required",
      tab: "images",
    },
  };

  const validateField = useCallback(
    (fieldName: string, value: any, formData?: any): ValidationError[] => {
      const fieldErrors: ValidationError[] = [];
      const rules = validationRules[fieldName];

      if (!rules) return fieldErrors;

      // Required validation
      if (rules.required) {
        const isEmpty =
          value === undefined ||
          value === null ||
          value === "" ||
          value === 0 ||
          (typeof value === "string" && value.trim() === "");

        if (isEmpty) {
          fieldErrors.push({
            field: fieldName,
            message: rules.requiredMessage || `${fieldName} is required`,
            type: "required",
            tab: rules.tab,
          });
          return fieldErrors;
        }
      }

      // Skip other validations if field is empty and not required
      if (!value || (typeof value === "string" && value.trim() === "")) {
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

  // Validate account/membership number
  const validateAccountOrMembership = useCallback(
    (formData: any, inputMode: "account" | "membership"): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (inputMode === "account") {
        if (!formData.memberAccountNo || formData.memberAccountNo.trim() === "") {
          errors.push({
            field: "memberAccountNo",
            message: "Member Account Number is required",
            type: "required",
            tab: "basic",
          });
        }
      } else {
        if (!formData.membershipNo || formData.membershipNo.trim() === "") {
          errors.push({
            field: "membershipNo",
            message: "Membership Number is required",
            type: "required",
            tab: "basic",
          });
        }
      }

      return errors;
    },
    []
  );

  // Validate member details - NEW FUNCTION
  const validateMemberDetailsData = useCallback(
    (memberDetailsData: any): ValidationError[] => {
      const errors: ValidationError[] = [];
      const memberFields = ["memberName", "gender", "dateOfBirth", "relativeName"];

      memberFields.forEach((fieldName) => {
        const fieldValue = memberDetailsData[fieldName];
        const fieldErrors = validateField(fieldName, fieldValue, memberDetailsData);
        errors.push(...fieldErrors);
      });

      // Validate optional fields
      if (memberDetailsData.mobileNo) {
        const mobileErrors = validateField("mobileNo", memberDetailsData.mobileNo);
        errors.push(...mobileErrors);
      }

      if (memberDetailsData.emailId) {
        const emailErrors = validateField("emailId", memberDetailsData.emailId);
        errors.push(...emailErrors);
      }

      if (memberDetailsData.aadhaarCardNo) {
        const aadhaarErrors = validateField(
          "aadhaarCardNo",
          memberDetailsData.aadhaarCardNo
        );
        errors.push(...aadhaarErrors);
      }

      if (memberDetailsData.panCardNo) {
        const panErrors = validateField("panCardNo", memberDetailsData.panCardNo);
        errors.push(...panErrors);
      }

      if (memberDetailsData.addressLine1) {
        const addressErrors = validateField(
          "addressLine1",
          memberDetailsData.addressLine1
        );
        errors.push(...addressErrors);
      }

      return errors;
    },
    [validateField]
  );

  // Validate member details are loaded
  const validateMemberDetailsLoaded = useCallback(
    (memberDetails: any): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (!memberDetails) {
        errors.push({
          field: "memberDetails",
          message: "Please search and load member details",
          type: "custom",
          tab: "basic",
        });
      }

      return errors;
    },
    []
  );

  // Validate joint holders
  const validateJointHolders = useCallback(
    (isJointAccount: boolean, jointHolders: any[]): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (!isJointAccount) return errors;

      if (jointHolders.length === 0) {
        errors.push({
          field: "jointHolders",
          message: "At least one joint holder is required for Joint Account",
          type: "required",
          tab: "joint",
        });
        return errors;
      }

      jointHolders.forEach((holder, index) => {
        if (!holder.jointHolderAccountNo || holder.jointHolderAccountNo.trim() === "") {
          errors.push({
            field: `jointHolders[${index}].jointHolderAccountNo`,
            message: `Joint Holder ${index + 1}: Account Number is required`,
            type: "required",
            tab: "joint",
          });
        }

        if (!holder.jointHolderName || holder.jointHolderName.trim() === "") {
          errors.push({
            field: `jointHolders[${index}].jointHolderName`,
            message: `Joint Holder ${index + 1}: Please search and load holder details`,
            type: "required",
            tab: "joint",
          });
        }

        if (!holder.relationWithMainHolder || holder.relationWithMainHolder === 0) {
          errors.push({
            field: `jointHolders[${index}].relationWithMainHolder`,
            message: `Joint Holder ${index + 1}: Relation is required`,
            type: "required",
            tab: "joint",
          });
        }
      });

      return errors;
    },
    []
  );

  // Validate nominees
  const validateNominees = useCallback(
    (isNomineeRequired: boolean, nominees: any[]): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (!isNomineeRequired) return errors;

      if (nominees.length === 0) {
        errors.push({
          field: "nominees",
          message: "At least one nominee is required",
          type: "required",
          tab: "nominee",
        });
        return errors;
      }

      nominees.forEach((nominee, index) => {
        if (!nominee.nomineeName || nominee.nomineeName.trim() === "") {
          errors.push({
            field: `nominees[${index}].nomineeName`,
            message: `Nominee ${index + 1}: Nominee Name is required`,
            type: "required",
            tab: "nominee",
          });
        } else if (!/^[a-zA-Z\s]+$/.test(nominee.nomineeName)) {
          errors.push({
            field: `nominees[${index}].nomineeName`,
            message: `Nominee ${index + 1}: Name can only contain letters and spaces`,
            type: "format",
            tab: "nominee",
          });
        }

        if (!nominee.dateOfBirth) {
          errors.push({
            field: `nominees[${index}].dateOfBirth`,
            message: `Nominee ${index + 1}: Date of Birth is required`,
            type: "required",
            tab: "nominee",
          });
        }

        if (!nominee.relationWithAccountHolder || nominee.relationWithAccountHolder === 0) {
          errors.push({
            field: `nominees[${index}].relationWithAccountHolder`,
            message: `Nominee ${index + 1}: Relation is required`,
            type: "required",
            tab: "nominee",
          });
        }

        if (!nominee.address || nominee.address.trim() === "") {
          errors.push({
            field: `nominees[${index}].address`,
            message: `Nominee ${index + 1}: Address is required`,
            type: "required",
            tab: "nominee",
          });
        }

        if (nominee.isMinor && (!nominee.guardianName || nominee.guardianName.trim() === "")) {
          errors.push({
            field: `nominees[${index}].guardianName`,
            message: `Nominee ${index + 1}: Guardian Name is required for minor`,
            type: "required",
            tab: "nominee",
          });
        }

        if (nominee.aadhaarCardNo && !/^\d{12}$/.test(nominee.aadhaarCardNo)) {
          errors.push({
            field: `nominees[${index}].aadhaarCardNo`,
            message: `Nominee ${index + 1}: Invalid Aadhaar format (123456789012)`,
            type: "format",
            tab: "nominee",
          });
        }

        if (nominee.panCardNo && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(nominee.panCardNo)) {
          errors.push({
            field: `nominees[${index}].panCardNo`,
            message: `Nominee ${index + 1}: Invalid PAN format (ABCDE1234F)`,
            type: "format",
            tab: "nominee",
          });
        }
      });

      return errors;
    },
    []
  );

  // Validate images
  const validateImages = useCallback(
    (picturePreview: string, pictureFile: any, signaturePreview: string, signatureFile: any): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (!picturePreview && !pictureFile) {
        errors.push({
          field: "picture",
          message: "Picture is required",
          type: "required",
          tab: "images",
        });
      }

      if (!signaturePreview && !signatureFile) {
        errors.push({
          field: "signature",
          message: "Signature is required",
          type: "required",
          tab: "images",
        });
      }

      return errors;
    },
    []
  );

  // Main form validation
  const validateForm = useCallback(
    (
      formData: any,
      inputMode: "account" | "membership",
      memberDetailsData: any,
      memberDetailsLoaded: any,
      isJointAccount: boolean,
      jointHolders: any[],
      isNomineeRequired: boolean,
      nominees: any[],
      voucherData: any,
      picturePreview: string,
      pictureFile: any,
      signaturePreview: string,
      signatureFile: any
    ): ValidationResult => {
      const allErrors: ValidationError[] = [];

      // Validate basic fields
      const basicFields = ["savingProductId", "accountOpeningDate", "openingBalance","suffix"];
      basicFields.forEach((fieldName) => {
        const fieldValue = formData[fieldName];
        const fieldErrors = validateField(fieldName, fieldValue, formData);
        allErrors.push(...fieldErrors);
      });

      // Validate account/membership number based on input mode
      const accountErrors = validateAccountOrMembership(formData, inputMode);
      allErrors.push(...accountErrors);

      // Validate member is loaded
      const memberLoadedErrors = validateMemberDetailsLoaded(memberDetailsLoaded);
      allErrors.push(...memberLoadedErrors);

      // Validate member details data
      const memberDetailsErrors = validateMemberDetailsData(memberDetailsData);
      allErrors.push(...memberDetailsErrors);

      // Validate joint holders if applicable
      const jointHolderErrors = validateJointHolders(isJointAccount, jointHolders);
      allErrors.push(...jointHolderErrors);

      // Validate nominees if applicable
      const nomineeErrors = validateNominees(isNomineeRequired, nominees);
      allErrors.push(...nomineeErrors);

      // Validate voucher data
      const voucherFields = ["depositAmount", "debitAccountId"];
      voucherFields.forEach((fieldName) => {
        const fieldValue = voucherData[fieldName];
        const fieldErrors = validateField(fieldName, fieldValue, voucherData);
        allErrors.push(...fieldErrors);
      });

      // Validate images
      const imageErrors = validateImages(
        picturePreview,
        pictureFile,
        signaturePreview,
        signatureFile
      );
      allErrors.push(...imageErrors);

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
    [
      validateField,
      validateAccountOrMembership,
      validateMemberDetailsLoaded,
      validateMemberDetailsData,
      validateJointHolders,
      validateNominees,
      validateImages,
    ]
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
