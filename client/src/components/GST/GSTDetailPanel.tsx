import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import Select from "react-select";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import commonservice from "../../services/common/commonservice";
import loanExpenseApi, {
  GSTDetailDTO,
  TaxLineDTO,
  BillBookForExpenseDTO,
  ServiceLookupDTO,
} from "../../services/vouchers/loan/loanExpenseApi";

interface StateOption {
  stateId: number;
  stateName: string;
}

interface GSTDetailPanelProps {
  date: string;
  crAccountId: number;
  expenseAmount: number;
  value: GSTDetailDTO | null;
  onChange: (v: GSTDetailDTO | null, totalTax: number) => void;
  onHasService?: (has: boolean) => void;
}

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "40px",
    borderWidth: "2px",
    borderColor: state.isFocused ? "#3b82f6" : "#e5e7eb",
    borderRadius: "0.5rem",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59,130,246,0.2)" : "none",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    "&:hover": { borderColor: "#3b82f6" },
  }),
  option: (base: any) => ({ ...base, cursor: "pointer" }),
};

const SUPPLY_TYPES = [
  { value: 1, label: "Within State" },
  { value: 2, label: "Inter State" },
];

const GSTDetailPanel: React.FC<GSTDetailPanelProps> = ({
  date, crAccountId, expenseAmount, onChange, onHasService,
}) => {
  const user = useSelector((state: RootState) => state.user);
  const branchId = user.branchid;
  const branchGstNo = user.branchGstNo;
  const branchStateId = user.branchStateId;

  const onChangeRef = useRef(onChange);
  const onHasServiceRef = useRef(onHasService);
  useLayoutEffect(() => { onChangeRef.current = onChange; onHasServiceRef.current = onHasService; });

  const [billBooks, setBillBooks] = useState<BillBookForExpenseDTO[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [serviceLookup, setServiceLookup] = useState<ServiceLookupDTO | null>(null);
  const [supplyTypeId, setSupplyTypeId] = useState<number>(1);
  const [stateId, setStateId] = useState<number>(branchStateId ?? 0);
  const [selectedBillBook, setSelectedBillBook] = useState<BillBookForExpenseDTO | null>(null);
  const [billNo, setBillNo] = useState<number>(0);
  const [gstinNo, setGstinNo] = useState<string>(branchGstNo ?? "");

  // Load bill books, states and branch GST info in parallel — apply state after all data is ready
  useEffect(() => {
    if (!branchId) return;
    Promise.all([
      loanExpenseApi.getBillBooks(branchId),
      commonservice.get_states(),
      loanExpenseApi.getBranchGstInfo(branchId),
    ]).then(([bbRes, statesRes, gstRes]) => {
      const items: BillBookForExpenseDTO[] = (bbRes as any).items ?? [];
      setBillBooks(items);
      if (items.length > 0) {
        setSelectedBillBook(items[0]);
        setBillNo(items[0].nextBillNo);
      }
      if (statesRes.success) setStates((statesRes as any).data ?? []);
      const gstData = (gstRes as any).data;
      if (gstData?.stateId > 0) setStateId(gstData.stateId);
      if (gstData?.gstNo) setGstinNo(gstData.gstNo);
    });
  }, [branchId]);

  // Fetch service lookup when account/date/supplyType changes
  useEffect(() => {
    if (!crAccountId || !date || !branchId) {
      setServiceLookup(null);
      onChangeRef.current(null, 0);
      onHasServiceRef.current?.(false);
      return;
    }
    loanExpenseApi
      .getServiceLookup(crAccountId, branchId, date, supplyTypeId)
      .then((res) => {
        const data: ServiceLookupDTO = (res as any).data;
        if (!data?.hasService) {
          setServiceLookup(null);
          onChangeRef.current(null, 0);
          onHasServiceRef.current?.(false);
        } else {
          setServiceLookup(data);
          onHasServiceRef.current?.(true);
        }
      })
      .catch(() => {
        setServiceLookup(null);
        onChangeRef.current(null, 0);
        onHasServiceRef.current?.(false);
      });
  }, [crAccountId, date, supplyTypeId, branchId]);

  // Emit updated GST detail whenever relevant state changes
  useEffect(() => {
    if (!serviceLookup?.hasService || !selectedBillBook) {
      onChangeRef.current(null, 0);
      return;
    }
    const taxLines: TaxLineDTO[] = serviceLookup.taxLines.map((tl) => ({
      ...tl,
      taxAmt: Math.round((expenseAmount * tl.perc) / 100 * 100) / 100,
    }));
    const totalTax = taxLines.reduce((s, tl) => s + tl.taxAmt, 0);
    const gstDetail: GSTDetailDTO = {
      billBookId: selectedBillBook.id,
      billNo,
      stateId,
      supplyTypeId,
      gstinNo: gstinNo || undefined,
      serviceId: serviceLookup.serviceId,
      serviceName: serviceLookup.serviceName,
      taxId: serviceLookup.taxId,
      taxName: serviceLookup.taxName,
      taxLines,
    };
    onChangeRef.current(gstDetail, totalTax);
  }, [serviceLookup, expenseAmount, selectedBillBook, billNo, stateId, supplyTypeId, gstinNo]);

  if (!serviceLookup?.hasService) return null;

  const taxLines: TaxLineDTO[] = serviceLookup.taxLines.map((tl) => ({
    ...tl,
    taxAmt: Math.round((expenseAmount * tl.perc) / 100 * 100) / 100,
  }));
  const totalTax = taxLines.reduce((s, tl) => s + tl.taxAmt, 0);

  const stateOptions = states.map((s) => ({ value: s.stateId, label: s.stateName }));

  return (
    <div className="border-2 border-blue-200 rounded-xl p-4 bg-blue-50 mt-4">
      <h3 className="font-semibold text-blue-800 mb-3 text-sm uppercase tracking-wide">
        GST Detail
      </h3>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {/* Bill Book */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bill Book</label>
          <Select
            options={billBooks.map((bb) => ({
              value: bb.id,
              label: bb.name ?? `Book #${bb.id}`,
            }))}
            value={
              selectedBillBook
                ? {
                    value: selectedBillBook.id,
                    label: selectedBillBook.name ?? `Book #${selectedBillBook.id}`,
                  }
                : null
            }
            onChange={(sel) => {
              const bb = billBooks.find((b) => b.id === sel?.value) ?? null;
              setSelectedBillBook(bb);
              if (bb) setBillNo(bb.nextBillNo);
            }}


            styles={selectStyles}
            placeholder="Select bill book..."
          />
        </div>

        {/* Bill No */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Bill No</label>
          <input
            type="number"
            value={billNo || ""}
            onChange={(e) => setBillNo(Number(e.target.value))}
            className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Supply Type */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Supply Type</label>
          <Select
            options={SUPPLY_TYPES}
            value={SUPPLY_TYPES.find((s) => s.value === supplyTypeId) ?? null}
            onChange={(sel) => setSupplyTypeId(sel?.value ?? 1)}


            styles={selectStyles}
          />
        </div>

        {/* State */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
          <Select
            options={stateOptions}
            value={stateOptions.find((o) => o.value === stateId) ?? null}
            onChange={(sel) => setStateId(sel?.value ?? 0)}


            styles={selectStyles}
            placeholder="Select state..."
          />
        </div>

        {/* GSTIN */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN No</label>
          <input
            type="text"
            value={gstinNo}
            onChange={(e) => setGstinNo(e.target.value.toUpperCase())}
            maxLength={15}
            className="w-full h-10 px-3 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none uppercase"
            placeholder="GSTIN (optional)"
          />
        </div>

        {/* Service (read-only) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Service</label>
          <input
            type="text"
            value={serviceLookup.serviceName ?? ""}
            readOnly
            className="w-full h-10 px-3 border-2 border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
          />
        </div>

        {/* Tax (read-only) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tax</label>
          <input
            type="text"
            value={serviceLookup.taxName ?? ""}
            readOnly
            className="w-full h-10 px-3 border-2 border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Tax Lines Table */}
      {taxLines.length > 0 && (
        <div className="mt-3">
          <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-blue-100 text-blue-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Tax Type</th>
                <th className="px-3 py-2 text-right font-medium">Rate (%)</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {taxLines.map((tl) => (
                <tr key={tl.taxTypeId} className="border-t border-gray-200 bg-white">
                  <td className="px-3 py-2">{tl.taxTypeName}</td>
                  <td className="px-3 py-2 text-right">{tl.perc.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium">{tl.taxAmt.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-blue-300 bg-blue-50">
                <td className="px-3 py-2 font-semibold text-blue-800" colSpan={2}>
                  Total Tax
                </td>
                <td className="px-3 py-2 text-right font-bold text-blue-800">
                  {totalTax.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GSTDetailPanel;
