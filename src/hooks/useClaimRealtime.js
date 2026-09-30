import { useEffect } from "react";
import socket from "../services/socket";

export const useClaimRealtime = ({ claimId, isStaff, onCreated, onStatusUpdated, onCommentCreated }) => {
  useEffect(() => {
    // เข้าร่วม Room
    if (isStaff) {
      socket.emit("join:staff");
    }
    if (claimId) {
      socket.emit("join:claim", claimId);
    }

    // ดักฟัง Events
    if (onCreated) socket.on("claim:created", onCreated);
    if (onStatusUpdated) socket.on("claim:status_updated", onStatusUpdated);
    if (onCommentCreated) socket.on("claim:comment_created", onCommentCreated);

    return () => {
      if (onCreated) socket.off("claim:created", onCreated);
      if (onStatusUpdated) socket.off("claim:status_updated", onStatusUpdated);
      if (onCommentCreated) socket.off("claim:comment_created", onCommentCreated);
    };
  }, [claimId, isStaff, onCreated, onStatusUpdated, onCommentCreated]);
};