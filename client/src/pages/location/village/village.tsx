// import React from "react";
// import DashboardLayout from "../../../Common/Layout";
// import { useNavigate } from "react-router-dom";
// import VillageApiService from "../../../services/Village/Villageapi";
// import { toast, ToastContainer } from "react-toastify";


// const VillageMaster: React.FC = () => {
//   const navigate = useNavigate();

//   const [VillageCode, setVillageCode] = React.useState("");
//   const [VillageName, setVillageName] = React.useState("");
//   const [VillageNameSL, setVillageNameSL] = React.useState("");
//   const [error, setError] = React.useState("");
//   const [loading, setLoading] = React.useState(false);

//   const hindiRegex = /^[\u0900-\u097F\s.,!?]*$/;

//   const handleVillageNameSLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const inputText = e.target.value;
//     if (inputText === "" || hindiRegex.test(inputText)) {
//       setVillageNameSL(inputText);
//       setError("");
//     } else {
//       setError("Please enter only Hindi characters (Devanagari script).");
//     }
//   };

//   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//   e.preventDefault();
//   setLoading(true);
//   setError("");

//   try {
//     const response = await VillageApiService.add_new_Village(VillageName, VillageCode, VillageNameSL || "");
//     console.error("Response from API:", response);

//     if (response.success) {
//       toast.success(response.message, { position: "top-right" });
//     } else {
//       toast.error(response.message || "Failed to save Village.");
//     }
//   } catch (err: any) {
//     toast.error(
//   <div>
//     {err.message?.split('\n').map((line : any, idx : any) => (
//       <div key={idx}>{line}</div>
//     )) || "An unexpected error occurred."}
//   </div>
// );
//   } finally {
//     setLoading(false);
//   }
// };


//   return (
//     <>
//       <ToastContainer />
//       <DashboardLayout
//         mainContent={
//           <div className="bg-white shadow-md rounded-xl p-6">
//             <h2 className="text-2xl font-bold text-gray-800 mb-6">Village Master</h2>
//             <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
//               <div className="flex flex-col">
//                 <label htmlFor="VillageCode" className="mb-2 text-sm font-medium text-gray-700">
//                   Village Code
//                 </label>
//                 <input
//                   type="text"
//                   id="VillageCode"
//                   value={VillageCode}
//                   autoFocus = {true}
//                   onChange={(e) => setVillageCode(e.target.value)}
//                   required pattern="[a-zA-Z0-9]{2,10}"
//                   maxLength={10}
//                   className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>

//               <div className="flex flex-col">
//                 <label htmlFor="VillageName" className="mb-2 text-sm font-medium text-gray-700">
//                   Village Name
//                 </label>
//                 <input
//                   type="text"
//                   id="VillageName"
//                   value={VillageName}
//                   onChange={(e) => setVillageName(e.target.value)}
//                   required pattern="[a-zA-Z0-9]{2,10}"
//                   maxLength={50}
//                   className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>

//               <div className="flex flex-col md:col-span-2">
//                 <label htmlFor="VillageNameSL" className="mb-2 text-sm font-medium text-gray-700">
//                   Village Name (In SL)
//                 </label>
//                 <input
//                   type="text"
//                   id="VillageNameSL"
//                   value={VillageNameSL}
//                   onChange={handleVillageNameSLChange}
//                   maxLength={50}
//                   pattern="[A-Z0-9]"
//                   className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//                 {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
//               </div>

//               <div className="md:col-span-2 flex justify-end">
//                 <button
//                   type="submit"
//                   disabled={loading}
//                   className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200"
//                 >
//                   {loading ? "Saving..." : "Save Village"}
//                 </button>
//                 <button
//                   type="button"
//                   onClick={() => navigate("/Village-operations")}
//                   className="bg-blue-600 ms-2 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-all duration-200"
//                 >
//                   Close
//                 </button>
//               </div>
//             </form>
//           </div>
//         }
//       />
//     </>
//   );
// };

// export default VillageMaster;
