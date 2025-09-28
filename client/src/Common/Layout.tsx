import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { setUser, clearUser } from "../redux/userSlice";
import {
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Calculator,
  Users,
  Building,
  DollarSign,
  Heart,
  FileText,
  MessageCircle,
  LayoutDashboard,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../components/HeaderLandingPage";
import Footer from "../components/Footer";
import ApiService from "../services/api";
import { useEffect } from "react";
import { debug } from "console";
import Swal from "sweetalert2";

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
}

interface SubMenuItem {
  label: string;
  path: string;
  subItems?: SubMenuItem[];
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  isExpanded?: boolean;
  hasSubItems?: boolean;
  isActive?: boolean;
  subItems?: SubMenuItem[];
  isCollapsed?: boolean;
  path?: string;
  level?: number;
}

interface DashboardLayoutProps {
  mainContent: React.ReactNode;
  user?: { name: string; balance: number };
  transactions?: Transaction[];
  enableScroll?: boolean;
}

export const useBrowserNavigationControl = (shouldDisable: boolean = true) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!shouldDisable) return;

    // Add a dummy entry to history to prevent going back
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      // Push the current location back to prevent navigation
      window.history.pushState(null, "", location.pathname + location.search);
    };

    // Push current state to prevent back
    window.history.pushState(null, "", location.pathname + location.search);

    // Listen for browser navigation attempts
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [location, shouldDisable]);
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  mainContent,
  enableScroll = true,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<{
    [key: string]: boolean;
  }>({});
  const [activePath, setActivePath] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  useBrowserNavigationControl(true);
  useEffect(() => {
    const init = async () => {
      try {
        // const tokenResult = await ApiService.validate_token();

        // if (!tokenResult.success) {
        //   navigate("/session-expired");
        //   return;
        // }

        // only run this if token is valid
        const data = await ApiService.get_login_info();
        if (data.success) {
          dispatch(
            setUser({
              name: data.userName,
              email: data.email,
              branch_name: data.branchName,
              address: data.address,
              contact: data.contact,
              workingdate: data.workingDate,
              branchid: data.branchId,
            })
          );
        } else {
          navigate("/session-expired");
        }
      } catch (error) {
        console.error("Error in session init:", error);
        navigate("/session-expired");
      }
    };

    init();
    setActivePath(location.pathname);
  }, [location.pathname, navigate, dispatch]);

  React.useEffect(() => {
    const currentPath = location.pathname;
    setActivePath(currentPath);
    menuItems.forEach((item) => {
      if (item.path === currentPath) {
        setExpandedItems((prev) => ({ ...prev, [item.label]: false }));
      } else if (item.hasSubItems && item.subItems) {
        item.subItems.forEach((subItem) => {
          if (
            subItem.path === currentPath ||
            subItem.subItems?.some(
              (thirdItem) => thirdItem.path === currentPath
            )
          ) {
            setExpandedItems((prev) => ({ ...prev, [item.label]: true }));
          }
          if (subItem.subItems) {
            subItem.subItems.forEach((thirdItem) => {
              if (thirdItem.path === currentPath) {
                setExpandedItems((prev) => ({
                  ...prev,
                  [item.label]: true,
                  [subItem.label]: true,
                }));
              }
            });
          }
        });
      }
    });
  }, [location.pathname]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const toggleExpand = (label: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleItemClick = (
    label: string,
    hasSubItems: boolean,
    path?: string
  ) => {
    if (hasSubItems) {
      toggleExpand(label);
    } else if (path) {
      setActivePath(path);
      navigate(path);
    }
  };

  const menuItems = [
    {
      icon: <LayoutDashboard size={18} />,
      label: "Dashboard",
      hasSubItems: false,
      path: "/dashboard",
    },
    {
      icon: <Calculator size={18} />,
      label: "Modules",
      hasSubItems: true,
      subItems: [
        {
          label: "Miscalleneous Masters",
          path: "",
          subItems: [
            {
              label: "Account Head Type Master",
              path: "/accountheadtype-operations",
            },
            { label: "Account Head Master", path: "/accounthead-operations" },
            { label: "Caste Master", path: "/caste-operations" },
            { label: "Category Master", path: "/category-operations" },
            { label: "Relation Master", path: "/relation-operations" },
            { label: "State Master", path: "/state-operations" },
          ],
        },
        {
          label: "Location Masters",
          path: "",
          subItems: [
            { label: "Post Office Master", path: "/postOffice-operations" },
            { label: "Tehsil Master", path: "/tehsil-operations" },
            { label: "Thana Master", path: "/thana-operations" },
            { label: "Zone Master", path: "/zone-operations" },
            { label: "Village Master", path: "/village-operations" },
          ],
        },
        {
          label: "Masters",
          path: "",
          subItems: [
            { label: "Account Masters", path: "/account-operations" },
            { label: "Member Master", path: "/member-operations" },
            // { label: "Tehsil Master", path: "/tehsil-operations" },
            // { label: "Thana Master", path: "/thana-operations" },
            // { label: "Zone Master", path: "/zone-operations" },
            // { label: "Village Master", path: "/village-operations" },
          ],
        },
        // { label: "Sales", path: "/modules/sales" },
        // { label: "CRM", path: "/modules/crm" },
        // { label: "Stock", path: "/modules/stock" },
        // { label: "Manufacturing", path: "/modules/manufacturing" },
        // { label: "Projects", path: "/modules/projects" },
        // { label: "Assets", path: "/modules/assets" },
        // { label: "Point of Sale", path: "/modules/pos" },
        // { label: "Quality", path: "/modules/quality" },
        // { label: "Support", path: "/modules/support" },
        // { label: "HR & Payroll", path: "/modules/hr-payroll" },
        // { label: "No-Code Builder", path: "/modules/no-code-builder" },
      ],
    },
  ];

  const MenuItem: React.FC<MenuItemProps> = ({
    icon,
    label,
    isExpanded,
    hasSubItems,
    isActive,
    subItems,
    isCollapsed,
    path,
    level = 1,
  }) => {
    const handleClick = () => {
      handleItemClick(label, hasSubItems || false, path);
    };

    const getIndentation = () => {
      if (level === 1) return "px-4";
      if (level === 2) return "px-8";
      return "px-12";
    };

    const getHighlightStyle = () => {
      if (level === 1)
        return isActive
          ? "bg-blue-600 text-white shadow-md"
          : "text-gray-800 hover:bg-blue-100";
      if (level === 2)
        return isActive
          ? "bg-blue-200 text-blue-800 font-medium"
          : "text-gray-700 hover:bg-blue-100";
      return isActive
        ? "bg-blue-100 text-blue-900 font-medium"
        : "text-gray-600 hover:bg-blue-50";
    };

    return (
      <div>
        <div
          onClick={handleClick}
          className={`flex items-center justify-between ${getIndentation()} py-3 text-base cursor-pointer transition-all duration-200 group ${getHighlightStyle()}`}
        >
          <div className="flex items-center gap-4">
            {level === 1 && (
              <span
                className={`text-lg ${
                  isActive ? "text-white" : "text-gray-600"
                }`}
              >
                {icon}
              </span>
            )}
            <span
              className={`font-medium block lg:${
                isCollapsed ? "hidden" : "inline"
              } ${level > 1 ? "text-sm" : ""}`}
            >
              {label}
            </span>
          </div>
          {hasSubItems && !isCollapsed && (
            <span className={`${isActive ? "text-white" : "text-gray-500"}`}>
              {isExpanded ? (
                <ChevronDown size={18} />
              ) : (
                <ChevronRight size={18} />
              )}
            </span>
          )}
        </div>

        {hasSubItems && isExpanded && subItems && !isCollapsed && (
          <div
            className={`bg-blue-50 border-l-4 ${
              level === 1 ? "border-blue-200" : "border-blue-100"
            }`}
          >
            {subItems.map((subItem, idx) => (
              <MenuItem
                key={idx}
                icon={null}
                label={subItem.label}
                hasSubItems={!!subItem.subItems}
                isExpanded={expandedItems[subItem.label]}
                isActive={activePath === subItem.path}
                subItems={subItem.subItems}
                isCollapsed={isCollapsed}
                path={subItem.path}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
      {/* Bubbles */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400 rounded-full filter blur-3xl opacity-20 animate-pulse delay-2000" />
        <div className="absolute top-40 left-40 w-80 h-80 bg-purple-400 rounded-full filter blur-3xl opacity-20 animate-pulse delay-4000" />
      </div>

      <div className="relative z-10">
        <Header />
      </div>

      <div className="flex flex-1 relative z-10 overflow-hidden">
        {/* Sidebar */}
        <>
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={toggleSidebar}
            />
          )}

          <div
            className={`fixed top-0 left-0 h-screen bg-white z-50 border-r transition-all duration-300
              ${isCollapsed ? "w-20" : "w-80"}
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
              lg:translate-x-0 lg:relative lg:shadow-md`}
          >
            <div className="lg:hidden flex items-center justify-end p-4 bg-blue-700 text-white">
              <button onClick={toggleSidebar}>
                <X size={22} />
              </button>
            </div>

            <div className="hidden lg:flex justify-end p-3 border-b border-gray-200">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="flex items-center gap-2 text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition"
              >
                {isCollapsed ? <Menu size={18} /> : <X size={18} />}
              </button>
            </div>

            <nav
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{ maxHeight: "calc(100vh - 140px)", paddingBottom: "13px" }}
            >
              <div className="min-h-full pb-4">
                {menuItems.map((item) => {
                  const isParentActive =
                    activePath === item.path ||
                    (item.hasSubItems &&
                      item.subItems?.some(
                        (subItem) =>
                          activePath === subItem.path ||
                          subItem.subItems?.some(
                            (thirdItem) => activePath === thirdItem.path
                          )
                      ));
                  return (
                    <MenuItem
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      hasSubItems={item.hasSubItems}
                      isExpanded={expandedItems[item.label]}
                      isActive={isParentActive}
                      subItems={item.subItems}
                      isCollapsed={isCollapsed}
                      path={item.path}
                      level={1}
                    />
                  );
                })}
              </div>
            </nav>
          </div>
        </>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="lg:hidden p-4 bg-white shadow-sm flex-shrink-0">
            <button
              onClick={toggleSidebar}
              className="p-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700"
            >
              <Menu size={22} />
            </button>
          </div>

          <main
            id="mainlayoutdiv"
            className={`flex-1 p-6 sm:p-8 lg:p-10 ${
              enableScroll ? "overflow-y-auto" : ""
            }`}
          >
            {mainContent}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default DashboardLayout;
