// services/Validations/accountMasters/fdaccmastervalidations.ts
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

  // Enhanced validation rules for FD Account
  const validationRules: Record<string, ValidationRule> = {
    // FD/MIS Detail Tab - Product & Member Info
    fdProductId: {
      required: true,
      requiredMessage: "Product is required",
      custom: (value: any) => value > 0,
      customMessage: "Please select a valid product",
      tab: "fdDetail", // Will be dynamically set in validation
    },
    memberAccountNo: {
      required: true,
      minLength: 1,
      maxLength: 100,
      requiredMessage: "Member Account Number is required",
      tab: "fdDetail",
    },
    membershipNo: {
      required: true,
      minLength: 1,
      maxLength: 100,
      requiredMessage: "Membership Number is required",
      tab: "fdDetail",
    },
    accountOpeningDate: {
      required: true,
      requiredMessage: "Account Opening Date is required",
      custom: (value: any) => {
        if (!value) return false;
        const openingDate = new Date(value);
        return openingDate <= new Date(commonservice.getTodaysDate());
      },
      customMessage: "Account opening date cannot be in the future",
      tab: "fdDetail",
    },

    // Member Details
    memberName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z\s]+$/,
      requiredMessage: "Name is required",
      patternMessage: "Name can only contain letters and spaces",
      tab: "fdDetail",
    },
    gender: {
      required: true,
      requiredMessage: "Gender is required",
      tab: "fdDetail",
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
      tab: "fdDetail",
    },
    mobileNo: {
      pattern: /^[6-9]\d{9}$/,
      patternMessage:
        "Please enter a valid 10-digit mobile number starting with 6-9",
      tab: "fdDetail",
    },
    emailId: {
      pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      patternMessage: "Please enter a valid email address",
      tab: "fdDetail",
    },
    relativeName: {
      required: true,
      requiredMessage: "Relative Name is required",
      tab: "fdDetail",
    },
    aadhaarCardNo: {
      pattern: /^\d{12}$/,
      patternMessage: "Aadhaar must be 12 digits",
      custom: (value: any) => {
        if (!value) return true;
        return /^\d{12}$/.test(value);
      },
      customMessage: "Please enter a valid 12-digit Aadhaar number",
      tab: "fdDetail",
    },
    panCardNo: {
      pattern: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
      patternMessage: "PAN format should be ABCDE1234F",
      tab: "fdDetail",
    },
    addressLine1: {
      minLength: 10,
      maxLength: 150,
      customMessage: "Address must be at least 10 characters long",
      tab: "fdDetail",
    },
    fdDate: {
      required: true,
      requiredMessage: "FD Date is required",
      custom: (value: any) => {
        if (!value) return false;
        const fdDate = new Date(value);
        return fdDate <= new Date(commonservice.getTodaysDate());
      },
      customMessage: "FD Date cannot be in the future",
      tab: "fdDetail",
    },
    fdAmount: {
      required: true,
      requiredMessage: "FD Amount is required",
      custom: (value: any) => {
        if (!value) return false;
        const amount = parseFloat(value);
        return amount > 0;
      },
      customMessage: "FD Amount must be greater than 0",
      tab: "fdDetail",
    },
    months: {
      custom: (value: any, formData: any) => {
        const months = parseInt(value) || 0;
        const days = parseInt(formData?.days) || 0;
        return months > 0 || days > 0;
      },
      customMessage: "Period (Months or Days) is required",
      tab: "fdDetail",
    },
    intRate: {
      required: true,
      requiredMessage: "Interest Rate is required",
      custom: (value: any) => {
        if (!value) return false;
        const rate = parseFloat(value);
        return rate > 0 && rate <= 100;
      },
      customMessage: "Interest Rate must be between 0 and 100",
      tab: "fdDetail",
    },
    openingBalance: {
      custom: (value: any, formData: any) => {
        if (!formData?.isOpeningEntry) return true;
        if (!value) return false;
        const amount = parseFloat(value);
        return amount >= 0;
      },
      customMessage: "Opening Balance is required for opening entry",
      tab: "fdDetail",
    },

    // Voucher Tab - Cash/GL
    cashGLAccountId: {
      custom: (value: any, formData: any) => {
        if (
          formData?.paymentMode === "byCashGL" ||
          formData?.paymentMode === "both"
        ) {
          return value !== undefined && value !== null && value !== 0;
        }
        return true;
      },
      customMessage: "Please select a Cash/GL Account",
      tab: "voucher",
    },
    cashGLAmount: {
      custom: (value: any, formData: any) => {
        if (
          formData?.paymentMode === "byCashGL" ||
          formData?.paymentMode === "both"
        ) {
          if (!value) return false;
          const amount = parseFloat(value);
          return amount > 0;
        }
        return true;
      },
      customMessage: "Cash/GL Amount must be greater than 0",
      tab: "voucher",
    },

    // Voucher Tab - Saving
    savingProductId: {
      custom: (value: any, formData: any) => {
        if (
          formData?.paymentMode === "bySaving" ||
          formData?.paymentMode === "both"
        ) {
          return value !== undefined && value !== null && value !== 0;
        }
        return true;
      },
      customMessage: "Please select a Saving Product",
      tab: "voucher",
    },
    savingAccountId: {
      custom: (value: any, formData: any) => {
        if (
          formData?.paymentMode === "bySaving" ||
          formData?.paymentMode === "both"
        ) {
          return value !== undefined && value !== null && value !== 0;
        }
        return true;
      },
      customMessage: "Account Number is required",
      tab: "voucher",
    },
    savingAmount: {
      custom: (value: any, formData: any) => {
        if (
          formData?.paymentMode === "bySaving" ||
          formData?.paymentMode === "both"
        ) {
          if (!value) return false;
          const amount = parseFloat(value);
          return amount > 0;
        }
        return true;
      },
      customMessage: "Saving Amount must be greater than 0",
      tab: "voucher",
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

  // ✅ Validate MIS Details List
  const validateMisDetailsList = useCallback(
    (
      showMIS: boolean,
      misDetailsList: any[],
      isOpeningEntry: boolean
    ): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (!showMIS) return errors;

      if (misDetailsList.length === 0) {
        errors.push({
          field: "misDetailsList",
          message: "At least one MIS detail is required",
          type: "required",
          tab: "misDetail", // ✅ Changed to misDetail
        });
        return errors;
      }

      misDetailsList.forEach((mis, index) => {
        // if (!mis.misAccountNo || mis.misAccountNo.trim() === "") {
        //   errors.push({
        //     field: `misDetailsList[${index}].misAccountNo`,
        //     message: `MIS #${index + 1}: MIS Account Number is required`,
        //     type: "required",
        //     tab: "misDetail",
        //   });
        // }

        if (!mis.misDate) {
          errors.push({
            field: `misDetailsList[${index}].misDate`,
            message: `MIS #${index + 1}: MIS Date is required`,
            type: "required",
            tab: "misDetail",
          });
        }

        if (!mis.misAmount || mis.misAmount <= 0) {
          errors.push({
            field: `misDetailsList[${index}].misAmount`,
            message: `MIS #${index + 1}: MIS Amount must be greater than 0`,
            type: "custom",
            tab: "misDetail",
          });
        }

        if ((!mis.months || mis.months === 0) && (!mis.days || mis.days === 0)) {
          errors.push({
            field: `misDetailsList[${index}].months`,
            message: `MIS #${index + 1}: Period (Months or Days) is required`,
            type: "custom",
            tab: "misDetail",
          });
        }

        if (!mis.intRate || mis.intRate <= 0) {
          errors.push({
            field: `misDetailsList[${index}].intRate`,
            message: `MIS #${index + 1}: Interest Rate is required`,
            type: "required",
            tab: "misDetail",
          });
        }

        if (
          isOpeningEntry &&
          (mis.openingBalance === undefined || mis.openingBalance === null)
        ) {
          errors.push({
            field: `misDetailsList[${index}].openingBalance`,
            message: `MIS #${index + 1}: Opening Balance is required`,
            type: "required",
            tab: "misDetail",
          });
        }
      });

      return errors;
    },
    []
  );

  // Validate account/membership number
  const validateAccountOrMembership = useCallback(
    (
      formData: any,
      inputMode: "account" | "membership",
      showMIS: boolean
    ): ValidationError[] => {
      const errors: ValidationError[] = [];
      const tabName = showMIS ? "misDetail" : "fdDetail";

      if (inputMode === "account") {
        if (!formData.memberAccountNo || formData.memberAccountNo.trim() === "") {
          errors.push({
            field: "memberAccountNo",
            message: "Member Account Number is required",
            type: "required",
            tab: tabName,
          });
        }
      } else {
        if (!formData.membershipNo || formData.membershipNo.trim() === "") {
          errors.push({
            field: "membershipNo",
            message: "Membership Number is required",
            type: "required",
            tab: tabName,
          });
        }
      }

      return errors;
    },
    []
  );

  // Validate member details data
  const validateMemberDetailsData = useCallback(
    (memberDetailsData: any, showMIS: boolean): ValidationError[] => {
      const errors: ValidationError[] = [];
      const tabName = showMIS ? "misDetail" : "fdDetail";
      
      const memberFields = [
        "memberName",
        "gender",
        "dateOfBirth",
        "relativeName",
      ];

      memberFields.forEach((fieldName) => {
        const fieldValue = memberDetailsData[fieldName];
        const fieldErrors = validateField(fieldName, fieldValue, memberDetailsData);
        // Override tab to correct one
        fieldErrors.forEach(error => error.tab = tabName);
        errors.push(...fieldErrors);
      });

      // Validate optional fields
      if (memberDetailsData.mobileNo) {
        const mobileErrors = validateField("mobileNo", memberDetailsData.mobileNo);
        mobileErrors.forEach(error => error.tab = tabName);
        errors.push(...mobileErrors);
      }

      if (memberDetailsData.emailId) {
        const emailErrors = validateField("emailId", memberDetailsData.emailId);
        emailErrors.forEach(error => error.tab = tabName);
        errors.push(...emailErrors);
      }

      if (memberDetailsData.aadhaarCardNo) {
        const aadhaarErrors = validateField(
          "aadhaarCardNo",
          memberDetailsData.aadhaarCardNo
        );
        aadhaarErrors.forEach(error => error.tab = tabName);
        errors.push(...aadhaarErrors);
      }

      if (memberDetailsData.panCardNo) {
        const panErrors = validateField("panCardNo", memberDetailsData.panCardNo);
        panErrors.forEach(error => error.tab = tabName);
        errors.push(...panErrors);
      }

      if (memberDetailsData.addressLine1) {
        const addressErrors = validateField(
          "addressLine1",
          memberDetailsData.addressLine1
        );
        addressErrors.forEach(error => error.tab = tabName);
        errors.push(...addressErrors);
      }

      return errors;
    },
    [validateField]
  );

  // Validate member details are loaded
  const validateMemberDetailsLoaded = useCallback(
    (memberDetails: any, showMIS: boolean): ValidationError[] => {
      const errors: ValidationError[] = [];
      const tabName = showMIS ? "misDetail" : "fdDetail";

      if (!memberDetails) {
        errors.push({
          field: "memberDetails",
          message: "Please search and load member details",
          type: "custom",
          tab: tabName,
        });
      }

      return errors;
    },
    []
  );

  // ✅ Validate FD Details List
  const validateFdDetailsList = useCallback(
    (
      showMIS: boolean,
      fdDetailsList: any[],
      isOpeningEntry: boolean
    ): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (showMIS) return errors; // Skip FD validation if MIS is enabled

      if (fdDetailsList.length === 0) {
        errors.push({
          field: "fdDetailsList",
          message: "At least one FD detail is required",
          type: "required",
          tab: "fdDetail",
        });
        return errors;
      }

      fdDetailsList.forEach((fd, index) => {

        if (!fd.fdDate) {
          errors.push({
            field: `fdDetailsList[${index}].fdDate`,
            message: `FD #${index + 1}: FD Date is required`,
            type: "required",
            tab: "fdDetail",
          });
        }

        if (!fd.fdAmount || fd.fdAmount <= 0) {
          errors.push({
            field: `fdDetailsList[${index}].fdAmount`,
            message: `FD #${index + 1}: FD Amount must be greater than 0`,
            type: "custom",
            tab: "fdDetail",
          });
        }

        if ((!fd.months || fd.months === 0) && (!fd.days || fd.days === 0)) {
          errors.push({
            field: `fdDetailsList[${index}].months`,
            message: `FD #${index + 1}: Period (Months or Days) is required`,
            type: "custom",
            tab: "fdDetail",
          });
        }

        if (!fd.intRate || fd.intRate <= 0) {
          errors.push({
            field: `fdDetailsList[${index}].intRate`,
            message: `FD #${index + 1}: Interest Rate is required`,
            type: "required",
            tab: "fdDetail",
          });
        }

        if (isOpeningEntry) {
          if (fd.openingBalance === undefined || fd.openingBalance === null) {
            errors.push({
              field: `fdDetailsList[${index}].openingBalance`,
              message: `FD #${index + 1}: Opening Balance is required`,
              type: "required",
              tab: "fdDetail",
            });
          }
        }
      });

      return errors;
    },
    []
  );

  // Validate Voucher Data
  const validateVoucherData = useCallback(
    (
      voucherPaymentMode: "byCashGL" | "bySaving" | "both",
      voucherCashGL: any,
      voucherSaving: any,
      isOpeningEntry: boolean,
      isEditMode: boolean = false
    ): ValidationError[] => {
      const errors: ValidationError[] = [];

      // Skip voucher validation for opening entry
      if (isOpeningEntry || isEditMode) return errors;

      // Validate Cash/GL fields
      if (voucherPaymentMode === "byCashGL" || voucherPaymentMode === "both") {
        if (!voucherCashGL.cashGLAccountId || voucherCashGL.cashGLAccountId === 0) {
          errors.push({
            field: "cashGLAccountId",
            message: "Please select a Cash/GL Account",
            type: "required",
            tab: "voucher",
          });
        }

        if (!voucherCashGL.amount || parseFloat(voucherCashGL.amount) <= 0) {
          errors.push({
            field: "cashGLAmount",
            message: "Cash/GL Amount must be greater than 0",
            type: "custom",
            tab: "voucher",
          });
        }
      }

      // Validate Saving fields
      if (voucherPaymentMode === "bySaving" || voucherPaymentMode === "both") {
        if (!voucherSaving.savingProductId || voucherSaving.savingProductId === 0) {
          errors.push({
            field: "savingProductId",
            message: "Please select a Saving Product",
            type: "required",
            tab: "voucher",
          });
        }

        if (
          !voucherSaving.savingAccountId ||
          voucherSaving.savingAccountId === 0
        ) {
          errors.push({
            field: "savingAccountId",
            message: "Account Number is required",
            type: "required",
            tab: "voucher",
          });
        }

        if (!voucherSaving.amount || parseFloat(voucherSaving.amount) <= 0) {
          errors.push({
            field: "savingAmount",
            message: "Saving Amount must be greater than 0",
            type: "custom",
            tab: "voucher",
          });
        }
      }

      return errors;
    },
    []
  );

  // Validate Joint Account Holders
  const validateJointHolders = useCallback(
    (isJointAccount: boolean, jointHolders: any[]): ValidationError[] => {
      const errors: ValidationError[] = [];

      if (!isJointAccount) return errors;

      if (jointHolders.length === 0) {
        errors.push({
          field: "jointHolders",
          message: "At least one joint holder is required for Joint Account",
          type: "required",
          tab: "jointAccount",
        });
        return errors;
      }

      jointHolders.forEach((holder, index) => {
        if (
          !holder.jointHolderAccountNo ||
          holder.jointHolderAccountNo.trim() === ""
        ) {
          errors.push({
            field: `jointHolders[${index}].jointHolderAccountNo`,
            message: `Joint Holder ${index + 1}: Account Number is required`,
            type: "required",
            tab: "jointAccount",
          });
        }

        if (!holder.jointHolderName || holder.jointHolderName.trim() === "") {
          errors.push({
            field: `jointHolders[${index}].jointHolderName`,
            message: `Joint Holder ${index + 1}: Please search and load holder details`,
            type: "required",
            tab: "jointAccount",
          });
        }

        if (
          !holder.relationWithMainHolder ||
          holder.relationWithMainHolder === 0
        ) {
          errors.push({
            field: `jointHolders[${index}].relationWithMainHolder`,
            message: `Joint Holder ${index + 1}: Relation is required`,
            type: "required",
            tab: "jointAccount",
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

        if (
          !nominee.relationWithAccountHolder ||
          nominee.relationWithAccountHolder === 0
        ) {
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

        if (
          nominee.isMinor &&
          (!nominee.guardianName || nominee.guardianName.trim() === "")
        ) {
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

        if (
          nominee.panCardNo &&
          !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(nominee.panCardNo)
        ) {
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

  // ✅ Main form validation - UPDATED
  const validateForm = useCallback(
    (
      formData: any,
      inputMode: "account" | "membership",
      memberDetailsData: any,
      memberDetailsLoaded: any,
      detailsList: any[], // This will be either FD or MIS list
      isOpeningEntry: boolean,
      voucherPaymentMode: "byCashGL" | "bySaving" | "both",
      voucherCashGL: any,
      voucherSaving: any,
      isJointAccount: boolean,
      jointHolders: any[],
      isNomineeRequired: boolean,
      nominees: any[],
      showMIS: boolean, // ✅ Changed from isMISDetailsEnabled
      misDetailsList: any[],
      isEditMode: boolean = false
    ): ValidationResult => {
      const allErrors: ValidationError[] = [];

      // Determine tab name based on mode
      const tabName = showMIS ? "misDetail" : "fdDetail";

      // Validate basic fields
      const basicFieldErrors = validateField("fdProductId", formData.fdProductId, formData);
      basicFieldErrors.forEach(error => error.tab = tabName);
      allErrors.push(...basicFieldErrors);

      const dateFieldErrors = validateField("accountOpeningDate", formData.accountOpeningDate, formData);
      dateFieldErrors.forEach(error => error.tab = tabName);
      allErrors.push(...dateFieldErrors);

      // Validate account/membership number based on input mode
      const accountErrors = validateAccountOrMembership(formData, inputMode, showMIS);
      allErrors.push(...accountErrors);

      // Validate member is loaded
      const memberLoadedErrors = validateMemberDetailsLoaded(memberDetailsLoaded, showMIS);
      allErrors.push(...memberLoadedErrors);

      // Validate member details data
      const memberDetailsErrors = validateMemberDetailsData(memberDetailsData, showMIS);
      allErrors.push(...memberDetailsErrors);

      // ✅ Validate FD or MIS Details List based on mode
      if (showMIS) {
        const misErrors = validateMisDetailsList(showMIS, misDetailsList, isOpeningEntry);
        allErrors.push(...misErrors);
      } else {
        const fdErrors = validateFdDetailsList(showMIS, detailsList, isOpeningEntry);
        allErrors.push(...fdErrors);
      }

      // Validate voucher data (only if not opening entry)
      const voucherErrors = validateVoucherData(
        voucherPaymentMode,
        voucherCashGL,
        voucherSaving,
        isOpeningEntry,
        isEditMode
      );
      allErrors.push(...voucherErrors);

      // Validate joint holders if applicable
      const jointHolderErrors = validateJointHolders(isJointAccount, jointHolders);
      allErrors.push(...jointHolderErrors);

      // Validate nominees if applicable
      const nomineeErrors = validateNominees(isNomineeRequired, nominees);
      allErrors.push(...nomineeErrors);

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
      validateFdDetailsList,
      validateVoucherData,
      validateJointHolders,
      validateNominees,
      validateMisDetailsList,
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
