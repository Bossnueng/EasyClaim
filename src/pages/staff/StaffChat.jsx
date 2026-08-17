import React, { useState, useRef, useEffect } from "react";
import { Avatar, Badge, Input, Tag, List, Button, Dropdown, Space, Empty } from "antd";
import {
  SendOutlined,
  SmileOutlined,
  PaperClipOutlined,
  UserOutlined,
  CheckOutlined,
  FilterOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  MessageOutlined,
} from "@ant-design/icons";

const { Search } = Input;

const StaffChat = () => {
  const [activeClaimId, setActiveClaimId] = useState(null);
  const [inputText, setInputText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef(null);

  // ดึง chatHistory จาก localStorage (หากไม่มีให้เริ่มเป็น Object ว่าง {})
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : {};
  });

  // ซิงก์ chatHistory จาก localStorage เมื่อมีการอัปเดตข้าม Tab
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "chatHistory" && e.newValue) {
        setChatHistory(JSON.parse(e.newValue));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ตรวจจับขนาดหน้าจอ Mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ดึงรายการเคลมจาก localStorage
  const [claimsList, setClaimsList] = useState([]);

  useEffect(() => {
    const localClaims = JSON.parse(localStorage.getItem("claims")) || [];
    if (localClaims.length > 0) {
      const formattedClaims = localClaims.map((c) => ({
        claimId: c.claimId,
        customerName: c.customerName || "ลูกค้าทั่วไป",
        productName: c.productName || "ไม่ระบุชื่อสินค้า",
        status: c.status || "รอการตรวจสอบ",
        statusColor: c.status === "เสร็จสิ้น" ? "success" : c.status === "กำลังดำเนินการ" ? "processing" : "warning",
        lastMessage: "เปิดเคสเคลมสินค้า",
        lastTime: "เพิ่งเมื่อครู่",
      }));
      setClaimsList(formattedClaims);
      // เลือก active claim แรกให้อัตโนมัติหากมีรายการ
      if (formattedClaims.length > 0) {
        setActiveClaimId(formattedClaims[0].claimId);
      }
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeClaimId, chatHistory, showMobileChat]);

  const handleSelectClaim = (claimId) => {
    setActiveClaimId(claimId);
    setUnreadCounts((prev) => ({
      ...prev,
      [claimId]: 0,
    }));
    setShowMobileChat(true);
  };

  // ส่งข้อความฝั่ง Staff
  const handleSend = () => {
    if (!inputText.trim() || !activeClaimId) return;

    const currentTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const newMsg = {
      id: Date.now(),
      senderName: "เจ้าหน้าที่คลังสินค้า",
      senderRole: "STAFF",
      time: currentTime,
      text: inputText,
    };

    setChatHistory((prev) => {
      const updatedHistory = {
        ...prev,
        [activeClaimId]: [...(prev[activeClaimId] || []), newMsg],
      };
      localStorage.setItem("chatHistory", JSON.stringify(updatedHistory));
      return updatedHistory;
    });

    setClaimsList((prev) =>
      prev.map((claim) =>
        claim.claimId === activeClaimId
          ? {
              ...claim,
              lastMessage: inputText,
              lastTime: currentTime,
            }
          : claim
      )
    );

    setInputText("");
  };

  const filteredClaims = claimsList.filter((claim) => {
    const matchesSearch =
      claim.claimId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.productName.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === "UNREAD") return matchesSearch && (unreadCounts[claim.claimId] || 0) > 0;
    if (statusFilter === "IN_PROGRESS") return matchesSearch && claim.status === "กำลังดำเนินการ";
    if (statusFilter === "CLOSED") return matchesSearch && claim.status === "เสร็จสิ้น";
    return matchesSearch;
  });

  const totalUnread = Object.values(unreadCounts).reduce((acc, curr) => acc + curr, 0);
  const activeClaimInfo = claimsList.find((c) => c.claimId === activeClaimId);
  const currentMessages = activeClaimId ? chatHistory[activeClaimId] || [] : [];
  const hasNoClaims = claimsList.length === 0;

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: isMobile ? "100vh" : "calc(100vh - 112px)",
        backgroundColor: "#ffffff",
        borderRadius: isMobile ? "0px" : "12px",
        border: isMobile ? "none" : "1px solid #e2e8f0",
        overflow: "hidden",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* SIDEBAR */}
      <div
        style={{
          width: isMobile ? "100%" : "360px",
          borderRight: isMobile ? "none" : "1px solid #e2e8f0",
          display: isMobile && showMobileChat ? "none" : "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          flexShrink: 0,
          height: "100%",
        }}
      >
        <div
          style={{
            padding: "16px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                รายการการเคลม
              </h3>
              {totalUnread > 0 && <Badge count={totalUnread} style={{ backgroundColor: "#ef4444" }} />}
            </div>

            <Dropdown
              menu={{
                items: [
                  { key: "ALL", label: "เคสทั้งหมด", onClick: () => setStatusFilter("ALL") },
                  { key: "UNREAD", label: "ข้อความใหม่", onClick: () => setStatusFilter("UNREAD") },
                  { key: "IN_PROGRESS", label: "กำลังดำเนินการ", onClick: () => setStatusFilter("IN_PROGRESS") },
                  { key: "CLOSED", label: "เคสที่จบแล้ว", onClick: () => setStatusFilter("CLOSED") },
                ],
              }}
            >
              <Button icon={<FilterOutlined />} size="small" type="text">
                ตัวกรอง
              </Button>
            </Dropdown>
          </div>

          <Search
            placeholder="ค้นหา Claim ID, ชื่อลูกค้า..."
            allowClear
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {hasNoClaims ? (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={<span style={{ color: "#94a3b8", fontSize: "13px" }}>ยังไม่มีรายการสนทนาใหม่เข้าระบบ</span>}
              />
            </div>
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={filteredClaims}
              renderItem={(item) => {
                const isActive = item.claimId === activeClaimId;
                const unread = unreadCounts[item.claimId] || 0;

                return (
                  <div
                    key={item.claimId}
                    onClick={() => handleSelectClaim(item.claimId)}
                    style={{
                      padding: "14px 16px",
                      cursor: "pointer",
                      backgroundColor: isActive && !isMobile ? "#f0fdf4" : "#ffffff",
                      borderLeft: isActive && !isMobile ? "4px solid #059669" : "4px solid transparent",
                      borderBottom: "1px solid #f1f5f9",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>
                        {item.claimId}
                      </span>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>{item.lastTime}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                        {item.customerName}
                      </span>
                      <Tag color={item.statusColor} style={{ marginRight: 0, fontSize: "10px" }}>
                        {item.status}
                      </Tag>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          color: unread > 0 ? "#0f172a" : "#64748b",
                          fontWeight: unread > 0 ? "600" : "normal",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: isMobile ? "200px" : "240px",
                        }}
                      >
                        {item.lastMessage}
                      </span>
                      {unread > 0 && <Badge count={unread} style={{ backgroundColor: "#059669" }} />}
                    </div>
                  </div>
                );
              }}
            />
          )}
        </div>
      </div>

      {/* CHAT MAIN AREA */}
      <div
        style={{
          flex: 1,
          display: isMobile && !showMobileChat ? "none" : "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          height: "100%",
        }}
      >
        {hasNoClaims ? (
          /* หน้าจอเปล่าเมื่อยังไม่มีรายการเคลมหรือแชทในระบบ */
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8fafc",
              padding: "24px",
            }}
          >
            <Empty
              image={<MessageOutlined style={{ fontSize: "48px", color: "#cbd5e1" }} />}
              description={
                <div style={{ textAlign: "center" }}>
                  <h4 style={{ margin: "8px 0 4px 0", color: "#475569", fontSize: "16px" }}>ยังไม่มีรายการสนทนาใหม่</h4>
                  <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>
                    เมื่อมีการยื่นคำร้องเคลมสินค้า รายการสนทนาจะปรากฏในช่องนี้
                  </p>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div
              style={{
                padding: isMobile ? "12px 16px" : "12px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#ffffff",
                gap: "8px",
              }}
            >
              {activeClaimInfo ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                    {isMobile && (
                      <Button
                        type="text"
                        icon={<ArrowLeftOutlined />}
                        onClick={() => setShowMobileChat(false)}
                        style={{ padding: "4px 8px" }}
                      />
                    )}
                    <Avatar size={isMobile ? 36 : 40} icon={<UserOutlined />} style={{ backgroundColor: "#3b82f6", flexShrink: 0 }} />
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <h3 style={{ margin: 0, fontSize: isMobile ? "14px" : "16px", fontWeight: "700", color: "#1e293b", whiteSpace: "nowrap" }}>
                          {activeClaimInfo.customerName}
                        </h3>
                        <Tag color="blue" style={{ fontSize: "10px", marginRight: 0 }}>
                          {activeClaimInfo.claimId}
                        </Tag>
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        สินค้า: {activeClaimInfo.productName}
                      </div>
                    </div>
                  </div>

                  <Space size={isMobile ? 4 : 8}>
                    {!isMobile && (
                      <Button size="small" icon={<FileTextOutlined />}>
                        ดูรายละเอียดเคส
                      </Button>
                    )}
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      danger={activeClaimInfo.status === "เสร็จสิ้น"}
                      style={{ fontSize: isMobile ? "11px" : "12px", padding: isMobile ? "0 8px" : undefined }}
                    >
                      {activeClaimInfo.status === "เสร็จสิ้น" ? "ปิดเคสแล้ว" : "เสร็จสิ้น"}
                    </Button>
                  </Space>
                </>
              ) : (
                <div style={{ color: "#64748b" }}>กรุณาเลือกเคสการเคลม</div>
              )}
            </div>

            {/* Chat Messages Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: isMobile ? "12px" : "20px",
                backgroundColor: "#f8fafc",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {currentMessages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#94a3b8", fontSize: "13px" }}>ยังไม่มีข้อความในเคสนี้ เริ่มต้นพิมพ์ส่งข้อความได้เลย</span>
                </div>
              ) : (
                currentMessages.map((msg, index) => {
                  const isMe = msg.senderRole === "STAFF";

                  const isPrevSameSender =
                    index > 0 &&
                    currentMessages[index - 1].senderRole === msg.senderRole &&
                    currentMessages[index - 1].senderName === msg.senderName;

                  if (msg.isSystem || msg.senderRole === "SYSTEM") {
                    return (
                      <div key={msg.id} style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                        <span
                          style={{
                            backgroundColor: "#e2e8f0",
                            color: "#475569",
                            padding: "4px 12px",
                            borderRadius: "12px",
                            fontSize: "11px",
                          }}
                        >
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
                          gap: isMobile ? "8px" : "12px",
                          maxWidth: isMobile ? "85%" : "65%",
                          marginLeft: isMe ? "auto" : "0",
                          flexDirection: isMe ? "row-reverse" : "row",
                        }}
                      >
                        {!isMe && (
                          <div style={{ flexShrink: 0 }}>
                            {!isPrevSameSender ? (
                              <Avatar
                                size={isMobile ? 32 : 36}
                                icon={<UserOutlined />}
                                style={{ backgroundColor: "#94a3b8", color: "#ffffff" }}
                              />
                            ) : (
                              <div style={{ width: isMobile ? "32px" : "36px" }} />
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
                            <span
                              style={{
                                fontSize: "10px",
                                color: "#94a3b8",
                                marginTop: "4px",
                                display: "flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              <CheckOutlined style={{ color: "#059669" }} /> ส่งแล้ว {msg.time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              style={{
                padding: isMobile ? "12px" : "16px",
                backgroundColor: "#ffffff",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#f1f5f9",
                  padding: "6px 10px",
                  borderRadius: "9999px",
                  border: "1px solid #cbd5e1",
                }}
              >
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                >
                  <PaperClipOutlined style={{ fontSize: isMobile ? "16px" : "18px" }} />
                </button>

                <input
                  type="text"
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    padding: "4px",
                    fontSize: "14px",
                    color: "#0f172a",
                    minWidth: 0,
                  }}
                  placeholder={activeClaimId ? `ตอบกลับ ${activeClaimId}...` : "เลือกเคสเพื่อพิมพ์ข้อความ..."}
                  value={inputText}
                  disabled={!activeClaimId}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />

                {!isMobile && (
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                  >
                    <SmileOutlined style={{ fontSize: "18px" }} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!inputText.trim() || !activeClaimId}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: inputText.trim() && activeClaimId ? "pointer" : "not-allowed",
                    backgroundColor: inputText.trim() && activeClaimId ? "#059669" : "#cbd5e1",
                    color: "#ffffff",
                    transition: "background-color 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <SendOutlined style={{ fontSize: "12px" }} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StaffChat;