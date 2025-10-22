// fdproduct-crud.tsx
import { encryptId, decryptId } from '../../../utils/encryption';
import React, { useState, useCallback } from "react";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import FdProductTable from "./fdproduct-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import fdProductApiService, {
  FdProductFilter,
  CombinedFDDTO,
  FDFilter,
} from "../../../services/productmasters/FD/fdproductapi";

const fetchFdProducts = async (
  filter: FDFilter,
  branchId: number
): Promise<{
  success: boolean;
  data: CombinedFDDTO[];
  totalCount: number;
  message: string;
}> => {
  try {
    const res = await fdProductApiService.fetchFDProducts(filter, branchId);

    return {
      success: res.success ?? false,
      data: res.fdProducts || [],
      totalCount: res.data?.totalCount ?? 0,
      message: res.message ?? "",
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      totalCount: 0,
      message: error.message || "Failed to fetch FD products",
    };
  }
};

const FdProductMasterCRUD: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchFdProductsWithBranch = useCallback(
    async (filter: FDFilter) => {
      return await fetchFdProducts(filter, user.branchid);
    },
    [user.branchid]
  );

  // Handle Add - Route to FD product master
  const handleAddFdProduct = () => {
    navigate("/fd-product"); // Route to FD product master for add
  };

  // Handle Modify - Route to FD product master with ID
  const handleModifyFdProduct = (dto: CombinedFDDTO) => {
    const productId = dto.fdProductDTO?.id;
    if (productId) {
      navigate(`/fd-product/${encryptId(productId)}`); // Route with encrypted product ID
    } else {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Product ID not found",
      });
    }
  };

  // Handle Delete
  const handleDeleteFdProduct = async (dto: CombinedFDDTO) => {
    const product = dto.fdProductDTO;
    
    if (!product) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: "Product data not found",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Delete FD Product?",
      html: `
        <div style="text-align:left;padding:10px;">
          <p style="margin-bottom:10px;">Are you sure you want to delete this FD Product?</p>
          <div style="background:#f3f4f6;padding:12px;border-radius:6px;">
            <p style="font-weight:600;margin:0;">${product.productName}</p>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">Code: ${product.productCode}</p>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">
              Effective From: ${new Date(product.effectiveFrom).toLocaleDateString('en-IN')}
            </p>
            ${
              product.effectiveTill
                ? `<p style="font-size:13px;color:#6b7280;margin:4px 0 0;">
                    Effective Till: ${new Date(product.effectiveTill).toLocaleDateString('en-IN')}
                  </p>`
                : ""
            }
          </div>
          <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px;margin-top:12px;border-radius:4px;">
            <p style="color:#991b1b;font-size:13px;margin:0;font-weight:500;">
              ⚠️ Warning: This will delete the product and all its associated rules!
            </p>
            <p style="color:#dc2626;font-size:12px;margin:4px 0 0;">
              This action cannot be undone.
            </p>
          </div>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#EF4444",
      cancelButtonColor: "#6B7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      customClass: {
        popup: 'swal-wide',
      },
    });

    if (result.isConfirmed) {
      try {
        const productId = product.id;
        if (!productId) throw new Error("Product ID not found");

        const deleteResponse = await fdProductApiService.deleteFDProduct(
          productId,
          user.branchid
        );

        if (deleteResponse.success) {
          await Swal.fire({
            title: "Deleted!",
            html: `
              <div style="text-align:center;">
                <p style="font-size:16px;margin-bottom:8px;">
                  FD Product <strong>"${product.productName}"</strong> has been deleted successfully.
                </p>
                <p style="font-size:14px;color:#6b7280;">
                  Code: ${product.productCode}
                </p>
              </div>
            `,
            icon: "success",
            timer: 2500,
            showConfirmButton: false,
          });
          
          // Trigger refresh by reloading or using a state update
          window.location.reload();
        } else {
          throw new Error(deleteResponse.message || "Failed to delete FD Product");
        }
      } catch (err: any) {
        console.error("Delete error:", err);
        await Swal.fire({
          title: "Error!",
          html: `
            <div style="text-align:left;padding:10px;">
              <p style="margin-bottom:8px;">Failed to delete FD Product.</p>
              <div style="background:#fef2f2;padding:10px;border-radius:6px;border-left:4px solid #ef4444;">
                <p style="font-size:13px;color:#991b1b;margin:0;">
                  <strong>Error:</strong> ${err.message || "Unknown error occurred"}
                </p>
              </div>
              <p style="font-size:12px;color:#6b7280;margin-top:8px;">
                Please try again or contact support if the issue persists.
              </p>
            </div>
          `,
          icon: "error",
          confirmButtonColor: "#EF4444",
        });
      }
    }
  };

  return (
    <CRUDMaster<CombinedFDDTO>
      fetchData={fetchFdProductsWithBranch}
      addEntry={handleAddFdProduct}
      modifyEntry={handleModifyFdProduct}
      deleteEntry={handleDeleteFdProduct}
      pageTitle="FD Product Master Operations"
      addLabel="Add FD Product"
      onClose={() => navigate("/product-operations")}
      searchPlaceholder="Search by product name or code..."
      renderTable={(fdProducts, handleModify, handleDelete) => (
        <FdProductTable
          fdProducts={fdProducts}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(dto) => dto.fdProductDTO?.id || 0}
    />
  );
};

export default FdProductMasterCRUD;
