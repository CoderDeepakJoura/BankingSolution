import React, { useEffect, useState, useRef } from "react";
import DashboardLayout from "../../../Common/Layout";
import { useNavigate } from "react-router-dom";
import AccountHeadApiService from "../../../services/accountHead/accountheadapi";
import Swal from "sweetalert2";
import { useSelector } from "react-redux";
import { RootState } from "../../../redux";
import Select from "react-select";
import {
  FaPlus,
  FaTimes,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaSave,
} from "react-icons/fa";

interface AccountHeadType {
  accountHeadTypeId: number;
  accountHeadTypeName: string;
}

interface AccountHead {
  accountHeadId: number;
  accountHeadName: string;
}

const AccountHeadMaster: React.FC = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.user);
  const [AccountHeadName, setAccountHeadName] = useState("");
  const [AccountHeadNameSL, setAccountHeadNameSL] = useState("");
  const [AccountHeadType, setAccountHeadType] = useState<number | "">("");
  const [accountHeadTypes, setAccountHeadTypes] = useState<AccountHeadType[]>(
    []
  );
  const [HeadCode, setHeadCode] = useState("");
  const [ParentId, setParentId] = useState("");
  const [parents, setParents] = useState<AccountHead[]>([]);
  const [IsAnnexure, setIsAnnexure] = useState(0);
  const [ShowInReport, setShowInReport] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;

  useEffect(() => {
    const fetchTypesAndParents = async () => {
      try {
        const res = await AccountHeadApiService.fetchaccountheadtypes(
          user.branchid
        );
        if (!res.success) throw new Error("Failed to load Account Head Types");
        const data: AccountHeadType[] = res.data || [];
        setAccountHeadTypes(data);

        const parentRes = await AccountHeadApiService.fetchaccountheads(
          user.branchid
        );
        if (!parentRes.success)
          throw new Error("Failed to load Parent Account Heads");
        const parentData: AccountHead[] = parentRes.data || [];
        setParents(parentData);
      } catch (err: any) {
        console.error(err);
        Swal.fire("Error", err.message || "Could not load types", "error");
      }
    };
    fetchTypesAndParents();
  }, [user.branchid]);

  const handleAccountHeadNameSLChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputText = e.target.value;
    if (inputText === "" || hindiRegex.test(inputText)) {
      setAccountHeadNameSL(inputText);
      setError("");
    } else {
      setError("Please enter only Hindi characters (Devanagari script).");
    }
  };

  const handleReset = () => {
    setAccountHeadName("");
    setAccountHeadNameSL("");
    setAccountHeadType("");
    setHeadCode("");
    setParentId("");
    setIsAnnexure(0);
    setShowInReport(0);
    setError("");
    inputRef.current?.focus();
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Enhanced validation for required fields
    if (!AccountHeadName.trim()) {
      setError("Account Head Name is required");
      return;
    }

    if (!HeadCode.trim()) {
      setError("Head Code is required");
      return;
    }

    if (AccountHeadType === "") {
      setError("Please select an Account Head Type");
      return;
    }

    setLoading(true);
    setError("");

    // Updated payload with correct property names matching backend DTO
    const payload = {
      AccountHeadName: AccountHeadName, // ✅ Correct casing
      AccountHeadNameSL: AccountHeadNameSL, // ✅ Correct casing
      ParentHeadCode: ParentId, // ✅ Correct casing
      AccountHeadType: String(AccountHeadType), // ✅ Correct casing
      HeadCode: HeadCode, // ✅ Fixed casing (was: headCode)
      IsAnnexure: String(IsAnnexure), // ✅ Correct casing
      ShowInReport: String(ShowInReport), // ✅ Correct casing
      BranchID: user.branchid, // ✅ Correct casing
      AccountHeadId: 0, // ✅ Correct casing
    };

    try {
      const response = await AccountHeadApiService.add_new_accounthead(payload);

      if (response.success) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: response.message,
          showConfirmButton: false,
          timer: 1500,
        }).then(() => {
          handleReset();
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: response.message || "Failed to save Account Head.",
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: "error",
        title: "An unexpected error occurred!",
        text: err.message || "Please check your network connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  const accountHeadTypeOptions = accountHeadTypes.map((type) => ({
    value: type.accountHeadTypeId,
    label: type.accountHeadTypeName,
  }));

  const parentOptions = parents.map((parent) => ({
    value: String(parent.accountHeadId),
    label: parent.accountHeadName,
  }));

  return (
    <DashboardLayout
      enableScroll={false}
      mainContent={
        <div className="bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <FaMapMarkerAlt className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Account Head Master
                    </h1>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/AccountHead-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium text-sm sm:text-base"
                >
                  <FaArrowLeft className="text-sm" />
                  Back to Operations
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
                    <FaPlus className="text-white text-sm" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                      Create New Account Head
                    </h2>
                    <p className="text-sm text-gray-600">
                      Fill in the Account Head details below
                    </p>
                  </div>
                </div>
              </div>

              <form className="p-6 sm:p-8" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
                  <div className="flex flex-col">
                    <label
                      htmlFor="AccountHeadName"
                      className="text-sm font-semibold text-gray-700 mb-2"
                    >
                      Account Head Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="AccountHeadName"
                      ref={inputRef}
                      value={AccountHeadName}
                      onChange={(e) => setAccountHeadName(e.target.value)}
                      required
                      pattern="^(?! )[A-Za-z0-9]+( [A-Za-z0-9]+)*$"
                      autoFocus={true}
                      maxLength={50}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                      placeholder="Enter Account Head Name"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label
                      htmlFor="AccountHeadNameSL"
                      className="text-sm font-semibold text-gray-700 mb-2"
                    >
                      Account Head Name (SL){" "}
                      <span className="text-gray-500 text-xs">(Hindi)</span>
                    </label>
                    <input
                      type="text"
                      id="AccountHeadNameSL"
                      value={AccountHeadNameSL}
                      onChange={handleAccountHeadNameSLChange}
                      maxLength={50}
                      className={`w-full px-4 py-2 border-2 rounded-lg outline-none ${
                        error && error.includes("Hindi")
                          ? "border-red-300 focus:border-red-500"
                          : "border-gray-200 focus:border-emerald-500"
                      }`}
                      placeholder="Enter Hindi Name"
                      lang="hi"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label
                      htmlFor="AccountHeadType"
                      className="text-sm font-semibold text-gray-700 mb-2"
                    >
                      Account Head Type <span className="text-red-500">*</span>
                    </label>
                    <Select
                      id="AccountHeadType"
                      options={accountHeadTypeOptions}
                      value={accountHeadTypeOptions.find(
                        (option) => option.value === AccountHeadType) || null
                      }
                      onChange={(selected) =>
                        setAccountHeadType(selected ? selected.value : "")
                      }
                      placeholder="Select Type"
                      isClearable
                      required
                      className="text-sm"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label
                      htmlFor="HeadCode"
                      className="text-sm font-semibold text-gray-700 mb-2"
                    >
                      Head Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="HeadCode"
                      value={HeadCode}
                      inputMode="numeric"
                      minLength={12}
                      maxLength={12}
                      pattern="^\d+$"
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(
                          /[^0-9]/g,
                          ""
                        ); // strip non-numeric
                        setHeadCode(numericValue);
                      }}
                      required
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                      placeholder="Enter Head Code"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label
                      htmlFor="ParentId"
                      className="text-sm font-semibold text-gray-700 mb-2"
                    >
                      Parent Id
                    </label>
                    <Select
                      id="ParentId"
                      options={parentOptions}
                      value={parentOptions.find(
                        (option) => option.value === ParentId
                      ) || null}
                      onChange={(selected) =>
                        setParentId(selected ? selected.value : "")
                      }
                      placeholder="Select Parent Id"
                      isClearable
                      className="text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      id="IsAnnexure"
                      checked={IsAnnexure === 1}
                      onChange={(e) => setIsAnnexure(e.target.checked ? 1 : 0)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="IsAnnexure"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Show in Annexure
                    </label>
                  </div>

                  <div className="flex items-center gap-2 mt-6">
                    <input
                      type="checkbox"
                      id="ShowInReport"
                      checked={ShowInReport === 1}
                      onChange={(e) =>
                        setShowInReport(e.target.checked ? 1 : 0)
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="ShowInReport"
                      className="text-sm font-semibold text-gray-700"
                    >
                      Show in Report
                    </label>
                  </div>
                </div>

                {/* Error display */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 mt-6">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all"
                  >
                    <FaTimes />
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <FaSave />
                        Save Account Head
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default AccountHeadMaster;
