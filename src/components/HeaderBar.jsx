import { Layout, Avatar, Button } from "antd";
import { MenuOutlined, UserOutlined, MenuUnfoldOutlined, MenuFoldOutlined  } from "@ant-design/icons";
import Logo from './Logo';


const { Header } = Layout;

function HeaderBar({ collapsed, setCollapsed }) {
  return (
    <Header
      style={{
        background: "#fff",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 24px",
      }}
    >
      
      <Button
        type="text"
        className="lg:hidden"
        icon={
          collapsed ? (
            <MenuUnfoldOutlined style={{ fontSize: 24 }}/>
          ) : (
            <MenuFoldOutlined style={{ fontSize: 24 }}/>
          )
        }
        onClick={() => setCollapsed(!collapsed)}
      />

      <h2 style={{ margin: 0 }}>
        Dashboard
      </h2>

      <Avatar icon={<UserOutlined />} />
    </Header>
  );
}

export default HeaderBar;