import React, { useState } from "react";
import {
  Save,
  X,
  FileText,
  Info,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import Swal from "sweetalert2";

interface Transaction {
  id: number;
  particular: string;
  chequeNo: string;
  loanAmt: string;
  narration: string;
}

const LoanAdvancementDemo = () => {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [saveAttempted, setSaveAttempted] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    vrNo: "",
    type: "Short Term - ST",
    memberName: "",
    chequeNo: "",
    amount: "",
    narration: "",
    drAccount: "",
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [memberDetails, setMemberDetails] = useState({
    fatherName: "",
    waris: "",
    village: "",
    accountNo: "",
    khataNo: "",
    idCardNo: "",
    landHolding: "",
    aadhaarNo: "",
    memberDeposit: "",
    share: "",
    totalLimit: "",
    availableLimit: "",
  });

  // Dummy member data
  const memberData: { [key: string]: any } = {
    "2 - NACHTTAR SINGH S/O BAKSHI SINGH": {
      fatherName: "BAKSHI SINGH",
      waris: "WIFE: KULWINDER KAUR",
      village: "KHUNAN KALAN",
      accountNo: "1417D001030025G",
      khataNo: "2",
      idCardNo: "ID-2024-001",
      landHolding: "5 Acres",
      aadhaarNo: "1234-5678-9012",
      memberDeposit: "15000.00 Cr",
      share: "5000.00 Rs.",
      totalLimit: "100000.00",
      availableLimit: "75000.00",
    },
    "3 - RAM KUMAR S/O VIJAY SINGH": {
      fatherName: "VIJAY SINGH",
      waris: "WIFE: SUNITA DEVI",
      village: "PUNJAB NAGAR",
      accountNo: "1417D001030045H",
      khataNo: "3",
      idCardNo: "ID-2024-002",
      landHolding: "8 Acres",
      aadhaarNo: "9876-5432-1098",
      memberDeposit: "25000.00 Cr",
      share: "7500.00 Rs.",
      totalLimit: "150000.00",
      availableLimit: "120000.00",
    },
    "5 - HARJEET SINGH S/O KULDEEP SINGH": {
      fatherName: "KULDEEP SINGH",
      waris: "WIFE: PARAMJEET KAUR",
      village: "MOHALI CITY",
      accountNo: "1417D001030078K",
      khataNo: "5",
      idCardNo: "ID-2024-003",
      landHolding: "3 Acres",
      aadhaarNo: "5555-6666-7777",
      memberDeposit: "10000.00 Cr",
      share: "3000.00 Rs.",
      totalLimit: "80000.00",
      availableLimit: "60000.00",
    },
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Fetch member details when member changes
    if (field === "memberName" && value) {
      const details = memberData[value];
      if (details) {
        setMemberDetails(details);
        // Clear member name error when selected
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors["memberName"];
          return newErrors;
        });
        Swal.fire({
          icon: "info",
          title: "Member Loaded",
          text: `Details loaded for ${value.split(" - ")[1]}`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    }

    // Clear error when user starts typing/changing value
    if (errors[field] && value && value.toString().trim() !== "") {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Only validate if field was actually interacted with
    const value = formData[field as keyof typeof formData];
    if (value === undefined || value === null || value === "") {
      validateField(field, value);
    }
  };

  const validateField = (field: string, value: any) => {
    let error = "";

    switch (field) {
      case "vrNo":
        if (!value || value.trim() === "") {
          error = "Voucher number is required";
        } else if (!/^\d+$/.test(value)) {
          error = "Voucher number must contain only digits";
        }
        break;

      case "memberName":
        if (!value || value.trim() === "") {
          error = "Member name is required";
        }
        break;

      case "drAccount":
        if (!value || value.trim() === "") {
          error = "Dr Loan Account is required";
        }
        break;

      case "chequeNo":
        if (value && value.trim() !== "") {
          if (value.length < 6) {
            error = "Cheque number must be at least 6 characters";
          } else if (!/^[A-Za-z0-9]+$/.test(value)) {
            error = "Cheque number must be alphanumeric";
          }
        }
        break;

      case "amount":
        if (value && value.trim() !== "") {
          if (isNaN(Number(value))) {
            error = "Amount must be a valid number";
          } else if (Number(value) <= 0) {
            error = "Amount must be greater than 0";
          } else if (Number(value) > 10000000) {
            error = "Amount cannot exceed 1 crore";
          }
        }
        break;

      case "narration":
        if (value && value.trim() !== "") {
          if (value.trim().length < 5) {
            error = "Narration must be at least 5 characters";
          }
        }
        break;

      default:
        break;
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    return error === "";
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Required field validations
    if (!formData.vrNo || formData.vrNo.trim() === "") {
      newErrors["vrNo"] = "Voucher number is required";
    } else if (!/^\d+$/.test(formData.vrNo)) {
      newErrors["vrNo"] = "Voucher number must contain only digits";
    }

    if (!formData.memberName || formData.memberName.trim() === "") {
      newErrors["memberName"] = "Member name is required";
    }

    // Check if Dr account is selected
    if (!formData.drAccount || formData.drAccount.trim() === "") {
      newErrors["drAccount"] = "Please select a Dr Loan Account";
    }

    // Check if at least one transaction is added
    if (transactions.length === 0) {
      newErrors["transactions"] = "Please add at least one transaction";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addTransaction = () => {
    // Validate amount and narration before adding
    if (!formData.amount || formData.amount.trim() === "") {
      setErrors((prev) => ({ ...prev, amount: "Amount is required" }));
      setTouched((prev) => ({ ...prev, amount: true }));
      Swal.fire({
        icon: "warning",
        title: "Missing Amount",
        text: "Please enter amount to add transaction",
        confirmButtonColor: "#F59E0B",
      });
      return;
    }

    if (!formData.narration || formData.narration.trim() === "") {
      setErrors((prev) => ({ ...prev, narration: "Narration is required" }));
      setTouched((prev) => ({ ...prev, narration: true }));
      Swal.fire({
        icon: "warning",
        title: "Missing Narration",
        text: "Please enter narration to add transaction",
        confirmButtonColor: "#F59E0B",
      });
      return;
    }

    if (formData.narration.trim().length < 5) {
      setErrors((prev) => ({
        ...prev,
        narration: "Narration must be at least 5 characters",
      }));
      setTouched((prev) => ({ ...prev, narration: true }));
      Swal.fire({
        icon: "warning",
        title: "Invalid Narration",
        text: "Narration must be at least 5 characters",
        confirmButtonColor: "#F59E0B",
      });
      return;
    }

    const newTransaction: Transaction = {
      id: Date.now(),
      particular: "Loan Disbursement",
      chequeNo: formData.chequeNo || "-",
      loanAmt: formData.amount,
      narration: formData.narration,
    };

    setTransactions([...transactions, newTransaction]);

    // Clear form fields and errors
    setFormData((prev) => ({
      ...prev,
      chequeNo: "",
      amount: "",
      narration: "",
    }));

    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors["transactions"];
      delete newErrors["amount"];
      delete newErrors["narration"];
      delete newErrors["chequeNo"];
      return newErrors;
    });

    setTouched((prev) => {
      const newTouched = { ...prev };
      delete newTouched["amount"];
      delete newTouched["narration"];
      delete newTouched["chequeNo"];
      return newTouched;
    });

    Swal.fire({
      icon: "success",
      title: "Added!",
      text: "Transaction added successfully",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  const deleteTransaction = (id: number) => {
    Swal.fire({
      title: "Delete Transaction?",
      text: "Are you sure you want to remove this transaction?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        setTransactions(transactions.filter((t) => t.id !== id));
        Swal.fire({
          title: "Deleted!",
          text: "Transaction has been removed",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  const handleSave = async () => {
    setSaveAttempted(true);

    if (!validateForm()) {
      const errorMessages = Object.values(errors).filter((err) => err);
      const errorCount = errorMessages.length;

      await Swal.fire({
        icon: "error",
        title: "Validation Failed",
        html: `
          <div class="text-left">
            <p class="mb-3 font-semibold text-red-700">Validation Error${
              errorCount > 1 ? "s" : ""
            }</p>
            <p class="mt-3 text-xs text-gray-600">Please fix the above errors and try again.</p>
          </div>
        `,
        confirmButtonColor: "#EF4444",
        confirmButtonText: "Fix Errors",
      });
      return;
    }

    const totalAmount = transactions.reduce(
      (sum, t) => sum + Number(t.loanAmt),
      0
    );

    await Swal.fire({
      icon: "success",
      title: "Loan Advancement Successful!",
      html: `
        <div class="text-left space-y-2">
          <p class="font-semibold text-green-700">All validations passed successfully.</p>
          <div class="bg-blue-50 p-3 rounded-lg text-sm space-y-1">
            <p><strong>Member:</strong> ${formData.memberName.split(" - ")[1]}</p>
            <p><strong>Voucher No:</strong> ${formData.vrNo}</p>
            <p><strong>Date:</strong> ${new Date(
              formData.date
            ).toLocaleDateString()}</p>
            <p><strong>Total Debit Amount:</strong> ₹${totalAmount.toFixed(2)}</p>
            <p><strong>Transactions:</strong> ${transactions.length}</p>
            <p><strong>Dr Account:</strong> ${formData.drAccount}</p>
          </div>
        </div>
      `,
      confirmButtonColor: "#10B981",
      confirmButtonText: "OK",
    });

    // Reset form to initial state
    setFormData({
      date: new Date().toISOString().split("T")[0],
      vrNo: "",
      type: "Short Term - ST",
      memberName: "",
      chequeNo: "",
      amount: "",
      narration: "",
      drAccount: "",
    });

    setMemberDetails({
      fatherName: "",
      waris: "",
      village: "",
      accountNo: "",
      khataNo: "",
      idCardNo: "",
      landHolding: "",
      aadhaarNo: "",
      memberDeposit: "",
      share: "",
      totalLimit: "",
      availableLimit: "",
    });

    setTransactions([]);
    setErrors({});
    setTouched({});
    setSaveAttempted(false);
  };

  const handleNumericInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    allowDecimal: boolean = true
  ) => {
    let value = e.target.value;

    if (allowDecimal) {
      value = value.replace(/[^0-9.]/g, "");
      const parts = value.split(".");
      if (parts.length > 2) {
        value = parts[0] + "." + parts.slice(1).join("");
      }
      if (parts[1] && parts[1].length > 2) {
        value = parts[0] + "." + parts[1].slice(0, 2);
      }
    } else {
      value = value.replace(/[^0-9]/g, "");
    }

    handleInputChange(field, value);
  };

  const handleClose = () => {
    if (transactions.length > 0 || formData.memberName || formData.vrNo) {
      Swal.fire({
        title: "Close Form?",
        text: "Any unsaved changes will be lost",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#EF4444",
        cancelButtonColor: "#6B7280",
        confirmButtonText: "Yes, close it",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate("/voucher-operations");
        }
      });
    } else {
      navigate("/voucher-operations");
    }
  };

  const typeOptions = [
    { value: "Short Term - ST", label: "Short Term - ST" },
    { value: "Medium Term - MT", label: "Medium Term - MT" },
    { value: "Long Term - LT", label: "Long Term - LT" },
  ];

  const memberOptions = [
    {
      value: "2 - NACHTTAR SINGH S/O BAKSHI SINGH",
      label: "2 - NACHTTAR SINGH S/O BAKSHI SINGH",
    },
    {
      value: "3 - RAM KUMAR S/O VIJAY SINGH",
      label: "3 - RAM KUMAR S/O VIJAY SINGH",
    },
    {
      value: "5 - HARJEET SINGH S/O KULDEEP SINGH",
      label: "5 - HARJEET SINGH S/O KULDEEP SINGH",
    },
  ];

  const drAccountOptions = [
    { value: "LOAN TO MEMBER ST - 605", label: "LOAN TO MEMBER ST - 605" },
    { value: "CB Loan Mai Bhago - 702", label: "CB Loan Mai Bhago - 702" },
    { value: "CB LOAN MT 5 - 922", label: "CB LOAN MT 5 - 922" },
    { value: "CB LOAN ST - 592", label: "CB LOAN ST - 592" },
    {
      value: "CB LONE CATTEL FEED - 920",
      label: "CB LONE CATTEL FEED - 920",
    },
  ];

  const renderFieldError = (field: string) => {
    if (
      errors[field] &&
      (touched[field] || field === "drAccount" || field === "transactions")
    ) {
      return (
        <div className="flex items-center gap-1 mt-1 text-red-600 text-xs">
          <AlertCircle className="w-3 h-3" />
          <span>{errors[field]}</span>
        </div>
      );
    }
    return null;
  };

  const getInputClassName = (field: string) => {
    const baseClass =
      "w-full px-3 py-2.5 border-2 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none transition-colors";
    if (touched[field] && errors[field]) {
      return `${baseClass} border-red-500 focus:border-red-500`;
    }
    return `${baseClass} border-gray-300 focus:border-blue-500`;
  };

  // Calculate total debit amount from all transactions
  const totalDebitAmount = transactions.reduce(
    (sum, t) => sum + Number(t.loanAmt),
    0
  );

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Header Section */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <FileText className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Loan Advancement Voucher
                    </h1>
                    <p className="text-sm text-gray-500">
                      Handle All types of Loan Advancement Vouchers with ease
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Summary */}
            {saveAttempted && Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-800 mb-1">
                      {Object.keys(errors).length} Validation Error(s)
                    </h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {Object.entries(errors).map(([field, error]) => (
                        <li key={field}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Main Form */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Top Section */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange("date", e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Vr No <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.vrNo}
                      onChange={(e) => handleNumericInput(e, "vrNo", false)}
                      onBlur={() => handleBlur("vrNo")}
                      className={getInputClassName("vrNo")}
                      placeholder="Enter voucher number"
                      maxLength={10}
                    />
                    {renderFieldError("vrNo")}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={typeOptions}
                      value={typeOptions.find(
                        (opt) => opt.value === formData.type
                      )}
                      onChange={(selected) => {
                        handleInputChange("type", selected?.value || "");
                      }}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Middle Section */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Member Name <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={memberOptions}
                      value={memberOptions.find(
                        (opt) => opt.value === formData.memberName
                      )}
                      onChange={(selected) => {
                        handleInputChange("memberName", selected?.value || "");
                        setTouched((prev) => ({ ...prev, memberName: true }));
                      }}
                      placeholder="Select member to load details..."
                      className="text-sm"
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderColor:
                            touched.memberName && errors.memberName
                              ? "#EF4444"
                              : state.isFocused
                              ? "#3B82F6"
                              : "#D1D5DB",
                          borderWidth: "2px",
                        }),
                      }}
                    />
                    {renderFieldError("memberName")}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cheque No
                    </label>
                    <input
                      type="text"
                      value={formData.chequeNo}
                      onChange={(e) =>
                        handleInputChange("chequeNo", e.target.value.toUpperCase())
                      }
                      onBlur={() => handleBlur("chequeNo")}
                      className={getInputClassName("chequeNo")}
                      placeholder="Optional"
                      maxLength={15}
                    />
                    {renderFieldError("chequeNo")}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Narration <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.narration}
                      onChange={(e) =>
                        handleInputChange("narration", e.target.value)
                      }
                      className={getInputClassName("narration")}
                      placeholder="Enter narration (min 5 characters)"
                      maxLength={200}
                    />
                    {renderFieldError("narration")}
                    <div className="text-xs text-gray-500 mt-1">
                      {formData.narration.length}/200 characters
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Amount <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.amount}
                        onChange={(e) => handleNumericInput(e, "amount", true)}
                        className={getInputClassName("amount")}
                        placeholder="0.00"
                        maxLength={12}
                      />
                      <button
                        onClick={addTransaction}
                        className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md flex items-center gap-2 whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </button>
                    </div>
                    {renderFieldError("amount")}
                  </div>
                </div>
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                {/* Left Side */}
                <div className="p-6 border-r border-gray-200">
                  {/* Transaction Table */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Transaction Details <span className="text-red-500">*</span>
                    </h3>
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r">
                              Particular
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r">
                              Cheque
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700 border-r">
                              Amount
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-r">
                              Narration
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {transactions.length === 0 ? (
                            <tr>
                              <td
                                colSpan={5}
                                className="px-3 py-8 text-center text-gray-400 text-sm"
                              >
                                No transactions added yet
                              </td>
                            </tr>
                          ) : (
                            transactions.map((transaction) => (
                              <tr key={transaction.id} className="border-t">
                                <td className="px-3 py-2 text-xs text-gray-700">
                                  {transaction.particular}
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-700">
                                  {transaction.chequeNo}
                                </td>
                                <td className="px-3 py-2 text-xs text-right text-gray-700 font-semibold">
                                  ₹{Number(transaction.loanAmt).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-xs text-gray-700">
                                  {transaction.narration}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() =>
                                      deleteTransaction(transaction.id)
                                    }
                                    className="text-red-600 hover:text-red-800 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                          {transactions.length > 0 && (
                            <tr className="bg-blue-50 border-t-2 border-blue-200">
                              <td
                                colSpan={2}
                                className="px-3 py-2 text-xs font-semibold text-gray-700"
                              >
                                Total
                              </td>
                              <td className="px-3 py-2 text-xs text-right font-bold text-blue-700">
                                ₹{totalDebitAmount.toFixed(2)}
                              </td>
                              <td colSpan={2}></td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {renderFieldError("transactions")}
                  </div>

                  {/* Dr Loan Account Dropdown */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dr Loan A/C <span className="text-red-500">*</span>
                    </label>
                    <Select
                      options={drAccountOptions}
                      value={drAccountOptions.find(
                        (opt) => opt.value === formData.drAccount
                      )}
                      onChange={(selected) => {
                        handleInputChange("drAccount", selected?.value || "");
                        setTouched((prev) => ({ ...prev, drAccount: true }));
                      }}
                      placeholder="Select Dr Loan Account..."
                      className="text-sm"
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderColor:
                            touched.drAccount && errors.drAccount
                              ? "#EF4444"
                              : state.isFocused
                              ? "#3B82F6"
                              : "#D1D5DB",
                          borderWidth: "2px",
                        }),
                      }}
                    />
                    {renderFieldError("drAccount")}
                  </div>

                  {/* Total Debit Amount - Placed after Dr Account */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Total Debit Amount
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={`₹${totalDebitAmount.toFixed(2)}`}
                        readOnly
                        className="w-full px-3 py-2.5 border-2 border-green-300 rounded-lg bg-green-50 text-green-700 font-bold text-lg outline-none cursor-not-allowed"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Info className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      Auto-calculated from transactions
                    </p>
                  </div>
                </div>

                {/* Right Side - Member Details */}
                <div className="p-6 bg-gray-50">
                  <div className="bg-white border border-gray-300 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Member Details
                      </h3>
                      <Info className="w-4 h-4 text-blue-600" />
                    </div>

                    {!formData.memberName ? (
                      <div className="text-center py-8 text-gray-400">
                        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          Select a member to view details
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">S/O:</span>
                          <span className="text-red-600 font-medium">
                            {memberDetails.fatherName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">WARIS:</span>
                          <span className="text-gray-800">
                            {memberDetails.waris || "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Village:</span>
                          <span className="text-red-600 font-medium">
                            {memberDetails.village}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ac No:</span>
                          <span className="text-red-600 font-medium text-xs">
                            {memberDetails.accountNo} (Khata No -{" "}
                            {memberDetails.khataNo})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ID Card No:</span>
                          <span className="text-gray-800 text-xs">
                            {memberDetails.idCardNo} ({memberDetails.landHolding})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Aadhaar No:</span>
                          <span className="text-gray-800">
                            {memberDetails.aadhaarNo}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Member Deposit:</span>
                          <span className="text-red-600 font-medium">
                            {memberDetails.memberDeposit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Share:</span>
                          <span className="text-red-600 font-medium">
                            {memberDetails.share}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Limit:</span>
                          <span className="text-red-600 font-medium">
                            ₹{memberDetails.totalLimit}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Available Limit:</span>
                          <span className="text-green-600 font-semibold">
                            ₹{memberDetails.availableLimit}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-end gap-4">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                  >
                    <Save className="w-4 h-4" />
                    Save Loan Advancement
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md"
                  >
                    <X className="w-4 h-4" />
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default LoanAdvancementDemo;
