import React, { useState, useRef, useEffect } from "react";
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

const Chatbox = () => {
  const [inputText, setInputText] = useState("");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isClaimSelected, setIsClaimSelected] = useState(false);
  const messagesEndRef = useRef(null);

  // รายการอ้างอิงการเคลมของลูกค้า
  const claimOptions = [
    { value: "CLM-2026-001", label: "CLM-2026-001: สินค้าชำรุดจากการขนส่ง (รอดำเนินการ)" },
    { value: "CLM-2026-005", label: "CLM-2026-005: ได้รับสินค้าไม่ครบ (ตรวจสอบแล้ว)" },
    { value: "CLM-2026-012", label: "CLM-2026-012: เปลี่ยนขนาดสินค้า (กำลังจัดส่งคืน)" },
  ];

  // 1. เปลี่ยนการเก็บข้อมูลแชทเป็น Object โดยมี Key เป็น Claim ID
  const [chatHistory, setChatHistory] = useState({
    "CLM-2026-001": [
      {
        id: 1,
        senderName: "สมศักดิ์ (คลังสินค้า)",
        time: "10:30 AM",
        text: "สวัสดีครับ ฝ่ายบริการคลังสินค้ายินดีให้บริการครับ ไม่ทราบว่าต้องการสอบถามเรื่องอะไรครับ?",
        isMe: false,
      },
      {
        id: 2,
        senderName: "คุณ (ลูกค้า)",
        time: "10:32 AM",
        text: "สอบถามเรื่องสถานะการเคลมสินค้า หมายเลขอ้างอิง CLM-2026-001 ครับ ตอนนี้ถึงขั้นตอนไหนแล้วครับ?",
        isMe: true,
      },
      {
        id: 3,
        senderName: "กมลวรรณ (ตรวจสอบสินค้า)",
        time: "10:35 AM",
        text: "รับเรื่องเรียบร้อยค่ะ ทางฝ่ายตรวจสอบได้รับพัสดุเคลมของคุณแล้ว กำลังดำเนินเรื่องตรวจเช็กสภาพสินค้าอยู่นะคะ คาดว่าจะใช้เวลาประมาณ 1-2 วันทำการ แล้วจะแจ้งผลอนุมัติให้อีกครั้งผ่านแชทนี้ค่ะ",
        isMe: false,
      },
    ],
  });

  // เลื่อนลงล่างสุดอัตโนมัติเมื่อเปลี่ยนเคสหรือส่งข้อความใหม่
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isClaimSelected) {
      scrollToBottom();
    }
  }, [selectedClaim, isClaimSelected, chatHistory]);

  const handleSelectClaim = (value) => {
    setSelectedClaim(value);
  };

  const handleConfirmClaim = () => {
    if (!selectedClaim) return;

    // ถ้าเป็นเคสใหม่ที่ยังไม่เคยเปิดคุย ให้สร้างชุดข้อความเริ่มต้นไว้ก่อน
    if (!chatHistory[selectedClaim]) {
      setChatHistory((prev) => ({
        ...prev,
        [selectedClaim]: [
          {
            id: Date.now(),
            senderName: "ระบบอัตโนมัติ",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: `เปิดช่องทางติดต่อสำหรับหมายเลขการเคลม: ${selectedClaim}`,
            isMe: false,
            isSystem: true,
          },
          {
            id: Date.now() + 1,
            senderName: "สมศักดิ์ (คลังสินค้า)",
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: `สวัสดีครับ ฝ่ายบริการคลังสินค้าได้รับเรื่องเคลมหมายเลข ${selectedClaim} แล้ว มีอะไรให้ช่วยเพิ่มเติมไหมครับ?`,
            isMe: false,
          },
        ],
      }));
    }

    setIsClaimSelected(true);
  };

  const handleSend = () => {
    if (!inputText.trim() || !selectedClaim) return;

    const newMsg = {
      id: Date.now(),
      senderName: "คุณ (ลูกค้า)",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      text: inputText,
      isMe: true,
    };

    // บันทึกข้อความลงใน Key ของเคสปัจจุบัน
    setChatHistory((prev) => ({
      ...prev,
      [selectedClaim]: [...(prev[selectedClaim] || []), newMsg],
    }));

    setInputText("");
  };

  // ดึงรายการข้อความของเคสปัจจุบันมาแสดงผล
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
            onClick={() => setIsClaimSelected(false)}
            style={{ fontSize: "12px" }}
          >
            สลับเคสเคลม
          </Button>
        )}
      </div>

      {/* 2. BODY (หน้าเลือกเคส / หน้าต่างสนทนา) */}
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
              placeholder="-- กรุณาเลือกเลขอ้างอิงการเคลม --"
              style={{ width: "100%", marginBottom: "16px", textAlign: "left" }}
              size="large"
              options={claimOptions}
              onChange={handleSelectClaim}
              value={selectedClaim}
            />

            <Button
              type="primary"
              size="large"
              block
              disabled={!selectedClaim}
              onClick={handleConfirmClaim}
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
            const isPrevSameSender =
              index > 0 &&
              currentMessages[index - 1].isMe === msg.isMe &&
              currentMessages[index - 1].senderName === msg.senderName;

            if (msg.isSystem) {
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
                  justifyContent: msg.isMe ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    maxWidth: "65%",
                    marginLeft: msg.isMe ? "auto" : "0",
                    flexDirection: msg.isMe ? "row-reverse" : "row",
                  }}
                >
                  {!msg.isMe && (
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
                      alignItems: msg.isMe ? "flex-end" : "flex-start",
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
                        backgroundColor: msg.isMe ? "#059669" : "#ffffff",
                        color: msg.isMe ? "#ffffff" : "#1e293b",
                        border: msg.isMe ? "none" : "1px solid #e2e8f0",
                        borderTopRightRadius: msg.isMe ? "2px" : "16px",
                        borderTopLeftRadius: !msg.isMe ? "2px" : "16px",
                        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      }}
                    >
                      {msg.text}
                    </div>

                    {msg.isMe && (
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
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
              }}
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
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
              }}
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

export default Chatbox;