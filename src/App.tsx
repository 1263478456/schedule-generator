import { useState } from 'react';
import type { ScheduleConfig as ScheduleConfigType } from './types';
import EmployeeManager from './components/EmployeeManager';
import ScheduleConfig from './components/ScheduleConfig';
import ScheduleTable from './components/ScheduleTable';
import ExportPanel from './components/ExportPanel';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const defaultConfig: ScheduleConfigType = {
  year: currentYear,
  month: currentMonth,
  weeklyRestDays: 1,
  noRestDaysOfWeek: [0, 6], // 默认周日周六不排休
  noRestDates: [],
  employees: [
    { id: '1', name: '张三' },
    { id: '2', name: '李四' },
    { id: '3', name: '王五' },
  ],
};

function App() {
  const [config, setConfig] = useState<ScheduleConfigType>(defaultConfig);
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');

  const handleConfigChange = (newConfig: ScheduleConfigType) => {
    setConfig(newConfig);
  };

  const hasEmployees = config.employees.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* 顶部标题栏 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">智能排班表生成器</h1>
                <p className="text-xs text-gray-500">自定义员工信息和休息规则，一键导出排班表</p>
              </div>
            </div>
            
            {/* 移动端标签切换 */}
            <div className="flex md:hidden bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('config')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'config'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                配置
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  activeTab === 'preview'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                预览
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 左侧配置面板 */}
          <div className={`lg:col-span-4 space-y-6 ${activeTab === 'preview' ? 'hidden md:block' : ''}`}>
            <EmployeeManager
              employees={config.employees}
              onChange={(employees) => handleConfigChange({ ...config, employees })}
            />
            <ScheduleConfig config={config} onChange={handleConfigChange} />
            <ExportPanel config={config} />
          </div>

          {/* 右侧预览面板 */}
          <div className={`lg:col-span-8 ${activeTab === 'config' ? 'hidden md:block' : ''}`}>
            {hasEmployees ? (
              <ScheduleTable config={config} />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">请先添加员工</h3>
                <p className="text-gray-500">在左侧添加员工信息后，即可预览排班表</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="mt-12 py-6 border-t border-gray-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>智能排班表生成器 · 轻松管理员工排班</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
