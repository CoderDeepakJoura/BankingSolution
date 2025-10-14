import React, { useState, useRef, useEffect } from "react";
import { encryptId, decryptId } from "../../utils/encryption";
import { useFormValidation } from "../../services/Validations/member/useFormValidation";
import { ValidationSummary } from "../../components/Validations/ValidationSummary";
import { FormField } from "../../components/Validations/FormField";
import Swal from "sweetalert2";
import { ValidationError } from "../../services/Validations/validation";
import Select from "react-select";
import commonservice, {
  AccountMaster,
} from "../../services/common/commonservice";
import { useSelector } from "react-redux";
import { RootState } from "../../redux";
import memberAPIService, {
  CombinedMemberDTO,
  MemberDTO,
  MemberDocDetailsDTO,
  MemberLocationDetailsDTO,
  VoucherDTO,
  MemberNomineeDetailsDTO,
} from "../../services/member/memberServiceapi";
import {
  User,
  Users,
  MapPin,
  Phone,
  CreditCard,
  Calendar,
  Building,
  Home,
  Plus,
  Minus,
  Save,
  RotateCcw,
  ArrowLeft,
  UserCheck,
  Globe,
  Info,
  FileText,
  Upload,
  X,
  Image as ImageIcon,
  Settings,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardLayout from "../../Common/Layout";
import ZoneApiService from "../../services/location/zone/zoneapi";

interface ZoneInfo {
  zoneId: number;
  zoneName: string;
}
interface OptionType {
  value: number;
  label: string;
}

// Updated File Upload Component for single file with title
const FileUploadComponent = ({
  onFileSelect,
  acceptedTypes = "image/*",
  maxSize = 5 * 1024 * 1024,
  title = "Upload Picture",
  uploadedFile,
  onRemoveFile,
  isRequired = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles([files[0]]); // Only take first file
    }
  };

  const handleFiles = (files: any) => {
    const file = files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      Swal.fire({
        icon: "error",
        title: "Invalid File Type",
        text: "Please upload only image files (PNG, JPG, JPEG)",
      });
      return;
    }

    if (file.size > maxSize) {
      Swal.fire({
        icon: "error",
        title: "File Too Large",
        text: `File size must be less than ${maxSize / (1024 * 1024)}MB`,
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newFile = {
        id: Date.now(),
        name: file.name,
        size: file.size,
        type: file.type,
        preview: e.target.result,
        file: file,
      };

      if (onFileSelect) onFileSelect(newFile);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">
              {title} {isRequired && <span className="text-red-500">*</span>}
            </p>
            <p className="text-xs text-gray-500">
              Click to browse or drag and drop image here
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PNG, JPG, JPEG up to {maxSize / (1024 * 1024)}MB
            </p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={(e) => handleFiles(Array.from(e.target.files))}
        className="hidden"
      />

      {/* Uploaded File Preview */}
      {uploadedFile && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded File:</h4>
          <div className="relative inline-block">
            <div className="w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <img
                src={uploadedFile.preview}
                alt={uploadedFile.name}
                className="w-full h-full object-cover"
              />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onRemoveFile) onRemoveFile();
              }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            <p className="text-xs text-gray-600 mt-1 truncate">
              {uploadedFile.name}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Age calculation utility
const calculateAge = (dob: any) => {
  if (!dob) return "";
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age.toString();
};

// Interfaces
export interface Relation {
  relationId: number;
  description: string;
}
export interface Village {
  villageId: number;
  villageName: string;
}

interface CasteInfo {
  casteId: number;
  casteDescription: string;
}
interface OccupationInfo {
  occupationId: number;
  description: string;
}

const MemberMaster = () => {
  const navigate = useNavigate();
  const { memberId: encryptedId } = useParams<{ memberId?: string }>();
  const memberId = encryptedId ? decryptId(encryptedId) : null;
  const accountNumberRef = useRef(null);
  const refDebitAccount = useRef(null);
  const nominalMemNoRef = useRef(null);
  const permanentMemNoRef = useRef(null);
  const [smAccId, setSMAccId] = useState<number>(0);
  const isEditMode = !!memberId;
  const aadhaarRef = useRef(null);
  const PANref = useRef(null);
  const [membershipType, setMembershipType] = useState<string>(""); // 'P' or 'N'
  const user = useSelector((state: RootState) => state.user);
  const { errors, validateForm, clearErrors, markFieldTouched } =
    useFormValidation();
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [relationId, setRelationId] = useState<number | "">("");
  const [relations, setRelations] = useState<Relation[]>([]);
  const [villageId1, setVillageId1] = useState<number | "">("");
  const [villages1, setVillages] = useState<Village[]>([]);
  const [villageId2, setVillageId2] = useState<number | "">("");
  const [zone1, setZone1] = useState<number | "">("");
  const [pinCode1, setPinCode1] = useState<number | "">("");
  const [pinCode2, setPinCode2] = useState<number | "">("");
  const [zone2, setZone2] = useState<number | "">("");
  const [tehsil1, setTehsil1] = useState<number | "">("");
  const [tehsil2, setTehsil2] = useState<number | "">("");
  const [postOffice1, setPostOffice1] = useState<number | "">("");
  const [postOffice2, setPostOffice2] = useState<number | "">("");
  const [thana1, setThana1] = useState<number | "">("");
  const [thana2, setThana2] = useState<number | "">("");
  const [casteId, setCasteId] = useState<number | "">("");
  const [casteInfo, setCaste] = useState<CasteInfo[]>([]);
  const [category, setCategory] = useState<number | "">("");
  const [occupationInfo, setOccupation] = useState<OccupationInfo[]>([]);
  const [occupationId, setOccupationId] = useState<number | "">("");
  const [generalAccInfo, setGeneralAccounts] = useState<AccountMaster[]>([]);
  const [debitAccount, setDebitAccountId] = useState<number | "">("");
  // Image upload states
  const [memberPhoto, setMemberPhoto] = useState(null);
  const [memberSignature, setMemberSignature] = useState(null);
  const [shouldLoadData, setShouldLoadData] = useState(true);
  const [zones, setZones] = useState<ZoneInfo[]>([]);

  useEffect(() => {
    const fetchZoneData = async () => {
      const zonesRes = await ZoneApiService.getAllZones(user.branchid);
      setZones(zonesRes.data || []);
    }
    // Only set default if NOT in edit mode and membership type is empty
    if (!isEditMode && !membershipType) {
      setMembershipType("P");
    }
    fetchZoneData();
  }, [isEditMode, user.branchid]);
  // ✅ NEW: Fetch member data if in edit mode
  useEffect(() => {
    const fetchMemberData = async () => {
      if (isEditMode && memberId) {
        try {
          Swal.fire({
            title: "Loading Member Data...",
            text: "Please wait",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });

          const response = await memberAPIService.getMemberById(
            parseInt(memberId),
            user.branchid
          );

          if (response.success && response.data) {
            const data = response.data;
            // Populate member data
            setMemberData({
              accountNumber: data.accMaster?.accountNumber || "",
              defAreaBrId: data.member?.defAreaBrId?.toString() || "",
              memberType: data.member?.memberType?.toString() || "2",
              nominalMembershipNo: data.member?.nominalMembershipNo || "",
              permanentMembershipNo: data.member?.permanentMembershipNo || "",
              memberName: data.member?.memberName || "",
              memberNameSL: data.member?.memberNameSL || "",
              relativeName: data.member?.relativeName || "",
              relationId: data.member?.relationId?.toString() || "",
              gender: data.member?.gender?.toString() || "",
              dob: commonservice.splitDate(data.member?.dob) || "",
              casteId: data.member?.casteId?.toString() || "",
              age: calculateAge(data.member?.dob || ""),
              joiningDate:
                commonservice.splitDate(data.member?.joiningDate) || "",
              occupationId: data.member?.occupationId?.toString() || "",
              thana: "",
              addressLine1: data.locationDetails?.addressLine1 || "",
              addressLineSL1: data.locationDetails?.addressLineSL1 || "",
              villageId1: data.locationDetails?.villageId1?.toString() || "",
              po1: "",
              tehsil1: "",
              addressLine2: data.locationDetails?.addressLine2 || "",
              addressLineSL2: data.locationDetails?.addressLineSL2 || "",
              villageId2: data.locationDetails?.villageId2?.toString() || "",
              po2: "",
              tehsil2: "",
              phoneType1: data.member?.phoneType1?.toString() || "",
              phonePrefix1: data.member?.phonePrefix1 || "+91",
              phoneNo1: data.member?.phoneNo1 || "",
              phoneType2: data.member?.phoneType2?.toString() || "",
              phonePrefix2: data.member?.phonePrefix2 || "+91",
              phoneNo2: data.member?.phoneNo2 || "",
              panCardNo: data.documentDetails?.panCardNo || "",
              aadhaarCardNo: data.documentDetails?.aadhaarCardNo || "",
              zoneId: "",
              id: Number(memberId ?? 0),
              email1: data.member?.email1 || "",
              email2: data.member?.email2 || "",
            });

            // Set dropdown states
            setRelationId(data.member?.relationId || "");
            setCasteId(data.member?.casteId || "");
            setOccupationId(data.member?.occupationId || "");
            setVillageId1(data.locationDetails?.villageId1 || "");
            setVillageId2(data.locationDetails?.villageId2 || "");
            setDebitAccountId(data.voucher?.debitAccountId || "");
            fetchLocationData(data.locationDetails?.villageId1, 0);
            fetchLocationData(0, data.locationDetails?.villageId2);
            setSMAccId(data.accMaster?.smAccId || 0);
            // Set voucher data
            setVoucherData({
              smAmount: data.voucher?.smAmount?.toString() || "",
              admissionFeesAccount: "", // Will be set by settings
              admissionFeeAmount:
                data.voucher?.admissionFeeAmount?.toString() || "",
              debitAccountId: data.voucher?.debitAccountId?.toString() || "",
              debitAmount: data.voucher?.totalDebit?.toString() || "",
              narration: data.voucher?.voucherNarration || "",
              openingAmount: data.voucher.openingAmount?.toString() || "",
            });

            setDebitAccountId(data.voucher?.debitAccountId ?? 0);

            // Set nominees
            if (data.nominees && data.nominees.length > 0) {
              setNominees(
                data.nominees.map((nom) => ({
                  id: nom.id || Date.now(),
                  nomineeName: nom.nomineeName || "",
                  relation: nom.relationId || 0,
                  relationWithMember: nom.relationWithMember || 0,
                  age: nom.age?.toString() || "",
                  isMinor: nom.isMinor === 1,
                  dob:
                    (nom.dob != null ? commonservice.splitDate(nom.dob) : "") ||
                    "",
                  nameOfGuardian: nom.nameOfGuardian || "",
                  nameOfGuardianSL: nom.nameOfGuardianSL || "",
                  nominationDate:
                    (nom.nominationDate != null
                      ? commonservice.splitDate(nom.nominationDate)
                      : "") || "",
                  aadhaarCardNo: nom.aadhaarCardNo || "",
                  PANCardNo: nom.panCardNo || "",
                  nomRelativeName: nom.nomRelativeName || "",
                  percentageShare: Number(nom.percentageShare) || 0
                }))
              );
            }

            // Add cache-busting timestamp to photo URL
            if (data.documentDetails?.memberPicExt) {
              const fileName = `member_${memberId}_picture${data.documentDetails.memberPicExt}`;
              const cacheBuster = `?t=${Date.now()}`; // Cache-busting query parameter
              const photoUrl =
                commonservice.getImageUrl(fileName, "Pictures") + cacheBuster;
              setMemberPhoto({
                id: Date.now(),
                name: `photo${data.documentDetails.memberPicExt}`,
                preview: photoUrl,
                file: null,
              });
            }

            // Add cache-busting timestamp to signature URL
            if (data.documentDetails?.memberSignExt) {
              const fileName = `member_${memberId}_signature${data.documentDetails.memberSignExt}`;
              const cacheBuster = `?t=${Date.now()}`; // Cache-busting query parameter
              const signUrl =
                commonservice.getImageUrl(fileName, "Signatures") + cacheBuster;
              setMemberSignature({
                id: Date.now(),
                name: `sign${data.documentDetails.memberSignExt}`,
                preview: signUrl,
                file: null,
              });
            }

            // Load category from caste
            if (data.member?.casteId) {
              fetchCategoryFromCaste(data.member.casteId);
            }

            if (data.member.nominalMembershipNo != "") setMembershipType("N");
            else setMembershipType("P");

            Swal.close();
          } else {
            Swal.fire("Error", "Member not found", "error");
            navigate("/member");
          }
        } catch (error: any) {
          console.error("Error fetching member:", error);
          Swal.fire(
            "Error",
            error.message || "Failed to load member data",
            "error"
          );
          navigate("/member");
        }
      }
    };

    fetchMemberData();
  }, [memberId, isEditMode, user.branchid, navigate]);
 
  const zoneData: OptionType[] = zones.map((zone) => ({
    value: zone.zoneId,
    label: zone.zoneName,
  }));
  useEffect(() => {
    const fetchAutoCompleteData = async () => {
      try {
        const res = await commonservice.relation_info();
        const data: Relation[] = res.data || [];
        setRelations(data);

        const villages = await commonservice.village_info(user.branchid);
        const villageData: Village[] = villages.data || [];
        setVillages(villageData);

        const castes = await commonservice.caste_Info(user.branchid);
        const casteData: CasteInfo[] = castes.data || [];
        setCaste(casteData);

        const occupations = await commonservice.occupation_Info(user.branchid);
        const occupationData: OccupationInfo[] = occupations.data || [];
        setOccupation(occupationData);

        const general_accounts = await commonservice.general_accmasters_info(
          user.branchid
        );
        setGeneralAccounts(general_accounts.data || []);

        const settings = await commonservice.settings(user.branchid);
        setVoucherData((prevData) => ({
          ...prevData,
          admissionFeesAccount:
            settings.data.generalSettings.admissionFeeAccName || "",
          admissionFeeAmount:
            settings.data.generalSettings.admissionFeeAmount || 0,
        }));
      } catch (err: any) {
        console.error(err);
        Swal.fire("Error", err.message || "Could not load types", "error");
      }
    };
    fetchAutoCompleteData();
  }, [user.branchid]);
  const [memberData, setMemberData] = useState({
    accountNumber: "",
    defAreaBrId: "",
    memberType: "2",
    nominalMembershipNo: "",
    permanentMembershipNo: "",
    memberName: "",
    memberNameSL: "",
    relativeName: "",
    relationId: "",
    gender: "",
    dob: commonservice.getTodaysDate(),
    casteId: "",
    age: "", // Made readonly, calculated from DOB
    joiningDate: commonservice.getTodaysDate(),
    occupationId: "",
    // Address fields
    thana: "",
    addressLine1: "",
    addressLineSL1: "",
    villageId1: "",
    po1: "",
    tehsil1: "",
    addressLine2: "",
    addressLineSL2: "",
    villageId2: "",
    po2: "",
    tehsil2: "",
    // Contact fields
    phoneType1: "",
    phonePrefix1: "+91",
    phoneNo1: "",
    phoneType2: "",
    phonePrefix2: "+91",
    phoneNo2: "",
    // Document fields
    panCardNo: "",
    aadhaarCardNo: "",
    // Zone field
    zoneId: "",
    id: 0,
    email1: "",
    email2: "",
  });
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if in edit mode or form has data
      if (isEditMode) {
        e.preventDefault();
      }
    };

    // Add the event listener
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isEditMode, memberData]);

  const relationOptions = relations.map((type) => ({
    value: type.relationId,
    label: type.description,
  }));

  const casteOptions = casteInfo.map((type) => ({
    value: type.casteId,
    label: type.casteDescription,
  }));

  const villageOptions = villages1.map((type) => ({
    value: type.villageId,
    label: type.villageName,
  }));

  const occupationOptions = occupationInfo.map((type) => ({
    value: type.occupationId,
    label: type.description,
  }));

  const accOptions = generalAccInfo.map((type) => ({
    value: type.accId,
    label: type.accountName,
  }));

  // Updated Basic Information State

  // Voucher Info State
  const [voucherData, setVoucherData] = useState({
    smAmount: "",
    admissionFeesAccount: "", // Set as needed
    admissionFeeAmount: "", // Will be set via calculation or autofill
    debitAccountId: "",
    debitAmount: "", // Calculated field
    narration: "",
    openingAmount: "",
  });
  const handleSmAmountChange = (e) => {
    let value = e.target.value.replace(/[^0-9.]/g, "");
    value = value.replace(/^(\d*\.\d{0,2}).*$/, "$1");
    setVoucherData((v) => ({
      ...v,
      smAmount: value,
      debitAmount: (value > 0
        ? parseFloat(value || 0) + parseFloat(v.admissionFeeAmount || 0)
        : 0
      ).toFixed(2),
    }));
  };

  const handleOpeningAmountChange = (e) => {
    let value = e.target.value.replace(/[^0-9.]/g, "");
    value = value.replace(/^(\d*\.\d{0,2}).*$/, "$1");
    setVoucherData((v) => ({
      ...v,
      openingAmount: value,
    }));
  };

  const handleDebitAccountChange = (value: any) =>
    setVoucherData((v) => ({
      ...v,
      debitAccount: value,
    }));

  const handleNarrationChange = (e: any) =>
    setVoucherData((v) => ({
      ...v,
      narration: e.target.value,
    }));

  // Nominees State - Updated with age calculation
  const [nominees, setNominees] = useState([
    {
      id: Date.now(),
      nomineeName: "",
      relation: 0,
      relationWithMember: 0,
      age: "", // Made readonly, calculated from DOB
      isMinor: false,
      dob: commonservice.getTodaysDate(),
      nameOfGuardian: "",
      nameOfGuardianSL: "",
      nominationDate: commonservice.getTodaysDate(),
      aadhaarCardNo: "",
      PANCardNo: "",
      nomRelativeName: "",
      percentageShare: 0,
    },
  ]);

  // Existing functions with updates
  const addNominee = () => {
    setNominees([
      ...nominees,
      {
        id: Date.now(),
        nomineeName: "",
        relation: 0,
        relationWithMember: 0,
        age: "",
        isMinor: false,
        dob: "",
        nameOfGuardian: "",
        nameOfGuardianSL: "",
        nominationDate: "",
        aadhaarCardNo: "",
        PANCardNo: "",
        nomRelativeName: "",
        percentageShare: 0,
      },
    ]);
  };

  const removeNominee = (id: any) => {
    if (nominees.length > 1) {
      setNominees(nominees.filter((nominee) => nominee.id !== id));
    }
  };

  const updateNominee = (id: any, field: any, value: any) => {
    setNominees(
      nominees.map((nominee) => {
        if (nominee.id === id) {
          const updatedNominee = { ...nominee, [field]: value };

          // Calculate age when DOB changes
          if (field === "dob") {
            updatedNominee.age = calculateAge(value);
          }

          return updatedNominee;
        }
        return nominee;
      })
    );
  };

  const handleInputChange = (
    field: any,
    value: any,
    village1Label: any = "",
    village2Label: any = ""
  ) => {
    setMemberData((prev) => {
      const updatedData = { ...prev, [field]: value };

      // Calculate age when DOB changes
      if (field === "dob") {
        updatedData.age = calculateAge(value);
      }
      if (field === "villageId1" && value == 0) {
        updatedData.addressLine1 = "";
      }
      if (field === "villageId2" && value == 0) {
        updatedData.addressLine2 = "";
      }
      if (
        field === "nominalMembershipNo" ||
        field === "permanentMembershipNo"
      ) {
        updatedData.accountNumber = value;
      }
      return updatedData;
    });

    if (field === "villageId1") {
      fetchLocationData(value, 0, village1Label);
    }
    if (field === "villageId2") {
      fetchLocationData(0, value, "", village2Label);
    }
    if (field === "casteId") {
      fetchCategoryFromCaste(value);
    }
    clearLocationData(field);
    if (field == "debitAccount") {
      setDebitAccountId(value);
    }
  };

  const handleVoucherInputChange = (field: any, value: any) => {
    setVoucherData((prev) => ({ ...prev, [field]: value }));
  };

  // Image upload handlers
  const handleMemberPhotoSelect = (file) => {
    setMemberPhoto(file);
  };

  const handleMemberSignatureSelect = (file) => {
    setMemberSignature(file);
  };

  const removeMemberPhoto = () => {
    setMemberPhoto(null);
  };

  const removeMemberSignature = () => {
    setMemberSignature(null);
  };

  // Existing location and category functions remain the same...
  const fetchCategoryFromCaste = async (casteId: number) => {
    setCategory("");
    try {
      if (casteId === 0) return;
      const res = await commonservice.category_Info_from_caste(
        casteId,
        user.branchid
      );
      if (!res.success) throw new Error("Failed to load Category Data.");
      setCategory(res.data.categoryName || "");
    } catch (error) {}
  };

  const clearLocationData = (caption: string) => {
    if (caption == "villageId1") {
      setThana1("");
      setPostOffice1("");
      setTehsil1("");
      setZone1("");
      setPinCode1("");
    } else if (caption == "villageId2") {
      setThana2("");
      setPostOffice2("");
      setTehsil2("");
      setZone2("");
      setPinCode2("");
    }
  };

  const fetchLocationData = async (
    villageId1: number = 0,
    villageId2: number = 0,
    village1Label: string = "",
    village2Label: string = ""
  ) => {
    try {
      const villageId = villageId1 || villageId2;
      if (villageId === 0) {
        return;
      }
      const res = await commonservice.location_Info(villageId, user.branchid);
      if (!res.success) throw new Error("Failed to load Location Data.");
      const data = res.data;
      if (villageId1) {
        setThana1(data.ThanaName || "");
        setPostOffice1(data.PostOfficeName || "");
        setTehsil1(data.TehsilName || "");
        setZone1(commonservice.getLastSegment(data.ZoneName) || "");
        setPinCode1(data.PinCode || "");
        setMemberData((prevData) => ({
          ...prevData,
          addressLine1: `Village: ${village1Label}, Thana Name: ${
            data.ThanaName.split("-")[0]
          }, Tehsil Name: ${data.TehsilName.split("-")[0]}, Post Office: ${
            data.PostOfficeName.split("-")[0]
          },  Zone Name: ${data.ZoneName.split("-")[0]}, Pin Code: ${
            data.PinCode
          }`,
        }));
      } else {
        setThana2(data.ThanaName || "");
        setPostOffice2(data.PostOfficeName || "");
        setTehsil2(data.TehsilName || "");
        setZone2(commonservice.getLastSegment(data.ZoneName) || "");
        setPinCode2(data.PinCode || "");
        setMemberData((prevData) => ({
          ...prevData,
          addressLine2: `Village: ${village2Label}, Thana Name: ${
            data.ThanaName.split("-")[0]
          }, Tehsil Name: ${data.TehsilName.split("-")[0]}, Post Office: ${
            data.PostOfficeName.split("-")[0]
          },  Zone Name: ${data.ZoneName.split("-")[0]}, Pin Code: ${
            data.PinCode
          }`,
        }));
      }
    } catch (error) {
      Swal.fire("Error", "Could not fetch location data", "error");
    }
  };

  // Enhanced handleSubmit remains the same...
  const handleSubmit = async () => {
    const validation = validateForm(
      memberData,
      nominees,
      voucherData,
      [memberPhoto, memberSignature] // Pass images for validation
    );

    if (!validation.isValid) {
      setShowValidationSummary(true);
      // Same validation error handling...
      return;
    }
    if (!memberData.memberName?.trim()) {
      Swal.fire("Error", "Member Name is required", "error");
      return;
    }
    if (!memberData.relativeName?.trim()) {
      Swal.fire("Error", "Relative Name is required", "error");
      return;
    }
    if (!memberData.phoneNo1?.trim()) {
      Swal.fire("Error", "Phone Number is required", "error");
      return;
    }
    if (!memberData.phonePrefix1?.trim()) {
      Swal.fire("Error", "Phone Prefix is required", "error");
      return;
    }
    if (!memberData.panCardNo?.trim()) {
      Swal.fire("Error", "PAN Card is required", "error");
      return;
    }
    if (!memberData.aadhaarCardNo?.trim()) {
      Swal.fire("Error", "Aadhaar Card is required", "error");
      return;
    }
    if (!memberData.addressLine1?.trim()) {
      Swal.fire("Error", "Address is required", "error");
      return;
    }
    if (!memberPhoto?.file && !isEditMode) {
      Swal.fire("Error", "Member Photo is required", "error");
      return;
    }
    if (!memberSignature?.file && !isEditMode) {
      Swal.fire("Error", "Member Signature is required", "error");
      return;
    }
    debugger;
    if (memberData.aadhaarCardNo.trim() !== "") {
      const aadhaarExistsInNominees = nominees.some(
        (nominee) =>
          nominee.aadhaarCardNo?.trim() !== "" &&
          nominee.aadhaarCardNo?.trim() === memberData.aadhaarCardNo.trim()
      );

      if (aadhaarExistsInNominees) {
        Swal.fire({
          icon: "error",
          text: "Member's Aadhaar number already exists in nominee list!",
          title: "Duplication",
        });
        return false;
      }
    }
    if (memberData.panCardNo.trim() !== "") {
      const aadhaarExistsInNominees = nominees.some(
        (nominee) =>
          nominee.PANCardNo?.trim() !== "" &&
          nominee.PANCardNo?.trim() === memberData.panCardNo.trim()
      );

      if (aadhaarExistsInNominees) {
        Swal.fire({
          icon: "error",
          text: "Member's PAN already exists in nominee list!",
          title: "Duplication",
        });
        return false;
      }
    }

    if (debitAccount == 0) {
      Swal.fire({
        icon: "error",
        title: "Error.",
        text: "Debit Account is required in Voucher Tab.",
        didClose: () => {
          // 2. Call focus ONLY after the alert is completely closed and the DOM is clear
          refDebitAccount.current?.focus();
        },
      });
      return;
    }
    const memberDTO: MemberDTO = {
      branchId: user.branchid,
      defAreaBrId: Number(memberData.defAreaBrId) || 1, // ✅ Provide default
      memberType: memberData.memberType ? Number(memberData.memberType) : 1, // ✅ Provide default
      nominalMembershipNo: memberData.nominalMembershipNo,
      permanentMembershipNo: memberData.permanentMembershipNo,
      memberName: memberData.memberName.trim(), // ✅ Trim whitespace
      memberNameSL: memberData.memberNameSL,
      relativeName: memberData.relativeName.trim(), // ✅ Trim whitespace
      relationId: Number(memberData.relationId),
      gender: Number(memberData.gender),
      dob: memberData.dob,
      casteId: Number(memberData.casteId),
      categoryId: commonservice.getLastSegment(category.toString()) ?? 1, // ✅ Provide default
      occupationId: Number(memberData.occupationId) || 1, // ✅ Provide default
      joiningDate: memberData.joiningDate,
      phonePrefix1: memberData.phonePrefix1.trim(), // ✅ Trim whitespace
      phoneType1: Number(memberData.phoneType1),
      phoneNo1: memberData.phoneNo1.trim(), // ✅ Trim whitespace
      phonePrefix2: memberData.phonePrefix2,
      phoneType2: memberData.phoneType2
        ? Number(memberData.phoneType2)
        : undefined,
      phoneNo2: memberData.phoneNo2,
      id: Number(memberId),
      email1: memberData.email1,
      email2: memberData.email2,
    };

    const documentDetailsDTO: MemberDocDetailsDTO = {
      branchId: user.branchid,
      panCardNo: memberData.panCardNo.trim(), // ✅ Trim whitespace
      aadhaarCardNo: memberData.aadhaarCardNo.replace(/\s/g, ""), // ✅ Remove spaces
      memberPicExt: commonservice.getFileExtension(memberPhoto?.file || null),
      memberSignExt: commonservice.getFileExtension(
        memberSignature?.file || null
      ),
    };

    // Create LocationDetails DTO
    const locationDetailsDTO: MemberLocationDetailsDTO = {
      branchId: user.branchid,
      addressLine1: memberData.addressLine1.trim(), // ✅ Trim whitespace
      addressLineSL1: memberData.addressLineSL1,
      addressLine2: memberData.addressLine2,
      addressLineSL2: memberData.addressLineSL2,
      villageId1: Number(memberData.villageId1),
      villageId2: memberData.villageId2
        ? Number(memberData.villageId2)
        : undefined,
      po1: commonservice.getLastSegment(postOffice1.toString()) ?? 0,
      po2: commonservice.getLastSegment(postOffice2.toString()) ?? 0,
      tehsil1: commonservice.getLastSegment(tehsil1.toString()) ?? 0,
      tehsil2: commonservice.getLastSegment(tehsil2.toString()) ?? 0,
      thanaId1: commonservice.getLastSegment(thana1.toString()) ?? 0,
      thanaId2: commonservice.getLastSegment(thana2.toString()) ?? 0,
      zoneId1: Number(zone1) ?? 0,
      zoneId2: Number(zone2) ?? 0,
    };

    // Create Nominees DTO array
    const nomineesDTO: MemberNomineeDetailsDTO[] = nominees.map((nominee) => ({
      branchId: user.branchid,
      nomineeName: nominee.nomineeName,
      nomRelativeName: nominee.nomRelativeName?.substring(0, 10), // Truncate to match DB constraint
      relationId: Number(nominee.relation),
      relationWithMember: Number(nominee.relationWithMember),
      age: Number(nominee.age),
      dob: nominee.dob,
      isMinor: nominee.isMinor ? 1 : 0, // Convert boolean to smallint
      nameOfGuardian: nominee.nameOfGuardian,
      nameOfGuardianSL: nominee.nameOfGuardianSL,
      nominationDate: nominee.nominationDate,
      aadhaarCardNo: nominee.aadhaarCardNo,
      panCardNo: nominee.PANCardNo,
      percentageShare: Number(nominee.percentageShare), // Equal share for all nominees
    }));
    const totalNomineePercentage = nomineesDTO.reduce((sum, nominee) => {
        return sum + (nominee.percentageShare || 0); 
    }, 0);

    if(totalNomineePercentage > 100)
    {
      await Swal.fire({
        icon: "error",
        title: "Limit exceed",
        text: "The total share percentage of all nominees must not exceed 100%.",
      });
      return;
    }
    if(totalNomineePercentage < 100)
    {
      await Swal.fire({
        icon: "error",
        title: "Limit exceed",
        text: "The total share percentage of all nominees must be exactly 100%",
      });
      return;
    }

    // Create Voucher DTO
    const voucherDTO: VoucherDTO = {
      voucherNarration: voucherData.narration,
      smAmount: Number(voucherData.smAmount) ?? 0,
      admissionFeesAccountId:
        Number(
          commonservice.getLastSegment(voucherData.admissionFeesAccount)
        ) ?? 0,
      admissionFeeAmount: voucherData.admissionFeeAmount,
      debitAccountId: Number(debitAccount) ?? 0,
      totalDebit: Number(voucherData.debitAmount) || 0,
      openingAmount: Number(voucherData.openingAmount) || 0,
    };
    const accMasterDTO = {
      BranchId: user.branchid,
      AccountNumber: memberData.accountNumber.trim(),
      AccountName: `${memberData.memberName.trim()}`,
    };
    const combinedMemberDTO: CombinedMemberDTO = {
      member: memberDTO,
      nominees: nomineesDTO,
      documentDetails: documentDetailsDTO,
      locationDetails: locationDetailsDTO,
      accMaster: accMasterDTO,
      voucher: voucherDTO,
    };

    // console.log(JSON.stringify(combinedMemberDTO));
    setLoading(true);
    try {
      const response = isEditMode
        ? await memberAPIService.updateMember(
            combinedMemberDTO,
            memberPhoto?.file || undefined,
            memberSignature?.file || undefined
          )
        : await memberAPIService.createMember(
            combinedMemberDTO,
            memberPhoto?.file || undefined,
            memberSignature?.file || undefined
          );

      if (response.success) {
        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: response.message || "Member created successfully!",
          confirmButtonColor: "#3B82F6",
        });

        clearErrors();
        setShowValidationSummary(false);
        sessionStorage.removeItem("encryptedMemberId");
        handleReset(); // Reset form after successful submission
        if (isEditMode) {
          navigate("/member-info");
        }
      } else {
        await Swal.fire({
          icon: "error",
          title: "Error!",
          text: "Failed to create member. Please try again.",
          confirmButtonColor: "#EF4444",
        });
      }

      clearErrors();
      setShowValidationSummary(false);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Failed to create member. Please try again.",
        confirmButtonColor: "#EF4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldBlur = async (fieldName: string, value: any = "") => {
    markFieldTouched(fieldName);
    if (fieldName == "accountNumber" && value.trim() != "") {
      const response = await commonservice.accno_unique(
        user.branchid,
        value,
        smAccId,
        4
      );
      if (response.success) {
        setMemberData((prevData) => ({
          ...prevData,
          accountNumber: "",
        }));
        Swal.fire({
          icon: "error",
          title: "Duplication.",
          text: response.message,
          didClose: () => {
            // 2. Call focus ONLY after the alert is completely closed and the DOM is clear
            accountNumberRef.current?.focus();
          },
        });
      }
    }
    if (fieldName == "nominalMembershipNo" && value.trim() != "") {
      const response = await commonservice.nominalmembershipNo_unique(
        user.branchid,
        value,
        Number(memberId ?? 0) ?? 0
      );
      if (response.success) {
        setMemberData((prevData) => ({
          ...prevData,
          nominalMembershipNo: "",
        }));
        Swal.fire({
          icon: "error",
          title: "Duplication.",
          text: response.message,
          didClose: () => {
            // 2. Call focus ONLY after the alert is completely closed and the DOM is clear
            nominalMemNoRef.current?.focus();
          },
        });
      }
    }
    if (fieldName == "permanentMembershipNo" && value.trim() != "") {
      const response = await commonservice.permanentmembershipNo_unique(
        user.branchid,
        value,
        Number(memberId ?? 0) ?? 0
      );
      if (response.success) {
        setMemberData((prevData) => ({
          ...prevData,
          permanentMembershipNo: "",
        }));
        Swal.fire({
          icon: "error",
          title: "Duplication.",
          text: response.message,
          didClose: () => {
            // 2. Call focus ONLY after the alert is completely closed and the DOM is clear
            permanentMemNoRef.current?.focus();
          },
        });
      }
    }
    if (fieldName == "aadhaarCardNo" && value.trim() != "") {
      const response = await commonservice.aadhaar_unique(
        user.branchid,
        value,
        Number(memberId ?? 0) ?? 0
      );
      if (response.success) {
        setMemberData((prevData) => ({
          ...prevData,
          aadhaarCardNo: "",
        }));
        Swal.fire({
          icon: "error",
          title: "Duplication.",
          text: response.message,
          didClose: () => {
            // 2. Call focus ONLY after the alert is completely closed and the DOM is clear
            aadhaarRef.current?.focus();
          },
        });
      }
    }
    if (fieldName == "panCardNo" && value.trim() != "") {
      const response = await commonservice.PAN_unique(
        user.branchid,
        value,
        Number(memberId ?? 0) ?? 0
      );
      if (response.success) {
        setMemberData((prevData) => ({
          ...prevData,
          panCardNo: "",
        }));
        Swal.fire({
          icon: "error",
          title: "Duplication.",
          text: response.message,
          didClose: () => {
            // 2. Call focus ONLY after the alert is completely closed and the DOM is clear
            PANref.current?.focus();
          },
        });
      }
    }
  };

  // Group errors by field and tab
  const errorsByField = errors.reduce((acc, error) => {
    if (!acc[error.field]) acc[error.field] = [];
    acc[error.field].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const errorsByTab = errors.reduce((acc, error) => {
    if (!acc[error.tab]) acc[error.tab] = [];
    acc[error.tab].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);

  const handleResetNotAllowed = () => {
    Swal.fire({
      icon: "error",
      title: "Not Allowed",
      text: "Reset form is not allowed in modify mode.",
    });
  };

  // Updated handleReset function
  const handleReset = () => {
    // Reset member data
    setMembershipType("P");
    setMemberData({
      accountNumber: "",
      defAreaBrId: "",
      memberType: "",
      nominalMembershipNo: "",
      permanentMembershipNo: "",
      memberName: "",
      memberNameSL: "",
      relativeName: "",
      relationId: "",
      gender: "",
      dob: commonservice.getTodaysDate(),
      age: "", // Reset calculated age
      casteId: "",
      joiningDate: commonservice.getTodaysDate(),
      occupationId: "",
      thana: "",
      addressLine1: "",
      addressLineSL1: "",
      villageId1: "",
      po1: "",
      tehsil1: "",
      addressLine2: "",
      addressLineSL2: "",
      villageId2: "",
      po2: "",
      tehsil2: "",
      phoneType1: "",
      phonePrefix1: "+91",
      phoneNo1: "",
      phoneType2: "",
      phonePrefix2: "+91",
      phoneNo2: "",
      panCardNo: "",
      aadhaarCardNo: "",
      zoneId: "",
      id: Number(memberId ?? 0),
      email1: "",
      email2: "",
    });

    // Reset voucher data
    setVoucherData({
      smAmount: "",
      admissionFeeAmount: voucherData.admissionFeeAmount,
      admissionFeesAccount: voucherData.admissionFeesAccount,
      debitAccountId: "",
      debitAmount: "",
      narration: "",
      openingAmount: "",
    });
    setDebitAccountId("");
    setOccupationId("");

    // Reset images
    setMemberPhoto(null);
    setMemberSignature(null);

    // Reset nominees with calculated age
    setNominees([
      {
        id: Date.now(),
        nomineeName: "",
        relation: 0,
        relationWithMember: 0,
        age: "", // Reset calculated age
        isMinor: false,
        dob: commonservice.getTodaysDate(),
        nameOfGuardian: "",
        nameOfGuardianSL: "",
        nominationDate: commonservice.getTodaysDate(),
        aadhaarCardNo: "",
        PANCardNo: "",
        nomRelativeName: "",
        percentageShare: 0
      },
    ]);

    // Reset other states
    setRelationId("");
    setVillageId1("");
    setVillageId2("");
    setZone1("");
    setPinCode1("");
    setPinCode2("");
    setZone2("");
    setTehsil1("");
    setTehsil2("");
    setPostOffice1("");
    setPostOffice2("");
    setThana1("");
    setThana2("");
    setCasteId("");
    setCategory("");

    setActiveTab("basic");
    clearErrors();
    setShowValidationSummary(false);
  };

  // Rest of the component functions remain the same...
  const getTabClassName = (tabId: string) => {
    const hasTabErrors = errorsByTab[tabId]?.length > 0;
    const baseClassName = `flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-200 relative`;

    if (activeTab === tabId) {
      return `${baseClassName} border-blue-500 text-blue-600 bg-blue-50`;
    } else if (hasTabErrors) {
      return `${baseClassName} border-red-300 text-red-600 hover:bg-red-50`;
    } else {
      return `${baseClassName} border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50`;
    }
  };

  const tabs = [
    { id: "basic", label: "Basic Info", icon: User },
    { id: "address", label: "Address", icon: MapPin },
    { id: "contact", label: "Contact", icon: Phone },
    { id: "documents", label: "Documents", icon: CreditCard },
    { id: "voucher", label: "Voucher Info", icon: FileText },
    { id: "nominees", label: "Nominees", icon: Users },
  ];

  // Updated renderBasicInfo with readonly age and max date validation
  const renderBasicInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Account Number */}
      {/* Membership Numbers */}
      {/* Membership Type Toggle with Radio Buttons - Better Design */}
      <FormField
        name="membershipType"
        label="Membership Type"
        required
        errors={errorsByField.membershipType || []}
      >
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="membershipType"
              value="P"
              checked={membershipType === "P"}
              onChange={(e) => {
                setMembershipType("P");
                setMemberData((prev) => ({
                  ...prev,
                  nominalMembershipNo: "",
                }));
              }}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Permanent</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="membershipType"
              value="N"
              checked={membershipType === "N"}
              onChange={(e) => {
                setMembershipType("N");
                setMemberData((prev) => ({
                  ...prev,
                  permanentMembershipNo: "",
                }));
              }}
              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Nominal</span>
          </label>
        </div>
      </FormField>

      {/* Permanent Membership No - Show only when type is 'P' */}
      {membershipType === "P" && (
        <FormField
          name="permanentMembershipNo"
          label="Permanent Membership No"
          required
          errors={errorsByField.permanentMembershipNo || []}
        >
          <input
            type="text"
            value={memberData.permanentMembershipNo}
            ref={permanentMemNoRef}
            onChange={(e) =>
              handleInputChange("permanentMembershipNo", e.target.value)
            }
            onBlur={(e) =>
              handleFieldBlur("permanentMembershipNo", e.target.value)
            }
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            placeholder="Enter Permanent Membership No"
            maxLength={20}
            autoFocus
          />
        </FormField>
      )}

      {/* Nominal Membership No - Show only when type is 'N' */}
      {membershipType === "N" && (
        <FormField
          name="nominalMembershipNo"
          label="Nominal Membership No"
          required
          errors={errorsByField.nominalMembershipNo || []}
        >
          <input
            type="text"
            value={memberData.nominalMembershipNo}
            onChange={(e) =>
              handleInputChange("nominalMembershipNo", e.target.value)
            }
            ref={nominalMemNoRef}
            onBlur={(e) =>
              handleFieldBlur("nominalMembershipNo", e.target.value)
            }
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            placeholder="Enter Nominal Membership No"
            maxLength={20}
            autoFocus
          />
        </FormField>
      )}
      <FormField
        name="accountNumber"
        label="Share Money Account Number"
        required
        errors={errorsByField.accountNumber || []}
      >
        <input
          type="text"
          value={memberData.accountNumber}
          onChange={(e) => handleInputChange("accountNumber", e.target.value)}
          onBlur={(e) => handleFieldBlur("accountNumber", e.target.value)}
          ref={accountNumberRef}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Share Money Account Number"
          maxLength={20}
        />
      </FormField>

      {/* Name Fields */}
      <FormField
        name="memberName"
        label="Member Name"
        required
        errors={errorsByField.memberName || []}
        icon={<User className="w-4 h-4 text-green-500" />}
      >
        <input
          type="text"
          value={memberData.memberName}
          onChange={(e) => handleInputChange("memberName", e.target.value)}
          onBlur={() => handleFieldBlur("memberName")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Member Name"
          required
          maxLength={100}
        />
      </FormField>
      <FormField
        name="memberNameSL"
        label="Member Name (Hindi)"
        errors={errorsByField.memberNameSL || []}
        icon={<Globe className="w-4 h-4 text-purple-500" />}
      >
        <input
          type="text"
          value={memberData.memberNameSL}
          onChange={(e) => handleInputChange("memberNameSL", e.target.value)}
          onBlur={() => handleFieldBlur("memberNameSL")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="हिंदी में नाम"
          maxLength={100}
          lang="hi"
        />
      </FormField>
      {/* Relative Information */}
      <FormField
        name="relativeName"
        label="Relative Name"
        required
        errors={errorsByField.relativeName || []}
      >
        <input
          type="text"
          value={memberData.relativeName}
          onChange={(e) => handleInputChange("relativeName", e.target.value)}
          onBlur={() => handleFieldBlur("relativeName")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Relative Name"
          required
          maxLength={100}
        />
      </FormField>
      {/* Relation */}
      <FormField
        name="relationId"
        label="Relation"
        required
        errors={errorsByField.relationId || []}
      >
        <Select
          id="relation"
          options={relationOptions}
          value={
            relationOptions.find((option) => option.value === relationId) ||
            null
          }
          onChange={(selected) => {
            setRelationId(selected ? selected.value : "");
            handleInputChange("relationId", selected ? selected.value : "");
          }}
          placeholder="Select Relation"
          isClearable
          required
          className="text-sm"
        />
      </FormField>

      {/* Gender */}
      <FormField
        name="gender"
        label="Gender"
        required
        errors={errorsByField.gender || []}
      >
        <select
          value={memberData.gender}
          onChange={(e) => handleInputChange("gender", e.target.value)}
          onBlur={() => handleFieldBlur("gender")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          required
        >
          <option value="">Select Gender</option>
          <option value="1">Male</option>
          <option value="2">Female</option>
          <option value="3">Trans Gender</option>
        </select>
      </FormField>

      {/* DOB with max date validation */}
      <FormField
        name="dob"
        label="Date of Birth"
        required
        errors={errorsByField.dob || []}
        icon={<Calendar className="w-4 h-4 text-red-500" />}
      >
        <input
          type="date"
          value={memberData.dob}
          onChange={(e) => handleInputChange("dob", e.target.value)}
          onBlur={() => handleFieldBlur("dob")}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          max={commonservice.getTodaysDate()} // Prevent future dates
          required
        />
      </FormField>

      {/* Age - readonly and calculated */}
      <FormField
        name="age"
        label="Age"
        required
        errors={errorsByField.age || []}
        icon={<User className="w-4 h-4 text-red-500" />}
      >
        <input
          type="text"
          value={memberData.age}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-100 outline-none cursor-not-allowed"
          placeholder="Age will be calculated from DOB"
          readOnly
        />
      </FormField>

      {/* Joining Date with max date validation */}
      <FormField
        name="joiningDate"
        label="Joining Date"
        required
        errors={errorsByField.joiningDate || []}
        icon={<Calendar className="w-4 h-4 text-green-500" />}
      >
        <input
          type="date"
          value={memberData.joiningDate}
          onChange={(e) => handleInputChange("joiningDate", e.target.value)}
          onBlur={() => handleFieldBlur("joiningDate")}
          readOnly
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          max={commonservice.getTodaysDate()} // Prevent future dates
          required
        />
      </FormField>

      {/* Caste */}
      <FormField
        name="casteId"
        label="Caste"
        required
        errors={errorsByField.casteId || []}
      >
        <Select
          id="caste"
          options={casteOptions}
          value={
            casteOptions.find((option) => option.value === casteId) || null
          }
          onChange={(selected) => {
            setCasteId(selected ? selected.value : "");
            handleInputChange("casteId", selected ? selected.value : 0);
          }}
          placeholder="Select Caste"
          isClearable
          required
          className="text-sm"
        />
      </FormField>

      <FormField
        name="category"
        label="Category"
        required
        errors={errorsByField.category || []}
      >
        <input
          type="text"
          value={category}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-100 outline-none cursor-not-allowed"
          placeholder="Category will be auto-filled"
          readOnly
        />
      </FormField>

      {/* Occupation */}
      <FormField
        name="occupationId"
        label="Occupation"
        errors={errorsByField.occupationId || []}
      >
        <Select
          id="occupation"
          options={occupationOptions} // Replace with occupation options when available
          value={
            occupationOptions.find((option) => option.value === occupationId) ||
            null
          }
          onChange={(selected) => {
            setOccupationId(selected ? selected.value : "");
            handleInputChange("occupationId", selected ? selected.value : "");
          }}
          placeholder="Select Occupation"
          isClearable
          required
          className="text-sm"
        />
      </FormField>

      <FormField
        name="openingAmount"
        label="Opening Amount"
        errors={errorsByField.openingAmount || []}
      >
        <input
          type="text"
          pattern="^\d*(\.\d{0,2})?$"
          value={voucherData.openingAmount}
          onChange={handleOpeningAmountChange}
          className="w-full px-3 py-2 border rounded"
          placeholder="Enter Opening amount"
          inputMode="decimal"
          maxLength={10}
        />
      </FormField>
    </div>
  );

  // Updated Documents tab with two mandatory image uploads
  const renderDocumentsInfo = () => (
    <div className="space-y-8">
      {/* Document Information */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Document Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            name="panCardNo"
            label="PAN Card Number"
            required
            errors={errorsByField.panCardNo || []}
            icon={<CreditCard className="w-4 h-4 text-blue-500" />}
            description="Format: ABCDE1234F"
          >
            <input
              type="text"
              value={memberData.panCardNo}
              ref={PANref}
              autoFocus
              onChange={(e) =>
                handleInputChange("panCardNo", e.target.value.toUpperCase())
              }
              onBlur={(e) => handleFieldBlur("panCardNo", e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter PAN Number"
              maxLength={10}
              required
              pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
            />
          </FormField>

          <FormField
            name="aadhaarCardNo"
            label="Aadhaar Card Number"
            required
            errors={errorsByField.aadhaarCardNo || []}
            icon={<CreditCard className="w-4 h-4 text-green-500" />}
            description="Format: 1234 5678 9012"
          >
            <input
              type="text"
              value={memberData.aadhaarCardNo}
              ref={aadhaarRef}
              onChange={(e) =>
                handleInputChange(
                  "aadhaarCardNo",
                  e.target.value
                    .replace(/\D/g, "")
                    .replace(/(\d{4})(?=\d)/g, "$1")
                )
              }
              onBlur={(e) => handleFieldBlur("aadhaarCardNo", e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Aadhaar Number"
              maxLength={12}
              pattern="[0-9]{4}\s[0-9]{4}\s[0-9]{4}"
            />
          </FormField>
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Member Photo */}
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Member Photo
          </h3>
          <FileUploadComponent
            onFileSelect={handleMemberPhotoSelect}
            title="Upload Member Photo"
            acceptedTypes="image/*"
            maxSize={5 * 1024 * 1024}
            uploadedFile={memberPhoto}
            onRemoveFile={removeMemberPhoto}
            isRequired={true}
          />
        </div>

        {/* Member Signature */}
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
          <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Member Signature
          </h3>
          <FileUploadComponent
            onFileSelect={handleMemberSignatureSelect}
            title="Upload Member Signature"
            acceptedTypes="image/*"
            maxSize={5 * 1024 * 1024}
            uploadedFile={memberSignature}
            onRemoveFile={removeMemberSignature}
            isRequired={true}
          />
        </div>
      </div>
    </div>
  );

  // Updated nominees section with readonly age and max date validation
  const renderNomineesInfo = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-500" />
          Member Nominees
        </h3>
        <button
          onClick={addNominee}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Nominee
        </button>
      </div>

      {nominees.map((nominee, index) => (
        <div
          key={nominee.id}
          className="bg-gray-50 p-6 rounded-lg border border-gray-200"
        >
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-gray-800">Nominee {index + 1}</h4>
            {nominees.length > 1 && (
              <button
                onClick={() => removeNominee(nominee.id)}
                className="flex items-center gap-1 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors text-sm"
              >
                <Minus className="w-3 h-3" />
                Remove
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              name={`nominees[${index}].nomineeName`}
              label="Nominee Name"
              required
              errors={errorsByField[`nominees[${index}].nomineeName`] || []}
            >
              <input
                type="text"
                value={nominee.nomineeName}
                onChange={(e) =>
                  updateNominee(nominee.id, "nomineeName", e.target.value)
                }
                autoFocus
                onBlur={() => handleFieldBlur(`nominees[${index}].nomineeName`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter Name"
                required
              />
            </FormField>
            <FormField
              name={`nominees[${index}].nomRelativeName`}
              label="Relative Name"
              required
              errors={errorsByField[`nominees[${index}].nomRelativeName`] || []}
            >
              <input
                type="text"
                value={nominee.nomRelativeName}
                onChange={(e) =>
                  updateNominee(nominee.id, "nomRelativeName", e.target.value)
                }
                onBlur={() =>
                  handleFieldBlur(`nominees[${index}].nomRelativeName`)
                }
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter Relative Name"
                required
              />
            </FormField>
            <FormField
              name={`nominees[${index}].relation`}
              label="Relation"
              required
              errors={errorsByField[`nominees[${index}].relation`] || []}
            >
              <Select
                id="relation"
                required
                options={relationOptions}
                value={
                  relationOptions.find(
                    (option) => option.value === nominee.relation
                  ) || null
                }
                onChange={(e) =>
                  updateNominee(nominee.id, "relation", e?.value)
                }
                onBlur={() => handleFieldBlur(`nominees[${index}].relation`)}
                placeholder="Select Relation"
                isClearable
                className="text-sm"
              />
            </FormField>

            <FormField
              name={`nominees[${index}].relationWithMember`}
              label="Relation With Member"
              required
              errors={
                errorsByField[`nominees[${index}].relationWithMember`] || []
              }
            >
              <Select
                id="relationWithMember"
                options={relationOptions}
                value={
                  relationOptions.find(
                    (option) => option.value === nominee.relationWithMember
                  ) || null
                }
                onChange={(e) =>
                  updateNominee(nominee.id, "relationWithMember", e?.value)
                }
                onBlur={() =>
                  handleFieldBlur(`nominees[${index}].relationWithMember`)
                }
                placeholder="Select Relation"
                isClearable
                required
                className="text-sm"
              />
            </FormField>

            {/* DOB with max date validation */}
            <FormField
              name={`nominees[${index}].dob`}
              label="Date of Birth"
              required
              errors={errorsByField[`nominees[${index}].dob`] || []}
            >
              <input
                type="date"
                value={nominee.dob}
                onChange={(e) =>
                  updateNominee(nominee.id, "dob", e.target.value)
                }
                onBlur={() => handleFieldBlur(`nominees[${index}].dob`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                max={commonservice.getTodaysDate()} // Prevent future dates
                required
              />
            </FormField>

            {/* Age - readonly and calculated */}
            <FormField
              name={`nominees[${index}].age`}
              label="Age"
              required
              errors={errorsByField[`nominees[${index}].age`] || []}
            >
              <input
                type="text"
                value={nominee.age}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-100 outline-none cursor-not-allowed"
                placeholder="Age will be calculated from DOB"
                readOnly
              />
            </FormField>

            {/* Nomination Date with max date validation */}
            <FormField
              name={`nominees[${index}].nominationDate`}
              label="Nomination Date"
              required
              errors={errorsByField[`nominees[${index}].nominationDate`] || []}
            >
              <input
                type="date"
                value={nominee.nominationDate}
                required
                onChange={(e) =>
                  updateNominee(nominee.id, "nominationDate", e.target.value)
                }
                onBlur={() =>
                  handleFieldBlur(`nominees[${index}].nominationDate`)
                }
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                max={commonservice.getTodaysDate()} // Prevent future dates
              />
            </FormField>

            <FormField
              name={`nominees[${index}].aadhaarCardNo`}
              label="Aadhaar Card Number"
              errors={errorsByField[`nominees[${index}].aadhaarCardNo`] || []}
            >
              <input
                type="text"
                value={nominee.aadhaarCardNo}
                onChange={(e) =>
                  updateNominee(
                    nominee.id,
                    "aadhaarCardNo",
                    (e.target.value = e.target.value.replace(/\s+/g, ""))
                  )
                }
                onBlur={() =>
                  handleFieldBlur(`nominees[${index}].aadhaarCardNo`)
                }
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="123456789012"
                maxLength={12}
              />
            </FormField>

            <FormField
              name={`nominees[${index}].PANCardNo`}
              label="PAN Card Number"
              errors={errorsByField[`nominees[${index}].PANCardNo`] || []}
            >
              <input
                type="text"
                value={nominee.PANCardNo}
                onChange={(e) =>
                  updateNominee(
                    nominee.id,
                    "PANCardNo",
                    e.target.value.toUpperCase().substring(0, 10)
                  )
                }
                onBlur={() => handleFieldBlur(`nominees[${index}].PANCardNo`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="ABCDE1234F"
                maxLength={10}
              />
            </FormField>
            <FormField
              name={`nominees[${index}].percentageShare`}
              label="Share Percentage"
              required
              errors={errorsByField[`nominees[${index}].percentageShare`] || []}
            >
              <input
                type="text"
                // Use 'text' type but hint the browser for numeric input
                inputMode="decimal"
                value={nominee.percentageShare}
                onChange={(e) => {
                  const value = e.target.value;

                  // Regex to allow digits and AT MOST one decimal point, followed by max two digits.
                  // Allows numbers like 10, 10.5, 10.55, but prevents 10.555 or 10.5.5
                  const numericRegex = /^\d*\.?\d{0,2}$/;

                  if (value === "" || numericRegex.test(value)) {
                    updateNominee(nominee.id, "percentageShare", value);
                  }
                }}
                onBlur={() =>
                  handleFieldBlur(`nominees[${index}].percentageShare`)
                }
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="e.g., 50.00"
                maxLength={6} // Max length sufficient for 100.00 (6 characters)
              />
            </FormField>

            {/* Minor checkbox and guardian fields */}
            <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3">
              <input
                type="checkbox"
                id={`isMinor-${nominee.id}`}
                checked={nominee.isMinor}
                onChange={(e) =>
                  updateNominee(nominee.id, "isMinor", e.target.checked)
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label
                htmlFor={`isMinor-${nominee.id}`}
                className="text-sm font-semibold text-gray-700"
              >
                Is Minor (Below 18 years)
              </label>
            </div>

            {nominee.isMinor && (
              <>
                <FormField
                  name={`nominees[${index}].nameOfGuardian`}
                  label="Guardian Name"
                  required={nominee.isMinor}
                  errors={
                    errorsByField[`nominees[${index}].nameOfGuardian`] || []
                  }
                >
                  <input
                    type="text"
                    value={nominee.nameOfGuardian}
                    onChange={(e) =>
                      updateNominee(
                        nominee.id,
                        "nameOfGuardian",
                        e.target.value
                      )
                    }
                    onBlur={() =>
                      handleFieldBlur(`nominees[${index}].nameOfGuardian`)
                    }
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="Enter Guardian Name"
                    required={nominee.isMinor}
                  />
                </FormField>

                <FormField
                  name={`nominees[${index}].nameOfGuardianSL`}
                  label="Guardian Name (Hindi)"
                  errors={
                    errorsByField[`nominees[${index}].nameOfGuardianSL`] || []
                  }
                >
                  <input
                    type="text"
                    value={nominee.nameOfGuardianSL}
                    onChange={(e) =>
                      updateNominee(
                        nominee.id,
                        "nameOfGuardianSL",
                        e.target.value
                      )
                    }
                    onBlur={() =>
                      handleFieldBlur(`nominees[${index}].nameOfGuardianSL`)
                    }
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="हिंदी में संरक्षक का नाम"
                    lang="hi"
                  />
                </FormField>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // Keep existing address, contact, and voucher render functions...
  const renderAddressInfo = () => (
    <div className="space-y-8">
      {/* Primary Address */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <Home className="w-5 h-5" />
          Primary Address
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            name="villageId1"
            label="Village"
            required
            errors={errorsByField.villageId1 || []}
          >
            <Select
              id="village1"
              options={villageOptions}
              value={
                villageOptions.find((option) => option.value === villageId1) ||
                null
              }
              autoFocus
              onChange={(selected) => {
                setVillageId1(selected ? selected.value : "");
                handleInputChange(
                  "villageId1",
                  selected ? selected.value : 0,
                  selected?.label || ""
                );
              }}
              placeholder="Select Village"
              isClearable
              required
              className="text-sm"
            />
          </FormField>
          <FormField
            name="thana1"
            label="Thana"
            required
            errors={errorsByField.thana1 || []}
          >
            <input
              type="text"
              value={thana1}
              onChange={(e) => handleInputChange("thana", e.target.value)}
              onBlur={() => handleFieldBlur("thana")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Thana"
              maxLength={100}
              required
              readOnly={true}
            />
          </FormField>

          <FormField
            name="po1"
            label="Post Office"
            required
            errors={errorsByField.po1 || []}
          >
            <input
              type="text"
              value={postOffice1}
              onChange={(e) => handleInputChange("po1", e.target.value)}
              onBlur={() => handleFieldBlur("po1")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Post Office"
              readOnly={true}
              required
            />
          </FormField>

          <FormField
            name="tehsil1"
            label="Tehsil"
            required
            errors={errorsByField.tehsil1 || []}
          >
            <input
              type="text"
              value={tehsil1}
              onChange={(e) => handleInputChange("tehsil1", e.target.value)}
              onBlur={() => handleFieldBlur("tehsil1")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Tehsil"
              readOnly={true}
              required
            />
          </FormField>
          <FormField
            name="zone1"
            label="Zone"
            required
            errors={errorsByField.zone1 || []}
          >
            <Select
              id="zone1"
              options={zoneData}
              value={
                zoneData.find((option) => option.value === zone1) ||
                null
              }
              onChange={(selected) => {
                setZone1(selected ? selected.value : "");
                handleInputChange(
                  "zone1",
                  selected ? selected.value : 0,
                  selected?.label || ""
                );
              }}
              placeholder="Select Zone"
              isClearable
              required
              className="text-sm"
            />
          </FormField>
          <FormField
            name="pinCode1"
            label="Pin Code"
            required
            errors={errorsByField.pinCode1 || []}
          >
            <input
              type="text"
              value={pinCode1}
              onChange={(e) => handleInputChange("pinCode1", e.target.value)}
              onBlur={() => handleFieldBlur("pinCode1")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter PIN Code"
              readOnly={true}
              required
            />
          </FormField>
          <div className="lg:col-span-3">
            <FormField
              name="addressLine1"
              label="Address Line 1"
              required
              errors={errorsByField.addressLine1 || []}
            >
              <input
                type="text"
                value={memberData.addressLine1}
                onChange={(e) =>
                  handleInputChange("addressLine1", e.target.value)
                }
                onBlur={() => handleFieldBlur("addressLine1")}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter Address Line 1"
                required
                maxLength={150}
              />
            </FormField>
          </div>

          <div className="lg:col-span-3">
            <FormField
              name="addressLineSL1"
              label="Address Line 1 (Hindi)"
              errors={errorsByField.addressLineSL1 || []}
            >
              <input
                type="text"
                value={memberData.addressLineSL1}
                onChange={(e) =>
                  handleInputChange("addressLineSL1", e.target.value)
                }
                onBlur={() => handleFieldBlur("addressLineSL1")}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="हिंदी में पता लाइन 1"
                maxLength={150}
                lang="hi"
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Secondary Address */}
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
          <Home className="w-5 h-5" />
          Secondary Address (Optional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            name="villageId2"
            label="Village"
            errors={errorsByField.villageId2 || []}
          >
            <Select
              id="village2"
              options={villageOptions}
              value={
                villageOptions.find((option) => option.value === villageId2) ||
                null
              }
              onChange={(selected) => {
                setVillageId2(selected ? selected.value : "");
                handleInputChange(
                  "villageId2",
                  selected ? selected.value : 0,
                  "",
                  selected?.label || ""
                );
              }}
              placeholder="Select Village"
              isClearable
              required
              className="text-sm"
            />
          </FormField>
          <FormField
            name="thana2"
            label="Thana"
            errors={errorsByField.thana2 || []}
          >
            <input
              type="text"
              value={thana2}
              onChange={(e) => handleInputChange("thana2", e.target.value)}
              onBlur={() => handleFieldBlur("thana2")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Thana"
              maxLength={100}
              readOnly={true}
            />
          </FormField>
          <FormField
            name="po2"
            label="Post Office"
            errors={errorsByField.po2 || []}
          >
            <input
              type="text"
              value={postOffice2}
              onChange={(e) => handleInputChange("po2", e.target.value)}
              onBlur={() => handleFieldBlur("po2")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Post Office"
              readOnly={true}
            />
          </FormField>

          <FormField
            name="tehsil2"
            label="Tehsil"
            errors={errorsByField.tehsil2 || []}
          >
            <input
              type="text"
              value={tehsil2}
              onChange={(e) => handleInputChange("tehsil2", e.target.value)}
              onBlur={() => handleFieldBlur("tehsil2")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Tehsil"
              readOnly={true}
            />
          </FormField>
          <FormField
            name="zone2"
            label="Zone"
            required
            errors={errorsByField.zone2 || []}
          >
            <Select
              id="zone1"
              options={zoneData}
              value={
                zoneData.find((option) => option.value === zone2) ||
                null
              }
              onChange={(selected) => {
                setZone2(selected ? selected.value : "");
                handleInputChange(
                  "zone2",
                  selected ? selected.value : 0,
                  selected?.label || ""
                );
              }}
              placeholder="Select Zone"
              isClearable
              required
              className="text-sm"
            />
          </FormField>
          <FormField
            name="pinCode2"
            label="Pin Code"
            required
            errors={errorsByField.pinCode2 || []}
          >
            <input
              type="text"
              value={pinCode2}
              onChange={(e) => handleInputChange("pinCode2", e.target.value)}
              onBlur={() => handleFieldBlur("pinCode2")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter PIN Code"
              readOnly={true}
              required
            />
          </FormField>
          <div className="lg:col-span-3">
            <FormField
              name="addressLine2"
              label="Address Line 2"
              errors={errorsByField.addressLine2 || []}
            >
              <input
                type="text"
                value={memberData.addressLine2}
                onChange={(e) =>
                  handleInputChange("addressLine2", e.target.value)
                }
                onBlur={() => handleFieldBlur("addressLine2")}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter Address Line 2"
                maxLength={150}
              />
            </FormField>
          </div>

          <div className="lg:col-span-3">
            <FormField
              name="addressLineSL2"
              label="Address Line 2 (Hindi)"
              errors={errorsByField.addressLineSL2 || []}
            >
              <input
                type="text"
                value={memberData.addressLineSL2}
                onChange={(e) =>
                  handleInputChange("addressLineSL2", e.target.value)
                }
                onBlur={() => handleFieldBlur("addressLineSL2")}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="हिंदी में पता लाइन 2"
                maxLength={150}
                lang="hi"
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContactInfo = () => (
    <div className="space-y-6">
      {/* Phone 1 */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Primary Contact
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            name="email1"
            label="Email"
            errors={errorsByField.email1 || []}
          >
            <input
              type="email" // Changed type to email
              value={memberData.email1}
              onChange={(e) => handleInputChange("email1", e.target.value)}
              onBlur={() => handleFieldBlur("email1")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="example@domain.com" // Updated placeholder
              // Removed readOnly
              // Removed maxLength (emails can be long)
              autoComplete="email" // Added for better browser autofill
            />
          </FormField>
          <FormField
            name="phoneType1"
            label="Phone Type"
            required
            errors={errorsByField.phoneType1 || []}
          >
            <select
              value={memberData.phoneType1}
              onChange={(e) => handleInputChange("phoneType1", e.target.value)}
              onBlur={() => handleFieldBlur("phoneType1")}
              autoFocus
              required
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
            >
              <option value="">Select Type</option>
              <option value="1">Mobile</option>
              <option value="2">Landline</option>
              <option value="3">Office</option>
            </select>
          </FormField>

          <div className="hidden">
            <FormField
              name="phonePrefix1"
              label="Prefix"
              required
              errors={errorsByField.phonePrefix1 || []}
            >
              <input
                type="text"
                value={memberData.phonePrefix1}
                onChange={(e) =>
                  handleInputChange("phonePrefix1", e.target.value)
                }
                onBlur={() => handleFieldBlur("phonePrefix1")}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="+91"
                required
                readOnly
                maxLength={5}
              />
            </FormField>
          </div>
          <FormField
            name="phoneNo1"
            label="Phone Number"
            required
            errors={errorsByField.phoneNo1 || []}
          >
            <input
              type="tel"
              value={memberData.phoneNo1}
              onChange={(e) => handleInputChange("phoneNo1", e.target.value)}
              onBlur={() => handleFieldBlur("phoneNo1")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Phone Number"
              maxLength={15}
              required
            />
          </FormField>
        </div>
      </div>

      {/* Phone 2 */}
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Secondary Contact (Optional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            name="email2"
            label="Email"
            errors={errorsByField.email2 || []}
          >
            <input
              type="email" // Changed type to email
              value={memberData.email2}
              onChange={(e) => handleInputChange("email2", e.target.value)}
              onBlur={() => handleFieldBlur("email2")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="example@domain.com" // Updated placeholder
              // Removed readOnly
              // Removed maxLength (emails can be long)
              autoComplete="email" // Added for better browser autofill
            />
          </FormField>
          <FormField
            name="phoneType2"
            label="Phone Type"
            errors={errorsByField.phoneType2 || []}
          >
            <select
              value={memberData.phoneType2}
              onChange={(e) => handleInputChange("phoneType2", e.target.value)}
              onBlur={() => handleFieldBlur("phoneType2")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
            >
              <option value="">Select Type</option>
              <option value="1">Mobile</option>
              <option value="2">Landline</option>
              <option value="3">Office</option>
            </select>
          </FormField>

          <div className="hidden">
            <FormField
              name="phonePrefix2"
              label="Prefix"
              errors={errorsByField.phonePrefix2 || []}
            >
              <input
                type="text"
                value={memberData.phonePrefix2}
                onChange={(e) =>
                  handleInputChange("phonePrefix2", e.target.value)
                }
                onBlur={() => handleFieldBlur("phonePrefix2")}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="+91"
                readOnly
                maxLength={5}
              />
            </FormField>
          </div>

          <FormField
            name="phoneNo2"
            label="Phone Number"
            errors={errorsByField.phoneNo2 || []}
          >
            <input
              type="tel"
              value={memberData.phoneNo2}
              onChange={(e) => handleInputChange("phoneNo2", e.target.value)}
              onBlur={() => handleFieldBlur("phoneNo2")}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Phone Number"
              maxLength={20}
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  // Voucher Info tab with max date validation
  const renderVoucherInfo = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Voucher Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            name="smAmount"
            label="SM Amount"
            errors={errorsByField.smAmount || []}
            required
          >
            <input
              type="text"
              pattern="^\d*(\.\d{0,2})?$"
              value={voucherData.smAmount}
              onChange={handleSmAmountChange}
              className="w-full px-3 py-2 border rounded"
              placeholder="Enter amount"
              inputMode="decimal"
              autoFocus
              readOnly={isEditMode}
              maxLength={15}
            />
          </FormField>
          {/* Admission Fees Account - readonly */}
          <FormField
            errors={errorsByField.admissionFeesAccount || []}
            name="admissionFeesAccount"
            label="Admission Fees Account"
          >
            <input
              type="text"
              value={voucherData.admissionFeesAccount}
              readOnly
              className="w-full px-3 py-2 border rounded bg-gray-100"
              placeholder="Admission Fees Account"
            />
          </FormField>
          {/* Admission Fee Amount - readonly */}
          <FormField
            errors={errorsByField.admissionFeeAmount || []}
            name="admissionFeeAmount"
            label="Admission Fee Amount"
          >
            <input
              type="text"
              value={voucherData.admissionFeeAmount}
              readOnly
              className="w-full px-3 py-2 border rounded bg-gray-100"
              placeholder="Admission Fee Amount"
            />
          </FormField>
          {/* Debit Account Dropdown */}
          <FormField
            errors={errorsByField.debitAccount || []}
            name="debitAccount"
            label="Debit Account"
            required
          >
            <Select
              id="debitAccount"
              options={accOptions}
              value={
                accOptions.find((option) => option.value === debitAccount) ||
                null
              }
              ref={refDebitAccount}
              onChange={(selected) => {
                setDebitAccountId(selected ? selected.value : "");
                handleInputChange(
                  "debitAccount",
                  selected ? selected.value : ""
                );
              }}
              placeholder="Select Debit Account"
              isClearable
              required
              isDisabled={isEditMode}
              className="text-sm"
            />
          </FormField>
          {/* Debit Amount - sum, readonly */}
          <FormField
            errors={errorsByField.debitAmount || []}
            name="debitAmount"
            label="Debit Amount"
          >
            <input
              type="text"
              value={voucherData.debitAmount}
              readOnly
              className="w-full px-3 py-2 border rounded bg-gray-100"
              placeholder="Debit Amount"
            />
          </FormField>
          {/* Narration */}
          <FormField
            errors={errorsByField.narration || []}
            name="narration"
            label="Voucher Narration"
          >
            <textarea
              value={voucherData.narration}
              onChange={handleNarrationChange}
              className="w-full px-3 py-2 border rounded"
              maxLength={255}
              readOnly={isEditMode}
              placeholder="Narration"
              rows={2}
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "basic":
        return renderBasicInfo();
      case "address":
        return renderAddressInfo();
      case "contact":
        return renderContactInfo();
      case "documents":
        return renderDocumentsInfo();
      case "voucher":
        return renderVoucherInfo();
      case "nominees":
        return renderNomineesInfo();
      default:
        return renderBasicInfo();
    }
  };

  return (
    <DashboardLayout
      mainContent={
        <div className="-mt-3 bg-gradient-to-br from-gray-100 to-blue-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <UserCheck className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Member Master
                    </h1>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/member-operations")}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Operations
                </button>
              </div>
            </div>

            {/* Add Validation Summary */}
            <ValidationSummary
              errors={errors}
              errorsByTab={errorsByTab}
              isVisible={showValidationSummary}
              onErrorClick={(fieldName, tab) => {
                setActiveTab(tab);
              }}
              onClose={() => setShowValidationSummary(false)}
            />

            {/* Tab Navigation with Error Indicators */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-0 overflow-x-auto">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const tabErrorCount = errorsByTab[tab.id]?.length || 0;

                    return (
                      <button
                        key={tab.id}
                        data-tab-id={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={getTabClassName(tab.id)}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        {tabErrorCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {tabErrorCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6 sm:p-8">{renderTabContent()}</div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-end gap-4">
                  <button
                    onClick={isEditMode ? handleResetNotAllowed : handleReset}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Form
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Member
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default MemberMaster;
