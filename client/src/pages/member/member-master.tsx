import React, { useState, useRef, useEffect } from 'react';
import { useFormValidation } from '../../services/Validations/member/useFormValidation';
import { ValidationSummary } from '../../components/Validations/ValidationSummary';
import { FormField } from '../../components/Validations/FormField';
import Swal from 'sweetalert2';
import { ValidationError } from '../../services/Validations/validation';
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
  Image as ImageIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../Common/Layout';

// File Upload Component
const FileUploadComponent = ({ 
  onFileSelect, 
  acceptedTypes = "image/*", 
  maxSize = 5 * 1024 * 1024, // 5MB
  title = "Upload Pictures"
}) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFiles = (files) => {
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid File Type',
          text: 'Please upload only image files (PNG, JPG, JPEG)',
        });
        return false;
      }
      
      if (file.size > maxSize) {
        Swal.fire({
          icon: 'error',
          title: 'File Too Large',
          text: `File size must be less than ${maxSize / (1024 * 1024)}MB`,
        });
        return false;
      }
      
      return true;
    });

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newFile = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          type: file.type,
          preview: e.target.result,
          file: file
        };
        
        setUploadedFiles(prev => [...prev, newFile]);
        if (onFileSelect) onFileSelect(newFile);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
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
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-2">
          <Upload className="w-8 h-8 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">{title}</p>
            <p className="text-xs text-gray-500">
              Click to browse or drag and drop images here
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
        multiple
        accept={acceptedTypes}
        onChange={(e) => handleFiles(Array.from(e.target.files))}
        className="hidden"
      />

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <p className="text-xs text-gray-600 mt-1 truncate">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// AutocompleteSelect Component (keeping existing one)
const AutocompleteSelect = ({ 
  id, 
  value, 
  onChange, 
  options, 
  placeholder, 
  required = false, 
  icon: Icon,
  disabled = false,
  errors = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const hasErrors = errors.length > 0;

  useEffect(() => {
    if (searchTerm) {
      const filtered = options.filter(option =>
        option.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [searchTerm, options]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(option => option.id === value);
  const displayValue = selectedOption ? selectedOption.name : "";

  const handleOptionSelect = (option) => {
    onChange(option.id);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors z-10">
          <Icon className="w-4 h-4" />
        </div>
        
        <input
          type="text"
          id={id}
          value={isOpen ? searchTerm : displayValue}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => !disabled && setIsOpen(true)}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          ref={inputRef}
          required={required}
          disabled={disabled}
          className={`w-full pl-10 pr-10 py-2.5 border-2 rounded-lg focus:ring-2 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed ${
            hasErrors 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50' 
              : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
          }`}
          placeholder={placeholder}
          autoComplete="off"
        />
        
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
          <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>⌄</div>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-gray-500 text-sm">No results found</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors duration-150 border-b border-gray-100 last:border-b-0 ${
                  value === option.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-gray-400" />
                  {option.name}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Mock data (keeping existing ones)
const mockVillages = [
  { id: '1', name: 'Village Rajouri' },
  { id: '2', name: 'Village Karol Bagh' },
  { id: '3', name: 'Village Lajpat Nagar' }
];

const mockRelations = [
  { id: '1', name: 'Father' },
  { id: '2', name: 'Mother' },
  { id: '3', name: 'Spouse' },
  { id: '4', name: 'Son' },
  { id: '5', name: 'Daughter' }
];

const mockCastes = [
  { id: '1', name: 'General' },
  { id: '2', name: 'OBC' },
  { id: '3', name: 'SC' },
  { id: '4', name: 'ST' }
];

const mockOccupations = [
  { id: '1', name: 'Business' },
  { id: '2', name: 'Service' },
  { id: '3', name: 'Agriculture' },
  { id: '4', name: 'Other' }
];

const MemberMaster = () => {
  const { 
    errors, 
    validateForm, 
    clearErrors, 
    markFieldTouched 
  } = useFormValidation();
  const navigate = useNavigate();
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [loading, setLoading] = useState(false);

  // Basic Information State (removing status, statusDate, categoryId)
  const [memberData, setMemberData] = useState({
    accountNumber: '',
    defAreaBrId: '',
    memberType: '',
    nominalMembershipNo: '',
    permanentMembershipNo: '',
    firstName: '',
    lastName: '',
    firstNameSL: '',
    lastNameSL: '',
    relFirstName: '',
    relLastName: '',
    relationId: '',
    gender: '',
    dob: '',
    casteId: '',
    joiningDate: '',
    occupationId: '',
    // Address fields
    thana: '',
    addressLine1: '',
    addressLineSL1: '',
    villageId1: '',
    po1: '',
    tehsil1: '',
    addressLine2: '',
    addressLineSL2: '',
    villageId2: '',
    po2: '',
    tehsil2: '',
    // Contact fields
    phoneType1: '',
    phonePrefix1: '',
    phoneNo1: '',
    phoneType2: '',
    phonePrefix2: '',
    phoneNo2: '',
    // Document fields
    panCardNo: '',
    aadhaarCardNo: '',
    gstiNo: '',
    // Zone field
    zoneId: ''
  });

  // Voucher Info State (new tab)
  const [voucherData, setVoucherData] = useState({
    voucherNumber: '',
    voucherDate: '',
    voucherAmount: '',
    voucherType: '',
    voucherDescription: '',
    referenceNumber: '',
    approvedBy: '',
    approvedDate: ''
  });

  // Document uploads state
  const [documentUploads, setDocumentUploads] = useState([]);

  // Nominees State (keeping existing)
  const [nominees, setNominees] = useState([
    {
      id: Date.now(),
      firstName: '',
      lastName: '',
      firstNameSL: '',
      lastNameSL: '',
      relation: '',
      age: '',
      isMinor: false,
      dob: '',
      nameOfGuardian: '',
      nameOfGuardianSL: '',
      nominationDate: '',
      aadhaarCardNo: ''
    }
  ]);

  // Existing functions (keeping all)
  const addNominee = () => {
    setNominees([...nominees, {
      id: Date.now(),
      firstName: '',
      lastName: '',
      firstNameSL: '',
      lastNameSL: '',
      relation: '',
      age: '',
      isMinor: false,
      dob: '',
      nameOfGuardian: '',
      nameOfGuardianSL: '',
      nominationDate: '',
      aadhaarCardNo: ''
    }]);
  };

  const removeNominee = (id) => {
    if (nominees.length > 1) {
      setNominees(nominees.filter(nominee => nominee.id !== id));
    }
  };

  const updateNominee = (id, field, value) => {
    setNominees(nominees.map(nominee => 
      nominee.id === id ? { ...nominee, [field]: value } : nominee
    ));
  };

  const handleInputChange = (field, value) => {
    setMemberData(prev => ({ ...prev, [field]: value }));
  };

  const handleVoucherInputChange = (field, value) => {
    setVoucherData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (file) => {
    setDocumentUploads(prev => [...prev, file]);
  };

  // Enhanced handleSubmit with validation (keeping existing)
  const handleSubmit = async () => {
    const validation = validateForm(memberData, nominees, voucherData, documentUploads);
    
    if (!validation.isValid) {
      setShowValidationSummary(true);
      
      // Show SweetAlert for critical errors
      await Swal.fire({
        icon: 'error',
        title: 'Validation Errors',
        html: `
          <div class="text-left">
            <p class="mb-3">Please fix the following ${validation.errors.length} error(s):</p>
            <div class="max-h-48 overflow-y-auto text-sm">
              ${Object.entries(validation.errorsByTab).map(([tab, tabErrors]) => `
                <div class="mb-2">
                  <strong class="text-blue-600">${tab.charAt(0).toUpperCase() + tab.slice(1)}:</strong>
                  <ul class="ml-4 list-disc">
                    ${(tabErrors as ValidationError[]).slice(0, 3).map(error => `
                      <li class="text-red-600">${error.message}</li>
                    `).join('')}
                    ${(tabErrors as ValidationError[]).length > 3 ? `<li class="text-gray-500">...and ${(tabErrors as ValidationError[]).length - 3} more</li>` : ''}
                  </ul>
                </div>
              `).join('')}
            </div>
          </div>
        `,
        confirmButtonText: 'Fix Errors',
        customClass: {
          popup: 'text-left'
        }
      });

      // Focus first error field
      const firstError = validation.errors[0];
      if (firstError) {
        setActiveTab(firstError.tab);
        
        setTimeout(() => {
          const cleanFieldName = firstError.field.replace(/\[|\]|\./g, '_');
          const element = document.getElementById(cleanFieldName);
          if (element) {
            element.focus();
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
      
      return;
    }

    // If validation passes, proceed with save
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Member created successfully!',
        confirmButtonColor: '#3B82F6'
      });
      
      clearErrors();
      setShowValidationSummary(false);
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to create member. Please try again.',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldBlur = (fieldName: string) => {
    markFieldTouched(fieldName);
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

  const handleReset = () => {
    setMemberData({
      accountNumber: '',
      defAreaBrId: '',
      memberType: '',
      nominalMembershipNo: '',
      permanentMembershipNo: '',
      firstName: '',
      lastName: '',
      firstNameSL: '',
      lastNameSL: '',
      relFirstName: '',
      relLastName: '',
      relationId: '',
      gender: '',
      dob: '',
      casteId: '',
      joiningDate: '',
      occupationId: '',
      thana: '',
      addressLine1: '',
      addressLineSL1: '',
      villageId1: '',
      po1: '',
      tehsil1: '',
      addressLine2: '',
      addressLineSL2: '',
      villageId2: '',
      po2: '',
      tehsil2: '',
      phoneType1: '',
      phonePrefix1: '',
      phoneNo1: '',
      phoneType2: '',
      phonePrefix2: '',
      phoneNo2: '',
      panCardNo: '',
      aadhaarCardNo: '',
      gstiNo: '',
      zoneId: ''
    });
    
    setVoucherData({
      voucherNumber: '',
      voucherDate: '',
      voucherAmount: '',
      voucherType: '',
      voucherDescription: '',
      referenceNumber: '',
      approvedBy: '',
      approvedDate: ''
    });
    
    setDocumentUploads([]);
    
    setNominees([{
      id: Date.now(),
      firstName: '',
      lastName: '',
      firstNameSL: '',
      lastNameSL: '',
      relation: '',
      age: '',
      isMinor: false,
      dob: '',
      nameOfGuardian: '',
      nameOfGuardianSL: '',
      nominationDate: '',
      aadhaarCardNo: ''
    }]);
    
    setActiveTab('basic');
    clearErrors();
    setShowValidationSummary(false);
  };

  // Add error indicators to tabs
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

  // Updated tabs array with new Voucher Info tab
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'documents', label: 'Documents', icon: CreditCard },
    { id: 'voucher', label: 'Voucher Info', icon: FileText }, // New tab
    { id: 'nominees', label: 'Nominees', icon: Users }
  ];

  // Keep existing render functions (renderBasicInfo, renderAddressInfo, renderContactInfo)
  const renderBasicInfo = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Account Number */}
      <FormField 
        name="accountNumber" 
        label="Account Number" 
        errors={errorsByField.accountNumber || []}
      >
        <input
          type="text"
          value={memberData.accountNumber}
          onChange={(e) => handleInputChange('accountNumber', e.target.value)}
          onBlur={() => handleFieldBlur('accountNumber')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Account Number"
          maxLength={20}
        />
      </FormField>

      {/* Membership Numbers */}
      <FormField 
        name="nominalMembershipNo" 
        label="Nominal Membership No" 
        errors={errorsByField.nominalMembershipNo || []}
      >
        <input
          type="text"
          value={memberData.nominalMembershipNo}
          onChange={(e) => handleInputChange('nominalMembershipNo', e.target.value)}
          onBlur={() => handleFieldBlur('nominalMembershipNo')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Nominal Membership No"
          maxLength={20}
        />
      </FormField>

      <FormField 
        name="permanentMembershipNo" 
        label="Permanent Membership No" 
        errors={errorsByField.permanentMembershipNo || []}
      >
        <input
          type="text"
          value={memberData.permanentMembershipNo}
          onChange={(e) => handleInputChange('permanentMembershipNo', e.target.value)}
          onBlur={() => handleFieldBlur('permanentMembershipNo')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Permanent Membership No"
          maxLength={20}
        />
      </FormField>

      {/* Name Fields */}
      <FormField 
        name="firstName" 
        label="First Name" 
        required 
        errors={errorsByField.firstName || []}
        icon={<User className="w-4 h-4 text-green-500" />}
      >
        <input
          type="text"
          value={memberData.firstName}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
          onBlur={() => handleFieldBlur('firstName')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter First Name"
          required
          maxLength={100}
        />
      </FormField>

      <FormField 
        name="lastName" 
        label="Last Name" 
        required 
        errors={errorsByField.lastName || []}
        icon={<User className="w-4 h-4 text-green-500" />}
      >
        <input
          type="text"
          value={memberData.lastName}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
          onBlur={() => handleFieldBlur('lastName')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Last Name"
          required
          maxLength={100}
        />
      </FormField>

      <FormField 
        name="firstNameSL" 
        label="First Name (Hindi)" 
        errors={errorsByField.firstNameSL || []}
        icon={<Globe className="w-4 h-4 text-purple-500" />}
      >
        <input
          type="text"
          value={memberData.firstNameSL}
          onChange={(e) => handleInputChange('firstNameSL', e.target.value)}
          onBlur={() => handleFieldBlur('firstNameSL')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="हिंदी में प्रथम नाम"
          maxLength={100}
          lang="hi"
        />
      </FormField>

      <FormField 
        name="lastNameSL" 
        label="Last Name (Hindi)" 
        errors={errorsByField.lastNameSL || []}
        icon={<Globe className="w-4 h-4 text-purple-500" />}
      >
        <input
          type="text"
          value={memberData.lastNameSL}
          onChange={(e) => handleInputChange('lastNameSL', e.target.value)}
          onBlur={() => handleFieldBlur('lastNameSL')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="हिंदी में अंतिम नाम"
          maxLength={100}
          lang="hi"
        />
      </FormField>

      {/* Relative Information */}
      <FormField 
        name="relFirstName" 
        label="Relative First Name" 
        required 
        errors={errorsByField.relFirstName || []}
      >
        <input
          type="text"
          value={memberData.relFirstName}
          onChange={(e) => handleInputChange('relFirstName', e.target.value)}
          onBlur={() => handleFieldBlur('relFirstName')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Relative First Name"
          required
          maxLength={100}
        />
      </FormField>

      <FormField 
        name="relLastName" 
        label="Relative Last Name" 
        errors={errorsByField.relLastName || []}
      >
        <input
          type="text"
          value={memberData.relLastName}
          onChange={(e) => handleInputChange('relLastName', e.target.value)}
          onBlur={() => handleFieldBlur('relLastName')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          placeholder="Enter Relative Last Name"
          maxLength={100}
        />
      </FormField>

      {/* Relation */}
      <FormField 
        name="relationId" 
        label="Relation" 
        errors={errorsByField.relationId || []}
      >
        <AutocompleteSelect
          id="relation"
          value={memberData.relationId}
          onChange={(value) => handleInputChange('relationId', value)}
          options={mockRelations}
          placeholder="Select Relation"
          icon={Users}
          errors={errorsByField.relationId || []}
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
          onChange={(e) => handleInputChange('gender', e.target.value)}
          onBlur={() => handleFieldBlur('gender')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          required
        >
          <option value="">Select Gender</option>
          <option value="1">Male</option>
          <option value="2">Female</option>
          <option value="3">Other</option>
        </select>
      </FormField>

      {/* DOB */}
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
          onChange={(e) => handleInputChange('dob', e.target.value)}
          onBlur={() => handleFieldBlur('dob')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          required
        />
      </FormField>

      {/* Joining Date */}
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
          onChange={(e) => handleInputChange('joiningDate', e.target.value)}
          onBlur={() => handleFieldBlur('joiningDate')}
          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
          required
        />
      </FormField>

      {/* Caste */}
      <FormField 
        name="casteId" 
        label="Caste" 
        errors={errorsByField.casteId || []}
      >
        <AutocompleteSelect
          id="caste"
          value={memberData.casteId}
          onChange={(value) => handleInputChange('casteId', value)}
          options={mockCastes}
          placeholder="Select Caste"
          icon={Users}
          errors={errorsByField.casteId || []}
        />
      </FormField>

      {/* Occupation */}
      <FormField 
        name="occupationId" 
        label="Occupation" 
        errors={errorsByField.occupationId || []}
      >
        <AutocompleteSelect
          id="occupation"
          value={memberData.occupationId}
          onChange={(value) => handleInputChange('occupationId', value)}
          options={mockOccupations}
          placeholder="Select Occupation"
          icon={Building}
          errors={errorsByField.occupationId || []}
        />
      </FormField>
    </div>
  );

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
            name="thana" 
            label="Thana" 
            errors={errorsByField.thana || []}
          >
            <input
              type="text"
              value={memberData.thana}
              onChange={(e) => handleInputChange('thana', e.target.value)}
              onBlur={() => handleFieldBlur('thana')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Thana"
              maxLength={100}
            />
          </FormField>

          <div className="lg:col-span-2">
            <FormField 
              name="addressLine1" 
              label="Address Line 1" 
              required 
              errors={errorsByField.addressLine1 || []}
            >
              <input
                type="text"
                value={memberData.addressLine1}
                onChange={(e) => handleInputChange('addressLine1', e.target.value)}
                onBlur={() => handleFieldBlur('addressLine1')}
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
                onChange={(e) => handleInputChange('addressLineSL1', e.target.value)}
                onBlur={() => handleFieldBlur('addressLineSL1')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="हिंदी में पता लाइन 1"
                maxLength={150}
                lang="hi"
              />
            </FormField>
          </div>

          <FormField 
            name="villageId1" 
            label="Village" 
            required 
            errors={errorsByField.villageId1 || []}
          >
            <AutocompleteSelect
              id="village1"
              value={memberData.villageId1}
              onChange={(value) => handleInputChange('villageId1', value)}
              options={mockVillages}
              placeholder="Select Village"
              required={true}
              icon={MapPin}
              errors={errorsByField.villageId1 || []}
            />
          </FormField>

          <FormField 
            name="po1" 
            label="Post Office" 
            errors={errorsByField.po1 || []}
          >
            <input
              type="text"
              value={memberData.po1}
              onChange={(e) => handleInputChange('po1', e.target.value)}
              onBlur={() => handleFieldBlur('po1')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Post Office"
            />
          </FormField>

          <FormField 
            name="tehsil1" 
            label="Tehsil" 
            errors={errorsByField.tehsil1 || []}
          >
            <input
              type="text"
              value={memberData.tehsil1}
              onChange={(e) => handleInputChange('tehsil1', e.target.value)}
              onBlur={() => handleFieldBlur('tehsil1')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Tehsil"
            />
          </FormField>
        </div>
      </div>

      {/* Secondary Address */}
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
          <Home className="w-5 h-5" />
          Secondary Address (Optional)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FormField 
              name="addressLine2" 
              label="Address Line 2" 
              errors={errorsByField.addressLine2 || []}
            >
              <input
                type="text"
                value={memberData.addressLine2}
                onChange={(e) => handleInputChange('addressLine2', e.target.value)}
                onBlur={() => handleFieldBlur('addressLine2')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter Address Line 2"
                maxLength={150}
              />
            </FormField>
          </div>

          <FormField 
            name="villageId2" 
            label="Village" 
            errors={errorsByField.villageId2 || []}
          >
            <AutocompleteSelect
              id="village2"
              value={memberData.villageId2}
              onChange={(value) => handleInputChange('villageId2', value)}
              options={mockVillages}
              placeholder="Select Village"
              icon={MapPin}
              errors={errorsByField.villageId2 || []}
            />
          </FormField>

          <div className="lg:col-span-3">
            <FormField 
              name="addressLineSL2" 
              label="Address Line 2 (Hindi)" 
              errors={errorsByField.addressLineSL2 || []}
            >
              <input
                type="text"
                value={memberData.addressLineSL2}
                onChange={(e) => handleInputChange('addressLineSL2', e.target.value)}
                onBlur={() => handleFieldBlur('addressLineSL2')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="हिंदी में पता लाइन 2"
                maxLength={150}
                lang="hi"
              />
            </FormField>
          </div>

          <FormField 
            name="po2" 
            label="Post Office" 
            errors={errorsByField.po2 || []}
          >
            <input
              type="text"
              value={memberData.po2}
              onChange={(e) => handleInputChange('po2', e.target.value)}
              onBlur={() => handleFieldBlur('po2')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Post Office"
            />
          </FormField>

          <FormField 
            name="tehsil2" 
            label="Tehsil" 
            errors={errorsByField.tehsil2 || []}
          >
            <input
              type="text"
              value={memberData.tehsil2}
              onChange={(e) => handleInputChange('tehsil2', e.target.value)}
              onBlur={() => handleFieldBlur('tehsil2')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Tehsil"
            />
          </FormField>
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
            name="phoneType1" 
            label="Phone Type" 
            errors={errorsByField.phoneType1 || []}
          >
            <select
              value={memberData.phoneType1}
              onChange={(e) => handleInputChange('phoneType1', e.target.value)}
              onBlur={() => handleFieldBlur('phoneType1')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
            >
              <option value="">Select Type</option>
              <option value="1">Mobile</option>
              <option value="2">Landline</option>
              <option value="3">Office</option>
            </select>
          </FormField>

          <FormField 
            name="phonePrefix1" 
            label="Prefix" 
            errors={errorsByField.phonePrefix1 || []}
          >
            <input
              type="text"
              value={memberData.phonePrefix1}
              onChange={(e) => handleInputChange('phonePrefix1', e.target.value)}
              onBlur={() => handleFieldBlur('phonePrefix1')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="+91"
              maxLength={5}
            />
          </FormField>

          <FormField 
            name="phoneNo1" 
            label="Phone Number" 
            errors={errorsByField.phoneNo1 || []}
          >
            <input
              type="tel"
              value={memberData.phoneNo1}
              onChange={(e) => handleInputChange('phoneNo1', e.target.value)}
              onBlur={() => handleFieldBlur('phoneNo1')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Phone Number"
              maxLength={20}
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
            name="phoneType2" 
            label="Phone Type" 
            errors={errorsByField.phoneType2 || []}
          >
            <select
              value={memberData.phoneType2}
              onChange={(e) => handleInputChange('phoneType2', e.target.value)}
              onBlur={() => handleFieldBlur('phoneType2')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
            >
              <option value="">Select Type</option>
              <option value="1">Mobile</option>
              <option value="2">Landline</option>
              <option value="3">Office</option>
            </select>
          </FormField>

          <FormField 
            name="phonePrefix2" 
            label="Prefix" 
            errors={errorsByField.phonePrefix2 || []}
          >
            <input
              type="text"
              value={memberData.phonePrefix2}
              onChange={(e) => handleInputChange('phonePrefix2', e.target.value)}
              onBlur={() => handleFieldBlur('phonePrefix2')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="+91"
              maxLength={5}
            />
          </FormField>

          <FormField 
            name="phoneNo2" 
            label="Phone Number" 
            errors={errorsByField.phoneNo2 || []}
          >
            <input
              type="tel"
              value={memberData.phoneNo2}
              onChange={(e) => handleInputChange('phoneNo2', e.target.value)}
              onBlur={() => handleFieldBlur('phoneNo2')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              placeholder="Enter Phone Number"
              maxLength={20}
            />
          </FormField>
        </div>
      </div>
    </div>
  );

  // Updated Documents tab with image upload (removed status, statusDate, categoryId)
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
            errors={errorsByField.panCardNo || []}
            icon={<CreditCard className="w-4 h-4 text-blue-500" />}
            description="Format: ABCDE1234F"
          >
            <input
              type="text"
              value={memberData.panCardNo}
              onChange={(e) => handleInputChange('panCardNo', e.target.value.toUpperCase())}
              onBlur={() => handleFieldBlur('panCardNo')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter PAN Number"
              maxLength={20}
              pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
            />
          </FormField>

          <FormField 
            name="aadhaarCardNo" 
            label="Aadhaar Card Number" 
            errors={errorsByField.aadhaarCardNo || []}
            icon={<CreditCard className="w-4 h-4 text-green-500" />}
            description="Format: 1234 5678 9012"
          >
            <input
              type="text"
              value={memberData.aadhaarCardNo}
              onChange={(e) => handleInputChange('aadhaarCardNo', e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))}
              onBlur={() => handleFieldBlur('aadhaarCardNo')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Aadhaar Number"
              maxLength={14}
              pattern="[0-9]{4}\s[0-9]{4}\s[0-9]{4}"
            />
          </FormField>

          <FormField 
            name="gstiNo" 
            label="GSTIN Number" 
            errors={errorsByField.gstiNo || []}
            icon={<CreditCard className="w-4 h-4 text-purple-500" />}
          >
            <input
              type="text"
              value={memberData.gstiNo}
              onChange={(e) => handleInputChange('gstiNo', e.target.value.toUpperCase())}
              onBlur={() => handleFieldBlur('gstiNo')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter GSTIN"
              maxLength={25}
            />
          </FormField>
        </div>
      </div>

      {/* Document Upload Section */}
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Document Pictures
        </h3>
        <FileUploadComponent
          onFileSelect={handleFileUpload}
          title="Upload Document Pictures"
          acceptedTypes="image/*"
          maxSize={5 * 1024 * 1024}
        />
      </div>
    </div>
  );

  // New Voucher Info tab
  const renderVoucherInfo = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Voucher Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField 
            name="voucherNumber" 
            label="Voucher Number" 
            errors={errorsByField.voucherNumber || []}
          >
            <input
              type="text"
              value={voucherData.voucherNumber}
              onChange={(e) => handleVoucherInputChange('voucherNumber', e.target.value)}
              onBlur={() => handleFieldBlur('voucherNumber')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Voucher Number"
              maxLength={50}
            />
          </FormField>

          <FormField 
            name="voucherDate" 
            label="Voucher Date" 
            errors={errorsByField.voucherDate || []}
            icon={<Calendar className="w-4 h-4 text-purple-500" />}
          >
            <input
              type="date"
              value={voucherData.voucherDate}
              onChange={(e) => handleVoucherInputChange('voucherDate', e.target.value)}
              onBlur={() => handleFieldBlur('voucherDate')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </FormField>

          <FormField 
            name="voucherAmount" 
            label="Voucher Amount" 
            errors={errorsByField.voucherAmount || []}
          >
            <input
              type="number"
              value={voucherData.voucherAmount}
              onChange={(e) => handleVoucherInputChange('voucherAmount', e.target.value)}
              onBlur={() => handleFieldBlur('voucherAmount')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Amount"
              min="0"
              step="0.01"
            />
          </FormField>

          <FormField 
            name="voucherType" 
            label="Voucher Type" 
            errors={errorsByField.voucherType || []}
          >
            <select
              value={voucherData.voucherType}
              onChange={(e) => handleVoucherInputChange('voucherType', e.target.value)}
              onBlur={() => handleFieldBlur('voucherType')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            >
              <option value="">Select Voucher Type</option>
              <option value="1">Receipt</option>
              <option value="2">Payment</option>
              <option value="3">Journal</option>
              <option value="4">Contra</option>
            </select>
          </FormField>

          <FormField 
            name="referenceNumber" 
            label="Reference Number" 
            errors={errorsByField.referenceNumber || []}
          >
            <input
              type="text"
              value={voucherData.referenceNumber}
              onChange={(e) => handleVoucherInputChange('referenceNumber', e.target.value)}
              onBlur={() => handleFieldBlur('referenceNumber')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Reference Number"
              maxLength={50}
            />
          </FormField>

          <FormField 
            name="approvedBy" 
            label="Approved By" 
            errors={errorsByField.approvedBy || []}
          >
            <input
              type="text"
              value={voucherData.approvedBy}
              onChange={(e) => handleVoucherInputChange('approvedBy', e.target.value)}
              onBlur={() => handleFieldBlur('approvedBy')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              placeholder="Enter Approver Name"
              maxLength={100}
            />
          </FormField>

          <FormField 
            name="approvedDate" 
            label="Approved Date" 
            errors={errorsByField.approvedDate || []}
            icon={<Calendar className="w-4 h-4 text-green-500" />}
          >
            <input
              type="date"
              value={voucherData.approvedDate}
              onChange={(e) => handleVoucherInputChange('approvedDate', e.target.value)}
              onBlur={() => handleFieldBlur('approvedDate')}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </FormField>

          <div className="lg:col-span-3">
            <FormField 
              name="voucherDescription" 
              label="Voucher Description" 
              errors={errorsByField.voucherDescription || []}
            >
              <textarea
                value={voucherData.voucherDescription}
                onChange={(e) => handleVoucherInputChange('voucherDescription', e.target.value)}
                onBlur={() => handleFieldBlur('voucherDescription')}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none resize-vertical"
                placeholder="Enter Voucher Description"
                rows={3}
                maxLength={500}
              />
            </FormField>
          </div>
        </div>
      </div>
    </div>
  );

  // Keep existing nominees render function
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
        <div key={nominee.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
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
              name={`nominees[${index}].firstName`} 
              label="First Name" 
              required 
              errors={errorsByField[`nominees[${index}].firstName`] || []}
            >
              <input
                type="text"
                value={nominee.firstName}
                onChange={(e) => updateNominee(nominee.id, 'firstName', e.target.value)}
                onBlur={() => handleFieldBlur(`nominees[${index}].firstName`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter First Name"
                required
              />
            </FormField>

            <FormField 
              name={`nominees[${index}].lastName`} 
              label="Last Name" 
              errors={errorsByField[`nominees[${index}].lastName`] || []}
            >
              <input
                type="text"
                value={nominee.lastName}
                onChange={(e) => updateNominee(nominee.id, 'lastName', e.target.value)}
                onBlur={() => handleFieldBlur(`nominees[${index}].lastName`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter Last Name"
              />
            </FormField>

            <FormField 
              name={`nominees[${index}].firstNameSL`} 
              label="First Name (Hindi)" 
              errors={errorsByField[`nominees[${index}].firstNameSL`] || []}
            >
              <input
                type="text"
                value={nominee.firstNameSL}
                onChange={(e) => updateNominee(nominee.id, 'firstNameSL', e.target.value)}
                onBlur={() => handleFieldBlur(`nominees[${index}].firstNameSL`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="हिंदी में प्रथम नाम"
                lang="hi"
              />
            </FormField>

            <FormField 
              name={`nominees[${index}].lastNameSL`} 
              label="Last Name (Hindi)" 
              errors={errorsByField[`nominees[${index}].lastNameSL`] || []}
            >
              <input
                type="text"
                value={nominee.lastNameSL}
                onChange={(e) => updateNominee(nominee.id, 'lastNameSL', e.target.value)}
                onBlur={() => handleFieldBlur(`nominees[${index}].lastNameSL`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="हिंदी में अंतिम नाम"
                lang="hi"
              />
            </FormField>

            <FormField 
              name={`nominees[${index}].relation`} 
              label="Relation" 
              errors={errorsByField[`nominees[${index}].relation`] || []}
            >
              <select
                value={nominee.relation}
                onChange={(e) => updateNominee(nominee.id, 'relation', e.target.value)}
                onBlur={() => handleFieldBlur(`nominees[${index}].relation`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              >
                <option value="">Select Relation</option>
                <option value="1">Father</option>
                <option value="2">Mother</option>
                <option value="3">Spouse</option>
                <option value="4">Son</option>
                <option value="5">Daughter</option>
                <option value="6">Brother</option>
                <option value="7">Sister</option>
              </select>
            </FormField>

            <FormField 
              name={`nominees[${index}].age`} 
              label="Age" 
              errors={errorsByField[`nominees[${index}].age`] || []}
            >
              <input
                type="number"
                value={nominee.age}
                onChange={(e) => updateNominee(nominee.id, 'age', e.target.value)}
                onBlur={() => handleFieldBlur(`nominees[${index}].age`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="Enter Age"
                min="0"
                max="120"
              />
            </FormField>

            <FormField 
              name={`nominees[${index}].dob`} 
              label="Date of Birth" 
              errors={errorsByField[`nominees[${index}].dob`] || []}
            >
              <input
                type="date"
                value={nominee.dob}
                onChange={(e) => updateNominee(nominee.id, 'dob', e.target.value)}
                onBlur={() => handleFieldBlur(`nominees[${index}].dob`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              />
            </FormField>

            <FormField 
              name={`nominees[${index}].nominationDate`} 
              label="Nomination Date" 
              errors={errorsByField[`nominees[${index}].nominationDate`] || []}
            >
              <input
                type="date"
                value={nominee.nominationDate}
                onChange={(e) => updateNominee(nominee.id, 'nominationDate', e.target.value)}
                onBlur={() => handleFieldBlur(`nominees[${index}].nominationDate`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
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
                onChange={(e) => updateNominee(nominee.id, 'aadhaarCardNo', e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))}
                onBlur={() => handleFieldBlur(`nominees[${index}].aadhaarCardNo`)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                placeholder="1234 5678 9012"
                maxLength={14}
              />
            </FormField>

            {/* Minor checkbox and guardian fields */}
            <div className="flex items-center gap-2 md:col-span-2 lg:col-span-3">
              <input
                type="checkbox"
                id={`isMinor-${nominee.id}`}
                checked={nominee.isMinor}
                onChange={(e) => updateNominee(nominee.id, 'isMinor', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor={`isMinor-${nominee.id}`} className="text-sm font-semibold text-gray-700">
                Is Minor (Below 18 years)
              </label>
            </div>

            {nominee.isMinor && (
              <>
                <FormField 
                  name={`nominees[${index}].nameOfGuardian`} 
                  label="Guardian Name" 
                  required={nominee.isMinor}
                  errors={errorsByField[`nominees[${index}].nameOfGuardian`] || []}
                >
                  <input
                    type="text"
                    value={nominee.nameOfGuardian}
                    onChange={(e) => updateNominee(nominee.id, 'nameOfGuardian', e.target.value)}
                    onBlur={() => handleFieldBlur(`nominees[${index}].nameOfGuardian`)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                    placeholder="Enter Guardian Name"
                    required={nominee.isMinor}
                  />
                </FormField>

                <FormField 
                  name={`nominees[${index}].nameOfGuardianSL`} 
                  label="Guardian Name (Hindi)" 
                  errors={errorsByField[`nominees[${index}].nameOfGuardianSL`] || []}
                >
                  <input
                    type="text"
                    value={nominee.nameOfGuardianSL}
                    onChange={(e) => updateNominee(nominee.id, 'nameOfGuardianSL', e.target.value)}
                    onBlur={() => handleFieldBlur(`nominees[${index}].nameOfGuardianSL`)}
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicInfo();
      case 'address':
        return renderAddressInfo();
      case 'contact':
        return renderContactInfo();
      case 'documents':
        return renderDocumentsInfo();
      case 'voucher': // New tab
        return renderVoucherInfo();
      case 'nominees':
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
                  onClick={() =>navigate("/member-operations")}
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
              <div className="p-6 sm:p-8">
                {renderTabContent()}
              </div>

              {/* Action Buttons */}
              <div className="border-t border-gray-200 p-6 bg-gray-50">
                <div className="flex justify-end gap-4">
                  <button
                    onClick={handleReset}
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
