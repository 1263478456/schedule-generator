import type {
  ScheduleConfig,
  ScheduleResult,
  ScheduleDay,
  ScheduleStats,
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
  // 检查星期几是否在不排休列表中
  if (config.noRestDaysOfWeek.includes(dayOfWeek)) {
    return true;
  }

  // 检查具体日期是否在不排休列表中
  const dateStr = formatDate(year, month, day);
  if (config.noRestDates.includes(dateStr)) {
    return true;
  }

  return false;
}

/**
 * 生成排班表
 */
export function generateSchedule(config: ScheduleConfig): {
  results: ScheduleResult[];
  stats: ScheduleStats;
} {
  const { year, month, employees, weeklyRestDays } = config;
  const totalDays = getDaysInMonth(year, month);
  
  // 计算每月休息天数（如果设置了的话）
  
  // 找出所有不排休的日期
  const noRestDays: number[] = [];
  for (let day = 1; day <= totalDays; day++) {
    const dayOfWeek = getDayOfWeek(year, month, day);
    if (isNoRestDay(config, year, month, day, dayOfWeek)) {
      noRestDays.push(day);
    }
  }
  
  // 可以排休的日期（排除不排休日期）
  const assignableDays: number[] = [];
  for (let day = 1; day <= totalDays; day++) {
    if (!noRestDays.includes(day)) {
      assignableDays.push(day);
    }
  }
  
  // 计算每个员工需要的休息天数
  // 总休息天数 = 可排休天数 / 员工数 * 每周休息天数（近似）
  // 简化算法：每个员工休息天数 = 每周休息天数 * 周数（约4-5周）
  const weeksInMonth = totalDays / 7;
  const restDaysPerEmployee = Math.min(
    Math.round(weeklyRestDays * weeksInMonth),
    Math.floor(assignableDays.length / employees.length) // 不超过可分配的天数
  );
  
  const results: ScheduleResult[] = [];
  
  employees.forEach((employee, empIndex) => {
    const days: ScheduleDay[] = [];
    let restDaysAssigned = 0;
    
    // 策略：轮流分配休息日，尽量均匀分布
    // 将可排休日期分成若干段，每段分配给不同员工
    const segmentSize = Math.ceil(assignableDays.length / employees.length);
    const startIdx = empIndex * segmentSize;
    const endIdx = Math.min(startIdx + segmentSize, assignableDays.length);
    
    for (let day = 1; day <= totalDays; day++) {
      const dayOfWeek = getDayOfWeek(year, month, day);
      const isNoRest = noRestDays.includes(day);
      
      if (isNoRest) {
        // 不排休日，不分配休息
        days.push({
          date: formatDate(year, month, day),
          dayOfWeek,
          isRest: false,
          isNoAssign: true,
        });
      } else {
        // 可排休日
        const isRest =
          restDaysAssigned < restDaysPerEmployee &&
          assignableDays.indexOf(day) >= startIdx &&
          assignableDays.indexOf(day) < endIdx;
        
        if (isRest) {
          restDaysAssigned++;
        }
        
        days.push({
          date: formatDate(year, month, day),
          dayOfWeek,
          isRest,
          isNoAssign: false,
        });
      }
    }
    
    results.push({
      employeeId: employee.id,
      employeeName: employee.name,
      days,
      totalWorkDays: totalDays - restDaysAssigned - noRestDays.length,
      totalRestDays: restDaysAssigned,
    });
  });
  
  return {
    results,
    stats: {
      totalDays,
      workDaysPerEmployee: totalDays - restDaysPerEmployee - noRestDays.length,
      restDaysPerEmployee,
      noRestDaysCount: noRestDays.length,
    },
  };
}

/**
 * 优化排班算法 - 更均匀地分配休息日
 */
export function generateOptimizedSchedule(config: ScheduleConfig): {
  results: ScheduleResult[];
  stats: ScheduleStats;
} {
  const { year, month, employees, weeklyRestDays } = config;
  const totalDays = getDaysInMonth(year, month);
  
  // 找出所有不排休的日期
  const noRestDays: number[] = [];
  const workDays: number[] = [];
  
  for (let day = 1; day <= totalDays; day++) {
    const dayOfWeek = getDayOfWeek(year, month, day);
    if (isNoRestDay(config, year, month, day, dayOfWeek)) {
      noRestDays.push(day);
    } else {
      workDays.push(day);
    }
  }
  
  // 计算每个员工需要的休息天数
  const weeksInMonth = totalDays / 7;
  const targetRestDays = Math.round(weeklyRestDays * weeksInMonth);
  
  // 使用轮转算法分配休息日
  const restDaySchedule: Map<number, number> = new Map(); // day -> employeeIndex
  
  // 按星期几分组工作日
  const workDaysByWeekday: Map<number, number[]> = new Map();
  for (let i = 0; i <= 6; i++) {
    workDaysByWeekday.set(i, []);
  }
  workDays.forEach((day) => {
    const dow = getDayOfWeek(year, month, day);
    workDaysByWeekday.get(dow)?.push(day);
  });
  
  // 为每个员工分配休息日
  const employeeRestCounts: number[] = employees.map(() => 0);
  
  // 尝试均匀分配
  employees.forEach((_employee, empIdx) => {
    let assignedCount = 0;
    
    // 优先在工作日较少的星期分配
    for (let dow = 0; dow <= 6; dow++) {
      if (assignedCount >= targetRestDays) break;
      
      const availableDays = workDaysByWeekday.get(dow) || [];
      const unassignedDays = availableDays.filter(
        (d) => !restDaySchedule.has(d)
      );
      
      if (unassignedDays.length > 0 && assignedCount < targetRestDays) {
        // 选择一个未被分配的日期
        const dayToAssign = unassignedDays[0];
        restDaySchedule.set(dayToAssign, empIdx);
        assignedCount++;
        employeeRestCounts[empIdx]++;
      }
    }
  });
  
  // 构建结果
  const results: ScheduleResult[] = employees.map((employee, empIdx) => {
    const days: ScheduleDay[] = [];
    let restCount = 0;
    let workCount = 0;
    
    for (let day = 1; day <= totalDays; day++) {
      const dayOfWeek = getDayOfWeek(year, month, day);
      const isNoRest = noRestDays.includes(day);
      const assignedTo = restDaySchedule.get(day);
      const isRest = assignedTo === empIdx;
      
      if (isRest) restCount++;
      else if (!isNoRest) workCount++;
      
      days.push({
        date: formatDate(year, month, day),
        dayOfWeek,
        isRest,
        isNoAssign: isNoRest,
      });
    }
    
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      days,
      totalWorkDays: workCount,
      totalRestDays: restCount,
    };
  });
  
  return {
    results,
    stats: {
      totalDays,
      workDaysPerEmployee: totalDays - targetRestDays - noRestDays.length,
      restDaysPerEmployee: targetRestDays,
      noRestDaysCount: noRestDays.length,
    },
  };
}
