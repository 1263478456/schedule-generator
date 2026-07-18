import type {
  ScheduleConfig,
  ScheduleResult,
  ScheduleDay,
  ScheduleStats,
  ScheduleConflict,
  EmployeeRestConfig,
} from '../types';

/**
 * 获取指定年月的天数
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 获取指定日期是星期几（0=周日, 1=周一, ..., 6=周六）
 */
function getDayOfWeek(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 检查某天是否为不排休日
 */
function isNoRestDay(
  config: ScheduleConfig,
  year: number,
  month: number,
  day: number,
  dayOfWeek: number
): boolean {
  if (config.noRestDaysOfWeek.includes(dayOfWeek)) {
    return true;
  }
  const dateStr = formatDate(year, month, day);
  if (config.noRestDates.includes(dateStr)) {
    return true;
  }
  return false;
}

/**
 * 获取员工的休息配置
 */
function getEmployeeRestConfig(employee: { restConfig?: EmployeeRestConfig }): EmployeeRestConfig {
  return employee.restConfig || { minRestDays: 0, maxRestDays: 10 };
}

/**
 * 生成智能排班表
 */
export function generateSmartSchedule(config: ScheduleConfig): {
  results: ScheduleResult[];
  stats: ScheduleStats;
  conflicts: ScheduleConflict[];
} {
  const { year, month, employees, weeklyRestDays, scheduleStrategy, noRestDayType } = config;
  
  // 边界情况：没有员工
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
  
  // 1. 找出所有不排休的日期
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
  
  // 根据 noRestDayType 计算实际可排休天数
  // 如果 noRestDayType === 'work'，不排休日是工作日，不可排休
  // 如果 noRestDayType === 'rest'，不排休日是休息日，自动休息，也不需要排休
  const availableDaysForRest = noRestDayType === 'work' 
    ? assignableDays.length 
    : assignableDays.length; // 两种情况下，可排休天数是一样的（不排休日都不能排）
  
  // 2. 为每个员工计算休息天数范围
  const employeeRestRanges = employees.map((emp) => {
    const empRestConfig = getEmployeeRestConfig(emp);
    const minRest = Math.min(empRestConfig.minRestDays, availableDaysForRest);
    const maxRest = Math.min(empRestConfig.maxRestDays, availableDaysForRest);
    const targetRest = weeklyRestDays;
    return {
      employee: emp,
      minRest,
      maxRest,
      targetRest: Math.max(minRest, Math.min(targetRest, maxRest)),
    };
  });
  
  // 3. 按最少休息天数降序排列（优先满足要求高的）
  employeeRestRanges.sort((a, b) => b.minRest - a.minRest);
  
  // 4. 初始化排班结果
  const schedule: Map<string, Set<number>> = new Map(); // employeeId -> 休息日集合
  const dayAssignments: Map<number, string[]> = new Map(); // day -> 员工ID列表
  
  employees.forEach((emp) => {
    schedule.set(emp.id, new Set());
  });
  assignableDays.forEach((day) => {
    dayAssignments.set(day, []);
  });
  
  // 5. 第一轮：为每个员工分配最少休息天数
  for (const { employee, minRest } of employeeRestRanges) {
    let assigned = 0;
    for (const day of assignableDays) {
      if (assigned >= minRest) break;
      
      const dayEmps = dayAssignments.get(day) || [];
      if (dayEmps.length < (scheduleStrategy?.maxConcurrentRest || 1)) {
        schedule.get(employee.id)?.add(day);
        dayAssignments.set(day, [...dayEmps, employee.id]);
        assigned++;
      }
    }
  }
  
  // 6. 第二轮：分配目标休息天数（尽量分散）
  for (const { employee, targetRest } of employeeRestRanges) {
    const currentRest = schedule.get(employee.id)?.size || 0;
    let toAssign = targetRest - currentRest;
    
    if (toAssign <= 0) continue;
    
    const availableDays = assignableDays
      .filter((day) => !schedule.get(employee.id)?.has(day))
      .sort((a, b) => {
        const aCount = (dayAssignments.get(a) || []).length;
        const bCount = (dayAssignments.get(b) || []).length;
        return aCount - bCount;
      });
    
    for (const day of availableDays) {
      if (toAssign <= 0) break;
      
      const dayEmps = dayAssignments.get(day) || [];
      if (scheduleStrategy?.avoidMultipleRest) {
        if (dayEmps.length >= (scheduleStrategy?.maxConcurrentRest || 1)) {
          continue;
        }
      }
      
      schedule.get(employee.id)?.add(day);
      dayAssignments.set(day, [...dayEmps, employee.id]);
      toAssign--;
    }
  }
  
  // 7. 第三轮：尝试满足最大休息天数
  for (const { employee, maxRest } of employeeRestRanges) {
    const currentRest = schedule.get(employee.id)?.size || 0;
    let canAdd = maxRest - currentRest;
    
    if (canAdd <= 0) continue;
    
    const availableDays = assignableDays
      .filter((day) => !schedule.get(employee.id)?.has(day))
      .sort((a, b) => {
        const aCount = (dayAssignments.get(a) || []).length;
        const bCount = (dayAssignments.get(b) || []).length;
        return aCount - bCount;
      });
    
    for (const day of availableDays) {
      if (canAdd <= 0) break;
      
      const dayEmps = dayAssignments.get(day) || [];
      if (scheduleStrategy?.avoidMultipleRest) {
        if (dayEmps.length >= (scheduleStrategy?.maxConcurrentRest || 1)) {
          continue;
        }
      }
      
      schedule.get(employee.id)?.add(day);
      dayAssignments.set(day, [...dayEmps, employee.id]);
      canAdd--;
    }
  }
  
  // 8. 检查冲突并生成结果
  const results: ScheduleResult[] = [];
  
  for (const emp of employees) {
    const restDays = schedule.get(emp.id) || new Set();
    const empRestConfig = getEmployeeRestConfig(emp);
    
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
      const isNoRest = noRestDays.includes(day);
      const isRest = restDays.has(day);
      const concurrentEmps = dayAssignments.get(day) || [];
      
      if (isRest && concurrentEmps.length > 1) {
        concurrentRestDays++;
      }
      
      // 判断是否为工作日
      let isWorkDay = true;
      if (isNoRest) {
        // 不排休日：根据 noRestDayType 判断
        isWorkDay = noRestDayType === 'work'; // 'work'=工作日，'rest'=休息日
      } else if (isRest) {
        // 排休日
        isWorkDay = false;
      }
      
      days.push({
        date: formatDate(year, month, day),
        dayOfWeek,
        isRest,
        isNoAssign: isNoRest && noRestDayType === 'rest', // 只有类型为'rest'时才标记为未排休
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
  
  // 9. 检查并发休息冲突
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
  
  // 10. 计算统计信息
  let totalConcurrentRest = 0;
  let maxConcurrentInDay = 0;
  
  for (const empIds of dayAssignments.values()) {
    if (empIds.length > 1) {
      totalConcurrentRest += empIds.length;
    }
    maxConcurrentInDay = Math.max(maxConcurrentInDay, empIds.length);
  }
  
  // 计算实际工作日天数（排除不排休日）
  const totalWorkDays = noRestDayType === 'work' 
    ? totalDays - noRestDays.length  // 不排休日是工作日，减去休息日
    : totalDays - noRestDays.length; // 不排休日是休息日，也要减去
  
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
    totalWorkDays,
  };
  
  return { results, stats, conflicts };
}

/**
 * 生成排班表（兼容旧接口）
 */
export function generateSchedule(config: ScheduleConfig): {
  results: ScheduleResult[];
  stats: ScheduleStats;
} {
  const { results, stats } = generateSmartSchedule(config);
  return { results, stats };
}

/**
 * 优化排班算法（兼容旧接口）
 */
export function generateOptimizedSchedule(config: ScheduleConfig): {
  results: ScheduleResult[];
  stats: ScheduleStats;
} {
  return generateSmartSchedule(config);
}
