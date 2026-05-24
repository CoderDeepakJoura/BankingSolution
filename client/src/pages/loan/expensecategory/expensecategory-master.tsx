import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { Save, RotateCcw, ArrowLeft, Tag } from "lucide-react";
import { decryptId } from "../../../utils/encryption";
import expenseCategoryApi, { ExpenseCategoryDTO } from "../../../services/loan/expensecategoryapi";

const makeInitial = (branchId: number): ExpenseCategoryDTO => ({
  branchId,
  code: "",
  description: "",
  descriptionSL: "",
});

const ExpenseCategoryMaster: React.FC = () => {
  const navigate = useNavigate();
  const { categoryId: encId } = useParams<{ categoryId?: string }>();
  const categoryId = encId ? decryptId(encId) : null;
  const user = useSelector((state: RootState) => state.user);
  const isEdit = !!categoryId;
  const codeRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<ExpenseCategoryDTO>(() => makeInitial(user.branchid));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    if (!categoryId || Number.isNaN(Number(categoryId))) {
      Swal.fire({ icon: "error", title: "Error!", text: "Invalid Expense Category selected." });
      navigate("/expense-category-info");
      return;
    }
    loadCategory(Number(categoryId));
  }, [user.branchid, categoryId]);

  const loadCategory = async (id: number) => {
    setLoading(true);
    try {
      const res = await expenseCategoryApi.getById(id, user.branchid);
      const payload = (res as any).data ?? (res as any).Data;
      if (res.success && payload) setData({ ...payload, id, branchId: user.branchid });
      else throw new Error(res.message || "Failed to load");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      navigate("/expense-category-info");
    } finally { setLoading(false); }
  };

  const handleReset = () => { setData(makeInitial(user.branchid)); codeRef.current?.focus(); };

  const handleSubmit = async () => {
    if (!data.code?.trim()) {
      Swal.fire({ icon: "warning", title: "Required", text: "Code is required." }); return;
    }
    if (!data.description?.trim()) {
      Swal.fire({ icon: "warning", title: "Required", text: "Description is required." }); return;
    }
    setLoading(true);
    try {
      const dto = isEdit && categoryId ? { ...data, id: Number(categoryId), branchId: user.branchid } : data;
      const res = isEdit && categoryId
        ? await expenseCategoryApi.update(dto, Number(categoryId))
        : await expenseCategoryApi.create(dto);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved.", confirmButtonColor: "#3B82F6" });
        if (isEdit) navigate("/expense-category-info");
        else handleReset();
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setLoading(false); }
  };

  const set = (key: keyof ExpenseCategoryDTO, val: any) => setData(p => ({ ...p, [key]: val }));

  const inp = "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm";

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Tag className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{isEdit ? "Edit" : "Add"} Loan Expense Category</h1>
                  <p className="text-sm text-gray-500">Manage loan expense category details</p>
                </div>
              </div>
              <button onClick={() => navigate("/expense-category-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back To Operations
              </button>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-8 space-y-6">

              {/* Code */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Code <span className="text-red-500">*</span>
                </label>
                <input
                  ref={codeRef}
                  autoFocus
                  type="text"
                  value={data.code || ""}
                  onChange={e => set("code", e.target.value)}
                  maxLength={20}
                  placeholder="e.g. G"
                  className={inp}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={data.description || ""}
                  onChange={e => set("description", e.target.value)}
                  maxLength={100}
                  placeholder="Enter description"
                  className={inp}
                />
              </div>

              {/* Description SL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Description (SL) <span className="text-gray-400 text-xs font-normal">(Hindi)</span>
                </label>
                <input
                  type="text"
                  value={data.descriptionSL || ""}
                  onChange={e => set("descriptionSL", e.target.value)}
                  maxLength={200}
                  placeholder="Enter Hindi description"
                  className={inp}
                  lang="hi"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={isEdit ? () => {} : handleReset} disabled={isEdit} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm disabled:opacity-40">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow">
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isEdit ? "Updating..." : "Saving..."}</>
                    : <><Save className="w-4 h-4" />{isEdit ? "Update" : "Save"}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default ExpenseCategoryMaster;
