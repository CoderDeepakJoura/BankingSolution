import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { CommonAccMasterDTO } from "../../services/accountMasters/generalAccountMaster/generalAccServiceapi";
import GenericTable, { Column } from "../../components/Location/GenericTable";

interface GeneralAccountTableProps {
  accounts: CommonAccMasterDTO[];
  handleModify: (account: CommonAccMasterDTO) => void;
  handleDelete: (account: CommonAccMasterDTO) => void;
}

// Flattened type so table can work directly with flat properties
type FlatAccount = {
  accId: number;
  accountNumber: string;
  accountName: string;
  accountNameSL?: string;
  headCode?: string;
  headId?: number;
  headName? : string;
  isAccClosed: boolean;
  gstInNo?: string;
  stateId?: number;
  stateName?: string;
  // keep full original object if you need it for actions
  _original: CommonAccMasterDTO;
};

const GeneralAccountTable: React.FC<GeneralAccountTableProps> = ({
  accounts,
  handleModify,
  handleDelete,
}) => {
  // ✅ Flatten the DTOs before sending to GenericTable
  const flatAccounts: FlatAccount[] = accounts.map((dto) => ({
    accId: dto.accountMasterDTO?.accId || 0,
    accountNumber: dto.accountMasterDTO?.accountNumber || "",
    accountName: dto.accountMasterDTO?.accountName || "",
    accountNameSL: dto.accountMasterDTO?.accountNameSL || "",
    headCode: dto.accountMasterDTO?.headCode,
    headId: dto.accountMasterDTO?.headId,
    isAccClosed: dto.accountMasterDTO?.isAccClosed ?? false,
    gstInNo: dto.gstInfoDTO?.gstInNo || "",
    stateId: dto.gstInfoDTO?.stateId,
    stateName: dto.gstInfoDTO?.stateName,
    headName: dto.accountMasterDTO?.headName,
    _original: dto, // keep reference to original
  }));

  // ✅ Columns now map to flat properties
  const columns: Column<FlatAccount>[] = [
    {
      key: "accountNumber",
      header: "Account No.",
      render: (row) => (
        <span className="font-mono text-sm font-medium text-blue-600">
          {row.accountNumber}
        </span>
      ),
    },
    {
      key: "accountName",
      header: "Account Name",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.accountName}</span>
          {row.accountNameSL && (
            <span className="text-xs text-gray-500 italic" lang="hi">
              {row.accountNameSL}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "headCode",
      header: "Account Head",
      render: (row) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {row.headName}
        </span>
      ),
    },
    {
      key: "gstInNo",
      header: "GST Info",
      render: (row) =>
        row.gstInNo || row.stateId ? (
          <div className="flex flex-col space-y-1">
            <span className="font-mono text-xs text-green-600">{row.gstInNo}</span>
            {row.stateId && (
              <span className="text-xs text-gray-500">State: {row.stateName}</span>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">No GST Info</span>
        ),
    },
    {
      key: "isAccClosed",
      header: "Status",
      render: (row) => (
        <div className="flex justify-center">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              !row.isAccClosed
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {!row.isAccClosed ? "Open" : "Closed"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => handleModify(row._original)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition"
            aria-label="Modify Account"
            title="Modify Account"
          >
            <FaEdit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row._original)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
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
      getKey={(row) => row.accId}
    />
  );
};

export default GeneralAccountTable;
