import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import NewClaim from "../pages/NewClaim";
import History from "../pages/History";
import Chatbox from "../pages/Chatbox";
import ClaimProcessing from "../pages/Claim/ClaimProcessing";
import ClaimSummary from "../pages/Claim/ClaimSummary";

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
        path="/claim/processing/:id" 
        element={<ClaimProcessing />}
        />

        <Route 
        path="/claim/summary/:id" 
        element={<ClaimSummary />}
        />

      <Route
        path="/history"
        element={<History/>}
      />

      <Route
        path="/chat"
        element={<Chatbox/>}
      />


    </Routes>
  );
}

export default AppRouter;