import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Modal, Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import { buildClaimDocument } from "../utils/claimDocument";
import signatureService from "../services/signatureService";

const PAPER_WIDTH_PX = 756;

const cell = { border: "1px solid #000" };

const Dotted = ({ children, className = "", style }) => (
  <span className={`border-b border-dotted border-slate-800 px-1 ${className}`} style={style}>
    {children}
  </span>
);

const SignLine = ({ no, signer, role, colorClass = "text-blue-900", plate }) => (
  <div className="flex flex-col gap-0.5">
    <div className="flex items-baseline min-w-0">
      <span className="shrink-0 font-medium">{no}.ลงชื่อ</span>
      <span
        className={`flex-1 min-w-0 text-center font-bold px-1 truncate mx-1 ${colorClass}`}
        style={{ borderBottom: "1px dotted #000" }}
      >
        {signer?.name || " "}
      </span>
      <span className="shrink-0 text-[8px]">{role}</span>
      {plate !== undefined && (
        <>
          <span className="shrink-0 text-[8px] ml-1">ทะเบียน</span>
          <span
            className={`font-mono font-bold shrink-0 text-[8px] px-1 min-w-[55px] text-center ${colorClass}`}
            style={{ borderBottom: "1px dotted #000" }}
          >
            {plate || " "}
          </span>
        </>
      )}
    </div>
    <div className="flex items-baseline text-[8px] pl-8">
      <span className="mr-1">วันที่</span>
      <span className={`min-w-[96px] text-center font-mono font-bold ${colorClass}`} style={{ borderBottom: "1px dotted #000" }}>
        {signer?.at && signer.at !== "-" ? signer.at : " "}
      </span>
      {signer?.isAuto && <span className="ml-1 text-[7px] text-slate-500">(ยืนยันอัตโนมัติ)</span>}
    </div>
  </div>
);

