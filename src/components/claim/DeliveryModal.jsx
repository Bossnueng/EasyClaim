import React from "react";
import { Modal, Input } from "antd";

const DeliveryModal = ({
  open,
  onCancel,
  onSave,
  submitting,
  deliveryForm,
  setDeliveryForm,
  claimId,
  isReassign = false,
}) => {
  return (
    <Modal
      title={<span className="font-medium text-slate-800">มอบหมาย พขร. / บันทึกการจัดส่ง</span>}
      open={open}
      onOk={onSave}
      confirmLoading={submitting}
      onCancel={() => !submitting && onCancel()}
      okText="บันทึก"
      cancelText="ยกเลิก"
      okButtonProps={{ className: "bg-blue-600 hover:bg-blue-700 font-normal" }}
      width={500}
    >
      <div className="flex flex-col gap-4 py-3">
        <div className="text-xs sm:text-sm leading-relaxed text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
          {isReassign
            ? "การเปลี่ยน พขร. จะยกเลิกงานของ พขร. คนเดิม และส่งงานให้ พขร. คนใหม่แทน"
            : "หลังบันทึก พขร. จะเห็นงานนี้ในแอป เพื่อรับสินค้าไปส่งคืนลูกค้าและเปลี่ยนสถานะเป็น Shipping"}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Claim ID:</label>
          <Input value={claimId || ""} disabled className="bg-slate-50 font-mono" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            รหัส พขร. (Driver ID) <span className="text-red-500">*</span>:
          </label>
          <Input
            placeholder="เช่น 70079126"
            value={deliveryForm.driver_id}
            onChange={(e) => setDeliveryForm((prev) => ({ ...prev, driver_id: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            ทะเบียนรถ <span className="text-red-500">*</span>:
          </label>
          <Input
            placeholder="เช่น 748895"
            value={deliveryForm.truck_plate}
            onChange={(e) => setDeliveryForm((prev) => ({ ...prev, truck_plate: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">สถานะการจัดส่ง (ค่าเริ่มต้น 8):</label>
          <Input value={deliveryForm.delivery_status} disabled className="bg-slate-50 font-mono text-slate-500" />
        </div>
      </div>
    </Modal>
  );
};

export default DeliveryModal;