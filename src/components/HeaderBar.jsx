import { Layout, Avatar } from "antd";
import { MenuOutlined, UserOutlined } from "@ant-design/icons";
import Logo from './Logo';

const { Header } = Layout;

function HeaderBar() {
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
      <Logo />

      <h2 style={{ margin: 0 }}>
        Dashboard
      </h2>

      <Avatar icon={<UserOutlined />} />
    </Header>
  );
}

export default HeaderBar;