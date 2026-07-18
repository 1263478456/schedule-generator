// 员工信息
export interface Employee {
  id: string;
  name: string;
}

// 排班规则
export interface ScheduleConfig {
  // 排班月份
  year: number;
  month: number;
  // 每周休息天数
  weeklyRestDays: number;
  // 每月休息天数（可选，覆盖每周设置）
  monthlyRestDays?: number;
  // 不排休的星期几（0=周日, 1=周一, ..., 6=周六）
  noRestDaysOfWeek: number[];
  // 不排休的具体日期（格式: "YYYY-MM-DD"）
  noRestDates: string[];
  // 员工列表
  employees: Employee[];
}

// 排班结果
export interface ScheduleResult {
  employeeId: string;
  employeeName: string;
  days: ScheduleDay[];
  totalWorkDays: number;
  totalRestDays: number;
}

// 单日排班
export interface ScheduleDay {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6
  isRest: boolean;
  isNoAssign: boolean; // 未排班（如周末不排休时）
}

// 排班统计
export interface ScheduleStats {
  totalDays: number;
  workDaysPerEmployee: number;
  restDaysPerEmployee: number;
  noRestDaysCount: number;
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
