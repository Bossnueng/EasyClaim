import {Menu} from "antd"
import {HomeOutlined, FileAddOutlined, HistoryOutlined, WechatOutlined, SettingFilled} from "@ant-design/icons"
import {NavLink, useLocation } from "react-router-dom";



const MenuList = () => {

  const location = useLocation();

  // 1. ดึงข้อมูล User จาก localStorage
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const role = user?.role; // 'staff' หรือ 'customer'

  const getSelectedKey = () => {
    // Customer
    if (location.pathname.includes("/customer/setting")) {
      return "customer-setting";
    }

    if (location.pathname.includes("/customer/new-claim")) {
      return "customer-create-claim";
    }

    if (location.pathname.includes("/customer/list-claim")) {
      return "customer-list-claim";
    }

    if (location.pathname.includes("/customer/detail-claim")) {
      return "customer-list-claim";
    }

    if (location.pathname.includes("/customer/chat")) {
      return "customer-chat";
    }

    if (location.pathname === "/customer") {
      return "customer-home";
    }

    // Staff
    if (location.pathname.includes("/staff/setting")) {
      return "staff-setting";
    }

    if (location.pathname.includes("/staff/list-claim")) {
      return "staff-list-claim";
    }


     if (location.pathname.includes("/staff/update-claim")) {
      return "staff-list-claim";
    }

    if (location.pathname.includes("/staff/chat")) {
      return "staff-chat";
    }

    if (location.pathname === "/staff") {
      return "staff-home";
    }

    return "";
  };

  return (
    <Menu theme="dark" mode="inline" selectedKeys={[getSelectedKey()]} className="menu-bar">
      {/* ==================== STAFF MENUS ==================== */}
      {role === "staff" && (
        <>
          <Menu.Item key="staff-home" icon={<HomeOutlined />}>
            <NavLink to="/staff">Home</NavLink>
          </Menu.Item>

          <Menu.Item key="staff-list-claim" icon={<HistoryOutlined />}>
            <NavLink to="/staff/list-claim">Claim List</NavLink>
          </Menu.Item>

          <Menu.Item key="staff-chat" icon={<WechatOutlined />}>
            <NavLink to="/staff/chat">Chat</NavLink>
          </Menu.Item>

           <Menu.Item key="staff-setting" icon={<SettingFilled />}>
            <NavLink to="/staff/setting">Setting</NavLink>
          </Menu.Item>
        </>
      )}
   
      {/* ==================== CUSTOMER MENUS ==================== */}
      {role === "customer" && (
        <>
          <Menu.Item key="customer-home" icon={<HomeOutlined />}>
            <NavLink to="/customer">Home</NavLink>
          </Menu.Item>

          <Menu.Item key="customer-create-claim" icon={<FileAddOutlined />}>
            <NavLink to="/customer/new-claim">New Claim</NavLink>
          </Menu.Item>

          <Menu.Item key="customer-list-claim" icon={<HistoryOutlined />}>
            <NavLink to="/customer/list-claim">Claim List</NavLink>
          </Menu.Item>

          <Menu.Item key="customer-chat" icon={<WechatOutlined />}>
            <NavLink to="/customer/chat">Chat</NavLink>
          </Menu.Item>

          <Menu.Item key="customer-setting" icon={<SettingFilled />}>
            <NavLink to="/customer/setting">Setting</NavLink>
          </Menu.Item>
        </>
      )}
    </Menu>
  );
};

export default MenuList