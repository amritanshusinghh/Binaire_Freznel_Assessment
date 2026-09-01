const { Worker } = require('worker_threads');
const path = require('path');

// manages a fixed pool of worker threads so we don't
// accidentally spawn 100 workers and crash everything

class WorkerPool {
  constructor(maxWorkers = 4) {
    this.maxWorkers = maxWorkers;
    this.activeWorkers = new Map(); // threadId -> { worker, task }
  }

  get busyCount() {
    return this.activeWorkers.size;
  }

  isFull() {
    return this.activeWorkers.size >= this.maxWorkers;
  }

  canAcceptWork() {
    return this.activeWorkers.size < this.maxWorkers;
  }

  // try to run a task on a free worker
  // returns false if all workers are busy
  runTask(task, filePath, callbacks) {
    if (this.isFull()) {
      return false;
    }

    const workerScript = path.join(__dirname, '..', 'workers', 'csvProcessor.js');

    const worker = new Worker(workerScript, {
      workerData: { filePath: filePath }
    });

    // the worker's thread id becomes the task's process id
    task.processId = worker.threadId;
    task.updateStatus('waiting');

    this.activeWorkers.set(worker.threadId, { worker, task });

    worker.on('message', (msg) => {
      if (msg.type === 'progress') {
        task.updateProgress(msg.percent);
        // move from waiting to processing on first progress report
        if (task.status === 'waiting') {
          task.updateStatus('processing');
        }
        if (callbacks.onProgress) callbacks.onProgress(task);
      } else if (msg.type === 'done') {
        task.complete(msg.sum);
        this.activeWorkers.delete(worker.threadId);
        worker.terminate();
        if (callbacks.onComplete) callbacks.onComplete(task);
      }
    });

    worker.on('error', (err) => {
      console.error(`Worker error for task ${task.id}:`, err.message);
      task.status = 'error';
      task.error = err.message;
      this.activeWorkers.delete(worker.threadId);
      if (callbacks.onError) callbacks.onError(task, err);
    });

    worker.on('exit', (code) => {
      // if worker crashed (non-zero exit) and we haven't cleaned up yet
      if (code !== 0 && this.activeWorkers.has(worker.threadId)) {
        console.error(`Worker exited unexpectedly with code ${code} for task ${task.id}`);
        this.activeWorkers.delete(worker.threadId);
      }
    });

    return true;
  }
}

module.exports = WorkerPool;