const ClaimPrintModal = ({
  open,
  onClose,
  isStaff,
  claim,
  items = [],
  statusLogs = [],
  approveLogs = [],
  deliveries = [],
  usersMap = {},
  users = [],
  agents = [],
  agentName = "",
}) => {
  const printRef = useRef(null);
  const frameRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const [signature, setSignature] = useState(null);
  const [signatureReady, setSignatureReady] = useState(true);

  useEffect(() => {
    if (!open || !isStaff || !claim?.warehouse) return undefined;
    let alive = true;
    signatureService
      .getByWarehouse(claim.warehouse)
      .then(({ ready, data }) => {
        if (!alive) return;
        setSignatureReady(ready);
        setSignature(data);
      })
      .catch(() => alive && setSignature(null));
    return () => {
      alive = false;
    };
  }, [open, isStaff, claim?.warehouse]);

  const doc = useMemo(
    () =>
      buildClaimDocument({
        claim: claim || {},
        items,
        statusLogs,
        approveLogs,
        deliveries,
        usersMap,
        users,
        agents,
        agentName,
        signature,
        forCustomer: !isStaff,
      }),
    [claim, items, statusLogs, approveLogs, deliveries, usersMap, users, agents, agentName, signature, isStaff]
  );

  useLayoutEffect(() => {
    if (!open) return undefined;
    const update = () => {
      const w = frameRef.current?.clientWidth || PAPER_WIDTH_PX;
      setScale(Math.min(1, (w - 8) / PAPER_WIDTH_PX));
      setContentHeight(printRef.current?.offsetHeight || 0);
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (ro && frameRef.current) ro.observe(frameRef.current);
    if (ro && printRef.current) ro.observe(printRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [open, doc]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `ใบรับ-เบิก-ส่ง_สินค้าแตกเอเย่นต์_${doc.claimNo}`,
  });

  const emptyRows = Math.max(0, 4 - doc.rows.length);

  return (
    <Modal
      title="ตัวอย่างใบรับ-เบิก-ส่งสินค้าแตก"
      open={open}
      onCancel={onClose}
      width={880}
      centered
      footer={[
        <Button key="close" onClick={onClose}>
          ปิด
        </Button>,
        <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
          พิมพ์ / PDF
        </Button>,
      ]}
    >
      {!signatureReady && isStaff && (
        <div className="mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          ระบบลายเซ็นผู้สอบทานยังไม่พร้อมใช้งาน (รอเพิ่ม API ฝั่ง backend) — ช่องผู้สอบทานจะเว้นว่างไว้
        </div>
      )}

      <div ref={frameRef} className="w-full bg-slate-100 rounded-lg p-1 overflow-hidden">
        <div style={{ height: contentHeight ? contentHeight * scale : undefined }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: PAPER_WIDTH_PX }}>
            <div
              ref={printRef}
              id="printable-area"
              className="w-[200mm] min-h-[138mm] bg-white p-3.5 text-slate-900 text-[10px] leading-tight shadow-md box-border flex flex-col justify-start gap-1.5"
              style={{ border: "1.5px solid #000" }}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-0.5">
                <div className="w-1/4" />
                <div className="w-2/4 text-center">
                  <h2 className="text-xs font-bold m-0 leading-tight">
                    บริษัท ไทยเบฟเวอเรจ โลจิสติก จำกัด คลัง <Dotted className="font-bold text-blue-900">{doc.warehouse}</Dotted>
                  </h2>
                  <p className="font-bold text-[10.5px] m-0 mt-0.5">ใบรับ - เบิก - ส่ง สินค้าแตกเอเย่นต์</p>
                </div>
                <div className="w-1/4 text-right">
                  <span className="font-bold">เล่มที่-เลขที่ </span>
                  <Dotted className="font-bold text-blue-900">{doc.claimNo}</Dotted>
                </div>
              </div>

              <div className="flex items-center gap-1 mb-0.5">
                <span className="font-bold shrink-0">เอเย่นต์ ชื่อ :</span>
                <span className="border-b border-dotted border-slate-800 flex-1 font-bold px-1 truncate text-blue-900">{doc.agentName}</span>
              </div>

              {/* ประเภทการแตก & วันที่ */}
              <div className="flex justify-between items-center mb-0.5 text-[9.5px] gap-2">
                <div className="flex items-center gap-3">
                  {[
                    ["transport", "แตกจากการขนส่ง"],
                    ["after", "แตกแห้งหลังการส่งสินค้า"],
                    ["other", "อื่นๆ"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1">
                      <input type="checkbox" checked={Boolean(doc.causeFlags[key])} readOnly className="w-3 h-3 accent-blue-900" />
                      <span className="font-medium">{label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3 font-medium shrink-0">
                  <div>
                    วันที่รับสินค้า <Dotted className="font-bold text-blue-900">{doc.receiveDate}</Dotted>
                  </div>
                  <div>
                    วันที่เบิกสินค้าจากคลัง <Dotted className="font-bold text-blue-900 inline-block min-w-[64px] text-center">{doc.withdrawDate || "\u00a0"}</Dotted>
                  </div>
                </div>
              </div>

              <table className="w-full text-center text-[9.5px] my-0.5" style={{ borderCollapse: "collapse", border: "1.5px solid #000" }}>
                <thead>
                  <tr className="bg-slate-50">
                    <th colSpan={5} className="py-1 font-bold" style={cell}>ส่วนรับสินค้าแตกจากเอเย่นต์</th>
                    <th colSpan={2} className="py-1 font-bold" style={cell}>ส่วนคืนสินค้าแตกให้เอเย่นต์</th>
                  </tr>
                  <tr className="bg-slate-100 font-semibold">
                    <th className="p-1 w-[13%]" style={cell}>เลขที่ใบส่งของ</th>
                    <th className="p-1 w-[22%]" style={cell}>ชนิดสินค้า</th>
                    <th className="p-1 w-[10%]" style={cell}>จำนวนแตก<br />(ขวด/กระป๋อง)</th>
                    <th className="p-1 w-[16%]" style={cell}>สาเหตุแตก</th>
                    <th className="p-1 w-[13%]" style={cell}>รับคืนสินค้าแตก<br />(ขวด/กระป๋อง)</th>
                    <th className="p-1 w-[13%]" style={cell}>วันที่คืนสินค้าแตก</th>
                    <th className="p-1 w-[13%]" style={cell}>ส่งคืนสินค้าแตก<br />(ขวด/กระป๋อง)</th>
                  </tr>
                </thead>
                <tbody>
                  {doc.rows.map((row) => (
                    <tr key={row.key} className="h-6">
                      <td className="p-0.5 text-blue-900 font-mono font-bold break-all" style={cell}>{row.shipment}</td>
                      <td className="p-0.5 text-blue-900 font-semibold px-1 text-left break-words" style={cell}>{row.productName}</td>
                      <td className="p-0.5 font-mono font-bold text-blue-900" style={cell}>{row.brokenQty}</td>
                      <td className="p-0.5 text-blue-900 font-medium text-left px-1 break-words" style={cell}>{row.cause}</td>
                      <td className="p-0.5 font-mono font-bold text-blue-900" style={cell}>{row.receivedQty}</td>
                      <td className="p-0.5 font-mono font-bold text-blue-900" style={cell}>{row.returnDate}</td>
                      <td className="p-0.5 font-mono font-bold text-blue-900" style={cell}>{row.returnedQty}</td>
                    </tr>
                  ))}
                  {Array.from({ length: emptyRows }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="h-6">
                      {Array.from({ length: 7 }).map((__, c) => (
                        <td key={c} className="p-0.5" style={cell} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* ผู้อนุมัติ */}
              <div className="text-[9px] mt-auto pt-1 leading-relaxed">
                <div className="flex flex-col items-end pr-1 pt-2 pb-2 gap-2">
                  <div className="flex items-end text-[8.5px]">
                    <span className="whitespace-nowrap">ลงชื่อ</span>
                    <div className="w-48 mx-2 border-b border-dotted border-slate-700 text-center h-5 flex items-end justify-center">
                      <span className="font-bold text-blue-900 text-[9px] truncate px-1">{doc.approver?.name || " "}</span>
                    </div>
                    <span className="font-bold pl-1 whitespace-nowrap">ผู้อนุมัติ</span>
                    <span className="text-gray-500 text-[8px] pl-1 whitespace-nowrap">(หัวหน้าคลังสินค้า)</span>
                  </div>

                  <div className="flex items-end text-[8.5px]">
                    <span className="whitespace-nowrap">ลงชื่อ</span>
                    <div className="w-48 mx-2 border-b border-dotted border-slate-700 text-center h-9 flex flex-col items-center justify-end">
                      {doc.reviewer?.signatureUrl ? (
                        <img src={doc.reviewer.signatureUrl} alt="ลายเซ็นผู้สอบทาน" className="max-h-7 max-w-full object-contain" />
                      ) : null}
                      {doc.reviewer?.name ? (
                        <span className="font-bold text-blue-900 text-[8px] truncate px-1 leading-none pb-px">({doc.reviewer.name})</span>
                      ) : null}
                    </div>
                    <span className="font-bold pl-1 whitespace-nowrap">ผู้สอบทาน</span>
                    <span className="text-gray-500 text-[7.5px] pl-1 whitespace-nowrap">(หัวหน้ากลุ่มคลัง/ผช. ผจก.กลุ่มคลัง)</span>
                  </div>
                </div>

                <div className="px-4 py-3 text-[8.5px] leading-loose" style={{ border: "1.5px solid #000" }}>
                  <div className="grid grid-cols-12 gap-3 items-stretch">
                    <div className="col-span-7 flex flex-col justify-between pr-4 gap-1.5" style={{ borderRight: "1px solid #64748b" }}>
                      <SignLine no={1} signer={doc.driverPickup} role="ผู้รับคืนสินค้าจากเอเย่นต์(พขร.)" colorClass="text-blue-900" plate={doc.driverPickup?.plate} />
                      <SignLine no={2} signer={doc.staffReceive} role="รับสินค้าจากพขร.(พนักงานคลังสินค้า)" colorClass="text-blue-900" />
                      <SignLine no={3} signer={doc.driverReturn} role="ผู้ส่งคืนสินค้า(พขร.)" colorClass="text-blue-900" plate={doc.driverReturn?.plate || ""} />
                    </div>
                    <div className="col-span-5 flex flex-col justify-around pl-2 gap-1.5">
                      <SignLine no={4} signer={doc.agentSubmit} role="ผู้ส่งคืนสินค้า(เอเย่นต์)" colorClass="text-blue-900" />
                      <SignLine no={5} signer={doc.agentReceive} role="ผู้รับสินค้า(เอเย่นต์)" colorClass="text-blue-900" />
                    </div>
                  </div>
                </div>

                <div className="mt-2 pt-1 px-2 border-t border-slate-300 text-[8px] text-gray-500 flex justify-between">
                  <span className="font-semibold text-slate-700">{isStaff ? "ต้นฉบับ - คลัง TBL" : "สำเนา - สำหรับเอเย่นต์"}</span>
                  <span>เอกสารระบบ BEV CLAIM BY TBL · สถานะ {doc.statusName}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ClaimPrintModal;