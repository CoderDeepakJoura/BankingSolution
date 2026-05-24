import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Swal from "sweetalert2";
import { Save, RotateCcw, ArrowLeft, BookOpen } from "lucide-react";
import { decryptId } from "../../../utils/encryption";
import billBookApi, { BillBookDTO } from "../../../services/gst/billbookapi";

const makeInitial = (branchId: number): BillBookDTO => ({
  branchId,
  description: "",
  billNoPrefix: "",
  billNoFrom: 1,
  billNoGeneration: 1,
});

const BillBookMaster: React.FC = () => {
  const navigate = useNavigate();
  const { billBookId: encId } = useParams<{ billBookId?: string }>();
  const billBookId = encId ? decryptId(encId) : null;
  const user = useSelector((state: RootState) => state.user);
  const isEdit = !!billBookId;
  const descRef = useRef<HTMLInputElement>(null);

  const [data, setData] = useState<BillBookDTO>(() => makeInitial(user.branchid));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    if (!billBookId || Number.isNaN(Number(billBookId))) {
      Swal.fire({ icon: "error", title: "Error!", text: "Invalid Bill Book selected." });
      navigate("/billbook-info");
      return;
    }
    loadBillBook(Number(billBookId));
  }, [user.branchid, billBookId]);

  const loadBillBook = async (id: number) => {
    setLoading(true);
    try {
      const res = await billBookApi.getById(id, user.branchid);
      const payload = (res as any).data ?? (res as any).Data;
      if (res.success && payload) setData({ ...payload, id, branchId: user.branchid });
      else throw new Error(res.message || "Failed to load");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
      navigate("/billbook-info");
    } finally { setLoading(false); }
  };

  const handleReset = () => { setData(makeInitial(user.branchid)); descRef.current?.focus(); };

  const handleSubmit = async () => {
    const errors: string[] = [];
    if (!data.description?.trim()) errors.push("Description is required.");
    if (!data.billNoPrefix?.trim()) errors.push("Bill No. Prefix is required.");
    if (!data.billNoFrom || data.billNoFrom < 1) errors.push("Bill No. From must be at least 1.");
    if (errors.length > 0) {
      Swal.fire({ icon: "warning", title: "Please fix the following:", html: `<ul class="text-left list-disc pl-5 space-y-1">${errors.map(e => `<li>${e}</li>`).join("")}</ul>` });
      return;
    }

    setLoading(true);
    try {
      const dto = isEdit && billBookId ? { ...data, id: Number(billBookId), branchId: user.branchid } : data;
      const res = isEdit && billBookId
        ? await billBookApi.update(dto, Number(billBookId))
        : await billBookApi.create(dto);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved.", confirmButtonColor: "#3B82F6" });
        if (isEdit) navigate("/billbook-info");
        else handleReset();
      } else throw new Error(res.message || "Operation failed");
    } catch (err: any) {
      await Swal.fire({ icon: "error", title: "Error!", text: err.message });
    } finally { setLoading(false); }
  };

  const set = (key: keyof BillBookDTO, val: any) => setData(p => ({ ...p, [key]: val }));

  const inp = "w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm";

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4">
          <div className="w-full space-y-4">

            {/* Header */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg flex items-center justify-center">
                  <BookOpen className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800">{isEdit ? "Edit" : "Add"} Bill Book</h1>
                  <p className="text-sm text-gray-500">Manage GST bill book details</p>
                </div>
              </div>
              <button onClick={() => navigate("/billbook-operations")} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> Back To Operations
              </button>
            </div>

            {/* Form */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={descRef}
                    autoFocus
                    type="text"
                    value={data.description || ""}
                    onChange={e => set("description", e.target.value)}
                    maxLength={100}
                    placeholder="Enter description"
                    className={inp}
                  />
                </div>

                {/* Bill No. Prefix */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bill No. Prefix <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={data.billNoPrefix || ""}
                    onChange={e => set("billNoPrefix", e.target.value)}
                    maxLength={5}
                    placeholder="e.g. INV"
                    className={inp}
                  />
                </div>

                {/* Bill No. From */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Bill No. From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={data.billNoFrom}
                    onChange={e => set("billNoFrom", Number(e.target.value) || 1)}
                    className={inp}
                  />
                </div>

                {/* Bill No. Generation */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Bill No. Generation <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-8">
                    {[
                      { value: 1, label: "Financial Year" },
                      { value: 2, label: "Continuous" },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="billNoGeneration"
                          value={opt.value}
                          checked={data.billNoGeneration === opt.value}
                          onChange={() => set("billNoGeneration", opt.value)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={isEdit ? () => {} : handleReset} disabled={isEdit} className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm disabled:opacity-40">
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
                <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white rounded-lg font-semibold text-sm disabled:opacity-50 shadow">
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

export default BillBookMaster;
