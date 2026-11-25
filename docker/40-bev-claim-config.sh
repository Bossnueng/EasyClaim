#!/bin/sh
# รันอัตโนมัติตอน nginx container เริ่ม (ทุกไฟล์ใน /docker-entrypoint.d/ ถูกเรียกก่อนเปิด nginx)
# เขียน env-config.js จาก environment ของ pod เพื่อให้ image เดียวกันตั้งค่าต่างกันได้ตาม environment
#
#   AUTO_CONFIRM_SUBMIT_SECONDS   เวลาก่อนระบบยืนยันการส่งเคลมแทนลูกค้า (วินาที)
#   AUTO_CONFIRM_RECEIVE_SECONDS  เวลาก่อนระบบยืนยันรับสินค้าแทนลูกค้า (วินาที)
#
# ไม่ได้ตั้งตัวไหน = ใช้ค่าที่ build ไว้ (VITE_AUTO_CONFIRM_*: 24 ชม. / 72 ชม.)
set -eu

TARGET="${BEV_CLAIM_HTML_DIR:-/usr/share/nginx/html/bev-claim}/env-config.js"

# รับเฉพาะตัวเลข กันค่าแปลก ๆ หลุดเข้าไปในไฟล์ JavaScript
num() {
  case "${1:-}" in
    ''|*[!0-9]*) echo "null" ;;
    *) echo "$1" ;;
  esac
}

SUBMIT=$(num "${AUTO_CONFIRM_SUBMIT_SECONDS:-}")
RECEIVE=$(num "${AUTO_CONFIRM_RECEIVE_SECONDS:-}")

cat > "$TARGET" <<EOF
window.__BEV_CLAIM_CONFIG__ = {
  AUTO_CONFIRM_SUBMIT_SECONDS: ${SUBMIT},
  AUTO_CONFIRM_RECEIVE_SECONDS: ${RECEIVE}
};
EOF

echo "bev-claim config: AUTO_CONFIRM_SUBMIT_SECONDS=${SUBMIT} AUTO_CONFIRM_RECEIVE_SECONDS=${RECEIVE} (null = ค่าตอน build)"
