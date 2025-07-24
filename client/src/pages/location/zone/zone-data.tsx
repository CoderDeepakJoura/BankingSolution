import React, { useEffect, useState } from "react";
import ZoneApiService, {
  Zone,
  ZoneFilter,
} from "../../../services/zone/zoneapi";
import DashboardLayout from "../../../Common/Layout";

const ZoneMaster: React.FC = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingSearchTerm, setPendingSearchTerm] = useState(""); // user input
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchData = async () => {
    try {
      const filter: ZoneFilter = { searchTerm, pageNumber, pageSize };
      const res = await ZoneApiService.fetchZones(filter);
      if (res.success) {
        setZones(res.zones);
        setTotalCount(res.totalCount);
      }
    } catch (err) {
      console.error("Error fetching zones:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [pageNumber, searchTerm]); // Triggers only when page or actual searchTerm changes

  const handleSearch = () => {
    setPageNumber(1); // Reset to first page when searching
    setSearchTerm(pendingSearchTerm.trim());
  };

  const handleModify = (zone: Zone) => {
    alert(`Modify Zone: ${zone.zonename}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <DashboardLayout
      mainContent={
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">Zone Master</h1>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Search by name or code"
              value={pendingSearchTerm}
              onChange={(e) => setPendingSearchTerm(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded w-1/2"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Search
            </button>
          </div>

          <div className="overflow-auto rounded shadow border">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-200 text-gray-700 uppercase font-semibold">
                <tr>
                  <th className="p-3">Zone Code</th>
                  <th className="p-3">Zone Name</th>
                  <th className="p-3">Zone Name SL</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id} className="border-t hover:bg-gray-50">
                    <td className="p-3">{zone.zonecode}</td>
                    <td className="p-3">{zone.zonename}</td>
                    <td className="p-3">{zone.zonenamesl}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleModify(zone)}
                        className="text-blue-600 hover:underline"
                      >
                        Modify
                      </button>
                    </td>
                  </tr>
                ))}
                {zones.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-gray-500">
                      No zones found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-600">
              Page {pageNumber} of {totalPages}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                disabled={pageNumber === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setPageNumber((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={pageNumber === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default ZoneMaster;
