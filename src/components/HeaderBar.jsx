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
    <Header className="!bg-white grid grid-cols-[1fr_auto_1fr] items-center !px-2 sm:!px-4 h-16 shadow-sm border-b border-slate-100">
      {/* ฝั่งซ้าย: ขยับปุ่มออกชิดซ้ายด้วย -ml-2 */}
      <div className="flex items-center justify-start">
        <Button
          type="text"
          className="lg:hidden -ml-2 flex items-center justify-center"
          icon={
            collapsed ? (
              <MenuUnfoldOutlined style={{ fontSize: 24 }} />
            ) : (
              <MenuFoldOutlined style={{ fontSize: 24 }} />
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