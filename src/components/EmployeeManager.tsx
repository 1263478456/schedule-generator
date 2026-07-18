import { useState } from 'react';
import type { Employee, EmployeeRestConfig, RestPreference } from '../types';
import { validateEmployee, escapeHtml } from '../utils/validation';
import { REST_PREFERENCE_OPTIONS } from '../types';

interface EmployeeManagerProps {
  employees: Employee[];
  defaultMonthlyRestDays: number;
  onChange: (employees: Employee[]) => void;
}

export default function EmployeeManager({ employees, defaultMonthlyRestDays, onChange }: EmployeeManagerProps) {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const addEmployee = () => {
    const validationErrors = validateEmployee(newName, employees);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map(e => e.message));
      return;
    }
    
    const newEmployee: Employee = {
      id: Date.now().toString(),
      name: newName.trim(),
      restConfig: {
        minRestDays: defaultMonthlyRestDays,
        maxRestDays: defaultMonthlyRestDays,
      },
      restPreference: 'scattered',
    };
    onChange([...employees, newEmployee]);
    setNewName('');
    setErrors([]);
  };

  const removeEmployee = (id: string) => {
    const employee = employees.find(e => e.id === id);
    if (employee && window.confirm(`确定要删除员工"${employee.name}"吗？`)) {
      onChange(employees.filter(e => e.id !== id));
    }
  };

  const startEditing = (employee: Employee) => {
    setEditingId(employee.id);
    setEditingName(employee.name);
    setErrors([]);
  };

  const saveEditing = () => {
    if (!editingId) return;
    
    const otherEmployees = employees.filter(e => e.id !== editingId);
    const validationErrors = validateEmployee(editingName, otherEmployees);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map(e => e.message));
      return;
    }
    
    onChange(
      employees.map(e =>
        e.id === editingId ? { ...e, name: editingName.trim() } : e
      )
    );
    setEditingId(null);
    setEditingName('');
    setErrors([]);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
    setErrors([]);
  };

  const updateRestConfig = (employeeId: string, config: Partial<EmployeeRestConfig>) => {
    onChange(
      employees.map(e => {
        if (e.id === employeeId) {
          const currentConfig = e.restConfig || { minRestDays: defaultMonthlyRestDays, maxRestDays: defaultMonthlyRestDays };
          const newConfig = { ...currentConfig, ...config };
          
          if (newConfig.minRestDays > newConfig.maxRestDays) {
            if (config.minRestDays !== undefined) {
              newConfig.maxRestDays = newConfig.minRestDays;
            } else {
              newConfig.minRestDays = newConfig.maxRestDays;
            }
          }
          
          return { ...e, restConfig: newConfig };
        }
        return e;
      })
    );
  };

  const updateRestPreference = (employeeId: string, preference: RestPreference) => {
    onChange(
      employees.map(e => {
        if (e.id === employeeId) {
          return { ...e, restPreference: preference };
        }
        return e;
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (editingId) {
        saveEditing();
      } else {
        addEmployee();
      }
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">员工管理</h2>
          <p className="text-sm text-gray-500">添加员工，配置个人休息天数和偏好</p>
        </div>
      </div>

      {/* 添加员工输入框 */}
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            if (errors.length > 0) setErrors([]);
          }}
          onKeyDown={handleKeyDown}
          placeholder="输入员工姓名..."
          maxLength={20}
          className={`flex-1 px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
            errors.length > 0 ? 'border-red-300' : 'border-gray-200'
          }`}
        />
        <button
          onClick={addEmployee}
          disabled={!newName.trim()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加
        </button>
      </div>

      {/* 错误提示 */}
      {errors.length > 0 && (
        <div className="mb-4 p-2 bg-red-50 rounded-lg">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">{escapeHtml(err)}</p>
          ))}
        </div>
      )}

      {/* 员工列表 */}
      <div className="space-y-3">
        {employees.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">暂无员工，请添加员工信息</p>
          </div>
        ) : (
          employees.map((employee) => {
            const restConfig = employee.restConfig || { minRestDays: defaultMonthlyRestDays, maxRestDays: defaultMonthlyRestDays };
            const isConfiguring = configuringId === employee.id;
            
            return (
              <div
                key={employee.id}
                className="bg-gray-50 rounded-lg overflow-hidden"
              >
                {/* 员工基本信息行 */}
                <div className="flex items-center gap-3 p-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {escapeHtml(employee.name.charAt(0))}
                  </div>
                  
                  {editingId === employee.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => {
                        setEditingName(e.target.value);
                        if (errors.length > 0) setErrors([]);
                      }}
                      onKeyDown={handleKeyDown}
                      onBlur={saveEditing}
                      autoFocus
                      maxLength={20}
                      className="flex-1 px-3 py-1.5 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="flex-1">
                      <span className="font-medium text-gray-700">{escapeHtml(employee.name)}</span>
                      <div className="text-xs text-gray-500 mt-0.5">
                        月休 {restConfig.minRestDays}-{restConfig.maxRestDays} 天 · 
                        {employee.restPreference === 'consecutive' ? ' 连休' : 
                         employee.restPreference === 'random' ? ' 随机' : ' 分散'}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    {editingId === employee.id ? (
                      <>
                        <button
                          onClick={saveEditing}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          title="保存"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
                          title="取消"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfiguringId(isConfiguring ? null : employee.id)}
                          className={`p-1.5 rounded-md transition-colors ${
                            isConfiguring 
                              ? 'text-indigo-600 bg-indigo-50' 
                              : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
                          }`}
                          title="设置休息天数"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => startEditing(employee)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeEmployee(employee.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="删除"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 休息天数配置面板 */}
                {isConfiguring && (
                  <div className="px-3 pb-3 pt-1 border-t border-gray-200">
                    {/* 休息偏好选择 */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        休息偏好
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {REST_PREFERENCE_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => updateRestPreference(employee.id, option.value)}
                            className={`p-2 rounded-lg text-center text-xs transition-all ${
                              (employee.restPreference || 'scattered') === option.value
                                ? 'bg-indigo-100 border-2 border-indigo-500 text-indigo-700'
                                : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium">{option.label}</div>
                            <div className="text-[10px] opacity-75 mt-0.5">{option.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* 休息天数滑块 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          最少休息天数
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="15"
                            value={restConfig.minRestDays}
                            onChange={(e) => updateRestConfig(employee.id, { minRestDays: parseInt(e.target.value) })}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <span className="w-8 text-center text-sm font-medium text-indigo-600">
                            {restConfig.minRestDays}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          最多休息天数
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="15"
                            value={restConfig.maxRestDays}
                            onChange={(e) => updateRestConfig(employee.id, { maxRestDays: parseInt(e.target.value) })}
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                          <span className="w-8 text-center text-sm font-medium text-indigo-600">
                            {restConfig.maxRestDays}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      💡 设为 0 表示该员工本月不想休息
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 员工数量提示 */}
      {employees.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
          共 {employees.length} 名员工
        </div>
      )}
    </div>
  );
}
