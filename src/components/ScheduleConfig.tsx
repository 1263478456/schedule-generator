import { useState } from 'react';
import type { ScheduleConfig as ScheduleConfigType } from '../types';
import { DAY_NAMES_FULL, MONTH_NAMES } from '../types';

interface ScheduleConfigProps {
  config: ScheduleConfigType;
  onChange: (config: ScheduleConfigType) => void;
}

const WEEKDAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6].map(d => ({
  value: d,
  label: DAY_NAMES_FULL[d],
}));

export default function ScheduleConfig({ config, onChange }: ScheduleConfigProps) {
  const [newRestDate, setNewRestDate] = useState('');

  const updateConfig = (updates: Partial<ScheduleConfigType>) => {
    onChange({ ...config, ...updates });
  };

  const toggleNoRestDayOfWeek = (day: number) => {
    const current = config.noRestDaysOfWeek;
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day];
    updateConfig({ noRestDaysOfWeek: updated });
  };

  const addRestDate = () => {
    if (newRestDate && !config.noRestDates.includes(newRestDate)) {
      updateConfig({ noRestDates: [...config.noRestDates, newRestDate] });
      setNewRestDate('');
    }
  };

  const removeRestDate = (date: string) => {
    updateConfig({ noRestDates: config.noRestDates.filter(d => d !== date) });
  };

  // 生成年份和月份选项
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">排班规则</h2>
          <p className="text-sm text-gray-500">配置排班月份和休息规则</p>
        </div>
      </div>

      {/* 排班月份选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">排班月份</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">年份</label>
            <select
              value={config.year}
              onChange={(e) => updateConfig({ year: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">月份</label>
            <select
              value={config.month}
              onChange={(e) => updateConfig({ month: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {months.map(month => (
                <option key={month} value={month}>{MONTH_NAMES[month - 1]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 每周休息天数 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">每周休息天数</label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="5"
            value={config.weeklyRestDays}
            onChange={(e) => updateConfig({ weeklyRestDays: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="w-12 h-10 flex items-center justify-center bg-purple-50 rounded-lg">
            <span className="text-xl font-bold text-purple-600">{config.weeklyRestDays}</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">建议设置 1-2 天</p>
      </div>

      {/* 不排休的星期几 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">不排休的星期几</label>
        <p className="text-xs text-gray-500 mb-3">选中的日期所有员工都工作</p>
        <div className="grid grid-cols-7 gap-2">
          {WEEKDAY_OPTIONS.map(({ value }) => {
            const isSelected = config.noRestDaysOfWeek.includes(value);
            const dayShort = DAY_NAMES_FULL[value].replace('星期', '周');
            return (
              <button
                key={value}
                onClick={() => toggleNoRestDayOfWeek(value)}
                className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {dayShort}
              </button>
            );
          })}
        </div>
      </div>

      {/* 不排休的具体日期 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">不排休的具体日期</label>
        <p className="text-xs text-gray-500 mb-3">添加特殊日期（如节假日），这些日期所有员工都工作</p>
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            value={newRestDate}
            onChange={(e) => setNewRestDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={addRestDate}
            disabled={!newRestDate}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-medium hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            添加
          </button>
        </div>
        
        {config.noRestDates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {config.noRestDates.sort().map(date => (
              <span
                key={date}
                className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm"
              >
                {date}
                <button
                  onClick={() => removeRestDate(date)}
                  className="ml-1 hover:text-purple-900"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
