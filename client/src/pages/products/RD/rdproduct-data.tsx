// rdproduct-crud.tsx
import { encryptId } from '../../../utils/encryption';
import React, { useCallback } from "react";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import RdProductTable from "./rdproduct-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import rdProductApiService, {
  CombinedRDProductDTO,
  RDFilter,
} from "../../../services/productmasters/RD/rdproductapi";

// ─── Fetch Helper ─────────────────────────────────────────────────────────────

const fetchRdProducts = async (
  filter: RDFilter,
  branchId: number
): Promise<{
  success:    boolean;
  data:       CombinedRDProductDTO[];
  totalCount: number;
  message:    string;
}> => {
  try {
    const res = await rdProductApiService.fetchRDProducts(filter, branchId);

    return {
      success:    res.success          ?? false,
      data:       res.rdProducts       || [],   // ✅ controller returns rdProducts directly
      totalCount: res.totalCount       ?? 0,    // ✅ not res.data.totalCount
      message:    res.message          ?? "",
    };
  } catch (error: any) {
    return { success: false, data: [], totalCount: 0, message: error.message || "Failed to fetch" };
  }
};


// ─── Component ────────────────────────────────────────────────────────────────

const RdProductMasterCRUD: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchRdProductsWithBranch = useCallback(
    async (filter: RDFilter) => {
      return await fetchRdProducts(filter, user.branchid);
    },
    [user.branchid]
  );

  // ── Add ──────────────────────────────────────────────────────────────────────
  const handleAddRdProduct = () => {
    navigate("/rd-product");
  };

  // ── Modify ───────────────────────────────────────────────────────────────────
  const handleModifyRdProduct = (dto: CombinedRDProductDTO) => {
    const productId = dto.rdProductDTO?.id;
    if (productId) {
      navigate(`/rd-product/${encryptId(productId)}`);
    } else {
      Swal.fire({ icon: "error", title: "Error", text: "Product ID not found" });
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDeleteRdProduct = async (dto: CombinedRDProductDTO) => {
    const product = dto.rdProductDTO;

    if (!product) {
      await Swal.fire({ icon: "error", title: "Error", text: "Product data not found" });
      return;
    }

    const result = await Swal.fire({
      title: "Delete RD Product?",
      html: `
        <div style="text-align:left;padding:10px;">
          <p style="margin-bottom:10px;">Are you sure you want to delete this RD Product?</p>
          <div style="background:#f3f4f6;padding:12px;border-radius:6px;">
            <p style="font-weight:600;margin:0;">${product.productName}</p>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">
              Name (SL): ${product.productNameInSL || "—"}
            </p>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">
              Code: ${product.productCode}
            </p>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">
              Effective From: ${new Date(product.effectiveFrom).toLocaleDateString("en-IN")}
            </p>
          </div>
          <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px;margin-top:12px;border-radius:4px;">
            <p style="color:#991b1b;font-size:13px;margin:0;font-weight:500;">
              ⚠️ Warning: This will delete the product and all its associated rules, posting heads, and interest configurations!
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
      customClass: { popup: "swal-wide" },
    });

    if (result.isConfirmed) {
      try {
        const productId = product.id;
        if (!productId) throw new Error("Product ID not found");

        const deleteResponse = await rdProductApiService.deleteRDProduct(
          productId,
          user.branchid
        );

        if (deleteResponse.success) {
          await Swal.fire({
            title: "Deleted!",
            html: `
              <div style="text-align:center;">
                <p style="font-size:16px;margin-bottom:8px;">
                  RD Product <strong>"${product.productName}"</strong> has been deleted successfully.
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

          window.location.reload();
        } else {
          throw new Error(deleteResponse.message || "Failed to delete RD Product");
        }
      } catch (err: any) {
        console.error("Delete error:", err);
        await Swal.fire({
          title: "Error!",
          html: `
            <div style="text-align:left;padding:10px;">
              <p style="margin-bottom:8px;">Failed to delete RD Product.</p>
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

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <CRUDMaster<CombinedRDProductDTO>
      fetchData={fetchRdProductsWithBranch}
      addEntry={handleAddRdProduct}
      modifyEntry={handleModifyRdProduct}
      deleteEntry={handleDeleteRdProduct}
      pageTitle="RD Product Master Operations"
      addLabel="Add RD Product"
      onClose={() => navigate("/product-operations")}
      searchPlaceholder="Search by product name or code..."
      renderTable={(rdProducts, handleModify, handleDelete) => (
        <RdProductTable
          rdProducts={rdProducts}
          handleModify={handleModify}
          handleDelete={handleDelete}
        />
      )}
      getKey={(dto) => dto.rdProductDTO?.id || 0}
    />
  );
};

export default RdProductMasterCRUD;
