import { Routes, Route } from "react-router-dom";
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


function AppRouter() {
  return (
    <Routes>

      <Route path="/login" element={<Login />} />      
      <Route path="/admin/:claimId" element={<StaffClaimUpdate />}/>

      {/* ------------------------- */}
      {/* Staff Route */}
      {/* ------------------------- */}
      <Route path="/staff" element={<StaffHome/>}/>
      <Route path="/staff/list-claim" element={<StaffClaimList />}/>
      <Route path="/staff/update-claim/:claimId" element={<StaffClaimUpdate/>}/>
      <Route path="/staff/chat" element={<StaffChat />}/>
      <Route path="/staff/setting" element={<UserSettings/>}/>
     
      {/* ------------------------- */}
      {/* Customer Route */}
      {/* ------------------------- */}
      <Route path="/customer" element={<CustomerHome/>}/>
      <Route path="/customer/list-claim" element={<CustomerClaimList />}/>
      <Route path="/customer/detail-claim/:claimId" element={<CustomerClaimDatail />}/>
      <Route path="/customer/new-claim" element={<CustomerNewClaim/>}/>
      <Route path="/customer/new-claim/processing/:claimId" element={<CustomerClaimProcessing/>}/>
      <Route path="/customer/chat/:claimId?" element={<CustomerChat />}/> 
      <Route path="/customer/setting" element={<UserSettings/>}/>
    </Routes>
  );
}

export default AppRouter;