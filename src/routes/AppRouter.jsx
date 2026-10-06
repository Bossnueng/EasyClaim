// src/routes/AppRouter.jsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import StaffClaimUpdate from "../pages/staff/StaffClaimUpdate";
import StaffHome from "../pages/staff/StaffHome";
import StaffClaimList from "../pages/staff/StaffClaimList";
import StaffChat from "../pages/staff/StaffChat";
import CustomerChat from "../pages/customer/CustomerChat";
import CustomerClaimList from "../pages/customer/CustomerClaimList";
import CustomerHome from "../pages/customer/CustomerHome";
import CustomerNewClaim from "../pages/customer/CustomerNewClaim";
import CustomerClaimDatail from "../pages/customer/CustomerClaimDetail";
import AgentManagement from "../pages/admin/AgentManagement";
import RoleManagement from "../pages/admin/RoleManagement";
import Login from "../pages/auth/Login";
import UserSettings from "../pages/auth/UserSettings";
import CustomerClaimProcessing from "../pages/customer/CustomerClaimProcessing";
import UserManagement from "../pages/admin/UserManagement";
import loginService from "../services/loginService";

// 🟢 ดึงข้อมูลผู้ใช้ และตรวจสอบสถานะ Authentication ที่ถูกต้อง
const getValidUser = () => {
  const user = loginService.getCurrentUser();
  const token = loginService.getToken(); // ดึง token จาก localStorage ตรงๆ

  // ตรวจสอบว่ามี Token และมี User (ที่มี user_id หรือ id)
  const userId = user?.user_id || user?.id;

  if (!token || !user || !userId) {
    loginService.logout?.(); 
    return null;
  }
  return user;
};

// 🟢 เช็กว่าเป็น Staff/Admin (รองรับ role_id 1, 3, 4, 5)
const isStaff = (user) => {
  if (!user) return false;
  const roleId = Number(user.role_id);
  const roleStr = String(user.role || user.user_type || "").toLowerCase();
  
  const staffRoleIds = [1, 3, 4, 5]; 
  return staffRoleIds.includes(roleId) || roleStr === "staff" || roleStr === "admin";
};

// 1. ตรวจสอบ Login
const ProtectedRoute = () => {
  const user = getValidUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

// 2. ตรวจสอบสิทธิ์ Staff/Admin
const StaffRoute = () => {
  const user = getValidUser();
  if (!isStaff(user)) {
    return <Navigate to="/customer" replace />;
  }
  return <Outlet />;
};

// 3. ตรวจสอบสิทธิ์ Customer
const CustomerRoute = () => {
  const user = getValidUser();
  if (isStaff(user)) {
    return <Navigate to="/staff" replace />;
  }
  return <Outlet />;
};

// 4. ป้องกันหน้า Login
const PublicRoute = () => {
  const user = getValidUser();
  if (user) {
    return <Navigate to={isStaff(user) ? "/staff" : "/customer"} replace />;
  }
  return <Outlet />;
};

function AppRouter() {
  const user = getValidUser();

  return (
    <Routes>
      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : isStaff(user) ? (
            <Navigate to="/staff" replace />
          ) : (
            <Navigate to="/customer" replace />
          )
        }
      />

      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<StaffRoute />}>
          <Route path="/admin/:claimId" element={<StaffClaimUpdate />} />
          <Route path="/staff/users" element={<UserManagement />} />
          <Route path="/staff" element={<StaffHome />} />
          <Route path="/staff/list-claim" element={<StaffClaimList />} />
          <Route path="/staff/update-claim/:claimId" element={<StaffClaimUpdate />} />
          <Route path="/staff/chat" element={<StaffChat />} />
          <Route path="/staff/setting" element={<UserSettings />} />
          <Route path="/staff/users" element={<UserManagement />} />
          <Route path="/staff/agents" element={<AgentManagement />} />
          <Route path="/staff/roles" element={<RoleManagement />} />
        </Route>

        <Route element={<CustomerRoute />}>
          <Route path="/customer" element={<CustomerHome />} />
          <Route path="/customer/list-claim" element={<CustomerClaimList />} />
          <Route path="/customer/detail-claim/:claimId" element={<CustomerClaimDatail />} />
          <Route path="/customer/new-claim" element={<CustomerNewClaim />} />
          <Route path="/customer/new-claim/processing/:claimId" element={<CustomerClaimProcessing />} />
          <Route path="/customer/chat/:claimId?" element={<CustomerChat />} />
          <Route path="/customer/setting" element={<UserSettings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRouter;