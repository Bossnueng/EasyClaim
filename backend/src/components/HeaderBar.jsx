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
      <div className="flex items-center gap-3">
        
        <Logo />

        <h2 className="text-xl m-2">
          <span className="font-extrabold">EASY CLAIM</span>
          <span className="text-gray-500 font-normal text-base ml-1"> by TBL</span>
        </h2>
      </div>      

      <Avatar icon={<UserOutlined />} />
    </Header>
  );
}

export default HeaderBar;