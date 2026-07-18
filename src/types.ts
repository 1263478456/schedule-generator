// 员工信息
export interface Employee {
  id: string;
  name: string;
  // 个人休息天数配置
  restConfig?: EmployeeRestConfig;
}

// 员工个人休息配置
export interface EmployeeRestConfig {
  // 本月最少休息天数（必须满足）
  minRestDays: number;
  // 本月最多休息天数
  maxRestDays: number;
}

// 不排休日的类型
export type NoRestDayType = 'work' | 'rest';

// 排班规则
export interface ScheduleConfig {
  // 排班月份
  year: number;
  month: number;
  // 每周休息天数
  weeklyRestDays: number;
  // 不排休的星期几（0=周日, 1=周一, ..., 6=周六）
  noRestDaysOfWeek: number[];
  // 不排休的具体日期（格式: "YYYY-MM-DD"）
  noRestDates: string[];
  // 员工列表
  employees: Employee[];
  // 全局排班策略
  scheduleStrategy: ScheduleStrategy;
  // 不排休日的类型：'work' 表示工作日，'rest' 表示休息日
  noRestDayType: NoRestDayType;
}

// 排班策略
export interface ScheduleStrategy {
  // 避免多人同时休息
  avoidMultipleRest: boolean;
  // 允许同时休息的最大人数
  maxConcurrentRest: number;
  // 无法避免时的处理方式
  conflictResolution: ConflictResolution;
}

// 冲突解决方式
export type ConflictResolution = 
  | 'allow'           // 允许（不做处理）
  | 'notify'          // 提示但继续
  | 'redistribute'    // 尝试重新分配
  | 'block';          // 阻止并要求修改

// 排班结果
export interface ScheduleResult {
  employeeId: string;
  employeeName: string;
  days: ScheduleDay[];
  totalWorkDays: number;
  totalRestDays: number;
  // 与其他员工同休的天数
  concurrentRestDays: number;
}

// 单日排班
export interface ScheduleDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6
  isRest: boolean;
  isNoAssign: boolean; // 未排休（不排休且类型为'rest'时）
  isWorkDay: boolean; // 是否为工作日
  // 当天同时休息的员工
  concurrentEmployees?: string[];
}

// 排班冲突信息
export interface ScheduleConflict {
  date: string;
  employeeNames: string[];
  type: 'exceed_limit' | 'concurrent_rest' | 'insufficient_rest';
  message: string;
}

// 排班统计
export interface ScheduleStats {
  totalDays: number;
  workDaysPerEmployee: number;
  restDaysPerEmployee: number;
  noRestDaysCount: number;
  // 平均每天同时休息人数
  avgConcurrentRest: number;
  // 最大同时休息人数
  maxConcurrentRest: number;
  // 工作日天数（排除不排休日）
  totalWorkDays: number;
}

// 星期名称
export const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 星期全称（用于显示）
export const DAY_NAMES_FULL = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

// 月份名称
export const MONTH_NAMES = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

// 默认排班策略
export const DEFAULT_SCHEDULE_STRATEGY: ScheduleStrategy = {
  avoidMultipleRest: true,
  maxConcurrentRest: 1,
  conflictResolution: 'notify',
};
