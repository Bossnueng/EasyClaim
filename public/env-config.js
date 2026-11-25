// ค่าตั้งของหน้าเว็บที่เปลี่ยนได้ตอนรัน (ไม่ต้อง build ใหม่)
// ไฟล์นี้ใช้ตอน npm run dev / ค่าเริ่มต้น — ใน container ถูกเขียนทับโดย docker/40-bev-claim-config.sh
// จาก environment ของ pod (ดู k8s/overlays/uat/kustomization.yaml)
// ค่าว่าง = ใช้ค่า VITE_AUTO_CONFIRM_* ตอน build
window.__BEV_CLAIM_CONFIG__ = {};
