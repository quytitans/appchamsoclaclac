import type { CreateRecordPayload, MonthStatsResponse, RecordItem, StatsResponse } from "./types";

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

export function fetchRecords(date: string): Promise<RecordItem[]> {
  return fetch(`${API_BASE}/records?date=${encodeURIComponent(date)}`).then((res) =>
    handleResponse<RecordItem[]>(res)
  );
}

export function updateRecord(id: number, payload: CreateRecordPayload): Promise<RecordItem> {
  return fetch(`${API_BASE}/records/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((res) => handleResponse<RecordItem>(res));
}

export function deleteRecord(id: number): Promise<void> {
  return fetch(`${API_BASE}/records/${id}`, { method: "DELETE" }).then((res) =>
    handleResponse<void>(res)
  );
}

export function fetchStats(date: string): Promise<StatsResponse> {
  return fetch(`${API_BASE}/stats?date=${encodeURIComponent(date)}`).then((res) =>
    handleResponse<StatsResponse>(res)
  );
}

export function verifyPin(pin: string): Promise<{ valid: boolean }> {
  return fetch(`${API_BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  }).then((res) => handleResponse<{ valid: boolean }>(res));
}

export function changePin(currentPin: string, newPin: string): Promise<void> {
  return fetch(`${API_BASE}/auth/change-pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPin, newPin }),
  }).then((res) => handleResponse<void>(res));
}

export function fetchMonthStats(month: string): Promise<MonthStatsResponse> {
  return fetch(`${API_BASE}/stats/month?month=${encodeURIComponent(month)}`).then((res) =>
    handleResponse<MonthStatsResponse>(res)
  );
}
