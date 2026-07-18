import type { ScheduleConfig } from '../types';
import { DAY_NAMES } from '../types';
import { generateSmartSchedule } from '../utils/scheduleGenerator';

interface ScheduleTableProps {
  config: ScheduleConfig;
}

export default function ScheduleTable({ config }: ScheduleTableProps) {
  const { results, stats, conflicts } = generateSmartSchedule(config);
  const { year, month } = config;
  
  const totalDays = new Date(year, month, 0).getDate();
  
  const dates = Array.from({ length: totalDays }, (_, i) => {
    const day = i + 1;
    const date = new Date(year, month - 1, day);
    return {
      day,
      dayOfWeek: date.getDay(),
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
    };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">排班预览</h2>
            <p className="text-sm text-gray-500">{year}年{month}月排班结果</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-100 border border-green-200"></span>
            <span className="text-gray-600">休息日</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-50 border border-blue-100"></span>
            <span className="text-gray-600">工作日</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></span>
            <span className="text-gray-600">不排休</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200"></span>
            <span className="text-gray-600">多人同休</span>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.totalDays}</div>
          <div className="text-xs text-blue-500">总天数</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.restDaysPerEmployee}</div>
          <div className="text-xs text-green-500">平均休息天数</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.workDaysPerEmployee}</div>
          <div className="text-xs text-purple-500">平均工作天数</div>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.maxConcurrentRest}</div>
          <div className="text-xs text-amber-500">最大同时休息</div>
        </div>
      </div>

      {/* 冲突警告 */}
      {conflicts.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium text-amber-800">排班冲突提示</span>
          </div>
          <div className="text-sm text-amber-700 space-y-1">
            {conflicts.map((conflict, idx) => (
              <div key={idx}>• {conflict.message}</div>
            ))}
          </div>
        </div>
      )}

      {/* 排班表格 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2 text-left font-semibold text-gray-700 min-w-[80px]">
                姓名
              </th>
              {dates.map(({ day, dayOfWeek, isWeekend }) => (
                <th
                  key={day}
                  className={`px-1 py-2 text-center font-medium min-w-[32px] ${
                    isWeekend ? 'bg-amber-50 text-amber-700' : 'text-gray-600'
                  }`}
                >
                  <div className="text-xs">{day}</div>
                  <div className="text-[10px] text-gray-400">{DAY_NAMES[dayOfWeek]}</div>
                </th>
              ))}
              <th className="px-2 py-2 text-center font-medium text-blue-600 min-w-[50px]">工作</th>
              <th className="px-2 py-2 text-center font-medium text-green-600 min-w-[50px]">休息</th>
              <th className="px-2 py-2 text-center font-medium text-amber-600 min-w-[50px]">同休</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result, idx) => (
              <tr
                key={result.employeeId}
                className={`border-t border-gray-100 ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                <td className="sticky left-0 z-10 px-3 py-2.5 font-medium text-gray-800 bg-inherit">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                      {result.employeeName.charAt(0)}
                    </div>
                    {result.employeeName}
                  </div>
                </td>
                {result.days.map((day, dayIdx) => {
                  const hasConcurrent = day.concurrentEmployees && day.concurrentEmployees.length > 1;
                  return (
                    <td
                      key={dayIdx}
                      className={`px-1 py-2.5 text-center text-xs font-medium ${
                        day.isNoAssign
                          ? 'bg-gray-100 text-gray-400'
                          : day.isRest
                          ? hasConcurrent
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-green-100 text-green-700'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                      title={hasConcurrent ? `同休: ${day.concurrentEmployees?.join(', ')}` : undefined}
                    >
                      {day.isNoAssign ? '—' : day.isRest ? (hasConcurrent ? '休*' : '休') : '✓'}
                    </td>
                  );
                })}
                <td className="px-2 py-2.5 text-center font-semibold text-blue-600">
                  {result.totalWorkDays}
                </td>
                <td className="px-2 py-2.5 text-center font-semibold text-green-600">
                  {result.totalRestDays}
                </td>
                <td className="px-2 py-2.5 text-center font-semibold text-amber-600">
                  {result.concurrentRestDays}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 图例说明 */}
      <div className="mt-4 text-xs text-gray-500">
        <span className="text-amber-600">休*</span> 表示多人同一天休息，鼠标悬停可查看详情
      </div>
    </div>
  );
}
