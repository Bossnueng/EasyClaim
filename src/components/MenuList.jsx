import { useEffect, useState } from "react";
import { Menu, Badge } from "antd";
import {
  ShopOutlined,
  SafetyCertificateOutlined,
  HomeOutlined,
  HistoryOutlined,
  WechatOutlined,
  SettingFilled,
  UserOutlined, // 🟢 1. Import Icon สำหรับจัดการผู้ใช้
  FormOutlined,
} from "@ant-design/icons";
import { NavLink, useLocation } from "react-router-dom";
import { isStaffUser, isAdminUser, CUSTOMER_ROLE_ID } from "../constants/roles";
import userService from "../services/userService";
import socket from "../services/socket";

// onNavigate: เรียกเมื่อกดเลือกเมนู (บนจอเล็กใช้ปิดเมนูที่ลอยอยู่)
const MenuList = ({ onNavigate }) => {
  const location = useLocation();

  // ดึงข้อมูล User จาก localStorage
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;
  const role = user?.role_id; // role_id ของผู้ใช้

  const isStaffRole = isStaffUser(user);
  const isAdminRole = isAdminUser(user); // 🟢 2. เงื่อนไขสำหรับ Admin เท่านั้น (role_id = 1)

  // จำนวนผู้สมัครใช้งานที่รอ admin อนุมัติ — แสดงเป็นตัวเลขบนเมนู "จัดการผู้ใช้งาน"
  const [pendingUsers, setPendingUsers] = useState(0);
  useEffect(() => {
    if (!isAdminRole) return undefined;
    let alive = true;
    const refresh = () =>
      userService
        .getPendingCount()
        .then((res) => alive && setPendingUsers(Number(res?.pending) || 0))
        .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 60 * 1000);
    window.addEventListener("bev-claim:pending-users-changed", refresh);
    socket.on("user:registered", refresh);
    socket.on("user:updated", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("bev-claim:pending-users-changed", refresh);
      socket.off("user:registered", refresh);
      socket.off("user:updated", refresh);
    };
  }, [isAdminRole]);

  const getSelectedKey = () => {
    // Customer
    if (location.pathname.includes("/customer/setting")) {
      return "customer-setting";
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
    if (location.pathname.includes("/staff/agents")) return "staff-agents";
    if (location.pathname.includes("/staff/roles")) return "staff-roles";
    if (location.pathname.includes("/staff/signatures")) return "staff-signatures";

    if (location.pathname.includes("/staff/setting")) {
      return "staff-setting";
    }
    
    if (location.pathname.includes("/staff/new-claim")) {
      return "staff-create-claim";
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
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      className="menu-bar"
      onClick={() => onNavigate?.()}
    >

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
            <>

              <Menu.Item key="staff-users" icon={<UserOutlined />}>
                <NavLink to="/staff/users">
                  จัดการผู้ใช้งาน
                  {pendingUsers > 0 && (
                    <Badge
                      count={pendingUsers}
                      size="small"
                      title={`รออนุมัติ ${pendingUsers} คน`}
                      style={{ marginLeft: 8, boxShadow: "none" }}
                    />
                  )}
                </NavLink>
              </Menu.Item>

              <Menu.Item key="staff-agents" icon={<ShopOutlined />}>
                <NavLink to="/staff/agents">จัดการ Agent</NavLink>
              </Menu.Item>

              <Menu.Item key="staff-roles" icon={<SafetyCertificateOutlined />}>
                <NavLink to="/staff/roles">จัดการสิทธิ์ (Role)</NavLink>
              </Menu.Item>

              <Menu.Item key="staff-signatures" icon={<FormOutlined />}>
                <NavLink to="/staff/signatures">ลายเซ็นผู้สอบทาน</NavLink>
              </Menu.Item>
            </>
          )}

          <Menu.Item key="staff-setting" icon={<SettingFilled />}>
            <NavLink to="/staff/setting">ตั้งค่า</NavLink>
          </Menu.Item>
        </>
      )}

      {/* ==================== CUSTOMER MENUS ==================== */}
      {Number(role) === CUSTOMER_ROLE_ID && (
        <>
          <Menu.Item key="customer-home" icon={<HomeOutlined />}>
            <NavLink to="/customer">หน้าแรก</NavLink>
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