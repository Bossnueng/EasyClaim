import { Layout } from "antd";
import MenuList from "./MenuList";

const { Sider } = Layout;

function Sidebar() {
  return (
    <Sider
      breakpoint="lg"
      collapsedWidth="0"
      width={250}
      className="sidebar"
    >
      <MenuList />
    </Sider>
  );
}

export default Sidebar;