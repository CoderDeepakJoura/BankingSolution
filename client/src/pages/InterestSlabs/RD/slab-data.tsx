import React, { useState, useEffect, useCallback } from "react";
import { encryptId, decryptId } from "../../../utils/encryption";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import InterestSlabTable from "./slab-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import interestSlabService, {
  CombinedRDIntDTO,
  InterestSlabFilter,
} from "../../../services/interestslab/rdinterestslab";
import commonservice from "../../../services/common/commonservice";

// ── Types ────────────────────────────────────────────────────────────────────

interface RDProduct {
  id: number;
  productName: string;
}

// ── Fetch Helper ─────────────────────────────────────────────────────────────

const fetchInterestSlabs = async (
  filter: InterestSlabFilter,
  branchId: number
): Promise<{
  success: boolean;
  data: CombinedRDIntDTO[];
  totalCount: number;
  message: string;
}> => {
  try {
    const res = await interestSlabService.fetchInterestSlabs(branchId, filter);
    return {
      success: res.success ?? false,
      data: res.rdInterestSlabs || [],
      totalCount: res.totalCount ?? 0,
      message: res.message ?? "",
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      totalCount: 0,
      message: error.message || "Failed to fetch interest slabs",
    };
  }
};

// ── Delete Helper ────────────────────────────────────────────────────────────

const deleteInterestSlab = async (
  dto: CombinedRDIntDTO,
  branchId: number
): Promise<void> => {
  const result = await Swal.fire({
    title: "Delete Interest Slab",
    text: `Are you sure you want to delete the interest slab "${dto.rdInterestSlab?.slabName}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      const slabId = dto.rdInterestSlab?.id;
      if (!slabId) throw new Error("Interest Slab ID not found");

      await interestSlabService.deleteInterestSlab(branchId, slabId);

      Swal.fire({
        title: "Deleted!",
        text: `Interest slab "${dto.rdInterestSlab?.slabName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire("Error!", err.message || "Failed to delete interest slab.", "error");
    }
  }
};

// ── Main Component ───────────────────────────────────────────────────────────

const RDInterestSlabOperations: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const [rdProducts, setRDProducts] = useState<RDProduct[]>([]);

  // ── Fetch RD Products on mount ───────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productRes = await commonservice.fetch_rd_products(user.branchid);
        if (!productRes.success) throw new Error("Failed to load RD Products");
        setRDProducts(productRes.data || []);
      } catch (err: any) {
        Swal.fire("Error", err.message || "Could not load required data", "error");
      }
    };

    if (user.branchid) {
      fetchData();
    }
  }, [user.branchid]);

  // ── Wrapped fetch (injects branchId) ────────────────────────────────────
  const fetchSlabsWithBranch = useCallback(
    async (
      filter: InterestSlabFilter
    ): Promise<{
      success: boolean;
      data: CombinedRDIntDTO[];
      totalCount: number;
      message: string;
    }> => {
      return await fetchInterestSlabs(filter, user.branchid);
    },
    [user.branchid]
  );

  // ── Navigate to Add page ─────────────────────────────────────────────────
  const handleAdd = () => {
    navigate("/rd-interest-slab");
  };

  // ── Navigate to Modify page ──────────────────────────────────────────────
  const handleModify = async (dto: CombinedRDIntDTO): Promise<void> => {
    const slabId = dto.rdInterestSlab?.id;
    if (slabId) {
      const encryptedId = encryptId(slabId);
      navigate(`/rd-interest-slab/${encryptedId}`);
    }
    return Promise.resolve();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <CRUDMaster<CombinedRDIntDTO>
      fetchData={fetchSlabsWithBranch}
      addEntry={handleAdd}
      modifyEntry={handleModify}
      deleteEntry={(dto) => deleteInterestSlab(dto, user.branchid)}
      pageTitle="RD Account Interest Slab Operations"
      addLabel="Add Interest Slab"
      onClose={() => navigate("/slab-operations")}
      searchPlaceholder="Search by product name, date..."
      renderTable={(slabs, handleModify, handleDelete) => (
        <InterestSlabTable
          slabs={slabs}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(dto) => dto.rdInterestSlab?.id || 0}
    />
  );
};

export default RDInterestSlabOperations;
