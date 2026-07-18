import { useState } from 'react';
import type { Employee } from '../types';

interface EmployeeRestConfigProps {
  employee: Employee;
  onChange: (employee: Employee) => void;
}

export default function EmployeeRestConfigPanel({ employee, onChange }: EmployeeRestConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleUpdate = (updates: Partial<Employee>) => {
    onChange({ ...employee, ...updates });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">排班策略</h2>
            <p className="text-sm text-gray-500">配置并发休息和冲突处理规则</p>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-800">
              💡 员工 {employee.name} 的休息天数设置请在员工管理中配置。
            </p>
          </div>
          <button
            onClick={() => handleUpdate({})}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm hover:bg-indigo-200 transition-colors"
          >
            查看配置
          </button>
        </div>
      )}
    </div>
  );
}
