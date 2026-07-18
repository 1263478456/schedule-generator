import type {
  ScheduleConfig,
  ScheduleResult,
  ScheduleDay,
  ScheduleStats,
  ScheduleConflict,
  EmployeeRestConfig,
  RestPreference,
} from '../types';

// 工具函数
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isForceWorkDay(config: ScheduleConfig, year: number, month: number, day: number, dayOfWeek: number): boolean {
  // 检查是否在强制工作日星期列表中
  if (config.noRestDaysOfWeek.includes(dayOfWeek)) {
    return true;
  }
  // 检查是否在强制工作日日期列表中
  const dateStr = formatDate(year, month, day);
  return config.noRestDates.includes(dateStr);
}

function getEmployeeRestConfig(
  employee: { restConfig?: EmployeeRestConfig },
  defaultMonthlyRestDays: number
): EmployeeRestConfig {
  // 如果员工有个人配置，使用个人配置；否则使用全局默认值
  if (employee.restConfig) {
    return employee.restConfig;
  }
  return { minRestDays: defaultMonthlyRestDays, maxRestDays: defaultMonthlyRestDays };
}

function getEmployeeRestPreference(employee: { restPreference?: RestPreference }): RestPreference {
  return employee.restPreference || 'scattered';
}

// 随机数生成器
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Fisher-Yates 洗牌算法
function shuffle<T>(array: T[], random: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 生成连休日
 */
function generateConsecutiveRestDays(availableDays: number[], count: number, random: () => number): number[] {
  if (count <= 0 || availableDays.length === 0) return [];
  
  const sortedDays = [...availableDays].sort((a, b) => a - b);
  
  // 找出所有可能的连续段
  const segments: number[][] = [];
  let currentSegment: number[] = [sortedDays[0]];
  
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] === sortedDays[i - 1] + 1) {
      currentSegment.push(sortedDays[i]);
    } else {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      currentSegment = [sortedDays[i]];
    }
  }
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }
  
  // 按长度排序
  segments.sort((a, b) => b.length - a.length);
  
  const result: number[] = [];
  let remaining = count;
  
  for (const segment of segments) {
    if (remaining <= 0) break;
    
    const take = Math.min(remaining, segment.length);
    
    if (random() > 0.5) {
      result.push(...segment.slice(0, take));
    } else {
      result.push(...segment.slice(-take));
    }
    
    remaining -= take;
  }
  
  return result;
}

/**
 * 生成分散休息日
 */
function generateScatteredRestDays(availableDays: number[], count: number, totalDays: number, random: () => number): number[] {
  if (count <= 0 || availableDays.length === 0) return [];
  
  const interval = Math.floor(totalDays / count);
  const startOffset = Math.floor(random() * interval);
  
  const result: number[] = [];
  const sortedDays = [...availableDays].sort((a, b) => a - b);
  
  for (let i = 0; i < count; i++) {
    const targetDay = startOffset + i * interval + 1;
    
    let bestDay = sortedDays[0];
    let bestDiff = Math.abs(bestDay - targetDay);
    
    for (const day of sortedDays) {
      const diff = Math.abs(day - targetDay);
      if (diff < bestDiff && !result.includes(day)) {
        bestDay = day;
        bestDiff = diff;
      }
    }
    
    if (!result.includes(bestDay)) {
      result.push(bestDay);
    }
  }
  
  return result;
}

/**
 * 生成随机休息日
 */
function generateRandomRestDays(availableDays: number[], count: number, random: () => number): number[] {
  if (count <= 0 || availableDays.length === 0) return [];
  
  const shuffled = shuffle(availableDays, random);
  return shuffled.slice(0, count);
}

/**
 * 根据偏好生成休息日
 */
function generateRestDaysByPreference(
  availableDays: number[],
  count: number,
  totalDays: number,
  preference: RestPreference,
  random: () => number
): number[] {
  switch (preference) {
    case 'consecutive':
      return generateConsecutiveRestDays(availableDays, count, random);
    case 'scattered':
      return generateScatteredRestDays(availableDays, count, totalDays, random);
    case 'random':
    default:
      return generateRandomRestDays(availableDays, count, random);
  }
}

