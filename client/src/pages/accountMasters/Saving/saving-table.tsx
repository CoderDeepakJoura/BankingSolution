// pages/AccountMasters/SavingAccount/saving-account-table.tsx
import React from "react";
import { FaEdit, FaTrash, FaEye, FaUsers, FaUser } from "react-icons/fa";
import { CompleteSavingAccountDTO } from "../../../services/accountMasters/savingaccount/savingaccountapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface SavingAccountTableProps {
  accounts: CompleteSavingAccountDTO[];
  handleModify: (account: CompleteSavingAccountDTO) => void;
  handleDelete: (account: CompleteSavingAccountDTO) => void;
  handleView: (account: CompleteSavingAccountDTO) => void;
}

// Flattened type so table can work directly with flat properties
type FlatSavingAccount = {
  id: number;
  accountNumber: string;
  accountName: string;
  relativeName?: string;
  savingProductId: number;
  ProductName?: string;
  accountOpeningDate: string;
  isJointAccount: boolean;
  isAccClosed: boolean;
  nomineeCount: number;
  jointHolderCount: number;
  openingBalance: number;
  // keep full original object if you need it for actions
  _original: CompleteSavingAccountDTO;
};

const SavingAccountTable: React.FC<SavingAccountTableProps> = ({
  accounts,
  handleModify,
  handleDelete,
  handleView,
}) => {
  // ✅ Flatten the DTOs before sending to GenericTable
  const flatAccounts: FlatSavingAccount[] = accounts.map((dto) => {
    // Build account number from prefix and suffix
    const accPrefix = dto.accountMasterDTO?.accPrefix || "00";
    const accSuffix = dto.accountMasterDTO?.accSuffix || 0;
    const accountNumber = `${accPrefix}-${accSuffix}`;

    // Get opening balance from Voucher
    const openingBalance = dto.openingBalance || 0;
    const productName = dto.productName || "";

    return {
      id: dto.accountMasterDTO?.accId || 0,
      accountNumber: accountNumber,
      accountName: dto.accountMasterDTO?.accountName || "",
      relativeName: dto.accountMasterDTO?.accountNameSL || "",
      savingProductId: dto.accountMasterDTO?.generalProductId || 0,
      accountOpeningDate: dto.accountMasterDTO?.accOpeningDate || "",
      isJointAccount: dto.accountMasterDTO?.isJointAccount === 1,
      isAccClosed: dto.accountMasterDTO?.isAccClosed ?? false,
      nomineeCount: dto.AccNomineeDTO?.length || 0,
      jointHolderCount: dto.JointAccountInfoDTO?.length || 0,
      openingBalance: openingBalance,
      ProductName: productName,
      _original: dto, // keep reference to original
    };
  });

  // ✅ Columns now map to flat properties
  const columns: Column<FlatSavingAccount>[] = [
    {
      key: "accountNumber",
      header: "Account Number",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm font-bold text-blue-600">
            {row.accountNumber}
          </span>
          <span className="text-xs text-gray-500">
            {row.accountOpeningDate
              ? new Date(row.accountOpeningDate).toLocaleDateString()
              : "N/A"}
          </span>
        </div>
      ),
    },
    {
      key: "accountName",
      header: "Account Name",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.accountName}</span>
          {row.relativeName && (
            <span className="text-xs text-gray-500 italic">{row.relativeName}</span>
          )}
        </div>
      ),
    },
    {
      key: "ProductName",
      header: "Product",
      render: (row) => (
        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
          {row.ProductName}
        </span>
      ),
    },
    {
      key: "isJointAccount",
      header: "Account Classification",
      render: (row) => (
        <div className="flex justify-center items-center gap-2">
          {row.isJointAccount ? (
            <>
              <FaUsers className="text-purple-600" size={14} />
              <span className="text-xs font-medium text-purple-600">
                Joint ({row.jointHolderCount})
              </span>
            </>
          ) : (
            <>
              <FaUser className="text-blue-600" size={14} />
              <span className="text-xs font-medium text-blue-600">Single</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: "openingBalance",
      header: "Opening Balance",
      render: (row) => (
        <span className="font-mono text-sm font-semibold text-gray-900">
          ₹{" "}
          {row.openingBalance.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
           }
        </span>
      ),
    },
    {
      key: "isAccClosed",
      header: "Status",
      render: (row) => (
        <div className="flex justify-center">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${
              !row.isAccClosed
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !row.isAccClosed ? "bg-green-600" : "bg-red-600"
              }`}
            ></span>
            {!row.isAccClosed ? "Active" : "Closed"}
          </span>
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
            aria-label="Edit Account"
            title="Edit Account"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._original)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition duration-200 transform hover:scale-110"
            aria-label="Delete Account"
            title="Delete Account"
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

export default SavingAccountTable;
