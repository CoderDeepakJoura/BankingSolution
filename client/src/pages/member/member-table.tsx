import React from "react";
import { FaEdit, FaTrash, FaEye, FaPhone, FaMapMarkerAlt, FaIdCard, FaCalendar } from "react-icons/fa";
import { CombinedMemberDTO } from "../../services/member/memberServiceapi";
import GenericTable, { Column } from "../../components/Location/GenericTable";

interface MemberTableProps {
  members: CombinedMemberDTO[];
  handleModify: (member: CombinedMemberDTO) => void;
  handleDelete: (member: CombinedMemberDTO) => void;
}

// Flattened type with FIXED DTO mapping
type FlatMember = {
  memberId: number;
  branchId: number;
  accountNumber: string;
  nominalMembershipNo: string;
  permanentMembershipNo?: string;
  fullName: string;
  memberName: string;
  relativeFullName: string;
  gender: number;
  genderText: string;
  dob: string;
  age: number;
  joiningDate: string;
  memberStatus: number;
  memberStatusText: string;
  phoneNo1: string;
  phoneNo2?: string;
  phoneType1: number;
  phoneTypeText: string;
  addressLine1: string;
  villageName?: string;
  panCardNo: string;
  aadhaarCardNo: string;
  relationName?: string;
  casteName?: string;
  occupationName?: string;
  nomineeCount: number;
  hasImages: boolean;
  memberPicExt?: string;
  memberSignExt?: string;
  _original: CombinedMemberDTO;
};

