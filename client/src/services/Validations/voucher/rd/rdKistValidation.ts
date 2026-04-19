import { ValidationError } from "../../validation";

export interface RDKistFormData {
  voucherDate: string;
  rdProduct: string;
  accountId: number;
  kistAmount: string;
  penaltyAmount: string;
  totalAmount: string;
  debitAccount: string;
  agent: string;
  fromSavingAmount: string;
  savingProduct: string;
  savingAccount: string;
  narration: string;
  rdNumber: string;
  interestRate: string;
  balanceAmount: string;
  firstKistDate: string;
  matureityDate: string;
  station: string;
  savingAccountNo: string;
  savingBalance: string;
  loanAccountNo: string;
  loanProduct: string;
}

export function validateRDKistField(
  fieldName: string,
  value: any,
  _formData: RDKistFormData
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (fieldName === "voucherDate") {
    if (!value) errors.push({ field: fieldName, message: "Voucher date is required", type: "required", tab: "account-info" });
  } else if (fieldName === "rdProduct") {
    if (!value) errors.push({ field: fieldName, message: "RD product selection is required", type: "required", tab: "account-info" });
  } else if (fieldName === "accountId") {
    if (!value || value === 0) errors.push({ field: fieldName, message: "RD account selection is required", type: "required", tab: "account-info" });
  } else if (fieldName === "kistAmount") {
    if (!value || value === "") {
      errors.push({ field: fieldName, message: "Kist amount is required", type: "required", tab: "account-info" });
    } else if (parseFloat(value) <= 0) {
      errors.push({ field: fieldName, message: "Kist amount must be greater than 0", type: "custom", tab: "account-info" });
    }
  }

  return errors;
}

export function validateRDKistForm(formData: RDKistFormData): {
  isValid: boolean;
  errors: ValidationError[];
} {
  const errors: ValidationError[] = [];

  if (!formData.voucherDate)
    errors.push({ field: "voucherDate", message: "Voucher date is required", type: "required", tab: "account-info" });

  if (!formData.rdProduct)
    errors.push({ field: "rdProduct", message: "RD product selection is required", type: "required", tab: "account-info" });

  if (!formData.accountId || formData.accountId === 0)
    errors.push({ field: "accountId", message: "RD account selection is required", type: "required", tab: "account-info" });

  if (!formData.kistAmount || formData.kistAmount === "") {
    errors.push({ field: "kistAmount", message: "Kist amount is required", type: "required", tab: "account-info" });
  } else if (parseFloat(formData.kistAmount) <= 0) {
    errors.push({ field: "kistAmount", message: "Kist amount must be greater than 0", type: "custom", tab: "account-info" });
  }

  const fromSaving = parseFloat(formData.fromSavingAmount || "0") || 0;
  const totalAmount = (parseFloat(formData.kistAmount || "0") || 0) + (parseFloat(formData.penaltyAmount || "0") || 0);
  const debitAmount = Math.round((totalAmount - fromSaving) * 100) / 100;

  const hasSavingSource = fromSaving > 0 && !!formData.savingAccount && formData.savingAccount !== "";
  const hasDebitSource = debitAmount > 0 && !!formData.debitAccount && formData.debitAccount !== "";

  if (!hasSavingSource && !hasDebitSource) {
    errors.push({
      field: "debitAccount",
      message: "At least one payment source (Saving Account or Debit Account) is required",
      type: "required",
      tab: "account-info",
    });
  }

  if (fromSaving > 0 && (!formData.savingAccount || formData.savingAccount === "")) {
    errors.push({
      field: "savingAccount",
      message: "Saving account is required when From Saving amount is entered",
      type: "required",
      tab: "account-info",
    });
  }

  if (fromSaving > 0 && (!formData.savingProduct || formData.savingProduct === "")) {
    errors.push({
      field: "savingProduct",
      message: "Saving product is required when From Saving amount is entered",
      type: "required",
      tab: "account-info",
    });
  }

  if (fromSaving < 0) {
    errors.push({
      field: "fromSavingAmount",
      message: "From Saving amount cannot be negative",
      type: "custom",
      tab: "account-info",
    });
  }

  if (debitAmount < 0) {
    errors.push({
      field: "fromSavingAmount",
      message: "From Saving amount cannot exceed total amount",
      type: "custom",
      tab: "account-info",
    });
  }

  if (debitAmount > 0 && !formData.debitAccount) {
    errors.push({
      field: "debitAccount",
      message: "Debit account is required for the remaining amount",
      type: "required",
      tab: "account-info",
    });
  }

  return { isValid: errors.length === 0, errors };
}

export const rdKistValidationSchema = {};
