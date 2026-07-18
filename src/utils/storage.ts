import type { ScheduleConfig, ScheduleResult } from '../types';

// 存储键名常量
const STORAGE_KEYS = {
  CURRENT_CONFIG: 'schedule-generator-config',
  SCHEDULE_HISTORY: 'schedule-generator-history',
  EMPLOYEES: 'schedule-generator-employees',
} as const;

// 历史记录接口
export interface ScheduleHistoryItem {
  id: string;
  name: string;
  config: ScheduleConfig;
  results: ScheduleResult[];
  createdAt: string;
  stats: {
    totalDays: number;
    workDaysPerEmployee: number;
    restDaysPerEmployee: number;
    employeesCount: number;
  };
}

// 最大历史记录数
const MAX_HISTORY_ITEMS = 50;

/**
 * 通用 localStorage 操作，带错误处理
 */
function safeLocalStorage() {
  return {
    get<T>(key: string, defaultValue: T): T {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (error) {
        console.error(`Failed to read from localStorage: ${key}`, error);
        return defaultValue;
      }
    },
    set<T>(key: string, value: T): boolean {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error(`Failed to write to localStorage: ${key}`, error);
        // 存储空间不足时尝试清理旧数据
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn('localStorage quota exceeded, clearing old data...');
          this.clearOldData();
          try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
          } catch {
            return false;
          }
        }
        return false;
      }
    },
    remove(key: string): boolean {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error(`Failed to remove from localStorage: ${key}`, error);
        return false;
      }
    },
    clearOldData(): void {
      // 清理超过30天的历史记录
      const history = this.get<ScheduleHistoryItem[]>(STORAGE_KEYS.SCHEDULE_HISTORY, []);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentHistory = history.filter(item => 
        new Date(item.createdAt) > thirtyDaysAgo
      );
      
      this.set(STORAGE_KEYS.SCHEDULE_HISTORY, recentHistory);
    },
  };
}

const storage = safeLocalStorage();

/**
 * 配置持久化（不包含员工列表，员工列表单独存储）
 */
export const configStorage = {
  load(): Omit<ScheduleConfig, 'employees'> | null {
    return storage.get<Omit<ScheduleConfig, 'employees'> | null>(STORAGE_KEYS.CURRENT_CONFIG, null);
  },
  
  save(config: Omit<ScheduleConfig, 'employees'>): boolean {
    return storage.set(STORAGE_KEYS.CURRENT_CONFIG, config);
  },
  
  clear(): boolean {
    return storage.remove(STORAGE_KEYS.CURRENT_CONFIG);
  },
};

/**
 * 员工列表持久化
 */
export const employeeStorage = {
  load(): ScheduleConfig['employees'] {
    return storage.get<ScheduleConfig['employees']>(STORAGE_KEYS.EMPLOYEES, []);
  },
  
  save(employees: ScheduleConfig['employees']): boolean {
    return storage.set(STORAGE_KEYS.EMPLOYEES, employees);
  },
};

/**
 * 历史排班表持久化
 */
export const historyStorage = {
  load(): ScheduleHistoryItem[] {
    return storage.get<ScheduleHistoryItem[]>(STORAGE_KEYS.SCHEDULE_HISTORY, []);
  },
  
  save(item: Omit<ScheduleHistoryItem, 'id' | 'createdAt'>): ScheduleHistoryItem | null {
    const history = this.load();
    
    const newItem: ScheduleHistoryItem = {
      id: `schedule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      ...item,
    };
    
    // 添加到开头
    history.unshift(newItem);
    
    // 限制最大数量
    if (history.length > MAX_HISTORY_ITEMS) {
      history.splice(MAX_HISTORY_ITEMS);
    }
    
    const success = storage.set(STORAGE_KEYS.SCHEDULE_HISTORY, history);
    return success ? newItem : null;
  },
  
  delete(id: string): boolean {
    const history = this.load();
    const filtered = history.filter(item => item.id !== id);
    
    if (filtered.length === history.length) {
      return false; // 没有找到
    }
    
    return storage.set(STORAGE_KEYS.SCHEDULE_HISTORY, filtered);
  },
  
  clear(): boolean {
    return storage.set(STORAGE_KEYS.SCHEDULE_HISTORY, []);
  },
  
  getById(id: string): ScheduleHistoryItem | undefined {
    return this.load().find(item => item.id === id);
  },
  
  getRecent(count: number = 10): ScheduleHistoryItem[] {
    return this.load().slice(0, count);
  },
};
