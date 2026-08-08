import { useState } from 'react'
import { Layout } from 'antd'
//import Logo from './components/Logo';
//import MenuList from './components/MenuList';
import Sidebar from "./components/Sidebar";
import HeaderBar from "./components/HeaderBar";
import AppRouter from "./routes/AppRouter";
//import { icons } from 'antd/es/image/PreviewGroup';

const{Content} = Layout;

function App() {

  const [collapsed, setCollapsed] = useState(true);
  
   return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      <Sidebar 
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
      <Layout style={{ height: "100vh", overflow: "hidden" }}>
        <HeaderBar 
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
        <Content 
          style={{ 
            padding: "24px", 
            background: "#f5f5f5",
            overflowY: "auto", // เปิดให้สกอร์ลเฉพาะส่วนเนื้อหา
            flex: 1
          }}
        >
          <AppRouter />
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
