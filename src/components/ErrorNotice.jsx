import React from "react";
import { notification } from "antd";
import { CloseCircleFilled } from "@ant-design/icons";
import { toFriendlyError } from "../utils/friendlyError";

const ErrorNoticeBody = ({ description, hint, detail }) => (
  <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-slate-700">
    {description && <div className="break-words">{description}</div>}
    {hint && (
      <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-amber-800 break-words">
        <span className="font-medium">วิธีแก้: </span>
        {hint}
      </div>
    )}
    {detail && (
      <details className="text-xs text-slate-500">
        <summary className="cursor-pointer select-none hover:text-slate-700">รายละเอียดสำหรับผู้ดูแลระบบ</summary>
        <div className="mt-1.5 max-h-28 overflow-auto rounded-md bg-slate-50 border border-slate-100 px-2 py-1.5 font-mono text-[11px] leading-snug break-all select-all">
          {detail}
        </div>
      </details>
    )}
  </div>
);

export const showErrorNotice = (input, options = {}) => {
  const info = toFriendlyError(input, options.title);
  const key = options.key || `error:${info.title}:${info.description}`;
  notification.error({
    key,
    title: <span className="font-medium text-slate-800 break-words">{info.title}</span>,
    description: <ErrorNoticeBody description={info.description} hint={info.hint} detail={info.detail} />,
    icon: <CloseCircleFilled style={{ color: "#dc2626" }} />,
    placement: "topRight",
    duration: options.duration ?? (info.hint || info.detail ? 8 : 5),
    showProgress: true,
    pauseOnHover: true,
    className: "friendly-error-notice",
  });
  return info;
};

let installed = false;

export const installFriendlyErrors = (message) => {
  if (installed || !message || typeof message.error !== "function") return;
  installed = true;
  const originalError = message.error.bind(message);
  message.error = (content, ...rest) => {
    const isConfig = content && typeof content === "object" && !React.isValidElement(content) && !(content instanceof Error) && "content" in content;
    const value = isConfig ? content.content : content;
    if (typeof value === "string" || value instanceof Error) {
      showErrorNotice(value, isConfig && content.key ? { key: content.key } : {});
      const done = Promise.resolve(true);
      const close = () => {};
      close.then = done.then.bind(done);
      return close;
    }
    return originalError(content, ...rest);
  };
};
