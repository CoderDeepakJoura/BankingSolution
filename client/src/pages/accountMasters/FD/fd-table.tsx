// pages/AccountMasters/FDAccount/fd-account-table.tsx
import React from "react";
import { FaEdit, FaTrash, FaEye, FaCalendarAlt, FaMoneyBillWave } from "react-icons/fa";
import { CommonAccMasterDTO } from "../../../services/accountMasters/fdaccount/fdaccountapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface FDAccountTableProps {
  accounts: CommonAccMasterDTO[];
  handleModify: (account: CommonAccMasterDTO) => void;
  handleDelete: (account: CommonAccMasterDTO) => void;
  handleView: (account: CommonAccMasterDTO) => void;
}

// Flattened type for table display
type FlatFDAccount = {
  id: number;
  accountNumber: string;
  accountName: string;
  relativeName?: string;
  fdProductId: number;
  ProductName?: string;
  accountOpeningDate: string;
  isAccClosed: boolean;
  nomineeCount: number;
  totalFDAmount: number;
  totalMaturityAmount: number;
  fdCount: number;
  openingBalance: number;
  _original: CommonAccMasterDTO;
};

const FDAccountTable: React.FC<FDAccountTableProps> = ({
  accounts,
  handleModify,
  handleDelete,
  handleView,
}) => {
  // ✅ Flatten the DTOs before sending to GenericTable
  const flatAccounts: FlatFDAccount[] = accounts.map((dto) => {
    // Build account number from prefix and suffix
    const accPrefix = dto.accountMasterDTO?.accPrefix || "FD";
    const accSuffix = dto.accountMasterDTO?.accSuffix || 0;
    const accountNumber = `${accPrefix}-${accSuffix}`;

    // Calculate totals from FD details
    const fdDetails = dto.fdAccountDetailDTO || [];
    const totalFDAmount = fdDetails.reduce((sum, fd) => sum + (fd.fdAmount || 0), 0);
    const totalMaturityAmount = fdDetails.reduce((sum, fd) => sum + (fd.maturityAmount || 0), 0);

    const openingBalance = dto.openingBalance || 0;
    const productName = dto.productName || "";

    return {
      id: dto.accountMasterDTO?.accId || 0,
      accountNumber: accountNumber,
      accountName: dto.accountMasterDTO?.accountName || "",
      relativeName: dto.accountMasterDTO?.relativeName || "",
      fdProductId: dto.accountMasterDTO?.generalProductId || 0,
      accountOpeningDate: dto.accountMasterDTO?.accOpeningDate || "",
      isAccClosed: dto.accountMasterDTO?.isAccClosed ?? false,
      nomineeCount: dto.accNomineeDTO?.length || 0,
      totalFDAmount: totalFDAmount,
      totalMaturityAmount: totalMaturityAmount,
      fdCount: fdDetails.length,
      openingBalance: openingBalance,
      ProductName: productName,
      _original: dto,
    };
  });

  // ✅ Columns for FD Account table
  const columns: Column<FlatFDAccount>[] = [
    {
      key: "accountNumber",
      header: "FD Account Number",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm font-bold text-purple-600">
            {row.accountNumber}
          </span>
          <span className="text-xs text-gray-500">
            {row.accountOpeningDate
              ? new Date(row.accountOpeningDate).toLocaleDateString("en-IN")
              : "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "accountName",
      header: "Account Holder",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.accountName}</span>
          {row.relativeName && (
            <span className="text-xs text-gray-500 italic">
              S/O {row.relativeName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "ProductName",
      header: "FD Product",
      render: (row) => (
        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
          {row.ProductName}
        </span>
      ),
    },
    {
      key: "fdCount",
      header: "FD Details",
      render: (row) => (
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-blue-600">
            <FaCalendarAlt size={12} />
            <span className="text-xs font-medium">{row.fdCount} FD(s)</span>
          </div>
          {row.nomineeCount > 0 && (
            <span className="text-xs text-gray-500 mt-1">
              {row.nomineeCount} Nominee(s)
            </span>
          )}
        </div>
      ),
    },
    {
      key: "totalFDAmount",
      header: "Total FD Amount",
      render: (row) => (
        <div className="flex flex-col items-end">
          <span className="font-mono text-sm font-semibold text-green-700">
            ₹{" "}
            {row.totalFDAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs text-gray-500">Principal</span>
        </div>
      ),
    },
    {
      key: "totalMaturityAmount",
      header: "Maturity Amount",
      render: (row) => (
        <div className="flex flex-col items-end">
          <span className="font-mono text-sm font-semibold text-blue-700">
            ₹{" "}
            {row.totalMaturityAmount.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs text-gray-500">At Maturity</span>
        </div>
      ),
    },
    
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleModify(row._original)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition duration-200 transform hover:scale-110"
            aria-label="Edit FD Account"
            title="Edit FD Account"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._original)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition duration-200 transform hover:scale-110"
            aria-label="Delete FD Account"
            title="Delete FD Account"
          >
            <FaTrash size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <GenericTable
      data={flatAccounts}
      columns={columns}
      getKey={(row) => row.id}
    />
  );
};

export default FDAccountTable;
