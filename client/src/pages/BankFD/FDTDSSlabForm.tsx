import React, { useState, useEffect } from "react";
import DashboardLayout from "../../Common/Layout";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import Swal from "sweetalert2";
import { Save, ArrowLeft, Layers, AlertCircle, RotateCcw, Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { FaEdit, FaTrash } from "react-icons/fa";
import DatePicker from "../../components/DatePicker";
import fdTdsSlabApi, { FDTDSSlabDetailDTO, FDTDSSlabWithDetails } from "../../services/bankfd/fdTdsSlabApi";
import { decryptId } from "../../utils/encryption";
import commonservice from "../../services/common/commonservice";

interface DetailRow {
  rowKey: number;
  id: number;
  fromAmount: string;
  toAmount: string;
  intRate: string;
}

interface ValidationErrors {
  name?: string;
  date?: string;
  details?: string;
}

const FDTDSSlabForm: React.FC = () => {
  const user = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();
  const { slabId: encryptedSlabId } = useParams<{ slabId: string }>();

  const isEditMode = !!encryptedSlabId;
  const slabId = isEditMode ? decryptId(encryptedSlabId!) : null;

  const [name, setName] = useState("");
  const [nameSL, setNameSL] = useState("");
  const [date, setDate] = useState(commonservice.getTodaysDate());
  const [type, setType] = useState(8);
  const [withPanCard, setWithPanCard] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const [details, setDetails] = useState<DetailRow[]>([]);
  const [rowCounter, setRowCounter] = useState(1);

  const [entryFromAmount, setEntryFromAmount] = useState("");
  const [entryToAmount, setEntryToAmount] = useState("");
  const [entryIntRate, setEntryIntRate] = useState("");
  const [editingRowKey, setEditingRowKey] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode && slabId) loadSlab(slabId);
  }, [isEditMode, slabId]);

  const loadSlab = async (id: number) => {
    setLoading(true);
    try {
      const res = await fdTdsSlabApi.getById(user.branchid, id);
      const payload = (res as any)?.data;
      if (!payload) throw new Error("Slab not found.");
      const { slab, details: detailList } = payload;
      setName(slab.name ?? "");
      setNameSL(slab.nameSL ?? "");
      setDate(slab.date ? commonservice.splitDate(slab.date) : commonservice.getTodaysDate());
      setType(slab.type ?? 8);
      setWithPanCard(slab.withPanCard === 1);
      let counter = 1;
      setDetails((detailList ?? []).map((d: any) => ({
        rowKey: counter++,
        id: d.id ?? 0,
        fromAmount: String(d.fromAmount ?? ""),
        toAmount: String(d.toAmount ?? ""),
        intRate: String(d.intRate ?? ""),
      })));
      setRowCounter(counter);
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const clearEntryRow = () => {
    setEntryFromAmount("");
    setEntryToAmount("");
    setEntryIntRate("");
    setEditingRowKey(null);
  };

  const handleAddDetail = () => {
    const from = parseFloat(entryFromAmount);
    const to = parseFloat(entryToAmount);
    const rate = parseFloat(entryIntRate);
    if (isNaN(from) || from < 0) { Swal.fire({ icon: "warning", title: "Validation", text: "Enter a valid From Amount." }); return; }
    if (isNaN(to) || to <= 0) { Swal.fire({ icon: "warning", title: "Validation", text: "Enter a valid To Amount." }); return; }
    if (to <= from) { Swal.fire({ icon: "warning", title: "Validation", text: "To Amount must be greater than From Amount." }); return; }
    if (isNaN(rate) || rate <= 0) { Swal.fire({ icon: "warning", title: "Validation", text: "Interest Rate must be greater than 0." }); return; }
    if (editingRowKey !== null) {
      setDetails(prev => prev.map(r =>
        r.rowKey === editingRowKey ? { ...r, fromAmount: String(from), toAmount: String(to), intRate: String(rate) } : r
      ));
    } else {
      const key = rowCounter;
      setRowCounter(k => k + 1);
      setDetails(prev => [...prev, { rowKey: key, id: 0, fromAmount: String(from), toAmount: String(to), intRate: String(rate) }]);
    }
    if (validationErrors.details) setValidationErrors(p => ({ ...p, details: undefined }));
    clearEntryRow();
  };

  const handleEditRow = (row: DetailRow) => {
    setEntryFromAmount(row.fromAmount);
    setEntryToAmount(row.toAmount);
    setEntryIntRate(row.intRate);
    setEditingRowKey(row.rowKey);
  };

  const handleDeleteRow = (key: number) => {
    setDetails(prev => prev.filter(r => r.rowKey !== key));
    if (editingRowKey === key) clearEntryRow();
  };

  const handleReset = () => {
    if (isEditMode) { commonservice.handleResetNotAllowed(); return; }
    setName("");
    setNameSL("");
    setDate(commonservice.getTodaysDate());
    setType(8);
    setWithPanCard(false);
    setDetails([]);
    setValidationErrors({});
    clearEntryRow();
  };

  const handleSave = async () => {
    const errors: ValidationErrors = {};
    if (!name.trim()) errors.name = "Slab Name is required.";
    if (!date) errors.date = "Date is required.";
    if (details.length === 0) errors.details = "At least one detail row is required.";
    if (Object.keys(errors).length > 0) { setValidationErrors(errors); return; }

    const detailDTOs: FDTDSSlabDetailDTO[] = details.map(d => ({
      id: d.id || undefined,
      brId: user.branchid,
      slabID: slabId ?? 0,
      fromAmount: parseFloat(d.fromAmount),
      toAmount: parseFloat(d.toAmount),
      intRate: parseFloat(d.intRate),
    }));

    const dto: FDTDSSlabWithDetails = {
      slab: {
        id: isEditMode ? (slabId ?? undefined) : undefined,
        brId: user.branchid,
        name: name.trim(),
        nameSL: nameSL.trim() || undefined,
        date,
        type,
        withPanCard: withPanCard ? 1 : 0,
      },
      details: detailDTOs,
    };

    setSaving(true);
    try {
      const res = isEditMode && slabId
        ? await fdTdsSlabApi.update(slabId, dto)
        : await fdTdsSlabApi.create(dto);
      if (res.success) {
        await Swal.fire({ icon: "success", title: "Success!", text: res.message || "Saved successfully.", confirmButtonColor: "#3B82F6", timer: 1500, showConfirmButton: false });
        navigate(isEditMode ? "/fd-tds-slab/list" : "/fd-tds-slab");
      } else {
        throw new Error(res.message || "Save failed.");
      }
    } catch (err: any) {
      Swal.fire({ icon: "error", title: "Error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (hasError?: boolean) =>
    `w-full px-3 py-2.5 border-2 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm ${hasError ? "border-red-500" : "border-gray-200"}`;

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="w-full space-y-6">

            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <Layers className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {isEditMode ? "Modify" : "Add"} FD TDS Slab
                    </h1>
                    <p className="text-gray-600 text-sm">Configure TDS slab for fixed deposit</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(isEditMode ? "/fd-tds-slab/list" : "/fd-tds-slab")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-6 sm:p-8 space-y-6">

                  {/* Slab Information */}
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                      <Layers className="w-5 h-5" />
                      Slab Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => { setName(e.target.value); if (validationErrors.name) setValidationErrors(p => ({ ...p, name: undefined })); }}
                          className={inputCls(!!validationErrors.name)}
                          placeholder="Enter slab name"
                          maxLength={150}
                        />
                        {validationErrors.name && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.name}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Name (Secondary Language)</label>
                        <input
                          type="text"
                          value={nameSL}
                          onChange={e => setNameSL(e.target.value)}
                          className={inputCls()}
                          placeholder="Optional secondary name"
                          maxLength={150}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Date <span className="text-red-500">*</span>
                        </label>
                        <DatePicker
                          value={date}
                          onChange={v => { setDate(v); if (validationErrors.date) setValidationErrors(p => ({ ...p, date: undefined })); }}
                          workingDate={commonservice.getTodaysDate()}
                          className={inputCls(!!validationErrors.date)}
                        />
                        {validationErrors.date && (
                          <span className="text-red-500 text-xs flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.date}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <input
                          type="number"
                          value={type}
                          onChange={e => setType(Number(e.target.value))}
                          className={inputCls()}
                          min={0}
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-6">
                        <input
                          type="checkbox"
                          id="withPanCard"
                          checked={withPanCard}
                          onChange={e => setWithPanCard(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="withPanCard" className="text-sm font-medium text-gray-700 cursor-pointer">
                          With PAN Card
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* TDS Rate Details — entry form + table combined */}
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <h3 className="text-lg font-semibold text-green-800 mb-1 flex items-center gap-2">
                      <Layers className="w-5 h-5" />
                      TDS Rate Details
                    </h3>
                    <p className="text-sm text-green-700 mb-4">
                      Add amount ranges with their applicable TDS rates.
                    </p>

                    {validationErrors.details && (
                      <div className="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {validationErrors.details}
                      </div>
                    )}

                    {/* Entry inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">From Amount</label>
                        <input
                          type="number"
                          value={entryFromAmount}
                          onChange={e => setEntryFromAmount(e.target.value)}
                          className={inputCls()}
                          placeholder="0.00"
                          min={0}
                          step="0.01"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">To Amount</label>
                        <input
                          type="number"
                          value={entryToAmount}
                          onChange={e => setEntryToAmount(e.target.value)}
                          className={inputCls()}
                          placeholder="0.00"
                          min={0}
                          step="0.01"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Rate %</label>
                        <input
                          type="number"
                          value={entryIntRate}
                          onChange={e => setEntryIntRate(e.target.value)}
                          className={inputCls()}
                          placeholder="0.00"
                          min={0}
                          step="0.01"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddDetail}
                          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold text-sm shadow transition-all"
                        >
                          <Plus className="w-4 h-4" />
                          {editingRowKey !== null ? "Update" : "Add"}
                        </button>
                        {editingRowKey !== null && (
                          <button
                            onClick={clearEntryRow}
                            className="px-4 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Detail rows table */}
                    {details.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border border-gray-300">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                              <th className="border border-gray-300 px-4 py-3 text-center font-semibold w-14">S.No</th>
                              <th className="border border-gray-300 px-4 py-3 text-right font-semibold">From Amount</th>
                              <th className="border border-gray-300 px-4 py-3 text-right font-semibold">To Amount</th>
                              <th className="border border-gray-300 px-4 py-3 text-right font-semibold">Rate %</th>
                              <th className="border border-gray-300 px-4 py-3 text-center font-semibold w-28">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details.map((row, index) => (
                              <tr
                                key={row.rowKey}
                                className={`${index % 2 === 0 ? "bg-blue-50" : "bg-white"} hover:bg-blue-100 transition-colors ${editingRowKey === row.rowKey ? "ring-2 ring-blue-400 ring-inset" : ""}`}
                              >
                                <td className="border border-gray-300 px-4 py-3 text-center text-gray-600 font-medium">
                                  {index + 1}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-right text-gray-800">
                                  {Number(row.fromAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-right text-gray-800">
                                  {Number(row.toAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-right text-gray-800 font-medium">
                                  {Number(row.intRate).toFixed(2)}%
                                </td>
                                <td className="border border-gray-300 px-4 py-3">
                                  <div className="flex justify-center gap-3">
                                    <button
                                      onClick={() => handleEditRow(row)}
                                      className={`p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition ${editingRowKey === row.rowKey ? "bg-blue-100" : ""}`}
                                      title="Edit"
                                    >
                                      <FaEdit size={14} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRow(row.rowKey)}
                                      className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition"
                                      title="Delete"
                                    >
                                      <FaTrash size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400 border border-dashed border-green-300 rounded-lg bg-white">
                        <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No detail rows added yet. Fill in the fields above and click Add.</p>
                      </div>
                    )}
                  </div>

                </div>

                {/* Action Bar */}
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset Form
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
                    >
                      {saving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          {isEditMode ? "Update" : "Save"} Slab
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      }
    />
  );
};

export default FDTDSSlabForm;
