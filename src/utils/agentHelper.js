/**
 * ค้นหาชื่อ Agent จาก User ID และข้อมูล Agents Map
 * Flow: User ID -> User.agent_id -> Agent.agent_name
 */
export const getAgentNameByUserId = (userId, usersList = [], agentsMap = {}) => {
  if (!userId) return "-";
  
  // 1. ค้นหา User object จาก userId
  const userObj = usersList.find(
    (u) => String(u.user_id || u.id) === String(userId)
  );
  
  // 2. ดึง agent_id ออกมาจาก User
  const agentId = userObj?.agent_id;
  if (!agentId) return "-";

  // 3. Map หา agent_name จาก agentsMap
  return agentsMap[String(agentId)] || "-";
};