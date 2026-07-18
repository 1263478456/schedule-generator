import { useState } from 'react';
import type { ScheduleConfig as ScheduleConfigType, RandomnessConfig } from '../types';
import { DAY_NAMES_FULL, MONTH_NAMES } from '../types';

interface ScheduleConfigProps {
  config: ScheduleConfigType;
  onChange: (config: ScheduleConfigType) => void;
}

export default function ScheduleConfig({ config, onChange }: ScheduleConfigProps) {
  const [newRestDate, setNewRestDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateConfig = (updates: Partial<ScheduleConfigType>) => {
    onChange({ ...config, ...updates });
  };

  const updateRandomness = (updates: Partial<RandomnessConfig>) => {
    const current = config.randomness || { enabled: true, intensity: 30 };
    updateConfig({
      randomness: { ...current, ...updates },
    });
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

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const randomness = config.randomness || { enabled: true, intensity: 30 };

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

      {/* 每月休息天数 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          每月休息天数（默认）
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="15"
            value={config.monthlyRestDays}
            onChange={(e) => updateConfig({ monthlyRestDays: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="w-12 h-10 flex items-center justify-center bg-purple-50 rounded-lg">
            <span className="text-xl font-bold text-purple-600">{config.monthlyRestDays}</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">此值作为员工的默认休息天数，可在员工管理中为个人单独设置</p>
      </div>

      {/* 强制工作日（不排休的星期几） */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">强制工作日（不排休）</label>
        <p className="text-xs text-gray-500 mb-3">选中的星期几所有人必须上班，不会安排休息</p>
        <div className="grid grid-cols-7 gap-2">
          {DAY_NAMES_FULL.map((name, index) => {
            const isSelected = config.noRestDaysOfWeek.includes(index);
            const dayShort = name.replace('星期', '周');
            return (
              <button
                key={index}
                onClick={() => toggleNoRestDayOfWeek(index)}
                className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {dayShort}
              </button>
            );
          })}
        </div>
        {config.noRestDaysOfWeek.length > 0 && (
          <p className="mt-2 text-xs text-red-600">
            ⚠️ {config.noRestDaysOfWeek.map(d => DAY_NAMES_FULL[d]).join('、')} 为强制工作日
          </p>
        )}
      </div>

      {/* 强制工作日（具体日期） */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">强制工作日（具体日期）</label>
        <p className="text-xs text-gray-500 mb-3">添加特殊日期（如节假日），这些日期所有人必须上班</p>
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
                className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm"
              >
                {date}
                <button
                  onClick={() => removeRestDate(date)}
                  className="ml-1 hover:text-red-900"
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

      {/* 最大同时休息人数 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          最大同时休息人数
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="10"
            value={config.maxConcurrentRest}
            onChange={(e) => updateConfig({ maxConcurrentRest: parseInt(e.target.value) })}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
          <div className="w-12 h-10 flex items-center justify-center bg-purple-50 rounded-lg">
            <span className="text-xl font-bold text-purple-600">{config.maxConcurrentRest}</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-gray-500">同一天最多允许几人同时休息</p>
      </div>

      {/* 高级设置 */}
      <div className="border-t border-gray-100 pt-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">随机性设置</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">启用随机性</p>
                <p className="text-xs text-gray-500">每次生成排班时略有不同</p>
              </div>
              <button
                onClick={() => updateRandomness({ enabled: !randomness.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  randomness.enabled ? 'bg-purple-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  randomness.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {randomness.enabled && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  随机强度
                </label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">稳定</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={randomness.intensity}
                    onChange={(e) => updateRandomness({ intensity: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <span className="text-xs text-gray-500">随机</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">当前强度：{randomness.intensity}%</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
