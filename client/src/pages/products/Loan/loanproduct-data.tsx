import { encryptId } from '../../../utils/encryption';
import React, { useCallback } from "react";
import Swal from "sweetalert2";
import CRUDMaster from "../../../components/Location/CRUDOperations";
import LoanProductTable from "./loanproduct-table";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import loanProductApiService, {
  LoanProductFilter,
  CombinedLoanProductDTO,
} from "../../../services/productmasters/Loan/loanproductapi";

const fetchLoanProducts = async (
  filter: LoanProductFilter,
  branchId: number
): Promise<{
  success: boolean;
  data: CombinedLoanProductDTO[];
  totalCount: number;
  message: string;
}> => {
  try {
    const res = await loanProductApiService.fetchLoanProducts(filter, branchId);
    return {
      success: res.success ?? false,
      data: (res as any).loanProducts || [],
      totalCount: (res as any).totalCount ?? 0,
      message: res.message ?? "",
    };
  } catch (error: any) {
    return {
      success: false,
      data: [],
      totalCount: 0,
      message: error.message || "Failed to fetch Loan products",
    };
  }
};

const LoanProductMasterCRUD: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);

  const fetchWithBranch = useCallback(
    async (filter: LoanProductFilter) => {
      return await fetchLoanProducts(filter, user.branchid);
    },
    [user.branchid]
  );

  const handleAdd = () => {
    navigate("/loan-product");
  };

  const handleModify = (dto: CombinedLoanProductDTO) => {
    const productId = dto.loanProductDTO?.id;
    if (productId) {
      navigate(`/loan-product/${encryptId(productId)}`);
    } else {
      Swal.fire({ icon: "error", title: "Error", text: "Product ID not found" });
    }
  };

  const handleDelete = async (dto: CombinedLoanProductDTO) => {
    const product = dto.loanProductDTO;

    if (!product) {
      await Swal.fire({ icon: "error", title: "Error", text: "Product data not found" });
      return;
    }

    const result = await Swal.fire({
      title: "Delete Loan Product?",
      html: `
        <div style="text-align:left;padding:10px;">
          <p style="margin-bottom:10px;">Are you sure you want to delete this Loan Product?</p>
          <div style="background:#f3f4f6;padding:12px;border-radius:6px;">
            <p style="font-weight:600;margin:0;">${product.productName}</p>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">Code: ${product.code}</p>
            <p style="font-size:13px;color:#6b7280;margin:4px 0 0;">
              Effective From: ${new Date(product.effectiveFrom).toLocaleDateString("en-IN")}
            </p>
          </div>
          <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:12px;margin-top:12px;border-radius:4px;">
            <p style="color:#991b1b;font-size:13px;margin:0;font-weight:500;">
              ⚠️ Warning: This will delete the product and all its associated data!
            </p>
            <p style="color:#dc2626;font-size:12px;margin:4px 0 0;">This action cannot be undone.</p>
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

        const res = await loanProductApiService.deleteLoanProduct(productId, user.branchid);

        if (res.success || (res as any).success) {
          await Swal.fire({
            title: "Deleted!",
            html: `<div style="text-align:center;">
              <p style="font-size:16px;margin-bottom:8px;">
                Loan Product <strong>"${product.productName}"</strong> has been deleted successfully.
              </p>
              <p style="font-size:14px;color:#6b7280;">Code: ${product.code}</p>
            </div>`,
            icon: "success",
            timer: 2500,
            showConfirmButton: false,
          });
          window.location.reload();
        } else {
          throw new Error((res as any).message || "Failed to delete Loan Product");
        }
      } catch (err: any) {
        await Swal.fire({
          title: "Error!",
          html: `<div style="text-align:left;padding:10px;">
            <p style="margin-bottom:8px;">Failed to delete Loan Product.</p>
            <div style="background:#fef2f2;padding:10px;border-radius:6px;border-left:4px solid #ef4444;">
              <p style="font-size:13px;color:#991b1b;margin:0;">
                <strong>Error:</strong> ${err.message || "Unknown error occurred"}
              </p>
            </div>
          </div>`,
          icon: "error",
          confirmButtonColor: "#EF4444",
        });
      }
    }
  };

  return (
    <CRUDMaster<CombinedLoanProductDTO>
      fetchData={fetchWithBranch}
      addEntry={handleAdd}
      modifyEntry={handleModify}
      deleteEntry={handleDelete}
      pageTitle="Loan Product Master Operations"
      addLabel="Add Loan Product"
      onClose={() => navigate("/product-operations")}
      searchPlaceholder="Search by product name or code..."
      renderTable={(loanProducts, onModify, onDelete) => (
        <LoanProductTable
          loanProducts={loanProducts}
          handleModify={onModify}
          handleDelete={onDelete}
        />
      )}
      getKey={(dto) => dto.loanProductDTO?.id || 0}
    />
  );
};

export default LoanProductMasterCRUD;
