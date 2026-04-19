// pages/AccountMasters/RDAccount/rd-table.tsx
import React from "react";
import { FaEdit, FaTrash, FaUsers, FaUser } from "react-icons/fa";
import { CommonAccMasterDTO } from "../../../services/accountMasters/rdaccount/rdaccountapi";
import GenericTable, { Column } from "../../../components/Location/GenericTable";

interface RDAccountTableProps {
  accounts: CommonAccMasterDTO[];
  handleModify: (account: CommonAccMasterDTO) => void;
  handleDelete: (account: CommonAccMasterDTO) => void;
}

type FlatRDAccount = {
  id: number;
  accountNumber: string;
  rdNumber: string;
  accountName: string;
  relativeName?: string;
  rdProductId: number;
  productName?: string;
  accountOpeningDate: string;
  noOfMonths?: number;
  rdAmount?: number;
  kistAmt?: number;
  maturityDate?: string;
  maturityAmt?: number;
  interestRate?: number;
  rdStatus?: number;
  isJointAccount: boolean;
  isAccClosed: boolean;
  nomineeCount: number;
  jointHolderCount: number;
  openingBalance: number;
  _original: CommonAccMasterDTO;
};

const rdStatusBadge = (status?: number) => {
  switch (status) {
    case 1:
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-600"></span>Open
        </span>
      );
    case 2:
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>Matured
        </span>
      );
    case 3:
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span>Pre-Matured
        </span>
      );
    default:
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          Unknown
        </span>
      );
  }
};

const RDAccountTable: React.FC<RDAccountTableProps> = ({
  accounts,
  handleModify,
  handleDelete,
}) => {
  const flatAccounts: FlatRDAccount[] = accounts.map((dto) => {
    const accPrefix = dto.accountMasterDTO?.accPrefix || "00";
    const accSuffix = dto.accountMasterDTO?.accSuffix || 0;
    const rd = dto.rdAccountDetailDTO;

    return {
      id: dto.accountMasterDTO?.accId || 0,
      accountNumber: `${accPrefix}-${accSuffix}`,
      rdNumber: rd?.rdNumber?.toString() || "",
      accountName: dto.accountMasterDTO?.accountName || "",
      relativeName: dto.accountMasterDTO?.relativeName || "",
      rdProductId: dto.accountMasterDTO?.generalProductId || 0,
      productName: dto.productName || "",
      accountOpeningDate: dto.accountMasterDTO?.accOpeningDate || "",
      noOfMonths: rd?.noOfMonths ?? undefined,
      rdAmount: rd?.rdAmount ?? undefined,
      kistAmt: rd?.kistAmt ?? undefined,
      maturityDate: rd?.maturityDate || "",
      maturityAmt: rd?.maturityAmt ?? undefined,
      interestRate: rd?.interestRate ?? undefined,
      rdStatus: rd?.status ?? undefined,
      isJointAccount: dto.accountMasterDTO?.isJointAccount === 1,
      isAccClosed: dto.accountMasterDTO?.isAccClosed ?? false,
      nomineeCount: dto.accNomineeDTO?.length || 0,
      jointHolderCount: dto.jointAccountInfoDTO?.length || 0,
      openingBalance: Number(dto.openingBalance) || 0,
      _original: dto,
    };
  });

  const columns: Column<FlatRDAccount>[] = [
    {
      key: "accountNumber",
      header: "Account No.",
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
      key: "rdNumber",
      header: "RD No.",
      render: (row) => (
        <span className="text-sm font-medium text-gray-800">
          {row.rdNumber || "-"}
        </span>
      ),
    },
    {
      key: "accountName",
      header: "Account Name",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.accountName}</span>
          {row.relativeName && (
            <span className="text-xs text-gray-500 italic">
              {row.relativeName}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "rdAmount",
      header: "RD Amount",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm font-semibold text-gray-900">
            ₹{" "}
            {row.rdAmount?.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"}
          </span>
          {row.kistAmt != null && (
            <span className="text-xs text-gray-500">
              Kist: ₹{row.kistAmt.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "interestRate",
      header: "Rate / Tenure",
      render: (row) => (
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-indigo-700">
            {row.interestRate != null ? `${row.interestRate}%` : "-"}
          </span>
          <span className="text-xs text-gray-500">
            {row.noOfMonths != null ? `${row.noOfMonths} Months` : "-"}
          </span>
        </div>
      ),
    },
    {
      key: "maturityDate",
      header: "Maturity",
      render: (row) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-800 font-medium">
            {row.maturityDate
              ? new Date(row.maturityDate).toLocaleDateString()
              : "-"}
          </span>
          {row.maturityAmt != null && (
            <span className="text-xs text-green-700 font-semibold">
              ₹{row.maturityAmt.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "productName",
      header: "Product",
      render: (row) => (
        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-medium">
          {row.productName || "-"}
        </span>
      ),
    },
    {
      key: "isJointAccount",
      header: "Type",
      render: (row) => (
        <div className="flex justify-center items-center gap-1">
          {row.isJointAccount ? (
            <>
              <FaUsers className="text-purple-600" size={13} />
              <span className="text-xs font-medium text-purple-600">
                Joint ({row.jointHolderCount})
              </span>
            </>
          ) : (
            <>
              <FaUser className="text-blue-600" size={13} />
              <span className="text-xs font-medium text-blue-600">Single</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: "rdStatus",
      header: "RD Status",
      render: (row) => (
        <div className="flex justify-center">
          {rdStatusBadge(row.rdStatus)}
        </div>
      ),
    },
    {
      key: "isAccClosed",
      header: "Acc. Status",
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
            />
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
            aria-label="Edit RD Account"
            title="Edit RD Account"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._original)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition duration-200 transform hover:scale-110"
            aria-label="Delete RD Account"
            title="Delete RD Account"
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

export default RDAccountTable;