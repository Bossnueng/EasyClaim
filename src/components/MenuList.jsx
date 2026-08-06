import {Menu} from "antd"
import {HomeOutlined, FileAddOutlined, HistoryOutlined, WechatOutlined, BarsOutlined} from "@ant-design/icons"
import { NavLink } from "react-router-dom";


const MenuList = () => {
  return (
    <Menu theme="dark" className="menu-bar">
        <Menu.Item key="home" icon = {<HomeOutlined/>}>
          <NavLink to="/dashboard">Home</NavLink>
        </Menu.Item>

        <Menu.Item key="newclaim" icon = {<FileAddOutlined/>}>
          <NavLink to="/claim">New Claim</NavLink>
        </Menu.Item>

        <Menu.Item key="history" icon = {<HistoryOutlined/>}>
          <NavLink to="/history">History</NavLink>
        </Menu.Item>
       
        <Menu.Item key="chat" icon = {<WechatOutlined/>}>
          <NavLink to="/chat">Chat</NavLink>
        </Menu.Item>
    </Menu>
  )
}

export default MenuList