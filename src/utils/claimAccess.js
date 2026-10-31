// src/utils/claimAccess.js
// [QA-FIX 2026-10-31] Test Case 1.1 — ตัวกลางตรวจสิทธิ์ "ลูกค้า/Agent เห็นเคลมใบไหนได้บ้าง" ใช้ร่วมกันทุกหน้า Customer
// เดิม: CustomerHome / CustomerClaimList เขียน logic ซ้ำกัน และมีบั๊ก
//   - เทียบ created_by (String) กับ user_id (Number) → ผู้สร้างเคลมไม่เห็นเคลมของตัวเอง
//   - เอา agent_id และ agent_code มารวมใน list เดียว → Agent อื่นที่ agent_code ตรงกับเลข agent_id ของเรา จะเห็นเคลมของเขา
//   - หน้า CustomerClaimDetail ไม่ตรวจเลย → พิมพ์ URL เลขเคลมของ Agent อื่นแล้วเปิดดูได้ (IDOR)
// หมายเหตุ: นี่คือการป้องกันฝั่งหน้าเว็บเท่านั้น — API /getClaim ยังส่งเคลมทุกใบมา (ต้องแก้ backend ซึ่งอยู่นอกขอบเขต)

const toStr = (v) => (v === null || v === undefined ? "" : String(v).trim());

/** รวมเลข agent_id และ agent_code ที่ผู้ใช้คนนี้ดูแล (แยกกันเพื่อไม่ให้ id ไปชนกับ code) */
export const getUserAgentScope = (user, agents = []) => {
  const ids = new Set();
  if (Array.isArray(user?.agent_ids)) user.agent_ids.forEach((id) => toStr(id) && ids.add(toStr(id)));
  if (toStr(user?.agent_id)) ids.add(toStr(user.agent_id));

  const codes = new Set();
  (Array.isArray(agents) ? agents : []).forEach((a) => {
    const aId = toStr(a?.agent_id ?? a?.id);
    const aCode = toStr(a?.agent_code ?? a?.code);
    if (aId && aCode && ids.has(aId)) codes.add(aCode);
  });

  return { ids, codes, userId: toStr(user?.user_id ?? user?.id) };
};

/** ผู้ใช้คนนี้มีสิทธิ์เห็นเคลมใบนี้หรือไม่ */
export const canAccessClaim = (claim, scope) => {
  if (!claim || !scope) return false;
  const claimAgentId = toStr(claim.agent_id);
  const claimAgentCode = toStr(claim.agent_code);
  const createdBy = toStr(claim.created_by ?? claim.user_id);

  // - ถ้า backend JOIN เจอ Agent (มี claim.agent_code) และเรารู้ code ของ Agent ตัวเอง → ตัดสินจาก code อย่างเดียว
  //   (กันกรณี agent_id ของเราไปตรงกับ agent_code ของ Agent อื่น)
  // - ถ้าไม่มี agent_code หรือโหลดรายชื่อ Agent ไม่สำเร็จ → เทียบ claims.agent_id กับ ids/codes (claims.agent_id บางแถวเก็บเป็น code)
  let isAgentMatch = false;
  if (claimAgentCode && scope.codes.size > 0) {
    isAgentMatch = scope.codes.has(claimAgentCode);
  } else if (claimAgentId) {
    isAgentMatch = scope.ids.has(claimAgentId) || scope.codes.has(claimAgentId);
  }
  const isCreator = Boolean(scope.userId) && createdBy === scope.userId;

  return Boolean(isAgentMatch || isCreator);
};

/** กรองรายการเคลมให้เหลือเฉพาะที่ผู้ใช้มีสิทธิ์ */
export const filterClaimsForUser = (claims = [], user, agents = []) => {
  const scope = getUserAgentScope(user, agents);
  return (Array.isArray(claims) ? claims : []).filter((c) => canAccessClaim(c, scope));
};
