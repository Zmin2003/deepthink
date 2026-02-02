import { EventEmitter } from 'events';

interface TaskState {
  taskId: string;
  query: string;
  status: 'running' | 'completed' | 'error';
  state: any;
  updates: any[];
  createdAt: number;
  lastUpdateAt: number;
}

export class TaskManager extends EventEmitter {
  private tasks: Map<string, TaskState> = new Map();
  private taskTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly TASK_TIMEOUT = 30 * 60 * 1000; // 30分钟超时

  createTask(query: string): string {
    const taskId = this.generateTaskId();
    const task: TaskState = {
      taskId,
      query,
      status: 'running',
      state: null,
      updates: [],
      createdAt: Date.now(),
      lastUpdateAt: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.setTaskTimeout(taskId);

    console.log(`[TaskManager] Created task ${taskId}`);
    return taskId;
  }

  addUpdate(taskId: string, update: any) {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.warn(`[TaskManager] Task ${taskId} not found`);
      return;
    }

    task.updates.push({
      ...update,
      timestamp: Date.now(),
    });
    task.lastUpdateAt = Date.now();

    if (update.state) {
      task.state = update.state;
    }

    if (update.type === 'complete') {
      task.status = 'completed';
      this.clearTaskTimeout(taskId);
    } else if (update.type === 'node_error') {
      task.status = 'error';
      this.clearTaskTimeout(taskId);
    }

    // 发送更新事件
    this.emit(`task:${taskId}`, update);
  }

  getTask(taskId: string): TaskState | null {
    return this.tasks.get(taskId) || null;
  }

  getTaskUpdates(taskId: string, fromIndex: number = 0): any[] {
    const task = this.tasks.get(taskId);
    if (!task) return [];
    return task.updates.slice(fromIndex);
  }

  deleteTask(taskId: string) {
    this.clearTaskTimeout(taskId);
    this.tasks.delete(taskId);
    this.removeAllListeners(`task:${taskId}`);
    console.log(`[TaskManager] Deleted task ${taskId}`);
  }

  private setTaskTimeout(taskId: string) {
    const timeout = setTimeout(() => {
      console.log(`[TaskManager] Task ${taskId} timeout, cleaning up`);
      this.deleteTask(taskId);
    }, this.TASK_TIMEOUT);

    this.taskTimeouts.set(taskId, timeout);
  }

  private clearTaskTimeout(taskId: string) {
    const timeout = this.taskTimeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.taskTimeouts.delete(taskId);
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 清理过期任务
  cleanup() {
    const now = Date.now();
    const expiredTasks: string[] = [];

    this.tasks.forEach((task, taskId) => {
      if (now - task.lastUpdateAt > this.TASK_TIMEOUT) {
        expiredTasks.push(taskId);
      }
    });

    expiredTasks.forEach(taskId => this.deleteTask(taskId));

    if (expiredTasks.length > 0) {
      console.log(`[TaskManager] Cleaned up ${expiredTasks.length} expired tasks`);
    }
  }
}

// 单例
export const taskManager = new TaskManager();

// 定期清理过期任务
setInterval(() => {
  taskManager.cleanup();
}, 5 * 60 * 1000); // 每5分钟清理一次
