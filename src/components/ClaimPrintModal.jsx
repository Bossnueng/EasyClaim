import React, { useRef } from "react";
import { Modal, Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";

const ClaimPrintModal = ({ open, onClose, data, isStaff}) => {
  const printRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `ใบรับ-เบิก-ส่ง_สินค้าแตกเอเย่นต์_${data?.claimNo || data?.claimId || "เอกสาร"}`,
  });

  return (
    <Modal
      title="ตัวอย่างเอกสารใบรับ-เบิก-ส่ง สินค้าแตกเอเย่นต์"
      open={open}
      onCancel={onClose}
      width={900}
      centered
      footer={[
        <Button key="close" onClick={onClose} className="rounded-lg">
          ปิด
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          className="bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium"
          onClick={handlePrint}
        >
          พิมพ์ / ดาวน์โหลดเอกสาร (PDF)
        </Button>,
      ]}
    >
      <div className="flex justify-center bg-slate-100 p-2 overflow-x-auto">
        <div
          ref={printRef}
          id="printable-area"
          className="w-[200mm] min-h-[138mm] bg-white p-3.5 font-sans text-slate-900 text-[10px] leading-tight shadow-md box-border flex flex-col justify-start gap-1.5"
          style={{ border: "1.5px solid #000" }}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-0.5">
            <div className="w-1/4"></div>
            <div className="w-2/4 text-center">
              <h2 className="text-xs font-bold m-0 text-slate-900 leading-tight">
                บริษัท ไทยเบฟเวอเรจ โลจิสติก จำกัด คลัง{" "}
                <span className="text-red-600 border-b border-dotted border-slate-800 px-1 font-bold">RDC ขอนแก่น</span>
              </h2>
              <p className="font-bold text-[10.5px] m-0 mt-0.5">ใบรับ - เบิก - ส่ง สินค้าแตกเอเย่นต์</p>
            </div>
            <div className="w-1/4 text-right">
              <div className="inline-flex items-baseline gap-1">
                <span className="font-bold">เล่มที่-เลขที่</span>
                <span className="border-b border-dotted border-slate-800 px-1 font-bold text-blue-900">
                  {data?.claimNo || "data?.claimNo"}
                </span>
              </div>
            </div>
          </div>

          {/* ข้อมูลเอเย่นต์ */}
          <div className="flex items-center gap-1 mb-0.5">
            <span className="font-bold shrink-0">เอเย่นต์ ชื่อ :</span>
            <span className="border-b border-dotted border-slate-800 flex-1 font-bold px-1 truncate">
              {/* 🟢 เช็คทั้ง agentName และ agent_name โดยตัดค่าว่างออก */}
              {data?.agentName   || "-"}
            </span>
          </div>

          {/* ประเภทการแตก & วันที่ */}
          <div className="flex justify-between items-center mb-0.5 text-[9.5px]">
            <div className="flex items-center gap-3">
              {/* 1. แตกจากการขนส่ง */}
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    String(data?.claimType || "").includes("ขนส่ง") ||
                    (!String(data?.claimType || "").includes("หลังการส่ง") &&
                    !String(data?.claimType || "").includes("อื่นๆ"))
                  }
                  readOnly
                  className="w-3 h-3 accent-red-600"
                />
                <span className="font-medium">แตกจากการขนส่ง</span>
              </label>

              {/* 2. แตกแห้งหลังการส่งสินค้า */}
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={String(data?.claimType || "").includes("หลังการส่ง")}
                  readOnly
                  className="w-3 h-3 accent-red-600"
                />
                <span className="font-medium">แตกแห้งหลังการส่งสินค้า</span>
              </label>

              {/* 3. อื่นๆ */}
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={
                    String(data?.claimType || "").includes("อื่นๆ") ||
                    String(data?.claimType || "").includes("อื่น")
                  }
                  readOnly
                  className="w-3 h-3 accent-red-600"
                />
                <span className="font-medium">อื่นๆ</span>
              </label>
            </div>
            <div className="flex gap-3 font-medium">
              <div>
                <span>วันที่รับสินค้า </span>
                <span className="border-b border-dotted border-slate-800 font-bold px-0.5 text-red-600">
                  {data?.receiveDate || "-"}
                </span>
              </div>
              <div>
                <span>วันที่เบิกสินค้าจากคลัง </span>
                <span className="border-b border-dotted border-slate-800 font-bold px-0.5 text-red-600">
                  {data?.withdrawDate ? dayjs(data.withdrawDate).format("DD/MM/YYYY") : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* ตารางข้อมูล */}
        <table className="w-full text-center text-[9.5px] my-0.5" style={{ borderCollapse: "collapse", border: "1.5px solid #000" }}>
          <thead>
            <tr className="bg-slate-50">
              <th colSpan={5} className="py-1 font-bold" style={{ border: "1px solid #000" }}>
                ส่วนรับสินค้าแตกจากเอเย่นต์
              </th>
              <th colSpan={2} className="py-1 font-bold" style={{ border: "1px solid #000" }}>
                ส่วนคืนสินค้าแตกให้เอเย่นต์
              </th>
            </tr>
            <tr className="bg-slate-100 font-semibold">
              <th className="p-1 w-[13%]" style={{ border: "1px solid #000" }}>เลขที่ใบส่งของ</th>
              <th className="p-1 w-[20%]" style={{ border: "1px solid #000" }}>ชนิดสินค้า</th>
              <th className="p-1 w-[10%]" style={{ border: "1px solid #000" }}>จำนวนแตก<br />(ขวด/กระป๋อง)</th>
              <th className="p-1 w-[18%]" style={{ border: "1px solid #000" }}>สาเหตุแตก</th>
              <th className="p-1 w-[13%]" style={{ border: "1px solid #000" }}>รับคืนสินค้าแตก<br />(ขวด/กระป๋อง)</th>
              <th className="p-1 w-[13%]" style={{ border: "1px solid #000" }}>วันที่คืนสินค้าแตก</th>
              <th className="p-1 w-[13%]" style={{ border: "1px solid #000" }}>ส่งคืนสินค้าแตก<br />(ขวด/กระป๋อง)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="h-6">
              {/* เลขที่ใบส่งของ */}
              <td className="p-0.5 text-red-600 font-mono font-bold" style={{ border: "1px solid #000" }}>
                {data?.claimNo || data?.claimId ? String(data.claimNo || data.claimId).slice(-8) : "-"}
              </td>
              
              {/* ชนิดสินค้า */}
              <td className="p-0.5 text-red-600 font-semibold px-1" style={{ border: "1px solid #000" }}>
                {data?.productName || "-"}
              </td>
              
              {/* 🟢 1. จำนวนแตก(ขวด/กระป๋อง): จำนวนแตกที่รับรองการเปลี่ยน (approved_qty) */}
              <td className="p-0.5 font-mono font-bold text-blue-600" style={{ border: "1px solid #000" }}>
                {data?.approved_qty ?? data?.approvedQty ?? "0"}
              </td>
              
              {/* สาเหตุแตก */}
              <td className="p-0.5 text-blue-600 font-medium" style={{ border: "1px solid #000" }}>
                {data?.detail || data?.remark || "-"}
              </td>
              
              {/* 🟢 2. รับคืนสินค้าแตก: จำนวนที่รับคืนสินค้าแตก จากข้อมูลการรับสินค้าเคลม (full_receive) */}
              <td className="p-0.5 font-mono font-bold text-red-600" style={{ border: "1px solid #000" }}>
                {data?.full_receive || data?.fullReceive || "-"}
              </td>
              
              {/* 🟢 3. วันที่คืนสินค้าแตก: Stamp วันที่สถานะกำลังจัดส่งใน Timeline Log */}
              <td className="p-0.5 font-mono font-bold text-red-600" style={{ border: "1px solid #000" }}>
                {(() => {
                  const rawDate = data?.deliveryLogDate || data?.delivery_date;
                  if (!rawDate || rawDate === "-") return "-";
                  // ดึงเฉพาะ DD/MM/YYYY
                  const dateOnly = String(rawDate).trim().split(" ")[0];
                  return dateOnly ? dayjs(dateOnly, ["DD/MM/YYYY", "YYYY-MM-DD"]).format("DD/MM/YYYY") : "-";
                })()}
              </td>
              
              {/* 🟢 4. ส่งคืนสินค้าแตก: จำนวนที่ส่งสินค้าคืน จากข้อมูลการเบิกเปลี่ยนสินค้า (returned_qty) */}
              <td className="p-0.5 font-mono font-bold text-red-600" style={{ border: "1px solid #000" }}>
                {data?.returned_qty ?? data?.returnedQty ?? "-"}
              </td>
            </tr>

            {/* แถวว่างสำหรับพิมพ์เขียนมือเพิ่มเติม */}
            <tr className="h-6">
              <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
              <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
              <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
              
              <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
              <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
              <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
            </tr>
            {[...Array(3)].map((_, idx) => (
              <tr key={idx} className="h-6">
                <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
                <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
                <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
                <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
                <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
                <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
                <td className="p-0.5" style={{ border: "1px solid #000" }}></td>
              </tr>
            ))}
          </tbody>
        </table>

          {/* Footer & ลายเซ็น */}
          <div className="text-[9px] text-slate-900 mt-auto pt-1 leading-relaxed">
            <div className="flex flex-col items-end pr-1 pt-3 pb-3 gap-2">
            {/* ผู้อนุมัติ */}
            <div className="flex items-baseline text-[8.5px]">
              <span className="whitespace-nowrap">ลงชื่อ</span>
              
              {/* 🟢 ช่องเส้นประพร้อมชื่อสแตมป์ทับตรงกลาง */}
              <div className="w-48 mx-2 border-b border-dotted border-slate-700 text-center relative flex justify-center items-end h-4">
                <span className="font-bold text-blue-600 text-[9px] absolute -bottom-0.5 truncate max-w-full px-1 bg-white/80">
                  {data?.approverName || data?.approvers || "อารียา, สุรศักดิ์, ยุทธพงษ์"}
                </span>
              </div>

              <span className="font-bold pl-1 whitespace-nowrap">ผู้อนุมัติ</span>
              <span className="text-gray-500 text-[8px] pl-1 whitespace-nowrap">(หัวหน้าคลังสินค้า)</span>
            </div>

            

            {/* ผู้สอบทาน */}
            <div className="flex items-baseline text-[8.5px]">
              <span className="whitespace-nowrap">ลงชื่อ</span>
              
              <div className="w-48 mx-2 border-b border-dotted border-slate-700 text-center relative flex justify-center items-end h-4">
                <span className="font-bold text-blue-600 text-[9px] absolute -bottom-0.5 truncate max-w-full px-1 bg-white/80">
                  {data?.reviewerName || "-"}
                </span>
              </div>

              <span className="font-bold pl-1 whitespace-nowrap">ผู้สอบทาน</span>
              <span className="text-gray-500 text-[7.5px] pl-1 whitespace-nowrap">(หัวหน้ากลุ่มคลัง/ผช. ผจก.กลุ่มคลัง)</span>
            </div>
          </div>

            <div className="p-6 text-[8.5px] leading-loose" style={{ border: "1.5px solid #000" }}>
              <div className="grid grid-cols-12 gap-3 items-stretch min-h-[50px]">
                <div className="col-span-7 flex flex-col justify-between pr-6 gap-2" style={{ borderRight: "1px solid #64748b" }}>
                  <div className="flex items-baseline">
                    <span className="shrink-0 font-medium">1.ลงชื่อ</span>
                    <span className="flex-1 text-center font-bold text-red-600 px-1 truncate mx-1" style={{ borderBottom: "1px dotted #000" }}>
                      {data?.driverName || data?.driver_name || "-"}
                    </span>
                    <span className="shrink-0 text-[8px]">ผู้รับคืนสินค้าจากเอเย่นต์(พขร.)</span>
                    <span className="shrink-0 text-[8px] ml-1">ทะเบียน</span>
                    <span className="font-mono font-bold text-red-600 shrink-0 text-[8px] px-1 min-w-[55px] text-center" style={{ borderBottom: "1px dotted #000" }}>
                      {data?.truckPlate || data?.truck_plate || "-"}
                    </span>
                  </div>

                  {/* บรรทัดที่ 2. ลงชื่อ */}
                  <div className="flex items-baseline">
                    <span className="shrink-0 font-medium">2.ลงชื่อ</span>
                    <span className="flex-1 text-center font-bold text-blue-600 px-1 truncate mx-1" style={{ borderBottom: "1px dotted #000" }}>
                      {data?.receiverName || "-"}
                    </span>
                    <span className="shrink-0 text-[8px]">รับสินค้าจากพขร.(พนักงานคลังสินค้า)</span>
                  </div>

                  <div className="flex items-baseline">
                    <span className="shrink-0 font-medium">3.ลงชื่อ</span>
                    <span className="flex-1 text-center font-bold text-red-600 px-1 truncate mx-1" style={{ borderBottom: "1px dotted #000" }}>
                      {data?.deliveryDriver || data?.delivery_driver || "-"}
                    </span>
                    <span className="shrink-0 text-[8px]">ผู้ส่งคืนสินค้า(พขร.)</span>
                    <span className="shrink-0 text-[8px] ml-1">ทะเบียน</span>
                    <span className="font-mono font-bold text-red-600 shrink-0 text-[8px] px-1 min-w-[55px] text-center" style={{ borderBottom: "1px dotted #000" }}>
                      {data?.deliveryPlate || data?.delivery_plate || "-"}
                    </span>
                  </div>
                </div>

                <div className="col-span-5 flex flex-col justify-between pl-4 gap-2">
                  {/* ข้อ 4. ผู้ส่งคืนสินค้า (เอเย่นต์) */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline">
                      <span className="shrink-0 font-medium">4. ลงชื่อ</span>
                      <span className="flex-1 text-center font-bold text-pink-500 px-1 truncate mx-1" style={{ borderBottom: "1px dotted #000" }}>
                        {data?.reporter || "-"}
                      </span>
                      <span className="shrink-0 text-[8px]">ผู้ส่งคืนสินค้า(เอเย่นต์)</span>
                    </div>
                    <div className="flex justify-start items-baseline text-[8px]">
                      <span className="mr-1 font-medium">วันที่</span>
                      <span className="w-36 text-center font-mono font-bold text-pink-500" style={{ borderBottom: "1px dotted #000" }}>
                        {data?.createdDate || "-"}
                      </span>
                    </div>
                  </div>

                  {/* ข้อ 5. ผู้รับสินค้า (เอเย่นต์) ใน ClaimPrintModal.jsx */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline">
                      <span className="shrink-0 font-medium">5. ลงชื่อ</span>
                      <span className="flex-1 text-center font-bold text-pink-500 px-1 truncate mx-1" style={{ borderBottom: "1px dotted #000" }}>
                        {data?.deliverySuccessName || "-"}
                      </span>
                      <span className="shrink-0 text-[8px]">ผู้รับสินค้า(เอเย่นต์)</span>
                    </div>
                    <div className="flex justify-start items-baseline text-[8px]">
                      <span className="mr-1 font-medium">วันที่</span>
                      <span className="w-36 text-center font-mono font-bold text-pink-500" style={{ borderBottom: "1px dotted #000" }}>
                        {data?.deliverySuccessDate || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-4 px-4 border-t border-slate-300 text-[8px] text-gray-500 flex justify-between">
              <span className="font-semibold text-slate-700">
                {isStaff
                  ? "ต้นฉบับ - คลัง TBL"
                  : "สำเนา - สำหรับเอเย่นต์"}
              </span>
              <span>เอกสารระบบ BEV CLAIM BY TBL</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ClaimPrintModal;