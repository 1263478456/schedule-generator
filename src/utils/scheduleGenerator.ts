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

function isNoRestDay(config: ScheduleConfig, year: number, month: number, day: number, dayOfWeek: number): boolean {
  if (config.noRestDaysOfWeek.includes(dayOfWeek)) {
    return true;
  }
  const dateStr = formatDate(year, month, day);
  return config.noRestDates.includes(dateStr);
}

function getEmployeeRestConfig(employee: { restConfig?: EmployeeRestConfig }): EmployeeRestConfig {
  return employee.restConfig || { minRestDays: 0, maxRestDays: 10 };
}

function getEmployeeRestPreference(employee: { restPreference?: RestPreference }): RestPreference {
  return employee.restPreference || 'scattered';
}

// 随机数生成器（带种子，确保可重现）
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
 * 生成连休日（连续的休息日）
 */
function generateConsecutiveRestDays(
  availableDays: number[],
  count: number,
  random: () => number
): number[] {
  if (count <= 0 || availableDays.length === 0) return [];
  
  // 按日期排序
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
  
  // 按长度排序，优先选择较长的连续段
  segments.sort((a, b) => b.length - a.length);
  
  const result: number[] = [];
  let remaining = count;
  
  // 从最长的连续段开始分配
  for (const segment of segments) {
    if (remaining <= 0) break;
    
    // 计算可以从这个段中取多少天
    const take = Math.min(remaining, segment.length);
    
    // 从段的开头或结尾随机选择
    if (random() > 0.5) {
      // 从开头取
      result.push(...segment.slice(0, take));
    } else {
      // 从结尾取
      result.push(...segment.slice(-take));
    }
    
    remaining -= take;
  }
  
  return result;
}

/**
 * 生成分散休息日（尽量分散）
 */
