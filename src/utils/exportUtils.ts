import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ScheduleConfig } from '../types';
import { DAY_NAMES_FULL } from '../types';
import { generateOptimizedSchedule } from './scheduleGenerator';

/**
 * 格式化日期显示
 */
function formatDateDisplay(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[1]}/${parts[2]}`;
}

/**
 * 生成排班表HTML内容（日历格式）
 */
export function generateScheduleHTML(config: ScheduleConfig): string {
  const { results, stats } = generateOptimizedSchedule(config);
  const { year, month, noRestDaysOfWeek, noRestDates } = config;
  
  const totalDays = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=周日
  
  // 构建按周分组的数据
  const weeks: number[][] = [];
  let currentWeek: number[] = [];
  
  // 填充第一周前面的空白
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(0); // 0 表示空白
  }
  
  // 填充所有日期
  for (let day = 1; day <= totalDays; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // 填充最后一周的空白
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(0);
    }
    weeks.push(currentWeek);
  }
  
  // 星期标题行
  const dayHeaders = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  
  // 构建每个员工的日历视图
  let employeeCalendars = '';
  
  results.forEach((result, idx) => {
    const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
    
    // 统计工作日和休息日
    let workDays = 0;
    let restDays = 0;
    result.days.forEach(d => {
      if (d.isWorkDay) workDays++;
      else restDays++;
    });
    
    // 员工标题
    employeeCalendars += `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding: 6px 10px; background: ${bgColor}; border-radius: 6px; border-left: 4px solid #3b82f6;">
          <span style="font-weight: 600; font-size: 14px; color: #1e293b;">${result.employeeName}</span>
          <span style="font-size: 11px; color: #64748b;">工作 ${workDays} 天 / 休息 ${restDays} 天</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
          <thead>
            <tr>`;
    
    // 星期表头
    dayHeaders.forEach((name, dayIdx) => {
      const isWeekend = dayIdx === 0 || dayIdx === 6;
      const headerBg = isWeekend ? '#fef3c7' : '#e5e7eb';
      employeeCalendars += `<th style="width: 14.28%; padding: 6px 4px; background: ${headerBg}; font-size: 11px; color: #374151; border: 1px solid #d1d5db;">${name}</th>`;
    });
    
    employeeCalendars += `</tr></thead><tbody>`;
    
    // 每周一行
    weeks.forEach((week) => {
      employeeCalendars += '<tr>';
      week.forEach((day) => {
        if (day === 0) {
          // 空白单元格
          employeeCalendars += '<td style="padding: 8px 4px; border: 1px solid #e5e7eb; background: #fafafa;"></td>';
        } else {
          const dayData = result.days[day - 1];
          const isRest = dayData.isRest;
          const isForceWork = dayData.isWorkDay && !dayData.isRest;
          const hasConcurrent = dayData.concurrentEmployees && dayData.concurrentEmployees.length > 1;
          
          let cellBg = '#ffffff';
          let textColor = '#374151';
          let displayText = day.toString();
          
          if (isRest && hasConcurrent) {
            cellBg = '#fef3c7';
            textColor = '#92400e';
            displayText = `${day}`;
          } else if (isRest) {
            cellBg = '#dcfce7';
            textColor = '#166534';
            displayText = `${day}`;
          } else if (isForceWork) {
            cellBg = '#f3f4f6';
            textColor = '#6b7280';
          }
          
          employeeCalendars += `<td style="padding: 8px 4px; border: 1px solid #d1d5db; background: ${cellBg}; text-align: center;">
            <div style="font-size: 14px; font-weight: 500; color: ${textColor};">${displayText}</div>
            ${isRest ? `<div style="font-size: 9px; color: ${textColor}; margin-top: 2px;">${hasConcurrent ? '休*' : '休'}</div>` : ''}
          </td>`;
        }
      });
      employeeCalendars += '</tr>';
    });
    
    employeeCalendars += `</tbody></table></div>`;
  });
  
  // 构建不排休日说明
  let noRestDaysInfo = '';
  if (noRestDaysOfWeek.length > 0) {
    const dayNames = noRestDaysOfWeek.map(d => DAY_NAMES_FULL[d]).join('、');
    noRestDaysInfo += `<span>不排休日（星期）：${dayNames}</span>`;
  }
  if (noRestDates.length > 0) {
    const dates = noRestDates.map(d => formatDateDisplay(d)).join('、');
    noRestDaysInfo += `<span style="margin-left: 20px;">不排休日（日期）：${dates}</span>`;
  }
  
  return `
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="font-size: 22px; font-weight: bold; margin-bottom: 6px; color: #1e293b;">
        ${year}年${month}月 员工排班表
      </h1>
      <div style="font-size: 11px; color: #64748b;">
        ${noRestDaysInfo || '无特殊不排休日'}
      </div>
      <div style="font-size: 10px; color: #94a3b8; margin-top: 3px;">
        共 ${stats.totalDays} 天 | 每人工作 ${stats.workDaysPerEmployee} 天 | 每人休息 ${stats.restDaysPerEmployee} 天
      </div>
    </div>
    
    ${employeeCalendars}
    
    <div style="margin-top: 15px; font-size: 9px; color: #94a3b8; display: flex; gap: 15px; justify-content: center;">
      <div style="display: flex; align-items: center; gap: 3px;">
        <span style="display: inline-block; width: 12px; height: 12px; background-color: #dcfce7; border: 1px solid #bbf7d0;"></span>
        <span>休息日</span>
      </div>
      <div style="display: flex; align-items: center; gap: 3px;">
        <span style="display: inline-block; width: 12px; height: 12px; background-color: #fef3c7; border: 1px solid #fde68a;"></span>
        <span>多人同休</span>
      </div>
      <div style="display: flex; align-items: center; gap: 3px;">
        <span style="display: inline-block; width: 12px; height: 12px; background-color: #f3f4f6; border: 1px solid #d1d5db;"></span>
        <span>强制工作</span>
      </div>
    </div>
    
    <div style="margin-top: 10px; font-size: 8px; color: #cbd5e1; text-align: right;">
      生成时间：${new Date().toLocaleString('zh-CN')}
    </div>
  `;
}

/**
 * 导出为PDF（日历格式，纵向 A4）
 */
export async function exportToPDF(config: ScheduleConfig): Promise<void> {
  // 创建临时容器
  const container = document.createElement('div');
  container.id = 'schedule-content';
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 210mm;
    background: white;
    padding: 15mm;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  `;
  container.innerHTML = generateScheduleHTML(config);
  document.body.appendChild(container);
  
  try {
    // 等待渲染完成
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // 使用html2canvas捕获内容
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
    // 创建PDF（纵向 A4 尺寸）
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = 210; // A4 宽度
    const pageHeight = 297; // A4 高度
    
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const imgData = canvas.toDataURL('image/png');
    
    // 如果内容高度超过一页，需要分页
    if (imgHeight > pageHeight) {
      let heightLeft = imgHeight;
      let position = 0;
      
      // 第一页
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // 后续页面
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
    } else {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    }
    
    // 保存PDF
    const { year, month } = config;
    pdf.save(`${year}年${month}月排班表.pdf`);
  } finally {
    // 清理临时容器
    document.body.removeChild(container);
  }
}

/**
 * 导出为HTML文件
 */
export function exportToHTML(config: ScheduleConfig): void {
  const htmlContent = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.year}年${config.month}月排班表</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      padding: 20px;
      background: #f5f5f5;
    }
    .container { 
      max-width: 1200px; 
      margin: 0 auto; 
      background: white;
      padding: 30px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .schedule-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .schedule-table th, .schedule-table td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: center; }
    .schedule-table th { background-color: #f3f4f6; font-weight: 600; }
    @media print { 
      body { padding: 0; background: white; } 
      .container { box-shadow: none; padding: 10mm; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${generateScheduleHTML(config)}
  </div>
</body>
</html>
  `;
  
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${config.year}年${config.month}月排班表.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
