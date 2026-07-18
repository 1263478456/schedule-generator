import type { ScheduleConfig, Employee } from '../types';

// 验证结果接口
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

/**
 * XSS 防护：转义 HTML 特殊字符
 */
export function escapeHtml(str: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
  };
  
  return str.replace(/[&<>"'\/`]/g, char => htmlEscapeMap[char]);
}

/**
 * 验证员工信息
 */
export function validateEmployee(name: string, existingEmployees: Employee[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const trimmedName = name.trim();
  
  // 空名称
  if (!trimmedName) {
    errors.push({
      field: 'name',
      message: '员工姓名不能为空',
      code: 'EMPTY_NAME',
    });
    return errors;
  }
  
  // 名称长度
  if (trimmedName.length > 20) {
    errors.push({
      field: 'name',
      message: '员工姓名不能超过20个字符',
      code: 'NAME_TOO_LONG',
    });
  }
  
  // 特殊字符
  if (/[<>&"'"`\/\\]/.test(trimmedName)) {
    errors.push({
      field: 'name',
      message: '员工姓名不能包含特殊字符',
      code: 'INVALID_CHARS',
    });
  }
  
  // 重复名称
  if (existingEmployees.some(e => e.name === trimmedName)) {
    errors.push({
      field: 'name',
      message: '已存在同名员工',
      code: 'DUPLICATE_NAME',
    });
  }
  
  return errors;
}

/**
 * 验证排班配置
 */
export function validateScheduleConfig(config: ScheduleConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // 验证年份
  const currentYear = new Date().getFullYear();
  if (config.year < 2020 || config.year > currentYear + 5) {
    errors.push({
      field: 'year',
      message: `年份应在 2020-${currentYear + 5} 之间`,
      code: 'INVALID_YEAR',
    });
  }
  
  // 验证月份
  if (config.month < 1 || config.month > 12) {
    errors.push({
      field: 'month',
      message: '月份应在 1-12 之间',
      code: 'INVALID_MONTH',
    });
  }
  
  // 验证每月休息天数
  if ((config as any).monthlyRestDays < 0 || (config as any).monthlyRestDays > 15) {
    errors.push({
      field: 'monthlyRestDays',
      message: '每月休息天数应在 0-15 之间',
      code: 'INVALID_REST_DAYS',
    });
  }
  
  // 验证员工列表
  if (config.employees.length === 0) {
    errors.push({
      field: 'employees',
      message: '请至少添加一名员工',
      code: 'NO_EMPLOYEES',
    });
  }
  
  if (config.employees.length > 30) {
    warnings.push({
      field: 'employees',
      message: '员工数量较多，可能影响排班效果',
      code: 'MANY_EMPLOYEES',
    });
  }
  
  // 验证不排休日
  const invalidDays = config.noRestDaysOfWeek.filter(d => d < 0 || d > 6);
  if (invalidDays.length > 0) {
    errors.push({
      field: 'noRestDaysOfWeek',
      message: '不排休日设置无效',
      code: 'INVALID_NO_REST_DAYS',
    });
  }
  
  // 验证日期格式
  const invalidDates = config.noRestDates.filter(d => !/^\d{4}-\d{2}-\d{2}$/.test(d));
  if (invalidDates.length > 0) {
    errors.push({
      field: 'noRestDates',
      message: '日期格式无效',
      code: 'INVALID_DATE_FORMAT',
    });
  }
  
  // 检查是否所有日期都是不排休日
  if (config.noRestDaysOfWeek.length === 7) {
    warnings.push({
      field: 'noRestDaysOfWeek',
      message: '所有星期都是不排休日，将无法安排休息',
      code: 'ALL_DAYS_NO_REST',
    });
  }
  
  // 检查休息天数是否合理
  const totalDays = new Date(config.year, config.month, 0).getDate();
  const forceWorkDays = config.noRestDaysOfWeek.length * Math.ceil(totalDays / 7);
  
  if (config.monthlyRestDays > 0 && forceWorkDays >= totalDays) {
    warnings.push({
      field: 'monthlyRestDays',
      message: '可排休天数不足，可能无法安排休息',
      code: 'INSUFFICIENT_WORK_DAYS',
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 生成安全的文件名
 */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 100);
}

/**
 * 验证导出配置
 */
export function validateExportConfig(config: ScheduleConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // 先验证基本配置
  const baseValidation = validateScheduleConfig(config);
  errors.push(...baseValidation.errors);
  warnings.push(...baseValidation.warnings);
  
  // 检查员工数量
  if (config.employees.length === 0) {
    errors.push({
      field: 'export',
      message: '没有员工数据，无法导出',
      code: 'NO_DATA_TO_EXPORT',
    });
  }
  
  // 检查月份天数
  const totalDays = new Date(config.year, config.month, 0).getDate();
  if (totalDays === 0) {
    errors.push({
      field: 'month',
      message: '所选月份无效',
      code: 'INVALID_MONTH_DAYS',
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
