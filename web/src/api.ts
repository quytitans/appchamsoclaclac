import type {
  AccountSummary,
  CreateRecordPayload,
  MonthStatsResponse,
  RecordItem,
  Session,
  StatsResponse,
} from "./types";

const API_BASE = `${import.meta.env.BASE_URL}api`.replace(/\/+/g, "/");

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Đã có lỗi xảy ra" }));
    throw new Error(body.error || "Đã có lỗi xảy ra");
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function createRecord(payload: CreateRecordPayload): Promise<RecordItem> {
  return fetch(`${API_BASE}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => handleResponse<RecordItem>(res));
}

export function fetchRecords(date: string, account: string): Promise<RecordItem[]> {
  return fetch(`${API_BASE}/records?date=${encodeURIComponent(date)}&account=${encodeURIComponent(account)}`).then(
    (res) => handleResponse<RecordItem[]>(res)
  );
}

export function updateRecord(id: number, payload: CreateRecordPayload): Promise<RecordItem> {
  return fetch(`${API_BASE}/records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => handleResponse<RecordItem>(res));
}

export function deleteRecord(id: number, account: string): Promise<void> {
  return fetch(`${API_BASE}/records/${id}?account=${encodeURIComponent(account)}`, {
    method: "DELETE",
  }).then((res) => handleResponse<void>(res));
}

export function fetchStats(date: string, account: string): Promise<StatsResponse> {
  return fetch(`${API_BASE}/stats?date=${encodeURIComponent(date)}&account=${encodeURIComponent(account)}`).then(
    (res) => handleResponse<StatsResponse>(res)
  );
}

export function fetchMonthStats(month: string, account: string): Promise<MonthStatsResponse> {
  return fetch(
    `${API_BASE}/stats/month?month=${encodeURIComponent(month)}&account=${encodeURIComponent(account)}`
  ).then((res) => handleResponse<MonthStatsResponse>(res));
}

export function login(account: string, pin: string): Promise<Session> {
  return fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, pin }),
  }).then((res) => handleResponse<Session>(res));
}

export function verifyToken(token: string): Promise<Session> {
  return fetch(`${API_BASE}/auth/verify-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).then((res) => handleResponse<Session>(res));
}

export function changePin(account: string, currentPin: string, newPin: string): Promise<Session> {
  return fetch(`${API_BASE}/auth/change-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, currentPin, newPin }),
  }).then((res) => handleResponse<Session>(res));
}

export function adminListAccounts(token: string): Promise<AccountSummary[]> {
  return fetch(`${API_BASE}/auth/admin/accounts?token=${encodeURIComponent(token)}`).then((res) =>
    handleResponse<AccountSummary[]>(res)
  );
}

export function adminCreateAccount(
  token: string,
  account: string,
  babyName: string,
  pin: string
): Promise<AccountSummary> {
  return fetch(`${API_BASE}/auth/admin/create-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, account, babyName, pin }),
  }).then((res) => handleResponse<AccountSummary>(res));
}

export function adminResetPin(token: string, targetAccount: string, newPin: string): Promise<void> {
  return fetch(`${API_BASE}/auth/admin/reset-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, targetAccount, newPin }),
  }).then((res) => handleResponse<void>(res));
}

export function adminSetActive(token: string, targetAccount: string, active: boolean): Promise<void> {
  return fetch(`${API_BASE}/auth/admin/set-active`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, targetAccount, active }),
  }).then((res) => handleResponse<void>(res));
}
