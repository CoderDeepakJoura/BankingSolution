import React, { useState, useEffect, useCallback } from "react";
import { encryptId, decryptId } from '../../../utils/encryption';
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import InterestSlabTable from "./slab-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import interestSlabService, {
  CombinedSavingIntDTO,
  InterestSlabFilter,
} from "../../../services/interestslab/interestslabservice";
import commonservice from "../../../services/common/commonservice";

interface SavingProduct {
  id: number;
  productName: string;
}

// Fetch Interest Slabs
const fetchInterestSlabs = async (
  filter: InterestSlabFilter,
  branchId: number
): Promise<{
  success: boolean;
  data: CombinedSavingIntDTO[];
  totalCount: number;
  message: string;
}> => {
  try {
    const res = await interestSlabService.fetchInterestSlabs(branchId, filter);

    return {
      success: res.success ?? false,
      data: res.savingInterestSlabs || [],
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

// Delete Interest Slab
const deleteInterestSlab = async (
  dto: CombinedSavingIntDTO,
  branchId: number
) => {
  const result = await Swal.fire({
    title: "Delete Interest Slab",
    text: `Are you sure you want to delete the interest slab for "${dto.savingInterestSlab?.slabName}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      const slabId = dto.savingInterestSlab?.id;
      if (!slabId) {
        throw new Error("Interest Slab ID not found");
      }

      await interestSlabService.deleteInterestSlab(branchId, slabId);
      
      Swal.fire({
        title: "Deleted!",
        text: `Interest slab for "${dto.savingInterestSlab?.slabName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        "Error!",
        err.message || "Failed to delete interest slab.",
        "error"
      );
    }
  }
};

// Main Component
const InterestSlabOperations: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const [savingProducts, setSavingProducts] = useState<SavingProduct[]>([]);

  // Fetch saving products
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productRes = await commonservice.fetch_saving_products(
          user.branchid
        );
        if (!productRes.success) throw new Error("Failed to load Saving Products");
        setSavingProducts(productRes.data || []);
      } catch (err: any) {
        Swal.fire("Error", err.message || "Could not load required data", "error");
      }
    };

    if (user.branchid) {
      fetchData();
    }
  }, [user.branchid]);

  // Fetch slabs with branch
  const fetchSlabsWithBranch = useCallback(
    async (
      filter: InterestSlabFilter
    ): Promise<{
      success: boolean;
      data: CombinedSavingIntDTO[];
      totalCount: number;
      message: string;
    }> => {
      return await fetchInterestSlabs(filter, user.branchid);
    },
    [user.branchid]
  );

  // Navigate to add page
  const handleAdd = () => {
    navigate("/savingproduct-interest-slab");
  };

  // Navigate to modify page
   const handleModify = async (dto: CombinedSavingIntDTO) => {
    const slabId = dto.savingInterestSlab?.id;
    if (slabId) {
      const encryptedId = encryptId(slabId);
      navigate(`/savingproduct-interest-slab/${encryptedId}`);
    }
    return Promise.resolve(); // FIX: Return a resolved promise
  };

  return (
    <CRUDMaster<CombinedSavingIntDTO>
      fetchData={fetchSlabsWithBranch}
      addEntry={handleAdd}
      modifyEntry={handleModify}
      deleteEntry={(dto) => deleteInterestSlab(dto, user.branchid)}
      pageTitle="Saving Account Interest Slab Operations"
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
      getKey={(dto) => dto.savingInterestSlab?.Id || 0}
    />
  );
};

export default InterestSlabOperations;
