import React, { useState, useEffect, useCallback } from "react";
import { encryptId, decryptId } from '../../../utils/encryption';
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import FDInterestSlabTable from "./slab-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import fdInterestSlabService, {
  CombinedFDIntDTO,
  FDInterestSlabFilter,
} from "../../../services/slabs/fdslabservice";
import commonservice from "../../../services/common/commonservice";

interface FDProduct {
  id: number;
  productName: string;
}

// Fetch FD Interest Slabs
const fetchFDInterestSlabs = async (
  filter: FDInterestSlabFilter,
  branchId: number
): Promise<{
  success: boolean;
  data: CombinedFDIntDTO[];
  totalCount: number;
  message: string;
}> => {
  try {
    const res = await fdInterestSlabService.fetchFDInterestSlabs(branchId, filter);
    console.log("Fetched FD Interest Slabs:", res);
    return {
      success: res.success ?? false,
      data: res.fdInterestSlabs || [],
      totalCount: res.totalCount ?? 0,
      message: res.message ?? "",
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      totalCount: 0,
      message: error.message || "Failed to fetch FD interest slabs",
    };
  }
};

// Delete FD Interest Slab
const deleteFDInterestSlab = async (
  dto: CombinedFDIntDTO,
  branchId: number
) => {
  const result = await Swal.fire({
    title: "Delete FD Interest Slab",
    text: `Are you sure you want to delete the FD interest slab for "${dto.fdInterestSlab?.slabName}"? This action cannot be undone.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  });

  if (result.isConfirmed) {
    try {
      const slabId = dto.fdInterestSlab?.id;
      if (!slabId) {
        throw new Error("FD Interest Slab ID not found");
      }

      await fdInterestSlabService.deleteFDInterestSlab(branchId, slabId);
      
      Swal.fire({
        title: "Deleted!",
        text: `FD interest slab for "${dto.fdInterestSlab?.slabName}" has been deleted.`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err: any) {
      Swal.fire(
        "Error!",
        err.message || "Failed to delete FD interest slab.",
        "error"
      );
    }
  }
};

// Main Component
const FDInterestSlabOperations: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const [fdProducts, setFdProducts] = useState<FDProduct[]>([]);

  // Fetch FD products
  useEffect(() => {
    const fetchData = async () => {
      try {
        const productRes = await commonservice.fetch_fd_products(
          user.branchid
        );
        if (!productRes.success) throw new Error("Failed to load FD Products");
        setFdProducts(productRes.data || []);
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
      filter: FDInterestSlabFilter
    ): Promise<{
      success: boolean;
      data: CombinedFDIntDTO[];
      totalCount: number;
      message: string;
    }> => {
      return await fetchFDInterestSlabs(filter, user.branchid);
    },
    [user.branchid]
  );

  // Navigate to add page
  const handleAdd = () => {
    navigate("/fdproduct-slab");
  };

  // Navigate to modify page
  const handleModify = async (dto: CombinedFDIntDTO) => {
    const slabId = dto.fdInterestSlab?.id;
    if (slabId) {
      const encryptedId = encryptId(slabId);
      navigate(`/fdproduct-slab/${encryptedId}`);
    }
    return Promise.resolve();
  };

  return (
    <CRUDMaster<CombinedFDIntDTO>
      fetchData={fetchSlabsWithBranch}
      addEntry={handleAdd}
      modifyEntry={handleModify}
      deleteEntry={(dto) => deleteFDInterestSlab(dto, user.branchid)}
      pageTitle="FD Slab Operations"
      addLabel="Add FD Slab"
      onClose={() => navigate("/fd-slab-operations")}
      searchPlaceholder="Search by FD product name, date, tenure..."
      renderTable={(slabs, handleModify, handleDelete) => (
        <FDInterestSlabTable
          slabs={slabs}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(dto) => dto.fdInterestSlab?.id || 0}
    />
  );
};

export default FDInterestSlabOperations;
