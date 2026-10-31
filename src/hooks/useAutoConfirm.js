import { useEffect, useRef } from "react";
import claimService from "../services/claimService";
import { getDueAutoConfirms, getConfirmDeadline, findConfirmLog, buildAutoConfirmPayload, CONFIRM_KIND } from "../utils/claimConfirm";

const inFlight = new Set();

export const runAutoConfirms = async ({ claim, logs, deliveries, statusName, updateBy }) => {
  if (!claim?.claim_id) return 0;
  const due = getDueAutoConfirms({ claim, logs, deliveries, statusName });
  let written = 0;
  for (const { kind, deadline } of due) {
    const key = `${claim.claim_id}:${kind}`;
    if (inFlight.has(key)) continue;
    inFlight.add(key);
    try {
      await claimService.createClaimStatusLogs(
        buildAutoConfirmPayload({ claimId: claim.claim_id, kind, deadline, updateBy })
      );
      written += 1;
    } catch (err) {
      console.warn("Auto-confirm failed:", err);
      inFlight.delete(key);
      continue;
    }
    setTimeout(() => inFlight.delete(key), 60 * 1000);
  }
  return written;
};

export const useAutoConfirm = ({ claim, logs, deliveries, statusName, updateBy, onStamped, enabled = true }) => {
  const onStampedRef = useRef(onStamped);
  useEffect(() => {
    onStampedRef.current = onStamped;
  });

  useEffect(() => {
    if (!enabled || !claim?.claim_id) return undefined;

    let cancelled = false;
    const check = async () => {
      const written = await runAutoConfirms({ claim, logs, deliveries, statusName, updateBy });
      if (!cancelled && written > 0) onStampedRef.current?.();
    };
    check();

    const nextDeadlines = [CONFIRM_KIND.SUBMIT, CONFIRM_KIND.RECEIVE]
      .filter((kind) => !findConfirmLog(logs, kind) && (kind === CONFIRM_KIND.SUBMIT || statusName === "Delivered"))
      .map((kind) => getConfirmDeadline(kind, claim, logs, deliveries))
      .filter(Boolean)
      .map((d) => d.getTime() - Date.now())
      .filter((ms) => ms > 0 && ms <= 60 * 60 * 1000);

    const timer = nextDeadlines.length > 0 ? setTimeout(check, Math.min(...nextDeadlines) + 500) : null;

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, claim, logs, deliveries, statusName, updateBy]);
};

export default useAutoConfirm;
