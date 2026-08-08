import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import NewClaim from "../pages/NewClaim";
import History from "../pages/History";
import Chatbox from "../pages/Chatbox";
import ClaimProcessing from "../pages/Claim/ClaimProcessing";
import ClaimSummary from "../pages/Claim/ClaimSummary";
import ClaimList from "../pages/Claim/ClaimList";
import ClaimDetail from "../pages/Claim/ClainDetail";

import StaffClaimUpdate from "../pages/staff/StaffClaimUpdate";
import StaffHome from "../pages/staff/StaffHome";
import StaffClaimList from "../pages/staff/StaffClaimList";
import StaffChat from "../pages/staff/StaffChat";

import CustomerChat from "../pages/customer/CustomerChat";
import CustomerClaimList from "../pages/customer/CustomerClaimList";
import CustomerHome from "../pages/customer/CustomerHome";
import CustomerNewClaim from "../pages/customer/CustomerNewClaim";
import CustomerClaimDatail from "../pages/customer/CustomerClaimDatail";

function AppRouter() {
  return (
    <Routes>

      <Route
        path="/"
        element={<Home/>}
      />

      <Route
        path="/claim/new"
        element={<NewClaim/>}
      />

        <Route 
        path="/claim/processing/:claimId" 
        element={<ClaimProcessing />}
        />

        <Route 
        path="/history/:claimId" 
        element={<ClaimSummary />}
        />

      <Route
        path="/history"
        element={<ClaimList/>}
      />

      <Route
        path="/chat"
        element={<Chatbox/>}
      />

      <Route
        path="/claim/:claimId"
        element={<ClaimDetail />}
      />

      <Route
        path="/admin/:claimId"
        element={<StaffClaimUpdate />}
      />

      {/* ------------------------- */}
      {/* Staff Route */}
      {/* ------------------------- */}

      <Route
        path="/staff"
        element={<StaffHome/>}
      />

      <Route 
       path="/staff/list-claim" 
       element={<StaffClaimList />}
      />

      <Route
        path="/staff/update-claim/:claimId"
        element={<StaffClaimUpdate/>}
      />

      <Route 
        path="/staff/chat" 
        element={<StaffChat />}
      />

      {/* ------------------------- */}
      {/* Customer Route */}
      {/* ------------------------- */}
      <Route
        path="/customer"
        element={<CustomerHome/>}
      />

      <Route 
       path="/customer/list-claim" 
       element={<CustomerClaimList />}
      />

      <Route
        path="/customer/detail-claim/:claimId"
        element={<CustomerClaimDatail />}
      />

      <Route
        path="/customer/new-claim"
        element={<CustomerNewClaim/>}
      />

      
      {/* ปรับแก้บรรทัดนี้ */}
      <Route 
        path="/customer/chat/:claimId?" 
        element={<CustomerChat />}
      />

    </Routes>
  );
}

export default AppRouter;