const MemberTable: React.FC<MemberTableProps> = ({
  members,
  handleModify,
  handleDelete,
}) => {
  // Helper functions
  const getGenderText = (gender: number): string => {
    switch (gender) {
      case 1: return "Male";
      case 2: return "Female";
      case 3: return "Trans Gender";
      default: return "Unknown";
    }
  };

  const getMemberStatusText = (status: number): string => {
    switch (status) {
      case 1: return "Active";
      case 2: return "Inactive";
      case 3: return "Suspended";
      case 4: return "Closed";
      default: return "Unknown";
    }
  };

  const getPhoneTypeText = (phoneType: number): string => {
    switch (phoneType) {
      case 1: return "Mobile";
      case 2: return "Landline";
      case 3: return "Office";
      default: return "Unknown";
    }
  };

  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // ✅ Flatten the DTOs with FIXED structure
  const flatMembers: FlatMember[] = members.map((dto) => {
    const member = dto.member;  // FIXED: Using proper DTO structure
    const documents = dto.documentDetails;  // FIXED: Using proper DTO structure
    const location = dto.locationDetails;   // FIXED: Using proper DTO structure
    const account = dto.accMaster;          // FIXED: Using proper DTO structure
    const nominees = dto.nominees || [];

    return {
      memberId: member?.id || 0,
      branchId: member?.branchId || 0,
      accountNumber: account?.accountNumber || "",  // FIXED: From AccMaster
      nominalMembershipNo: member?.nominalMembershipNo || "",
      permanentMembershipNo: member?.permanentMembershipNo || "",
      fullName: `${member?.memberName || ""}`.trim(),
      firstName: member?.memberName || "",
      relativeFullName: `${member?.relativeName || ""}`.trim(),
      gender: member?.gender || 0,
      genderText: getGenderText(member?.gender || 0),
      dob: member?.dob || "",
      age: calculateAge(member?.dob || ""),
      joiningDate: member?.joiningDate || "",
      memberStatus: member?.memberStatus || 1,
      memberStatusText: getMemberStatusText(member?.memberStatus || 1),
      phoneNo1: member?.phoneNo1 || "",
      phoneNo2: member?.phoneNo2 || "",  // FIXED: Added phone2
      phoneType1: member?.phoneType1 || 0,
      phoneTypeText: getPhoneTypeText(member?.phoneType1 || 0),
      addressLine1: location?.addressLine1 || "",
      villageName: location?.villageName || "", // This might need lookup
      panCardNo: documents?.panCardNo || "",
      aadhaarCardNo: documents?.aadhaarCardNo || "",
      relationName: member?.relationName || "", // This might need lookup
      casteName: member?.casteName || "", // This might need lookup  
      occupationName: member?.occupationName || "", // This might need lookup
      nomineeCount: nominees.length,
      hasImages: !!(documents?.memberPicExt && documents?.memberSignExt),
      memberPicExt: documents?.memberPicExt,
      memberSignExt: documents?.memberSignExt,
      _original: dto,
    };
  });

  // ✅ Columns with your exact requested structure
  const columns: Column<FlatMember>[] = [
    // Full Name Column
    {
      key: "fullName",
      header: "Full Name",
      render: (row) => (
        <div className="flex flex-col space-y-1 items-center text-center">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{row.fullName}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              row.gender === 1 ? "bg-blue-100 text-blue-800" :
              row.gender === 2 ? "bg-pink-100 text-pink-800" :
              "bg-purple-100 text-purple-800"
            }`}>
              {row.genderText}
            </span>
          </div>
          <div className="text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <FaCalendar className="w-3 h-3" />
              <span>Age: {row.age} years</span>
            </div>
          </div>
          
        </div>
      ),
    },
    
    // Relative Name Column  
    {
      key: "relativeFullName",
      header: "Relative Name",
      render: (row) => (
        <div className="flex flex-col space-y-1">
          <span className="text-sm font-medium text-gray-900">
            {row.relativeFullName}
          </span>
          {row.relationName && (
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
              {row.relationName}
            </span>
          )}
        </div>
      ),
    },

    // Account Number Column
    {
      key: "accountNumber", 
      header: "Account Number",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm font-medium text-blue-600">
            {row.accountNumber}
          </span>
          <span className="text-xs text-gray-500">
            Share Money A/c
          </span>
        </div>
      ),
    },

    // Membership Info Column
    {
      key: "membershipInfo",
      header: "Membership Info", 
      render: (row) => (
        <div className="flex flex-col space-y-1">
          {/* <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium text-green-600">
              {row.nominalMembershipNo}
            </span>
          </div> */}
          {row.permanentMembershipNo && (
            <span className="text-xs text-gray-500 font-mono">
              Perm: {row.permanentMembershipNo}
            </span>
          )}
          <div className="text-xs text-gray-600">
            Joined: {formatDate(row.joiningDate)}
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              row.memberStatus === 1
                ? "bg-green-100 text-green-800"
                : row.memberStatus === 2
                ? "bg-yellow-100 text-yellow-800"
                : row.memberStatus === 3
                ? "bg-orange-100 text-orange-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {row.memberStatusText}
          </span>
        </div>
      ),
    },

    // Contact Info Column
    {
      key: "contactInfo",
      header: "Contact Info",
      render: (row) => (
        <div className="flex flex-col space-y-2 items-center text-center">
          <div className="flex items-center gap-2">
            <FaPhone className="w-3 h-3 text-blue-500" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {row.phoneNo1}
              </span>
              <span className="text-xs text-gray-500">
                {row.phoneTypeText}
              </span>
            </div>
          </div>
          {row.phoneNo2 && (
            <div className="flex items-center gap-2">
              <FaPhone className="w-3 h-3 text-green-500" />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-900">
                  {row.phoneNo2}
                </span>
                <span className="text-xs text-gray-500">
                  Secondary
                </span>
              </div>
            </div>
          )}
          {row.addressLine1 && (
            <div className="flex items-start gap-2">
              <FaMapMarkerAlt className="w-3 h-3 text-green-500 mt-0.5" />
              <div className="text-xs text-gray-600">
                <div>{row.addressLine1}</div>
                {row.villageName && (
                  <div className="text-gray-500">{row.villageName}</div>
                )}
              </div>
            </div>
          )}
        </div>
      ),
    },

    // Actions Column
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => handleModify(row._original)}
            className="p-2 rounded-full border border-blue-500 text-blue-500 hover:bg-blue-50 transition-all duration-200 group"
            aria-label="Modify Member"
            title="Modify Member"
          >
            <FaEdit size={14} className="group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={() => handleDelete(row._original)}
            className="p-2 rounded-full border border-red-500 text-red-500 hover:bg-red-50 transition-all duration-200 group"
            aria-label="Delete Member"
            title="Delete Member"
          >
            <FaTrash size={14} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      ),
    },
  ];

  return (
   
     
      <GenericTable
        data={flatMembers}
        columns={columns}
        getKey={(row) => row.memberId}
      />

  );
};

export default MemberTable;
