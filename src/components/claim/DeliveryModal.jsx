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
}) => {
  return (
    <Modal
      title={<span className="font-medium text-slate-800">มอบหมายงาน พขร. (บันทึกข้อมูลจัดส่งสินค้าเคลม)</span>}
      open={open}
      onOk={onSave}
      confirmLoading={submitting}
      onCancel={() => !submitting && onCancel()}
      okText="บันทึก Delivery"
      cancelText="ยกเลิก"
      okButtonProps={{ className: "bg-blue-600 hover:bg-blue-700 font-normal" }}
      width={500}
    >
      <div className="flex flex-col gap-4 py-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Claim ID:</label>
          <Input value={claimId || ""} disabled className="bg-slate-50 font-mono" />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Driver ID (รหัสพนักงานขับรถ) <span className="text-red-500">*</span>:
          </label>
          <Input
            placeholder="เช่น 70079126"
            value={deliveryForm.driver_id}
            onChange={(e) => setDeliveryForm((prev) => ({ ...prev, driver_id: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            ทะเบียนรถ (Truck Plate) <span className="text-red-500">*</span>:
          </label>
          <Input
            placeholder="เช่น 748895"
            value={deliveryForm.truck_plate}
            onChange={(e) => setDeliveryForm((prev) => ({ ...prev, truck_plate: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Delivery Status ID ( Default: 8 ):</label>
          <Input value={deliveryForm.delivery_status} disabled className="bg-slate-50 font-mono text-slate-500" />
        </div>
      </div>
    </Modal>
  );
};

export default DeliveryModal;