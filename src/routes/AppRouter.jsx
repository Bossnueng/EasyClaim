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
import Login from "../pages/auth/Login";
import UserSettings from "../pages/auth/UserSettings";
import CustomerClaimProcessing from "../pages/customer/CustomerClaimProcessing";
import loginService from "../services/loginService";

// 🟢 ดึงข้อมูลผู้ใช้
const getValidUser = () => {
  const user = loginService.getCurrentUser();
  if (!user || (!user.agent_id && !user.user_id && !user.id && !user.token)) {
    loginService.logout?.(); 
    return null;
  }
  return user;
};

// 🟢 เช็กว่าเป็น Staff/Admin จาก role_id เดิม ( role_id 1 = Admin, 3 = Staff/Driver )
const isStaff = (user) => {
  if (!user) return false;
  const roleId = Number(user.role_id);
  const roleStr = String(user.role || user.user_type || "").toLowerCase();
  
  return roleId === 1 || roleId === 3 || roleStr === "staff" || roleStr === "admin";
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
          <Route path="/staff" element={<StaffHome />} />
          <Route path="/staff/list-claim" element={<StaffClaimList />} />
          <Route path="/staff/update-claim/:claimId" element={<StaffClaimUpdate />} />
          <Route path="/staff/chat" element={<StaffChat />} />
          <Route path="/staff/setting" element={<UserSettings />} />
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