function generateScatteredRestDays(
  availableDays: number[],
  count: number,
  totalDays: number,
  random: () => number
): number[] {
  if (count <= 0 || availableDays.length === 0) return [];
  
  // 计算理想的间隔
  const interval = Math.floor(totalDays / count);
  
  // 随机选择起始点
  const startOffset = Math.floor(random() * interval);
  
  const result: number[] = [];
  const sortedDays = [...availableDays].sort((a, b) => a - b);
  
  for (let i = 0; i < count; i++) {
    // 计算目标位置
    const targetDay = startOffset + i * interval + 1;
    
    // 找到最接近的可用日期
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
function generateRandomRestDays(
  availableDays: number[],
  count: number,
  random: () => number
): number[] {
  if (count <= 0 || availableDays.length === 0) return [];
  
  const shuffled = shuffle(availableDays, random);
  return shuffled.slice(0, count);
}

/**
 * 智能排班算法
 */
export function generateSmartSchedule(config: ScheduleConfig): {
  results: ScheduleResult[];
  stats: ScheduleStats;
  conflicts: ScheduleConflict[];
} {
  const { year, month, employees, weeklyRestDays, scheduleStrategy, noRestDayType, randomness } = config;
  
  if (employees.length === 0) {
    return {
      results: [],
      stats: {
        totalDays: 0,
        workDaysPerEmployee: 0,
        restDaysPerEmployee: 0,
        noRestDaysCount: 0,
        avgConcurrentRest: 0,
        maxConcurrentRest: 0,
        totalWorkDays: 0,
      },
      conflicts: [],
    };
  }
  
  const totalDays = getDaysInMonth(year, month);
  const conflicts: ScheduleConflict[] = [];
  
  // 初始化随机数生成器
  const seed = year * 10000 + month * 100 + (randomness?.intensity || 30);
  const random = randomness?.enabled !== false ? seededRandom(seed) : () => 0.5;
  
  // 1. 找出不排休日和可排休日
  const noRestDays: number[] = [];
  const assignableDays: number[] = [];
  
  for (let day = 1; day <= totalDays; day++) {
    const dayOfWeek = getDayOfWeek(year, month, day);
    if (isNoRestDay(config, year, month, day, dayOfWeek)) {
      noRestDays.push(day);
    } else {
      assignableDays.push(day);
    }
  }
  
  // 2. 为每个员工计算休息配置
  const employeeConfigs = employees.map((emp) => {
    const restConfig = getEmployeeRestConfig(emp);
    const preference = getEmployeeRestPreference(emp);
    const minRest = Math.min(restConfig.minRestDays, assignableDays.length);
    const maxRest = Math.min(restConfig.maxRestDays, assignableDays.length);
    const targetRest = Math.max(minRest, Math.min(weeklyRestDays, maxRest));
    
    return {
      employee: emp,
      minRest,
      maxRest,
      targetRest,
      preference,
    };
  });
  
  // 3. 按最少休息天数降序排列
  employeeConfigs.sort((a, b) => b.minRest - a.minRest);
  
  // 4. 初始化排班数据结构
  const schedule: Map<string, Set<number>> = new Map();
  const dayAssignments: Map<number, string[]> = new Map();
  
  employees.forEach((emp) => {
    schedule.set(emp.id, new Set());
  });
  assignableDays.forEach((day) => {
    dayAssignments.set(day, []);
  });
  
  // 5. 第一轮：为每个员工分配最少休息天数
  for (const { employee, minRest, preference } of employeeConfigs) {
    if (minRest <= 0) continue;
    
    let restDays: number[] = [];
    
    switch (preference) {
      case 'consecutive':
        restDays = generateConsecutiveRestDays(assignableDays, minRest, random);
        break;
      case 'scattered':
        restDays = generateScatteredRestDays(assignableDays, minRest, totalDays, random);
        break;
      case 'random':
      default:
        restDays = generateRandomRestDays(assignableDays, minRest, random);
        break;
    }
    
    // 应用排班
    for (const day of restDays) {
      schedule.get(employee.id)?.add(day);
      const dayEmps = dayAssignments.get(day) || [];
      dayAssignments.set(day, [...dayEmps, employee.id]);
    }
  }
  
  // 6. 第二轮：分配目标休息天数
  for (const { employee, targetRest, preference } of employeeConfigs) {
    const currentRest = schedule.get(employee.id)?.size || 0;
    const remaining = targetRest - currentRest;
    
    if (remaining <= 0) continue;
    
    // 获取未分配的可用日期
    const availableDays = assignableDays.filter((day) => !schedule.get(employee.id)?.has(day));
    
    let additionalDays: number[] = [];
    
    switch (preference) {
      case 'consecutive':
        additionalDays = generateConsecutiveRestDays(availableDays, remaining, random);
        break;
      case 'scattered':
        additionalDays = generateScatteredRestDays(availableDays, remaining, totalDays, random);
        break;
      case 'random':
      default:
        additionalDays = generateRandomRestDays(availableDays, remaining, random);
        break;
    }
    
    // 应用排班（考虑并发限制）
    for (const day of additionalDays) {
      if (scheduleStrategy?.avoidMultipleRest) {
        const dayEmps = dayAssignments.get(day) || [];
        if (dayEmps.length >= (scheduleStrategy?.maxConcurrentRest || 1)) {
          continue;
        }
      }
      
      schedule.get(employee.id)?.add(day);
      const dayEmps = dayAssignments.get(day) || [];
      dayAssignments.set(day, [...dayEmps, employee.id]);
    }
  }
  
  // 7. 第三轮：尝试满足最大休息天数
  for (const { employee, maxRest, preference } of employeeConfigs) {
    const currentRest = schedule.get(employee.id)?.size || 0;
    const remaining = maxRest - currentRest;
    
    if (remaining <= 0) continue;
    
    const availableDays = assignableDays.filter((day) => !schedule.get(employee.id)?.has(day));
    
    let additionalDays: number[] = [];
    
    switch (preference) {
      case 'consecutive':
        additionalDays = generateConsecutiveRestDays(availableDays, remaining, random);
        break;
      case 'scattered':
        additionalDays = generateScatteredRestDays(availableDays, remaining, totalDays, random);
        break;
      case 'random':
      default:
        additionalDays = generateRandomRestDays(availableDays, remaining, random);
        break;
    }
    
    // 应用排班
    for (const day of additionalDays) {
      if (scheduleStrategy?.avoidMultipleRest) {
        const dayEmps = dayAssignments.get(day) || [];
        if (dayEmps.length >= (scheduleStrategy?.maxConcurrentRest || 1)) {
          continue;
        }
      }
      
      schedule.get(employee.id)?.add(day);
      const dayEmps = dayAssignments.get(day) || [];
      dayAssignments.set(day, [...dayEmps, employee.id]);
    }
  }
  
  // 8. 生成结果和检查冲突
  const results: ScheduleResult[] = [];
  
  for (const emp of employees) {
    const restDays = schedule.get(emp.id) || new Set();
    const empRestConfig = getEmployeeRestConfig(emp);
    
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
      const isNoRest = noRestDays.includes(day);
      const isRest = restDays.has(day);
      const concurrentEmps = dayAssignments.get(day) || [];
      
      if (isRest && concurrentEmps.length > 1) {
        concurrentRestDays++;
      }
      
      let isWorkDay = true;
      if (isNoRest) {
        isWorkDay = noRestDayType === 'work';
      } else if (isRest) {
        isWorkDay = false;
      }
      
      days.push({
        date: formatDate(year, month, day),
        dayOfWeek,
        isRest,
        isNoAssign: isNoRest && noRestDayType === 'rest',
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
  
  // 9. 检查并发冲突
  if (scheduleStrategy?.avoidMultipleRest) {
    const maxAllowed = scheduleStrategy?.maxConcurrentRest || 1;
    
    for (const [day, empIds] of dayAssignments.entries()) {
      if (empIds.length > maxAllowed) {
        const empNames = empIds.map((id) => 
          employees.find((e) => e.id === id)?.name || id
        );
        conflicts.push({
          date: formatDate(year, month, day),
          employeeNames: empNames,
          type: 'concurrent_rest',
          message: `${day}日有 ${empNames.length} 人同时休息（允许最多 ${maxAllowed} 人）`,
        });
      }
    }
  }
  
  // 10. 计算统计
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
    noRestDaysCount: noRestDays.length,
    avgConcurrentRest: totalDays > 0 ? Math.round((totalConcurrentRest / totalDays) * 10) / 10 : 0,
    maxConcurrentRest: maxConcurrentInDay,
    totalWorkDays: totalDays - noRestDays.length,
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
