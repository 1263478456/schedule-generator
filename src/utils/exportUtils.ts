import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { ScheduleConfig } from '../types';
import { DAY_NAMES, DAY_NAMES_FULL } from '../types';
import { generateOptimizedSchedule } from './scheduleGenerator';

/**
 * 格式化日期显示
 */
function formatDateDisplay(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[1]}/${parts[2]}`;
}

/**
 * 生成排班表HTML内容
 */
export function generateScheduleHTML(config: ScheduleConfig): string {
  const { results, stats } = generateOptimizedSchedule(config);
  const { year, month, noRestDaysOfWeek, noRestDates } = config;
  
  const totalDays = new Date(year, month, 0).getDate();
  
  // 构建日期行
  let dateRow = '<th style="width: 80px;">姓名</th>';
  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(year, month - 1, day);
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const bgColor = isWeekend ? '#fef3c7' : '#f3f4f6';
    dateRow += `<th style="background-color: ${bgColor}; min-width: 28px; font-size: 10px;">${day}<br><span style="font-size: 9px; color: #6b7280;">${DAY_NAMES[dow]}</span></th>`;
  }
  dateRow += '<th style="width: 60px;">工作日</th><th style="width: 60px;">休息日</th>';
  
  // 构建员工行
  let employeeRows = '';
  results.forEach((result, idx) => {
    const bgColor = idx % 2 === 0 ? '#ffffff' : '#f9fafb';
    employeeRows += `<tr style="background-color: ${bgColor};"><td style="font-weight: 600; text-align: left; padding-left: 10px;">${result.employeeName}</td>`;
    
    result.days.forEach((day) => {
      let cellStyle = '';
      let cellContent = '';
      
      if (day.isRest) {
        // 休息日
        cellStyle = 'background-color: #dcfce7; color: #166534; font-weight: 500;';
        cellContent = '休';
      } else {
        // 工作日
        cellStyle = 'background-color: #eff6ff; color: #1e40af;';
        cellContent = '✓';
      }
      
      employeeRows += `<td style="${cellStyle}">${cellContent}</td>`;
    });
    
    employeeRows += `<td style="font-weight: 600; color: #1e40af;">${result.totalWorkDays}</td>`;
    employeeRows += `<td style="font-weight: 600; color: #166534;">${result.totalRestDays}</td>`;
    employeeRows += '</tr>';
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
      <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px; color: #1e293b;">
        ${year}年${month}月 员工排班表
      </h1>
      <div style="font-size: 12px; color: #64748b;">
        ${noRestDaysInfo || '无特殊不排休日'}
      </div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
        共 ${stats.totalDays} 天 | 每人工作 ${stats.workDaysPerEmployee} 天 | 每人休息 ${stats.restDaysPerEmployee} 天
      </div>
    </div>
    
    <div style="overflow-x: auto;">
      <table class="schedule-table" style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            ${dateRow}
          </tr>
        </thead>
        <tbody>
          ${employeeRows}
        </tbody>
      </table>
    </div>
    
    <div style="margin-top: 20px; font-size: 10px; color: #94a3b8; display: flex; gap: 20px; justify-content: center;">
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="display: inline-block; width: 16px; height: 16px; background-color: #dcfce7; border: 1px solid #bbf7d0;"></span>
        <span>休息日</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="display: inline-block; width: 16px; height: 16px; background-color: #eff6ff; border: 1px solid #bfdbfe;"></span>
        <span>工作日</span>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
        <span style="display: inline-block; width: 16px; height: 16px; background-color: #e5e7eb; border: 1px solid #d1d5db;"></span>
        <span>不排休日</span>
      </div>
    </div>
    
    <div style="margin-top: 16px; font-size: 9px; color: #cbd5e1; text-align: right;">
      生成时间：${new Date().toLocaleString('zh-CN')}
    </div>
  `;
}

/**
 * 导出为PDF
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
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 使用html2canvas捕获内容
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
    
    // 创建PDF（A4尺寸）
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = 210; // A4宽度
    const pageHeight = 297; // A4高度
    
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
