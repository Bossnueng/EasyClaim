import { Layout } from "antd";
import MenuList from "./MenuList";

const { Sider } = Layout;

function Sidebar({ collapsed, setCollapsed }) {
  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      width={250}
      collapsible
      trigger={null}
      collapsed={collapsed}
      onBreakpoint={(broken) => {
        if (!broken) {
          setCollapsed(false);
        } else {
          setCollapsed(true);
        }
      }}
      className="sidebar"
    >
      <MenuList />
    </Sider>
  );
}

export default Sidebar;
