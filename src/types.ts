// 员工信息
export interface Employee {
  id: string;
  name: string;
  // 个人休息配置
  restConfig?: EmployeeRestConfig;
  // 休息偏好
  restPreference?: RestPreference;
}

// 员工个人休息配置
export interface EmployeeRestConfig {
  // 本月最少休息天数（0 = 不想休息）
  minRestDays: number;
  // 本月最多休息天数
  maxRestDays: number;
}

// 休息偏好
export type RestPreference = 'consecutive' | 'scattered' | 'random';

// 排班规则
export interface ScheduleConfig {
  // 排班月份
  year: number;
  month: number;
  // 全局每月休息天数（默认值）
  monthlyRestDays: number;
  // 不排休的星期几（0=周日, 1=周一, ..., 6=周六）- 强制工作日
  noRestDaysOfWeek: number[];
  // 不排休的具体日期（格式: "YYYY-MM-DD"）- 强制工作日
  noRestDates: string[];
  // 员工列表
  employees: Employee[];
  // 最大同时休息人数
  maxConcurrentRest: number;
  // 随机性配置
  randomness: RandomnessConfig;
}

// 随机性配置
export interface RandomnessConfig {
  // 是否启用随机性
  enabled: boolean;
  // 随机强度 (0-100)
  intensity: number;
}

// 排班结果
export interface ScheduleResult {
  employeeId: string;
  employeeName: string;
  days: ScheduleDay[];
  totalWorkDays: number;
  totalRestDays: number;
  concurrentRestDays: number;
}

// 单日排班
export interface ScheduleDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6
  isRest: boolean;
  isForceWork: boolean; // 是否为强制工作日
  isWorkDay: boolean;
  concurrentEmployees?: string[];
}

// 排班冲突信息
export interface ScheduleConflict {
  date: string;
  employeeNames: string[];
  type: 'concurrent_rest' | 'insufficient_rest';
  message: string;
}

// 排班统计
export interface ScheduleStats {
  totalDays: number;
  workDaysPerEmployee: number;
  restDaysPerEmployee: number;
  forceWorkDaysCount: number; // 强制工作日天数
  avgConcurrentRest: number;
  maxConcurrentRest: number;
  availableRestDays: number; // 可排休的天数
}

// 星期名称
export const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 星期全称
export const DAY_NAMES_FULL = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 月份名称
export const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

// 休息偏好选项
export const REST_PREFERENCE_OPTIONS: { value: RestPreference; label: string; description: string }[] = [
  { value: 'consecutive', label: '连休', description: '尽量安排连续的休息日' },
  { value: 'scattered', label: '分散', description: '休息日尽量均匀分布' },
  { value: 'random', label: '随机', description: '随机安排休息日' },
];

// 默认随机性配置
export const DEFAULT_RANDOMNESS_CONFIG: RandomnessConfig = {
  enabled: true,
  intensity: 30,
};
