import { Layout, Avatar, Button, Dropdown } from "antd";
import { MenuOutlined, UserOutlined, MenuUnfoldOutlined, MenuFoldOutlined,SettingOutlined,
  LogoutOutlined,  } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Logo from './Logo';


const { Header } = Layout;

function HeaderBar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();

  // ดึงข้อมูล User จาก localStorage
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;

  // ฟังก์ชัน Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  // รายการเมนูเมื่อกดที่ Profile/Avatar
  const userMenuItems = [
    {
      key: "setting",
      icon: <SettingOutlined />,
      label: "User Setting",
      onClick: () => navigate("/setting-user"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Log out",
      danger: true,
      onClick: handleLogout,
    },
  ];
  
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