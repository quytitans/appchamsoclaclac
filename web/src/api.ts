import type {
  AccountSummary,
  CreateRecordPayload,
  DosePayload,
  LatestGrowth,
  MonthStatsResponse,
  RecordItem,
  Session,
  StatsResponse,
  VaccineDetail,
  VaccineDose,
  VaccinePayload,
  VaccineSummary,
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

export function fetchLatestGrowth(account: string): Promise<LatestGrowth> {
  return fetch(`${API_BASE}/stats/latest-growth?account=${encodeURIComponent(account)}`).then((res) =>
    handleResponse<LatestGrowth>(res)
  );
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

export function adminDeleteAccount(token: string, targetAccount: string): Promise<void> {
  return fetch(`${API_BASE}/auth/admin/delete-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, targetAccount }),
  }).then((res) => handleResponse<void>(res));
}

export function fetchVaccines(account: string): Promise<VaccineSummary[]> {
  return fetch(`${API_BASE}/vaccines?account=${encodeURIComponent(account)}`).then((res) =>
    handleResponse<VaccineSummary[]>(res)
  );
}

export function fetchVaccineDetail(id: number, account: string): Promise<VaccineDetail> {
  return fetch(`${API_BASE}/vaccines/${id}?account=${encodeURIComponent(account)}`).then((res) =>
    handleResponse<VaccineDetail>(res)
  );
}

export function createVaccine(payload: VaccinePayload): Promise<VaccineSummary> {
  return fetch(`${API_BASE}/vaccines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => handleResponse<VaccineSummary>(res));
}

export function updateVaccine(id: number, payload: VaccinePayload): Promise<VaccineSummary> {
  return fetch(`${API_BASE}/vaccines/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => handleResponse<VaccineSummary>(res));
}

export function deleteVaccine(id: number, account: string): Promise<void> {
  return fetch(`${API_BASE}/vaccines/${id}?account=${encodeURIComponent(account)}`, {
    method: "DELETE",
  }).then((res) => handleResponse<void>(res));
}

export function reorderVaccine(id: number, account: string, direction: "up" | "down"): Promise<void> {
  return fetch(`${API_BASE}/vaccines/${id}/reorder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, direction }),
  }).then((res) => handleResponse<void>(res));
}

export function confirmVaccineDose(id: number, account: string, date: string): Promise<VaccineSummary> {
  return fetch(`${API_BASE}/vaccines/${id}/confirm-dose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ account, date }),
  }).then((res) => handleResponse<VaccineSummary>(res));
}

export function addVaccineDose(vaccineId: number, payload: DosePayload): Promise<VaccineDose> {
  return fetch(`${API_BASE}/vaccines/${vaccineId}/doses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => handleResponse<VaccineDose>(res));
}

export function updateVaccineDose(
  vaccineId: number,
  doseId: number,
  payload: DosePayload
): Promise<VaccineDose> {
  return fetch(`${API_BASE}/vaccines/${vaccineId}/doses/${doseId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => handleResponse<VaccineDose>(res));
}

export function deleteVaccineDose(vaccineId: number, doseId: number, account: string): Promise<void> {
  return fetch(
    `${API_BASE}/vaccines/${vaccineId}/doses/${doseId}?account=${encodeURIComponent(account)}`,
    { method: "DELETE" }
  ).then((res) => handleResponse<void>(res));
}
