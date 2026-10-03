import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Avatar, Badge, Select, Button, Empty } from "antd";
import {SendOutlined,SmileOutlined,PaperClipOutlined,CustomerServiceOutlined,UserOutlined,CheckOutlined,
  FileTextOutlined,HistoryOutlined,PlusCircleOutlined,} from "@ant-design/icons";

const CustomerChat = () => {
  const { claimId } = useParams();
  const navigate = useNavigate();

  const [inputText, setInputText] = useState("");
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isClaimSelected, setIsClaimSelected] = useState(false);
  const [claimOptions, setClaimOptions] = useState([]);
  const messagesEndRef = useRef(null);

  // ดึง chatHistory จาก localStorage (หากไม่มีให้เริ่มเป็น Object ว่าง {})
  const [chatHistory, setChatHistory] = useState(() => {
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : {};
  });

  // ซิงก์ chatHistory ลง localStorage
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  // ตรวจจับ event "storage" เมื่อมีการอัปเดตแชทจาก tab อื่น
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "chatHistory" && e.newValue) {
        setChatHistory(JSON.parse(e.newValue));
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // ดึงรายการเคลมจริงจาก localStorage เพื่อสร้าง claimOptions
  useEffect(() => {
    const localClaims = JSON.parse(localStorage.getItem("claims")) || [];

    if (localClaims.length > 0) {
      const options = localClaims.map((claim) => ({
        value: claim.claimId,
        label: `${claim.claimId}: ${claim.productName || "ไม่ระบุชื่อสินค้า"} (${claim.status || "สร้างรายการเคลม"})`,
      }));
      setClaimOptions(options);
    } else {
      setClaimOptions([]); // ไม่มีคำร้องเคลมในระบบ
    }
  }, []);

  // ตรวจจับ claimId จาก URL
  useEffect(() => {
    if (claimId) {
      setSelectedClaim(claimId);
      setIsClaimSelected(true);

      // ถ้ายังไม่มีประวัติแชทของ claimId นี้ ให้สร้างข้อความต้อนรับเริ่มต้นสำหรับการยื่นคำร้องครั้งแรก
      setChatHistory((prev) => {
        if (!prev[claimId]) {
          const updated = {
            ...prev,
            [claimId]: [
              {
                id: Date.now(),
                senderName: "ระบบอัตโนมัติ",
                senderRole: "SYSTEM",
                time: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                text: `เปิดช่องทางสนทนาสำหรับรายการเคลมหมายเลข: ${claimId}`,
                isSystem: true,
              },
              {
                id: Date.now() + 1,
                senderName: "เจ้าหน้าที่ฝ่ายเคลม",
                senderRole: "STAFF",
                time: new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                text: `สวัสดีครับ เจ้าหน้ารับเรื่องเคลมหมายเลข ${claimId} เรียบร้อยแล้วครับ สามารถพิมพ์ข้อความสอบถามหรือแนบรูปภาพเพิ่มเติมทิ้งไว้ในแชทนี้ได้เลยครับ`,
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
      senderRole: "CUSTOMER",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
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
  const hasNoClaims = claimOptions.length === 0;

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
      {/* ===== HEADER ===== */}
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
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "700",
                color: "#1e293b",
                lineHeight: "1.2",
              }}
            >
              ฝ่ายบริการคลังสินค้า (Warehouse Support)
            </h3>
            <span
              style={{
                fontSize: "12px",
                color: "#059669",
                fontWeight: "500",
                marginTop: "4px",
              }}
            >
              {isClaimSelected
                ? `● สนทนาเคส: ${selectedClaim}`
                : "● เลือกรายการเคลมเพื่อเริ่มสนทนา"}
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

      {/* ===== BODY =====*/}
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
            {hasNoClaims ? (
              /* --- กรณีไม่มีคำร้องยื่นเคลมสินค้าเลย --- */
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span style={{ color: "#64748b", fontSize: "14px" }}>
                      คุณยังไม่มีรายการคำร้องยื่นเคลมสินค้าในระบบ
                    </span>
                  }
                />
                <Button
                  type="primary"
                  icon={<PlusCircleOutlined />}
                  onClick={() => navigate("/customer/new-claim")}
                  style={{
                    backgroundColor: "#059669",
                    borderRadius: "8px",
                    marginTop: "8px",
                  }}
                >
                  ยื่นคำร้องเคลมสินค้าใหม่
                </Button>
              </div>
            ) : (
              /* --- กรณีมีคำร้องยื่นเคลมในระบบ --- */
              <>
                <div
                  style={{
                    fontSize: "32px",
                    color: "#059669",
                    marginBottom: "12px",
                  }}
                >
                  <FileTextOutlined />
                </div>
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "18px",
                    color: "#1e293b",
                  }}
                >
                  เลือกรายการเคลมสินค้า
                </h4>
                <p
                  style={{
                    margin: "0 0 20px 0",
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  โปรดเลือกรายการที่คุณต้องการติดต่อสอบถามกับเจ้าหน้าที่
                </p>

                <Select
                  showSearch
                  allowClear
                  placeholder="-- เลือกเลขอ้างอิงการเคลม --"
                  notFoundContent={
                    <span style={{ color: "#94a3b8" }}>ไม่พบรายการเคลม</span>
                  }
                  style={{
                    width: "100%",
                    marginBottom: "16px",
                    textAlign: "left",
                  }}
                  size="large"
                  options={claimOptions}
                  value={selectedClaim}
                  onSearch={(val) => setSelectedClaim(val)}
                  onSelect={(val) => setSelectedClaim(val)}
                  onChange={(val) => !val && setSelectedClaim(null)}
                  filterOption={(input, option) =>
                    (option?.label ?? "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
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
              </>
            )}
          </div>
        </div>
      ) : (
        /* --- ส่วนแสดงกล่องข้อความสนทนา ---*/
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
            const isMe = msg.senderRole === "CUSTOMER";

            const isPrevSameSender =
              index > 0 &&
              currentMessages[index - 1].senderRole === msg.senderRole &&
              currentMessages[index - 1].senderName === msg.senderName;

            if (msg.isSystem || msg.senderRole === "SYSTEM") {
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    margin: "8px 0",
                  }}
                >
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
                          style={{
                            backgroundColor: "#cbd5e1",
                            color: "#475569",
                          }}
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
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "4px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#475569",
                          }}
                        >
                          {msg.senderName}
                        </span>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                          {msg.time}
                        </span>
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
                        <CheckOutlined style={{ color: "#059669" }} /> ส่งแล้ว{" "}
                        {msg.time}
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

      {/* ===== INPUT FOOTER ===== */}
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

export default CustomerChat;
