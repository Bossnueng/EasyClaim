import { Menu } from "antd";
import {
  HomeOutlined,
  FileAddOutlined,
  HistoryOutlined,
  WechatOutlined,
  SettingFilled,
  UserOutlined, // 🟢 1. Import Icon สำหรับจัดการผู้ใช้
} from "@ant-design/icons";
import { NavLink, useLocation } from "react-router-dom";

const MenuList = () => {
  const location = useLocation();

  // ดึงข้อมูล User จาก localStorage
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const role = user?.role_id; // role_id ของผู้ใช้

  const isStaffRole = [1, 4, 5].includes(role);
  const isAdminRole = Number(role) === 1; // 🟢 2. เงื่อนไขสำหรับ Admin เท่านั้น (role_id = 1)

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
    // 🟢 3. เพิ่มการตรวจสอบ Key สำหรับหน้า จัดการผู้ใช้
    if (location.pathname.includes("/staff/users")) {
      return "staff-users";
    }

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
      {isStaffRole && (
        <>
          <Menu.Item key="staff-home" icon={<HomeOutlined />}>
            <NavLink to="/staff">หน้าแรก</NavLink>
          </Menu.Item>

          <Menu.Item key="staff-list-claim" icon={<HistoryOutlined />}>
            <NavLink to="/staff/list-claim">รายการเคลม</NavLink>
          </Menu.Item>

          {/* 🟢 4. แสดงเมนูนี้เฉพาะผู้ที่มี role_id === 1 เท่านั้น */}
          {isAdminRole && (
            <Menu.Item key="staff-users" icon={<UserOutlined />}>
              <NavLink to="/staff/users">จัดการผู้ใช้งาน</NavLink>
            </Menu.Item>
          )}

          <Menu.Item key="staff-setting" icon={<SettingFilled />}>
            <NavLink to="/staff/setting">ตั้งค่า</NavLink>
          </Menu.Item>
        </>
      )}

      {/* ==================== CUSTOMER MENUS ==================== */}
      {role == 2 && (
        <>
          <Menu.Item key="customer-home" icon={<HomeOutlined />}>
            <NavLink to="/customer">หน้าแรก</NavLink>
          </Menu.Item>

          <Menu.Item key="customer-create-claim" icon={<FileAddOutlined />}>
            <NavLink to="/customer/new-claim">สร้างรายการเคลม</NavLink>
          </Menu.Item>

          <Menu.Item key="customer-list-claim" icon={<HistoryOutlined />}>
            <NavLink to="/customer/list-claim">รายการเคลม</NavLink>
          </Menu.Item>

          <Menu.Item key="customer-setting" icon={<SettingFilled />}>
            <NavLink to="/customer/setting">ตั้งค่า</NavLink>
          </Menu.Item>
        </>
      )}
    </Menu>
  );
};

export default MenuList;