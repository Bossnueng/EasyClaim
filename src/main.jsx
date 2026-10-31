import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import './index.css'
import App from "./App";
import "antd/dist/reset.css";

const appTheme = {
  token: {
    fontFamily: '"Mitr", sans-serif',
    fontSize: 14,
    colorPrimary: "#2563eb",
    colorInfo: "#2563eb",
    colorSuccess: "#059669",
    colorWarning: "#d97706",
    colorError: "#dc2626",
    colorText: "#1e293b",
    colorTextSecondary: "#64748b",
    colorBorder: "#cbd5e1",
    colorBorderSecondary: "#e2e8f0",
    colorBgLayout: "#f8fafc",
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 8,
    controlHeight: 38,
    controlHeightSM: 30,
    controlHeightLG: 44,
  },
  components: {
    Button: {
      paddingInline: 18,
      paddingInlineSM: 12,
      paddingInlineLG: 24,
      fontWeight: 500,
      contentFontSizeSM: 13,
      primaryShadow: "0 2px 6px rgba(37, 99, 235, 0.22)",
      defaultShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
      dangerShadow: "0 2px 6px rgba(220, 38, 38, 0.18)",
    },
    Modal: {
      titleFontSize: 17,
      titleColor: "#1e293b",
      contentPadding: "22px 26px",
    },
    Card: {
      headerFontSize: 15,
      headerHeight: 54,
    },
    Menu: {
      darkItemBg: "#0f172a",
      darkSubMenuItemBg: "#0f172a",
      darkItemColor: "rgba(226, 232, 240, 0.78)",
      darkItemHoverBg: "rgba(148, 163, 184, 0.14)",
      darkItemHoverColor: "#ffffff",
      darkItemSelectedBg: "#2563eb",
      darkItemSelectedColor: "#ffffff",
      itemBorderRadius: 10,
    },
    Layout: {
      siderBg: "#0f172a",
      headerBg: "#ffffff",
      bodyBg: "#f8fafc",
    },
    Tag: {
      defaultBg: "#f1f5f9",
    },
  },
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ConfigProvider theme={appTheme}>
      <App />
    </ConfigProvider>
  </BrowserRouter>
);
