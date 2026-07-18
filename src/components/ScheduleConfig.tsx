import { useState } from 'react';
import type { ScheduleConfig as ScheduleConfigType, ScheduleStrategy, ConflictResolution, RandomnessConfig } from '../types';
import { DAY_NAMES_FULL, MONTH_NAMES, DEFAULT_SCHEDULE_STRATEGY } from '../types';

interface ScheduleConfigProps {
  config: ScheduleConfigType;
  onChange: (config: ScheduleConfigType) => void;
}

export default function ScheduleConfig({ config, onChange }: ScheduleConfigProps) {
  const [newRestDate, setNewRestDate] = useState('');
  const [showStrategy, setShowStrategy] = useState(false);

  const updateConfig = (updates: Partial<ScheduleConfigType>) => {
    onChange({ ...config, ...updates });
  };

  const updateStrategy = (updates: Partial<ScheduleStrategy>) => {
    const currentStrategy = config.scheduleStrategy || DEFAULT_SCHEDULE_STRATEGY;
    updateConfig({
      scheduleStrategy: { ...currentStrategy, ...updates },
    });
  };

  const updateRandomness = (updates: Partial<RandomnessConfig>) => {
    const currentRandomness = config.randomness || { enabled: true, intensity: 30 };
    updateConfig({
      randomness: { ...currentRandomness, ...updates },
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

  const strategy = config.scheduleStrategy || DEFAULT_SCHEDULE_STRATEGY;
  const randomness = config.randomness || { enabled: true, intensity: 30 };

  const conflictOptions: { value: ConflictResolution; label: string; description: string }[] = [
    { value: 'allow', label: '允许', description: '不做处理，允许多人同休' },
    { value: 'notify', label: '提示', description: '显示警告但继续排班' },
    { value: 'redistribute', label: '重新分配', description: '尝试调整让更少人同休' },
    { value: 'block', label: '阻止', description: '停止排班并要求修改配置' },
  ];

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
        <label className="block text-sm font-medium text-gray-700 mb-2">每周休息天数（默认）</label>
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
        <p className="mt-1 text-xs text-gray-500">此值作为员工的默认休息天数，可在员工管理中为个人单独设置</p>
      </div>

      {/* 不排休的星期几 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">不排休的星期几</label>
        <p className="text-xs text-gray-500 mb-3">选中的日期所有员工都工作</p>
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
      <div className="mb-6">
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

      {/* 不排休日的类型 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          不排休日的类型
        </label>
        <p className="text-xs text-gray-500 mb-3">
          设置上面选中的"不排休"日期算作什么类型的日
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => updateConfig({ noRestDayType: 'work' })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              config.noRestDayType === 'work'
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">工作日</span>
            </div>
            <p className="text-xs opacity-75">
              不排休日 = 员工需要上班<br/>
              适合：法定工作日、特殊营业日
            </p>
          </button>
          <button
            onClick={() => updateConfig({ noRestDayType: 'rest' })}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              config.noRestDayType === 'rest'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">休息日</span>
            </div>
            <p className="text-xs opacity-75">
              不排休日 = 所有人自动休息<br/>
              适合：周末、节假日
            </p>
          </button>
        </div>
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            💡 <strong>当前设置：{config.noRestDayType === 'work' ? '工作日' : '休息日'}</strong>
            {config.noRestDayType === 'work' ? (
              <> — 选中的日期（如周六、周日）员工需要上班，这些天不会被安排休息</>
            ) : (
              <> — 选中的日期（如周六、周日）所有人自动休息，不会被安排排班</>
            )}
          </p>
        </div>
      </div>

      {/* 排班策略设置 */}
      <div className="border-t border-gray-100 pt-6">
        <button
          onClick={() => setShowStrategy(!showStrategy)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">高级排班策略</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${showStrategy ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showStrategy && (
          <div className="mt-4 space-y-4">
            {/* 避免多人同时休息 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">避免多人同时休息</p>
                <p className="text-xs text-gray-500">尽量分散员工的休息日</p>
              </div>
              <button
                onClick={() => updateStrategy({ avoidMultipleRest: !strategy.avoidMultipleRest })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  strategy.avoidMultipleRest ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  strategy.avoidMultipleRest ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* 最大同时休息人数 */}
            {strategy.avoidMultipleRest && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  允许同时休息的最大人数
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={strategy.maxConcurrentRest}
                    onChange={(e) => updateStrategy({ maxConcurrentRest: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="w-12 h-8 flex items-center justify-center bg-indigo-50 rounded-lg">
                    <span className="text-lg font-bold text-indigo-600">{strategy.maxConcurrentRest}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 冲突解决方式 */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                无法避免多人同休时的处理方式
              </label>
              <div className="grid grid-cols-2 gap-2">
                {conflictOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateStrategy({ conflictResolution: option.value })}
                    className={`p-2 rounded-lg text-left text-sm transition-all ${
                      strategy.conflictResolution === option.value
                        ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700'
                        : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs opacity-75">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 随机性设置 */}
      <div className="border-t border-gray-100 pt-6 mt-6">
        <button
          onClick={() => setShowStrategy(!showStrategy)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium text-gray-700">随机性设置</span>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${showStrategy ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showStrategy && (
          <div className="mt-4 space-y-4">
            {/* 启用随机性 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">启用随机性</p>
                <p className="text-xs text-gray-500">每次生成排班时略有不同</p>
              </div>
              <button
                onClick={() => updateRandomness({ enabled: !randomness.enabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  randomness.enabled ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  randomness.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* 随机强度 */}
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
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <span className="text-xs text-gray-500">随机</span>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  当前强度：{randomness.intensity}%（值越大，每次排班结果差异越大）
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
