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
  
   return (
    <>
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar />
      <Layout>
        <HeaderBar />
        <Content style={{ padding: "24px", background: "#f5f5f5"}}>
          <AppRouter />
        </Content>
      </Layout>
    </Layout>
    </>
  )
}

export default App
