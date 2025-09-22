import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import Swal from "sweetalert2";
import { FaSearch, FaTimes, FaPlus, FaBoxOpen } from "react-icons/fa";
import DashboardLayout from "../../Common/Layout";
import { X } from "lucide-react"; // Importing a close icon from lucide-react

interface CRUDMasterProps<T> {
  // Functions to perform API operations.
  fetchData: (filter: {
    searchTerm: string;
    pageNumber: number;
    pageSize: number;
  }) => Promise<{
    success: boolean;
    data: T[];
    totalCount: number;
    message?: string;
  }>;
  addEntry: () => Promise<void>;
  modifyEntry: (item: T) => Promise<void>;
  deleteEntry: (item: T) => Promise<void>;

  // Configuration for the component's UI and data display.
  pageTitle: string;
  addLabel: string;
  searchPlaceholder: string;
  renderTable: (
    data: T[],
    handleModify: (item: T) => void,
    handleDelete: (item: T) => void
  ) => ReactNode;

  // A function to get a unique key from each item.
  getKey: (item: T) => string | number;

  // Optional function to handle the close action.
  onClose?: () => void;
}

const CRUDMaster = <T,>({
  fetchData,
  addEntry,
  modifyEntry,
  deleteEntry,
  pageTitle,
  addLabel,
  searchPlaceholder,
  renderTable,
  getKey,
  onClose,
}: CRUDMasterProps<T>) => {
  const [data, setData] = useState<T[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingSearchTerm, setPendingSearchTerm] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetchData({ searchTerm, pageNumber, pageSize });
      if (res.success) {
        setData(res.data);
        setTotalCount(res.totalCount);
      } else {
        setError(res.message || "Failed to fetch data.");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // fetch was aborted -> silently ignore
        return;
      }

      if (err instanceof Error) {
        setError(err.message || "An unexpected error occurred.");
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsLoading(false);
      setIsSearchLoading(false);
    }
  }, [pageNumber, searchTerm, pageSize, fetchData]);

  useEffect(() => {
    loadData();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [loadData]);

  const handleSearch = () => {
    setIsSearchLoading(true);
    setPageNumber(1);
    setSearchTerm(pendingSearchTerm.trim());
  };

  const handleClearSearch = () => {
    setPendingSearchTerm("");
    setSearchTerm("");
    setPageNumber(1);
    setIsSearchLoading(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
    else if (e.key === "Escape") handleClearSearch();
  };

  const handleRetry = () => {
    loadData();
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const startEntry = (pageNumber - 1) * pageSize + 1;
  const endEntry = Math.min(startEntry + data.length - 1, totalCount);

  const getPageNumbers = () => {
    const maxPagesToShow = 5;
    const startPage = Math.max(1, pageNumber - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    return Array.from(
      { length: endPage - startPage + 1 },
      (_, i) => startPage + i
    );
  };

  return (
    <DashboardLayout
      mainContent={
        <div className="p-4 sm:p-8 bg-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {pageTitle}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => addEntry().then(loadData)}
                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-full shadow-md hover:bg-green-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <FaPlus className="mr-2" /> {addLabel}
              </button>

              <button
                onClick={onClose}
                className="flex items-center bg-red-600 text-white px-4 py-2 rounded-full shadow-md hover:bg-red-700 transition-colors font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Close"
                title="Close"
              >
                <X className="mr-2" /> Close
              </button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6">
            <div className="relative flex items-center">
              <FaSearch className="absolute left-3 text-gray-500" />
              <input
                id="search-input"
                type="text"
                placeholder={searchPlaceholder}
                value={pendingSearchTerm}
                onChange={(e) => setPendingSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                ref={searchInputRef}
                className="w-full pl-10 pr-12 py-2 rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              {pendingSearchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="bg-red-100 text-red-700 border border-red-300 rounded-lg p-4 mb-6 text-center font-medium">
              {error}
              <button
                onClick={handleRetry}
                className="ml-3 text-blue-600 underline hover:text-blue-800"
              >
                Retry
              </button>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-200 rounded-lg h-12 w-full"
                ></div>
              ))}
            </div>
          ) : data.length > 0 ? (
            renderTable(
              data,
              (item) => modifyEntry(item).then(loadData),
              (item) => deleteEntry(item).then(loadData)
            )
          ) : (
            <div className="flex flex-col justify-center items-center py-12 text-gray-500">
              <FaBoxOpen className="text-4xl mb-2" />
              <span>No data found</span>
            </div>
          )}
          {totalCount > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 bg-white p-3 rounded-lg shadow-sm">
              <div className="text-sm text-gray-600">
                Showing <strong>{startEntry}</strong> -{" "}
                <strong>{endEntry}</strong> of <strong>{totalCount}</strong>
              </div>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageNumber(1);
                }}
                className="text-sm border rounded-full px-3 py-1 shadow-sm"
              >
                {[10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPageNumber(1)}
                  disabled={pageNumber === 1}
                  className="px-3 py-1 border rounded-full text-sm disabled:opacity-50"
                >
                  « First
                </button>
                <button
                  onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                  disabled={pageNumber === 1}
                  className="px-3 py-1 border rounded-full text-sm disabled:opacity-50"
                >
                  ‹ Prev
                </button>
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => setPageNumber(page)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      page === pageNumber
                        ? "bg-blue-600 text-white"
                        : "border bg-white"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setPageNumber((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={pageNumber >= totalPages}
                  className="px-3 py-1 border rounded-full text-sm disabled:opacity-50"
                >
                  Next ›
                </button>
                <button
                  onClick={() => setPageNumber(totalPages)}
                  disabled={pageNumber >= totalPages}
                  className="px-3 py-1 border rounded-full text-sm disabled:opacity-50"
                >
                  Last »
                </button>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
};

export default CRUDMaster;