/**
 * 智能排班算法
 */
export function generateSmartSchedule(config: ScheduleConfig): {
  results: ScheduleResult[];
  stats: ScheduleStats;
  conflicts: ScheduleConflict[];
} {
  const { year, month, employees, monthlyRestDays, maxConcurrentRest, randomness } = config;
  
  if (employees.length === 0) {
    return {
      results: [],
      stats: {
        totalDays: 0,
        workDaysPerEmployee: 0,
        restDaysPerEmployee: 0,
        forceWorkDaysCount: 0,
        avgConcurrentRest: 0,
        maxConcurrentRest: 0,
      },
      conflicts: [],
    };
  }
  
  const totalDays = getDaysInMonth(year, month);
  const conflicts: ScheduleConflict[] = [];
  
  // 初始化随机数生成器
  const seed = year * 10000 + month * 100 + (randomness?.intensity || 30);
  const random = randomness?.enabled !== false ? seededRandom(seed) : () => 0.5;
  
  // 1. 找出强制工作日和可排休日
  const forceWorkDays: number[] = [];
  const assignableDays: number[] = [];
  
  for (let day = 1; day <= totalDays; day++) {
    const dayOfWeek = getDayOfWeek(year, month, day);
    if (isForceWorkDay(config, year, month, day, dayOfWeek)) {
      forceWorkDays.push(day);
    } else {
      assignableDays.push(day);
    }
  }
  
  // 2. 为每个员工计算休息配置
  const employeeConfigs = employees.map((emp) => {
    const restConfig = getEmployeeRestConfig(emp, monthlyRestDays);
    const preference = getEmployeeRestPreference(emp);
    
    // 确保最少休息天数不超过可排休天数
    const minRest = Math.min(restConfig.minRestDays, assignableDays.length);
    // 确保最多休息天数不超过可排休天数
    const maxRest = Math.min(restConfig.maxRestDays, assignableDays.length);
    
    return {
      employee: emp,
      minRest,
      maxRest,
      preference,
    };
  });
  
  // 3. 初始化排班数据结构
  const schedule: Map<string, Set<number>> = new Map();
  const dayAssignments: Map<number, string[]> = new Map();
  
  employees.forEach((emp) => {
    schedule.set(emp.id, new Set());
  });
  assignableDays.forEach((day) => {
    dayAssignments.set(day, []);
  });
  
  // 4. 第一轮：为每个员工分配最少休息天数
  for (const { employee, minRest, preference } of employeeConfigs) {
    if (minRest <= 0) continue;
    
    // 获取该员工可分配的日期（排除已经分配给自己的和超出并发限制的）
    const availableForEmployee = assignableDays.filter((day) => {
      if (schedule.get(employee.id)?.has(day)) return false;
      const dayEmps = dayAssignments.get(day) || [];
      return dayEmps.length < maxConcurrentRest;
    });
    
    const restDays = generateRestDaysByPreference(availableForEmployee, minRest, totalDays, preference, random);
    
    for (const day of restDays) {
      schedule.get(employee.id)?.add(day);
      const dayEmps = dayAssignments.get(day) || [];
      dayAssignments.set(day, [...dayEmps, employee.id]);
    }
  }
  
  // 5. 第二轮：尝试满足最多休息天数
  for (const { employee, maxRest, preference } of employeeConfigs) {
    const currentRest = schedule.get(employee.id)?.size || 0;
    const remaining = maxRest - currentRest;
    
    if (remaining <= 0) continue;
    
    const availableForEmployee = assignableDays.filter((day) => {
      if (schedule.get(employee.id)?.has(day)) return false;
      const dayEmps = dayAssignments.get(day) || [];
      return dayEmps.length < maxConcurrentRest;
    });
    
    const additionalDays = generateRestDaysByPreference(availableForEmployee, remaining, totalDays, preference, random);
    
    for (const day of additionalDays) {
      schedule.get(employee.id)?.add(day);
      const dayEmps = dayAssignments.get(day) || [];
      dayAssignments.set(day, [...dayEmps, employee.id]);
    }
  }
  
  // 6. 生成结果和检查冲突
  const results: ScheduleResult[] = [];
  
  for (const emp of employees) {
    const restDays = schedule.get(emp.id) || new Set();
    const empRestConfig = getEmployeeRestConfig(emp, monthlyRestDays);
    
    // 检查是否满足最少休息天数
    if (restDays.size < empRestConfig.minRestDays) {
      conflicts.push({
        date: `${year}-${month}`,
        employeeNames: [emp.name],
        type: 'insufficient_rest',
        message: `${emp.name} 需要至少休息 ${empRestConfig.minRestDays} 天，但只能安排 ${restDays.size} 天`,
      });
    }
    
    const days: ScheduleDay[] = [];
    let concurrentRestDays = 0;
    
    for (let day = 1; day <= totalDays; day++) {
      const dayOfWeek = getDayOfWeek(year, month, day);
      const isForceWork = forceWorkDays.includes(day);
      const isRest = restDays.has(day);
      const concurrentEmps = dayAssignments.get(day) || [];
      
      if (isRest && concurrentEmps.length > 1) {
        concurrentRestDays++;
      }
      
      // 计算是否为工作日
      // 强制工作日 = 必须上班
      // 休息日 = 不上班
      // 其他 = 上班
      const isWorkDay = isForceWork || !isRest;
      
      days.push({
        date: formatDate(year, month, day),
        dayOfWeek,
        isRest,
        isForceWork,
        isWorkDay,
        concurrentEmployees: concurrentEmps.map((id) => 
          employees.find((e) => e.id === id)?.name || id
        ),
      });
    }
    
    results.push({
      employeeId: emp.id,
      employeeName: emp.name,
      days,
      totalWorkDays: days.filter(d => d.isWorkDay).length,
      totalRestDays: days.filter(d => !d.isWorkDay).length,
      concurrentRestDays,
    });
  }
  
  // 7. 检查并发冲突
  for (const [day, empIds] of dayAssignments.entries()) {
    if (empIds.length > maxConcurrentRest) {
      const empNames = empIds.map((id) => 
        employees.find((e) => e.id === id)?.name || id
      );
      conflicts.push({
        date: formatDate(year, month, day),
        employeeNames: empNames,
        type: 'concurrent_rest',
        message: `${day}日有 ${empNames.length} 人同时休息（允许最多 ${maxConcurrentRest} 人）`,
      });
    }
  }
  
  // 8. 计算统计
  let totalConcurrentRest = 0;
  let maxConcurrentInDay = 0;
  
  for (const empIds of dayAssignments.values()) {
    if (empIds.length > 1) {
      totalConcurrentRest += empIds.length;
    }
    maxConcurrentInDay = Math.max(maxConcurrentInDay, empIds.length);
  }
  
  const stats: ScheduleStats = {
    totalDays,
    workDaysPerEmployee: results.length > 0 
      ? Math.round(results.reduce((sum, r) => sum + r.totalWorkDays, 0) / results.length)
      : 0,
    restDaysPerEmployee: results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.totalRestDays, 0) / results.length)
      : 0,
    forceWorkDaysCount: forceWorkDays.length,
    avgConcurrentRest: totalDays > 0 ? Math.round((totalConcurrentRest / totalDays) * 10) / 10 : 0,
    maxConcurrentRest: maxConcurrentInDay,
  };
  
  return { results, stats, conflicts };
}

// 兼容旧接口
export function generateSchedule(config: ScheduleConfig) {
  const { results, stats } = generateSmartSchedule(config);
  return { results, stats };
}

export function generateOptimizedSchedule(config: ScheduleConfig) {
  return generateSmartSchedule(config);
}
