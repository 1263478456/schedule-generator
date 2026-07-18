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

function isForceWorkDay(config: ScheduleConfig, year: number, month: number, day: number): boolean {
  const dayOfWeek = getDayOfWeek(year, month, day);
  if (config.noRestDaysOfWeek.includes(dayOfWeek)) {
    return true;
  }
  const dateStr = formatDate(year, month, day);
  return config.noRestDates.includes(dateStr);
}

function getEmployeeRestConfig(
  employee: { restConfig?: EmployeeRestConfig },
  defaultRestDays: number
): EmployeeRestConfig {
  return employee.restConfig || { minRestDays: 0, maxRestDays: defaultRestDays };
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
 * 智能排班算法（负载均衡版）
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
      stats: { totalDays: 0, workDaysPerEmployee: 0, restDaysPerEmployee: 0, forceWorkDaysCount: 0, avgConcurrentRest: 0, maxConcurrentRest: 0 },
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
  const availableDays: number[] = [];
  
  for (let day = 1; day <= totalDays; day++) {
    if (isForceWorkDay(config, year, month, day)) {
      forceWorkDays.push(day);
    } else {
      availableDays.push(day);
    }
  }
  
  // 2. 为每个员工计算休息配置
  const employeeConfigs = employees.map((emp) => {
    const restConfig = getEmployeeRestConfig(emp, monthlyRestDays);
    const preference = getEmployeeRestPreference(emp);
    const minRest = Math.min(restConfig.minRestDays, availableDays.length);
    const maxRest = Math.min(restConfig.maxRestDays, availableDays.length);
    
    return { employee: emp, minRest, maxRest, preference };
  });
  
  // 3. 初始化排班数据结构
  const schedule: Map<string, Set<number>> = new Map();
  const dayAssignments: Map<number, string[]> = new Map();
  
  employees.forEach((emp) => schedule.set(emp.id, new Set()));
  availableDays.forEach((day) => dayAssignments.set(day, []));
  
  // 辅助函数：获取某天当前休息人数
  const getRestCount = (day: number) => dayAssignments.get(day)?.length || 0;
  
  // 辅助函数：获取负载最小的可用日期列表
  const getLeastLoadedDays = (days: number[]): number[] => {
    if (days.length === 0) return [];
    
    // 按当前休息人数分组
    const grouped = new Map<number, number[]>();
    for (const day of days) {
      const count = getRestCount(day);
      if (!grouped.has(count)) grouped.set(count, []);
      grouped.get(count)!.push(day);
    }
    
    // 找到最小负载
    const minLoad = Math.min(...grouped.keys());
    return grouped.get(minLoad) || [];
  };
  
  // 辅助函数：选择最佳休息日（负载均衡）
  const selectBestRestDays = (
    candidateDays: number[],
    count: number,
    preference: RestPreference
  ): number[] => {
    if (count <= 0 || candidateDays.length === 0) return [];
    
    const result: number[] = [];
    const remaining = [...candidateDays];
    
    for (let i = 0; i < count && remaining.length > 0; i++) {
      // 获取负载最小的日期
      const leastLoaded = getLeastLoadedDays(remaining);
      
      let selected: number;
      
      if (preference === 'consecutive' && result.length > 0) {
        // 连休模式：优先选择与已选日期相邻的
        const lastDay = result[result.length - 1];
        const adjacent = leastLoaded.filter(d => Math.abs(d - lastDay) === 1);
        if (adjacent.length > 0) {
          selected = adjacent[Math.floor(random() * adjacent.length)];
        } else {
          selected = leastLoaded[Math.floor(random() * leastLoaded.length)];
        }
      } else if (preference === 'scattered') {
        // 分散模式：选择距离已选日期最远的
        if (result.length === 0) {
          selected = leastLoaded[Math.floor(random() * leastLoaded.length)];
        } else {
          let bestDay = leastLoaded[0];
          let bestMinDist = 0;
          
          for (const day of leastLoaded) {
            const minDist = Math.min(...result.map(d => Math.abs(d - day)));
            if (minDist > bestMinDist) {
              bestMinDist = minDist;
              bestDay = day;
            }
          }
          selected = bestDay;
        }
      } else {
        // 随机模式或默认：从负载最小的日期中随机选择
        selected = leastLoaded[Math.floor(random() * leastLoaded.length)];
      }
      
      result.push(selected);
      remaining.splice(remaining.indexOf(selected), 1);
    }
    
    return result;
  };
  
  // 4. 第一轮：为每个员工分配最少休息天数（带负载均衡）
  // 打乱员工顺序，避免固定模式
  const shuffledConfigs = shuffle([...employeeConfigs], random);
  
  for (const { employee, minRest, preference } of shuffledConfigs) {
    if (minRest <= 0) continue;
    
    // 获取该员工可用的日期（排除已排休的日期）
    const available = availableDays.filter((day) => !schedule.get(employee.id)?.has(day));
    
    // 使用负载均衡策略选择休息日
    const restDays = selectBestRestDays(available, minRest, preference);
    
    for (const day of restDays) {
      schedule.get(employee.id)?.add(day);
      const dayEmps = dayAssignments.get(day) || [];
      dayAssignments.set(day, [...dayEmps, employee.id]);
    }
  }
  
  // 5. 第二轮：分配最大休息天数（带负载均衡和并发限制）
  for (const { employee, maxRest, preference } of shuffledConfigs) {
    const currentRest = schedule.get(employee.id)?.size || 0;
    const remaining = maxRest - currentRest;
    
    if (remaining <= 0) continue;
    
    // 获取可用日期（排除已排休和已达并发上限的日期）
    const available = availableDays.filter((day) => {
      if (schedule.get(employee.id)?.has(day)) return false;
      if (getRestCount(day) >= maxConcurrentRest) return false;
      return true;
    });
    
    // 使用负载均衡策略选择休息日
    const additionalDays = selectBestRestDays(available, remaining, preference);
    
    for (const day of additionalDays) {
      schedule.get(employee.id)?.add(day);
      const dayEmps = dayAssignments.get(day) || [];
      dayAssignments.set(day, [...dayEmps, employee.id]);
    }
  }
  
  // 6. 生成结果
  const results: ScheduleResult[] = [];
  
  for (const emp of employees) {
    const restDays = schedule.get(emp.id) || new Set();
    const restConfig = getEmployeeRestConfig(emp, monthlyRestDays);
    
    if (restDays.size < restConfig.minRestDays) {
      conflicts.push({
        date: `${year}-${month}`,
        employeeNames: [emp.name],
        type: 'insufficient_rest',
        message: `${emp.name} 需要至少休息 ${restConfig.minRestDays} 天，但只能安排 ${restDays.size} 天`,
      });
    }
    
    const days: ScheduleDay[] = [];
    let concurrentRestDays = 0;
    
    for (let day = 1; day <= totalDays; day++) {
      const isForce = forceWorkDays.includes(day);
      const isRest = restDays.has(day);
      const concurrentEmps = dayAssignments.get(day) || [];
      
      if (isRest && concurrentEmps.length > 1) {
        concurrentRestDays++;
      }
      
      days.push({
        date: formatDate(year, month, day),
        dayOfWeek: getDayOfWeek(year, month, day),
        isRest: !isForce && isRest,
        isWorkDay: isForce || !isRest,
        concurrentEmployees: concurrentEmps.map((id) => employees.find((e) => e.id === id)?.name || id),
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
      const empNames = empIds.map((id) => employees.find((e) => e.id === id)?.name || id);
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
    if (empIds.length > 1) totalConcurrentRest += empIds.length;
    maxConcurrentInDay = Math.max(maxConcurrentInDay, empIds.length);
  }
  
  const stats: ScheduleStats = {
    totalDays,
    workDaysPerEmployee: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.totalWorkDays, 0) / results.length) : 0,
    restDaysPerEmployee: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.totalRestDays, 0) / results.length) : 0,
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
