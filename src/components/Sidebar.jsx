import { useEffect, useState } from "react";
import { Layout } from "antd";
import MenuList from "./MenuList";

const { Sider } = Layout;

// จอเล็กกว่า lg (992px) = มือถือ/แท็บเล็ต: เมนูลอยทับเนื้อหา มีพื้นหลังทึบ และปิดเองหลังเลือกเมนู
// จอใหญ่: เมนูอยู่ข้างเนื้อหาเหมือนเดิม
const SMALL_SCREEN_QUERY = "(max-width: 991.98px)";
const isSmallScreen = () => typeof window !== "undefined" && window.matchMedia(SMALL_SCREEN_QUERY).matches;

function Sidebar({ collapsed, setCollapsed }) {
  const [isSmall, setIsSmall] = useState(isSmallScreen);
  const overlayOpen = isSmall && !collapsed;

  // กด Esc เพื่อปิดเมนูบนจอเล็ก
  useEffect(() => {
    if (!overlayOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setCollapsed(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [overlayOpen, setCollapsed]);

  return (
    <>
      {overlayOpen && <div className="sidebar-backdrop" onClick={() => setCollapsed(true)} aria-hidden="true" />}

      <Sider
        breakpoint="lg"
        collapsedWidth="0"
        width={250}
        collapsible
        trigger={null}
        collapsed={collapsed}
        onBreakpoint={(broken) => {
          setIsSmall(broken);
          setCollapsed(broken);
        }}
        className={`sidebar${isSmall ? " sidebar--overlay" : ""}`}
      >
        <MenuList onNavigate={() => isSmall && setCollapsed(true)} />
      </Sider>
    </>
  );
}

export default Sidebar;
