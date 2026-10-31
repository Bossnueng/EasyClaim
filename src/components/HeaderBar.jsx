import { Layout, Button, Dropdown } from "antd";
import { MenuUnfoldOutlined, MenuFoldOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";

const { Header } = Layout;

function HeaderBar({ collapsed, setCollapsed }) {
  const navigate = useNavigate();

  // ดึงข้อมูล User จาก localStorage
  const savedUser = localStorage.getItem("user");
  const user = savedUser ? JSON.parse(savedUser) : null;

  return (
    <Header className="!bg-white grid grid-cols-[1fr_auto_1fr] items-center !px-3 sm:!px-6 h-16 shadow-sm border-b border-slate-100">
      {/* ฝั่งซ้าย: ปุ่ม Hamburger
          [UI-FIX 2026-10-31] ขยายพื้นที่กดเป็น 42x42px ไอคอน 20px อยู่กึ่งกลาง มีระยะจากขอบปุ่ม
          + hover/active state + aria-label (เดิม: ไอคอน 24px อัดในปุ่ม 32px และ -ml-2 ชิดขอบจอ) */}
      <div className="flex items-center justify-start">
        <Button
          type="text"
          aria-label={collapsed ? "เปิดเมนู" : "ปิดเมนู"}
          className="lg:hidden !w-[42px] !h-[42px] !rounded-xl text-slate-700 hover:!bg-slate-100 active:!bg-slate-200"
          icon={
            collapsed ? (
              <MenuUnfoldOutlined style={{ fontSize: 20 }} />
            ) : (
              <MenuFoldOutlined style={{ fontSize: 20 }} />
            )
          }
          onClick={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* ฝั่งตรงกลาง: Logo SVG ขนาดใหญ่ ชัดเจน + กดกลับหน้าหลัก */}
      <div
        className="flex items-center justify-center cursor-pointer select-none transition-all duration-200 hover:opacity-85 active:scale-95"
        onClick={() => {
          const targetPath = user?.role === "customer" ? "/customer" : "/staff";
          navigate(targetPath);
        }}
      >
        <Logo className="h-9 sm:h-10 w-auto" />
      </div>

      {/* ฝั่งขวา: พื้นที่ว่างสมดุลเพื่อให้ Logo กลางสมบูรณ์ */}
      <div className="flex justify-end items-center">
        {/* สามารถเพิ่ม Notification หรือ Profile Menu ฝั่งขวาตรงนี้ได้ */}
      </div>
    </Header>
  );
}

export default HeaderBar;