import React, { useCallback } from "react";
import { encryptId } from "../../../utils/encryption";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import LoanSlabTable from "./loanslab-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import loanSlabService, {
  CombinedLoanSlabDTO,
  LoanSlabFilter,
} from "../../../services/interestslab/loanslabservice";

const fetchLoanSlabs = async (
  filter: LoanSlabFilter,
  brId: number
): Promise<{ success: boolean; data: CombinedLoanSlabDTO[]; totalCount: number; message: string }> => {
  try {
    const res = await loanSlabService.fetchLoanSlabs(brId, filter);
    return {
      success:    res.success ?? false,
      data:       res.loanSlabs || [],
      totalCount: res.totalCount ?? 0,
      message:    res.message ?? "",
    };
  } catch (error: any) {
    return { success: false, data: [], totalCount: 0, message: error.message || "Failed to fetch loan slabs" };
  }
};

const deleteLoanSlab = async (dto: CombinedLoanSlabDTO, brId: number): Promise<void> => {
  const result = await Swal.fire({
    title: "Delete Loan Slab",
    text: `Are you sure you want to delete the loan slab "${dto.loanSlab?.name}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      const slabId = dto.loanSlab?.id;
      if (!slabId) throw new Error("Loan Slab ID not found");

      await loanSlabService.deleteLoanSlab(brId, slabId);

      Swal.fire({
        title: "Deleted!",
        text: `Loan slab "${dto.loanSlab?.name}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to delete loan slab.", "error");
    }
  }
};

const LoanSlabOperations: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchSlabsWithBranch = useCallback(
    async (filter: LoanSlabFilter) => fetchLoanSlabs(filter, user.branchid),
    [user.branchid]
  );

  return (
    <CRUDMaster<CombinedLoanSlabDTO>
      fetchData={fetchSlabsWithBranch}
      addEntry={() => navigate("/loan-interest-slab")}
      modifyEntry={async (dto) => {
        const slabId = dto.loanSlab?.id;
        if (slabId) navigate(`/loan-interest-slab/${encryptId(slabId)}`);
      }}
      deleteEntry={(dto) => deleteLoanSlab(dto, user.branchid)}
      pageTitle="Loan Interest Slab Operations"
      addLabel="Add Loan Slab"
      onClose={() => navigate("/slab-operations")}
      searchPlaceholder="Search by product name, slab name, date..."
      renderTable={(slabs, handleModify, handleDelete) => (
        <LoanSlabTable slabs={slabs} handleModify={handleModify} handleDelete={handleDelete} />
      )}
      getKey={(dto) => dto.loanSlab?.id || 0}
    />
  );
};

export default LoanSlabOperations;
