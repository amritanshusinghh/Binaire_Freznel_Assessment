// TaskQueue - priority based job queue
// High priority tasks always get dequeued before low priority ones
// Within same priority level, tasks are processed in FIFO order

class TaskQueue {
  constructor() {
    this.highQueue = [];  // high priority tasks
    this.lowQueue = [];   // low priority tasks
  }

  // add a task to the appropriate queue based on its priority
  enqueue(task) {
    if (task.priority === 'high') {
      this.highQueue.push(task);
    } else {
      this.lowQueue.push(task);
    }
    task.updateStatus('queued');
  }

  // get the next task to process (high priority first)
  dequeue() {
    if (this.highQueue.length > 0) {
      return this.highQueue.shift();
    }
    if (this.lowQueue.length > 0) {
      return this.lowQueue.shift();
    }
    return null;
  }

  // peek at the next task without removing it
  peek() {
    if (this.highQueue.length > 0) return this.highQueue[0];
    if (this.lowQueue.length > 0) return this.lowQueue[0];
    return null;
  }

  size() {
    return this.highQueue.length + this.lowQueue.length;
  }

  isEmpty() {
    return this.size() === 0;
  }

  // return all tasks currently in the queue (for UI display)
  getAll() {
    return [...this.highQueue, ...this.lowQueue];
  }
}

module.exports = TaskQueue;
