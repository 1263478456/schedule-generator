import { useState, useEffect, useCallback } from 'react';
import type { ScheduleConfig as ScheduleConfigType } from './types';
import type { HistoryRecord } from './utils/api';
import { getConfig, saveConfig, saveHistory } from './utils/api';
import { validateScheduleConfig, escapeHtml } from './utils/validation';
import EmployeeManager from './components/EmployeeManager';
import ScheduleConfig from './components/ScheduleConfig';
import ScheduleTable from './components/ScheduleTable';
import ExportPanel from './components/ExportPanel';
import ErrorBoundary from './components/ErrorBoundary';
import ConfirmDialog from './components/ConfirmDialog';
import HistoryPanel from './components/HistoryPanel';
import Login from './components/Login';
import UserSettings from './components/UserSettings';
import { ToastContainer, useToast } from './components/Toast';
import { APP_VERSION } from './utils/version';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const defaultConfig: ScheduleConfigType = {
  year: currentYear,
  month: currentMonth,
  weeklyRestDays: 1,
  noRestDaysOfWeek: [0, 6],
  noRestDates: [],
  employees: [],
  noRestDayType: 'work',
  scheduleStrategy: {
    avoidMultipleRest: true,
    maxConcurrentRest: 1,
    conflictResolution: 'notify',
  },
  randomness: {
    enabled: true,
    intensity: 30,
  },
};

interface User {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

function App() {
  const { toasts, removeToast, success, error, warning } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [config, setConfig] = useState<ScheduleConfigType>(defaultConfig);
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');
  const [showHistory, setShowHistory] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 检查本地存储的登录状态
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // 从服务器加载配置
  useEffect(() => {
    if (!user || !token) return;

    const loadConfig = async () => {
      try {
        const savedConfig = await getConfig();
        setConfig({
          year: savedConfig.year,
          month: savedConfig.month,
          weeklyRestDays: savedConfig.weeklyRestDays,
          noRestDaysOfWeek: savedConfig.noRestDaysOfWeek,
          noRestDates: savedConfig.noRestDates,
          employees: savedConfig.employees,
          noRestDayType: (savedConfig as any).noRestDayType || 'work',
          scheduleStrategy: (savedConfig as any).scheduleStrategy || defaultConfig.scheduleStrategy,
          randomness: (savedConfig as any).randomness || defaultConfig.randomness,
        });
      } catch (err) {
        console.error('加载配置失败:', err);
      }
    };

    loadConfig();
  }, [user, token]);

  // 保存配置到服务器
  useEffect(() => {
    if (isLoading || !user || !token) return;

    const saveConfigToServer = async () => {
      try {
        await saveConfig(config);
      } catch (err) {
        console.error('保存配置失败:', err);
      }
    };

    const timer = setTimeout(saveConfigToServer, 500);
    return () => clearTimeout(timer);
  }, [config, isLoading, user, token]);

  const handleLogin = useCallback((userData: User, tokenStr: string) => {
    setUser(userData);
    setToken(tokenStr);
    success(`欢迎回来，${userData.displayName || userData.username}！`);
  }, [success]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    success('已退出登录');
  }, [success]);

  const handleConfigChange = useCallback((newConfig: ScheduleConfigType) => {
    const validation = validateScheduleConfig(newConfig);
    
    if (!validation.valid) {
      setValidationErrors(validation.errors.map(e => e.message));
    } else {
      setValidationErrors([]);
    }
    
    if (validation.warnings.length > 0) {
      validation.warnings.forEach(w => warning(w.message));
    }
    
    setConfig(newConfig);
  }, [warning]);

  const handleSaveHistory = useCallback(async () => {
    const validation = validateScheduleConfig(config);
    
    if (!validation.valid) {
      error('配置无效，无法保存');
      return;
    }
    
    if (config.employees.length === 0) {
      error('请先添加员工');
      return;
    }
    
    const totalDays = new Date(config.year, config.month, 0).getDate();
    const weeksInMonth = totalDays / 7;
    const restDaysPerEmployee = Math.round(config.weeklyRestDays * weeksInMonth);
    
    try {
      await saveHistory({
        name: `${config.year}年${config.month}月排班表`,
        config,
        results: [],
        stats: {
          totalDays,
          workDaysPerEmployee: totalDays - restDaysPerEmployee,
          restDaysPerEmployee,
          employeesCount: config.employees.length,
        },
      });
      success('排班表已保存到历史记录');
    } catch (err) {
      error('保存失败，请重试');
    }
  }, [config, success, error]);

  const handleLoadHistory = useCallback(async (item: HistoryRecord) => {
    setConfig(item.config);
    setShowHistory(false);
    success(`已加载"${item.name}"`);
  }, [success]);

  const handleClearConfig = useCallback(() => {
    setDeleteConfirm(true);
  }, []);

  const confirmClearConfig = useCallback(() => {
    const newConfig = {
      ...defaultConfig,
      year: currentYear,
      month: currentMonth,
      noRestDaysOfWeek: [0, 6],
    };
    setConfig(newConfig);
    setDeleteConfirm(false);
    success('配置已重置');
  }, [success]);

  // 加载中状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  // 未登录，显示登录页面
  if (!user || !token) {
    return <Login onLogin={handleLogin} />;
  }

  const hasEmployees = config.employees.length > 0;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* 顶部标题栏 */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
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
                  <p className="text-xs text-gray-500">v{APP_VERSION} · {user.displayName || user.username}</p>
                </div>
              </div>
              
              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowHistory(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">历史</span>
                </button>
                
                <button
                  onClick={() => setShowUserSettings(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="账户设置"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="hidden sm:inline">{user.displayName || user.username}</span>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">退出</span>
                </button>
                
                {/* 移动端标签切换 */}
                <div className="flex md:hidden bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('config')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'config' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    配置
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'preview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-600'
                    }`}
                  >
                    预览
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 验证错误提示 */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border-b border-red-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-red-700">
                  {validationErrors.map((err, i) => (
                    <div key={i}>{escapeHtml(err)}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
              <ExportPanel 
                config={config} 
                onSaveHistory={handleSaveHistory}
                onClearConfig={handleClearConfig}
              />
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
            <p>智能排班表生成器 v{APP_VERSION} · 数据已同步到服务器</p>
          </div>
        </footer>

        {/* 历史记录面板 */}
        {showHistory && (
          <HistoryPanel
            onLoadHistory={handleLoadHistory}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* 重置确认对话框 */}
        <ConfirmDialog
          isOpen={deleteConfirm}
          title="重置配置"
          message="确定要重置所有配置吗？这将清除员工列表和排班规则。"
          confirmText="重置"
          cancelText="取消"
          type="warning"
          onConfirm={confirmClearConfig}
          onCancel={() => setDeleteConfirm(false)}
        />

        {/* 用户设置弹窗 */}
        {showUserSettings && (
          <UserSettings
            user={user}
            onClose={() => setShowUserSettings(false)}
            onUpdate={(updatedUser) => setUser(updatedUser)}
          />
        )}

        {/* Toast 通知 */}
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
