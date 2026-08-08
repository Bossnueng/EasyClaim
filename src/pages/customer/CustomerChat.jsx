import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, Badge, Select, Button } from "antd";
import {
  SendOutlined,
  SmileOutlined,
  PaperClipOutlined,
  CustomerServiceOutlined,
  UserOutlined,
  CheckOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from "@ant-design/icons";

const CustomerChat = () => {
  const { claimId } = useParams();
  const navigate = useNavigate();

  const [inputText, setInputText] = useState("");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isClaimSelected, setIsClaimSelected] = useState(false);
  const [claimOptions, setClaimOptions] = useState([]);
  const messagesEndRef = useRef(null);

  // Initial Chat History
  const initialChatHistory = {
    "CLM-2026-001": [
      {
        id: 1,
        senderName: "สมศักดิ์ (คลังสินค้า)",
        senderRole: "STAFF",
        time: "10:30 AM",
        text: "สวัสดีครับ ฝ่ายบริการคลังสินค้ายินดีให้บริการครับ ไม่ทราบว่าต้องการสอบถามเรื่องอะไรครับ?",
      },
      {
        id: 2,
        senderName: "คุณ (ลูกค้า)",
        senderRole: "CUSTOMER",
        time: "10:32 AM",
        text: "สอบถามเรื่องสถานะการเคลมสินค้า หมายเลขอ้างอิง CLM-2026-001 ครับ ตอนนี้ถึงขั้นตอนไหนแล้วครับ?",
      },
      {
        id: 3,
        senderName: "กมลวรรณ (ตรวจสอบสินค้า)",
        senderRole: "STAFF",
        time: "10:35 AM",
        text: "รับเรื่องเรียบร้อยค่ะ ทางฝ่ายตรวจสอบได้รับพัสดุเคลมของคุณแล้ว กำลังดำเนินเรื่องตรวจเช็กสภาพสินค้าอยู่นะคะ คาดว่าจะใช้เวลาประมาณ 1-2 วันทำการ แล้วจะแจ้งผลอนุมัติให้อีกครั้งผ่านแชทนี้ค่ะ",
      },
    ],
  };

  // ดึง chatHistory จาก localStorage หรือใช้ค่าเริ่มต้น
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : initialChatHistory;
  });

  // ซิงก์ chatHistory ลง localStorage ทุกครั้งที่มีการอัปเดต
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  // คอยตรวจจับ event "storage" เมื่อ StaffChat อัปเดตข้อมูล
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "chatHistory" && e.newValue) {
        setChatHistory(JSON.parse(e.newValue));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ดึงรายการเคลมจาก localStorage เพื่อสร้าง claimOptions
  useEffect(() => {
    const localClaims = JSON.parse(localStorage.getItem("claims")) || [];
    const defaultOptions = [
      { value: "CLM-2026-001", label: "CLM-2026-001: หูฟัง Bluetooth เสียงดี (กำลังดำเนินการ)" },
      { value: "CLM-2026-002", label: "CLM-2026-002: กล้องติดรถยนต์ FHD (รอการตรวจสอบ)" },
      { value: "CLM-2026-003", label: "CLM-2026-003: คีย์บอร์ดไร้สาย Mechanical (เสร็จสิ้น)" },
    ];

    if (localClaims.length > 0) {
      const options = localClaims.map((claim) => ({
        value: claim.claimId,
        label: `${claim.claimId}: ${claim.productName || "ไม่ระบุชื่อสินค้า"} (${claim.status || "รอการตรวจสอบ"})`,
      }));
      setClaimOptions(options);
    } else {
      setClaimOptions(defaultOptions);
    }
  }, []);

  // ตรวจจับ claimId จาก URL
  useEffect(() => {
    if (claimId) {
      setSelectedClaim(claimId);
      setIsClaimSelected(true);

      setChatHistory((prev) => {
        if (!prev[claimId]) {
          const updated = {
            ...prev,
            [claimId]: [
              {
                id: Date.now(),
                senderName: "ระบบอัตโนมัติ",
                senderRole: "SYSTEM",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                text: `เปิดช่องทางติดต่อสำหรับหมายเลขการเคลม: ${claimId}`,
                isSystem: true,
              },
              {
                id: Date.now() + 1,
                senderName: "สมศักดิ์ (คลังสินค้า)",
                senderRole: "STAFF",
                time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                text: `สวัสดีครับ ฝ่ายบริการคลังสินค้าได้รับเรื่องเคลมหมายเลข ${claimId} แล้ว มีอะไรให้ช่วยเพิ่มเติมไหมครับ?`,
              },
            ],
          };
          localStorage.setItem("chatHistory", JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    } else {
      setIsClaimSelected(false);
      setSelectedClaim(null);
    }
  }, [claimId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isClaimSelected) {
      scrollToBottom();
    }
  }, [selectedClaim, isClaimSelected, chatHistory]);

  const handleOpenChat = () => {
    if (selectedClaim) {
      navigate(`/customer/chat/${selectedClaim}`);
    }
  };

  // ส่งข้อความฝั่ง Customer
  const handleSend = () => {
    if (!inputText.trim() || !selectedClaim) return;

    const newMsg = {
      id: Date.now(),
      senderName: "คุณ (ลูกค้า)",
      senderRole: "CUSTOMER", // ระบุสิทธิ์ชัดเจน
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: inputText,
    };

    setChatHistory((prev) => {
      const updatedHistory = {
        ...prev,
        [selectedClaim]: [...(prev[selectedClaim] || []), newMsg],
      };
      localStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
      return updatedHistory;
    });

    setInputText("");
  };

  const currentMessages = selectedClaim ? chatHistory[selectedClaim] || [] : [];

  return (
    <div 
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "calc(100vh - 112px)",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* 1. HEADER */}
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Badge dot status="success" offset={[-4, 32]}>
            <Avatar
              size={40}
              icon={<CustomerServiceOutlined />}
              style={{ backgroundColor: "#059669", color: "#ffffff" }}
            />
          </Badge>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#1e293b", lineHeight: "1.2" }}>
              ฝ่ายบริการคลังสินค้า (Warehouse Support)
            </h3>
            <span style={{ fontSize: "12px", color: "#059669", fontWeight: "500", marginTop: "4px" }}>
              {isClaimSelected ? `● สนทนาเคส: ${selectedClaim}` : "● กรุณาเลือกเลขอ้างอิงการเคลมเพื่อเริ่มสนทนา"}
            </span>
          </div>
        </div>

        {isClaimSelected && (
          <Button 
            size="small" 
            icon={<HistoryOutlined />}
            onClick={() => navigate("/customer/chat")}
            style={{ fontSize: "12px" }}
          >
            สลับเคสเคลม
          </Button>
        )}
      </div>

      {/* 2. BODY */}
      {!isClaimSelected ? (
        <div 
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            backgroundColor: "#f8fafc",
            gap: "16px",
          }}
        >
          <div 
            style={{
              backgroundColor: "#ffffff",
              padding: "32px",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
              maxWidth: "450px",
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "32px", color: "#059669", marginBottom: "12px" }}>
              <FileTextOutlined />
            </div>
            <h4 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#1e293b" }}>
              เลือกหมายเลขอ้างอิงการเคลม
            </h4>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "#64748b" }}>
              โปรดเลือกรายการเคลมที่คุณต้องการติดต่อสอบถามกับเจ้าหน้าที่คลังสินค้า
            </p>

            <Select
              showSearch
              allowClear
              placeholder="-- กรุณาเลือกหรือพิมพ์เลขอ้างอิงการเคลม --"
              style={{ width: "100%", marginBottom: "16px", textAlign: "left" }}
              size="large"
              options={claimOptions}
              value={selectedClaim}
              onSearch={(val) => setSelectedClaim(val)}
              onSelect={(val) => setSelectedClaim(val)}
              onChange={(val) => !val && setSelectedClaim(null)}
              filterOption={(input, option) =>
                (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
              }
            />

            <Button
              type="primary"
              size="large"
              block
              disabled={!selectedClaim}
              onClick={handleOpenChat}
              style={{ backgroundColor: "#059669", fontWeight: "600" }}
            >
              เปิดหน้าต่างสนทนา
            </Button>
          </div>
        </div>
      ) : (
        <div 
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            backgroundColor: "#f8fafc",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {currentMessages.map((msg, index) => {
            // เช็กฝั่งผู้ส่ง: CUSTOMER แสดงด้านขวา (isMe = true)
            const isMe = msg.senderRole === "CUSTOMER";

            const isPrevSameSender =
              index > 0 &&
              currentMessages[index - 1].senderRole === msg.senderRole &&
              currentMessages[index - 1].senderName === msg.senderName;

            if (msg.isSystem || msg.senderRole === "SYSTEM") {
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                  <span style={{ backgroundColor: "#e2e8f0", color: "#475569", padding: "4px 12px", borderRadius: "12px", fontSize: "11px" }}>
                    {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: isMe ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    maxWidth: "65%",
                    marginLeft: isMe ? "auto" : "0",
                    flexDirection: isMe ? "row-reverse" : "row",
                  }}
                >
                  {!isMe && (
                    <div style={{ flexShrink: 0 }}>
                      {!isPrevSameSender ? (
                        <Avatar
                          size={36}
                          icon={<UserOutlined />}
                          style={{ backgroundColor: "#cbd5e1", color: "#475569" }}
                        />
                      ) : (
                        <div style={{ width: "36px" }} />
                      )}
                    </div>
                  )}

                  <div 
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMe ? "flex-end" : "flex-start",
                    }}
                  >
                    {!isPrevSameSender && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>
                          {msg.senderName}
                        </span>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>{msg.time}</span>
                      </div>
                    )}

                    <div
                      style={{
                        padding: "10px 16px",
                        borderRadius: "16px",
                        fontSize: "14px",
                        lineHeight: "1.5",
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        backgroundColor: isMe ? "#059669" : "#ffffff",
                        color: isMe ? "#ffffff" : "#1e293b",
                        border: isMe ? "none" : "1px solid #e2e8f0",
                        borderTopRightRadius: isMe ? "2px" : "16px",
                        borderTopLeftRadius: !isMe ? "2px" : "16px",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      {msg.text}
                    </div>

                    {isMe && (
                      <span style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px", display: "flex", alignItems: "center", gap: "2px" }}>
                        <CheckOutlined style={{ color: "#059669" }} /> ส่งแล้ว {msg.time}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 3. INPUT FOOTER */}
      {isClaimSelected && (
        <div 
          style={{
            padding: "16px",
            backgroundColor: "#ffffff",
            borderTop: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#f1f5f9",
              padding: "6px 12px",
              borderRadius: "9999px",
              border: "1px solid #cbd5e1",
            }}
          >
            <button
              type="button"
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
            >
              <PaperClipOutlined style={{ fontSize: "18px" }} />
            </button>

            <input
              type="text"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "4px 8px",
                fontSize: "14px",
                color: "#0f172a",
              }}
              placeholder={`พิมพ์ข้อความสอบถามเคส ${selectedClaim}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />

            <button
              type="button"
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
            >
              <SmileOutlined style={{ fontSize: "18px" }} />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim()}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: inputText.trim() ? "pointer" : "not-allowed",
                backgroundColor: inputText.trim() ? "#059669" : "#cbd5e1",
                color: "#ffffff",
                transition: "background-color 0.2s",
                flexShrink: 0,
              }}
            >
              <SendOutlined style={{ fontSize: "14px" }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerChat;