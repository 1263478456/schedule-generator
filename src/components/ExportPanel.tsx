import { useState } from 'react';
import type { ScheduleConfig } from '../types';
import { exportToPDF, exportToHTML } from '../utils/exportUtils';

interface ExportPanelProps {
  config: ScheduleConfig;
}

export default function ExportPanel({ config }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'html'>('pdf');

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportType === 'pdf') {
        await exportToPDF(config);
      } else {
        exportToHTML(config);
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-800">导出排班表</h2>
          <p className="text-sm text-gray-500">导出为可打印的文件</p>
        </div>
      </div>

      {/* 导出格式选择 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">导出格式</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setExportType('pdf')}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              exportType === 'pdf'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="text-left">
              <div className="font-semibold">PDF 文件</div>
              <div className="text-xs opacity-75">可打印 A4 格式</div>
            </div>
          </button>
          <button
            onClick={() => setExportType('html')}
            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
              exportType === 'html'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <div className="text-left">
              <div className="font-semibold">HTML 文件</div>
              <div className="text-xs opacity-75">可在浏览器打开</div>
            </div>
          </button>
        </div>
      </div>

      {/* 导出按钮 */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
      >
        {isExporting ? (
          <>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            正在导出...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            导出 {exportType.toUpperCase()} 文件
          </>
        )}
      </button>

      {/* 打印提示 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-gray-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-gray-600">
            <p className="font-medium mb-1">打印建议：</p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-500">
              <li>PDF 文件已优化为 A4 尺寸 (210×297mm)</li>
              <li>打印时选择"实际大小"以获得最佳效果</li>
              <li>横向打印可获得更大的表格显示</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
