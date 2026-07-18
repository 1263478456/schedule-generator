import type { ScheduleConfig, ScheduleResult } from '../types';

// API 基础地址
const API_BASE = '/api';

// 通用请求函数
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== 配置 API ====================

export interface ConfigData {
  year: number;
  month: number;
  weeklyRestDays: number;
  noRestDaysOfWeek: number[];
  noRestDates: string[];
  employees: ScheduleConfig['employees'];
  scheduleStrategy?: any;
  noRestDayType?: string;
  randomness?: { enabled: boolean; intensity: number };
}

// 获取配置
export async function getConfig(): Promise<ConfigData> {
  return request<ConfigData>('/config');
}

// 保存配置
export async function saveConfig(config: ConfigData): Promise<void> {
  await request('/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

// ==================== 历史记录 API ====================

export interface HistoryRecord {
  id: string;
  name: string;
  config: ScheduleConfig;
  results: ScheduleResult[];
  stats: {
    totalDays: number;
    workDaysPerEmployee: number;
    restDaysPerEmployee: number;
    employeesCount: number;
  };
  createdAt: string;
}

export interface HistoryResponse {
  records: HistoryRecord[];
  total: number;
  limit: number;
  offset: number;
}

// 获取历史记录列表
export async function getHistory(limit = 50, offset = 0): Promise<HistoryResponse> {
  return request<HistoryResponse>(`/history?limit=${limit}&offset=${offset}`);
}

// 获取单条历史记录
export async function getHistoryById(id: string): Promise<HistoryRecord> {
  return request<HistoryRecord>(`/history/${id}`);
}

// 保存历史记录
export async function saveHistory(record: Omit<HistoryRecord, 'id' | 'createdAt'>): Promise<string> {
  const response = await request<{ id: string }>('/history', {
    method: 'POST',
    body: JSON.stringify(record),
  });
  return response.id;
}

// 删除历史记录
export async function deleteHistory(id: string): Promise<void> {
  await request(`/history/${id}`, {
    method: 'DELETE',
  });
}

// 清空所有历史记录
export async function clearHistory(): Promise<void> {
  await request('/history', {
    method: 'DELETE',
  });
}
