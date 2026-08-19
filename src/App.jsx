import { useState } from "react";
import { Layout } from "antd";
import { useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import HeaderBar from "./components/HeaderBar";
import AppRouter from "./routes/AppRouter";

const { Content } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  if (isLoginPage) {
    return <AppRouter />;
  }

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Layout style={{ height: "100vh", overflow: "hidden" }}>
        <HeaderBar collapsed={collapsed} setCollapsed={setCollapsed} />

        <Content
          style={{
            padding: "24px",
            background: "#f5f5f5",
            overflowY: "auto",
            flex: 1,
          }}
        >
          <AppRouter />
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
