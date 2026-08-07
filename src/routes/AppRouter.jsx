import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import NewClaim from "../pages/NewClaim";
import History from "../pages/History";
import Chatbox from "../pages/Chatbox";

function AppRouter() {
  return (
    <Routes>

      <Route
        path="/"
        element={<Home/>}
      />

      <Route
        path="/claim"
        element={<NewClaim/>}
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