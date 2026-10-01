import React from "react";
import { Card, Input, Button } from "antd";
import { UserOutlined, SendOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const ClaimComment = ({ chatMessages, newMessage, setNewMessage, sendingMsg, onSendMessage }) => {
  return (
    <Card
      className="rounded-2xl shadow-sm border border-slate-300 w-full bg-[#f0f4f9]/60"
      bodyStyle={{ padding: "20px" }}
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <UserOutlined className="text-slate-700 text-lg" />
          <span className="font-semibold text-slate-800 text-sm sm:text-base">
            {chatMessages.length} private comments
          </span>
        </div>

        {/* รายการข้อความ */}
        <div className="flex flex-col gap-3">
          {chatMessages.length > 0 ? (
            chatMessages.map((msg) => (
              <div key={msg.id} className="flex flex-col gap-1 w-full">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-800 text-xs">
                    {msg.senderName}
                  </span>
                  <span className="text-slate-400 text-[10px] font-normal">
                    • {msg.time ? dayjs(msg.time).format("DD/MM/YYYY HH:mm") : "-"}
                  </span>
                </div>
                <div className="text-slate-800 text-sm sm:text-base whitespace-pre-wrap break-words font-normal leading-relaxed pl-0.5 w-full">
                  {msg.message}
                </div>
              </div>
            ))
          ) : (
            <div className="text-slate-400 italic text-xs py-2">
              ยังไม่มีคอมเมนต์ส่วนตัว
            </div>
          )}
        </div>

        {/* เส้นคั่นกลาง */}
        <div className="border-t border-slate-200/80 w-full" />

        {/* กล่องพิมพ์ข้อความ */}
        <Input.TextArea
          rows={2}
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder="เพิ่มความคิดเห็นส่วนตัว..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          className="rounded-xl border-slate-300 text-sm focus:border-blue-500 bg-white"
        />

        {/* ปุ่มส่ง */}
        <Button
          type="primary"
          block
          icon={<SendOutlined />}
          loading={sendingMsg}
          disabled={!newMessage.trim()}
          onClick={onSendMessage}
          className="bg-blue-500 hover:bg-blue-600 rounded-xl text-sm font-medium h-10 border-none shadow-sm flex items-center justify-center gap-1"
        >
          ส่ง
        </Button>
      </div>
    </Card>
  );
};

export default ClaimComment;