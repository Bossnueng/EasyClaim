const rawBase = import.meta.env.BASE_URL || "/";

export const BASE_PATH = rawBase.replace(/\/+$/, "");

export const ROUTER_BASENAME = BASE_PATH || "/";

export const appUrl = (path = "/") => `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
