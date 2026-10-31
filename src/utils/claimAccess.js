const toStr = (v) => (v === null || v === undefined ? "" : String(v).trim());

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

export const canAccessClaim = (claim, scope) => {
  if (!claim || !scope) return false;
  const claimAgentId = toStr(claim.agent_id);
  const claimAgentCode = toStr(claim.agent_code);
  const createdBy = toStr(claim.created_by ?? claim.user_id);

  let isAgentMatch = false;
  if (claimAgentCode && scope.codes.size > 0) {
    isAgentMatch = scope.codes.has(claimAgentCode);
  } else if (claimAgentId) {
    isAgentMatch = scope.ids.has(claimAgentId) || scope.codes.has(claimAgentId);
  }
  const isCreator = Boolean(scope.userId) && createdBy === scope.userId;

  return Boolean(isAgentMatch || isCreator);
};

export const filterClaimsForUser = (claims = [], user, agents = []) => {
  const scope = getUserAgentScope(user, agents);
  return (Array.isArray(claims) ? claims : []).filter((c) => canAccessClaim(c, scope));
};
