import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Empty, message, Spin } from "antd";
import {  RightOutlined,  CheckCircleOutlined,  FileSearchOutlined,  ClockCircleOutlined,  WarningOutlined,} from "@ant-design/icons";
import dayjs from "dayjs";
import { STATUS_PRIORITY, CLAIM_STATUS_MAP } from "../../constants/claimStatus";
import StaffClaimCard from "../../components/StaffClaimCard";
import loginService from "../../services/loginService";
import claimService from "../../services/claimService";
import itemService from "../../services/itemService";



const StaffHome = () => {
  const navigate = useNavigate();
  const user = loginService.getCurrentUser();
  const [allClaims, setAllClaims] = useState([]);
  const [latestClaims, setLatestClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [itemsMap, setItemsMap] = useState({});

  useEffect(() => {
    fetchClaimsAndItems();
  }, []);

  // Helper Function: แปลงสถานะเป็น Priority (รองรับทั้ง status_id ตัวเลข และ ชื่อภาษาไทย)
  const getPriority = (item) => {
    const statusVal = item?.status_id ?? item?.current_status ?? item?.status;
    
    // กรณี statusVal เป็นตัวเลข ID
    if (CLAIM_STATUS_MAP[String(statusVal)]) {
      return CLAIM_STATUS_MAP[String(statusVal)].priority;
    }
    // กรณี statusVal เป็นชื่อภาษาไทย
    if (STATUS_PRIORITY[statusVal] !== undefined) {
      return STATUS_PRIORITY[statusVal];
    }
    return 99; // fallback กรณีไม่ตรงกับสถานะใดเลย
  };

  // Helper Function: ดึงชื่อสถานะภาษาไทยสำหรับส่งให้ ClaimCard
  const getStatusNameText = (item) => {
    const statusVal = item?.status_id ?? item?.current_status ?? item?.status;
    if (CLAIM_STATUS_MAP[String(statusVal)]) {
      return CLAIM_STATUS_MAP[String(statusVal)].name;
    }
    return statusVal || "ไม่ระบุสถานะ";
  };

  const fetchClaimsAndItems = async () => {
    setLoading(true);

    try {
      const [resClaim, resItems] = await Promise.all([
        claimService.getClaim(),
        itemService.getItems(),
      ]);

      // 1. Map ชื่อสินค้า
      const itemsData = resItems?.data || resItems || [];
      const map = {};
      if (Array.isArray(itemsData)) {
        itemsData.forEach((item) => {
          map[item.item_id] = item.item_name;
        });
        setItemsMap(map);
      }

      // 2. จัดการข้อมูลรายการเคลม
      const claimData = Array.isArray(resClaim)
        ? resClaim
        : resClaim?.data || [];

      // อัปเดต State allClaims ทันที
      setAllClaims(claimData);

      if (claimData.length > 0) {
        // กรองเฉพาะรายการที่ยังไม่จบกระบวนการ (ตัด priority 8=สำเร็จ, 9=ไม่มีสิทธิ์, 10=ไม่อนุมัติ)
        const pendingClaims = claimData.filter((item) => {
          const priority = getPriority(item);
          return priority !== 8 && priority !== 9 && priority !== 10;
        });

        // จัดเรียงตาม Priority และ วันที่สร้างล่าสุด
        const sortedClaims = pendingClaims.sort((a, b) => {
          const priorityA = getPriority(a);
          const priorityB = getPriority(b);

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          const dateA = dayjs(a.claim_date || a.created_at || a.createdDate);
          const dateB = dayjs(b.claim_date || b.created_at || b.createdDate);
          return dateB.valueOf() - dateA.valueOf();
        });

        setLatestClaims(sortedClaims.slice(0, 8));
      } else {
        setLatestClaims([]);
      }
    } catch (error) {
      message.error(
        "ไม่สามารถดึงข้อมูลรายการเคลมได้: " +
          (error.message || "เกิดข้อผิดพลาด")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="p-4 sm:p-6 md:p-8 bg-gray-100 min-h-screen flex flex-col gap-6"
      style={{ boxSizing: "border-box", width: "100%" }}
    >
      <div
        className="w-full flex flex-col gap-6"
        style={{ boxSizing: "border-box" }}
      >
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 m-0">
            สวัสดี, {user?.full_name || user?.name || "-"}
          </h1>
          <p className="text-gray-500 text-sm m-0">
            ติดตามสถานะการแจ้งเคลมสินค้าใหม่ได้ที่นี่
          </p>
          
        </header>

        {/* Dashboard Summary Cards */}
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Card 1: รายการเคลมใหม่ / รอการพิจารณา (Priority 1 และ 2) */}
          <div
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
            style={{
              boxSizing: "border-box",
              padding: "24px 28px",
              overflow: "hidden",
            }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">
                รายการเคลมใหม่
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                {allClaims.filter((item) => {
                  const p = getPriority(item);
                  return p <= 2 ;
                }).length}
              </span>
              <span className="text-xs text-blue-500 font-medium">
                รอการพิจารณา
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <FileSearchOutlined />
            </div>
          </div>

          {/* Card 2: ค้างดำเนินการ (Priority 1 ถึง 7) */}
          <div
            style={{
              boxSizing: "border-box",
              padding: "24px 28px",
              overflow: "hidden",
            }}
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">
                รายการกำลังดำเนินการ
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-amber-600">
                {allClaims.filter((item) => {
                  const p = getPriority(item);
                  return p >= 3 && p <= 7;
                }).length}
              </span>
              <span className="text-xs text-amber-500 font-medium">
                อยู่ระหว่างการจัดการ
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <ClockCircleOutlined />
            </div>
          </div>

          {/* Card 3: เคลมสำเร็จ (Priority 8) */}
          <div
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
            style={{
              boxSizing: "border-box",
              padding: "24px 28px",
              overflow: "hidden",
            }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">
                รายการที่สำเร็จ
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
                {allClaims.filter((item) => getPriority(item) === 8).length}
              </span>
              <span className="text-xs text-emerald-500 font-medium">
                จัดส่ง/เสร็จสิ้นแล้ว
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <CheckCircleOutlined />
            </div>
          </div>

          {/* Card 4: รายการเคลมค้างเกิน (Priority 1: สถานะสร้างรายการเคลม) */}
          <div
            className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between"
            style={{
              boxSizing: "border-box",
              padding: "24px 28px",
              overflow: "hidden",
            }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs sm:text-sm font-medium text-gray-500">
                รายการค้างสถานะเดิมเกิน 3 วัน
              </span>
              <span className="text-2xl sm:text-3xl font-bold text-rose-600">
                {allClaims.filter((item) => {
                  const priority = getPriority(item);
                  
                  // 1. ยกเว้นรายการที่จบกระบวนการแล้ว (8 = จัดส่งสำเร็จ, 9 = ไม่มีสิทธิ์, 10 = ไม่อนุมัติ)[cite: 5]
                  const isFinished = priority === 8 || priority === 9 || priority === 10;
                  if (isFinished) return false;

                  // 2. ดึงวันที่อัปเดตล่าสุด (ถ้าไม่มี updated_at ให้ใช้วันอนุมัติหรือวันสร้างรายการแทน)
                  const lastUpdateDate = item.updated_at || item.approved_at || item.claim_date || item.created_at;
                  if (!lastUpdateDate) return false;

                  // 3. คำนวณจำนวนวันที่ไม่มีการเปลี่ยนสถานะเทียบกับวันนี้
                  const diffDays = dayjs().diff(dayjs(lastUpdateDate), "day");

                  // 4. ค้างสถานะเดิมเกิน 3 วัน (นับตั้งแต่เข้าสู่วันที่ 4 เป็นต้นไป)
                  return diffDays >= 3;
                }).length}
              </span>
              <span className="text-xs text-rose-500 font-medium">
                ต้องเร่งดำเนินการ
              </span>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg sm:text-xl shrink-0">
              <WarningOutlined />
            </div>
          </div>
        </div>

        {/* Section รายการเคลมล่าสุด */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 m-0">
              รายการเคลมล่าสุด
            </h2>
            <Button
              type="link"
              onClick={() => navigate("/staff/list-claim")}
              className="text-emerald-700 font-semibold p-0 flex items-center gap-1 hover:text-emerald-800"
            >
              ดูทั้งหมด
              <RightOutlined style={{ fontSize: "11px" }} />
            </Button>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl p-12 text-center w-full">
              <Spin size="large" tip="กำลังโหลดข้อมูล..." />
            </div>
          ) : latestClaims.length > 0 ? (
            <div className="flex flex-col gap-3.5 w-full">
              {latestClaims.map((claim) => (
                <StaffClaimCard
                  key={claim.claim_id || claim.claim_no}
                  claim={{
                    ...claim,
                    item_name:
                      itemsMap[claim.item_id] ||
                      claim.item_name ||
                      `สินค้า ID: ${claim.item_id}`,
                  }}
                  variant="compact"
                />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center my-4 w-full">
              <Empty description="ไม่พบรายการเคลมสินค้าใหม่หรือกำลังดำเนินการ" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StaffHome;