// task model - each uploaded file becomes one of these

let idCounter = 0;

class Task {
  constructor(fileName, originalName, priority, clientId) {
    idCounter += 1;
    this.id = 'proc-' + Date.now() + '-' + idCounter;
    this.fileName = fileName;         // name stored on disk
    this.originalName = originalName;  // original upload name
    this.priority = priority;         // 'high' or 'low'
    this.status = 'uploaded';
    this.progress = 0;
    this.result = null;
    this.clientId = clientId;         // socket id of the client who sent it
    this.processId = null;            // gets set when a worker picks this up
    this.createdAt = new Date().toISOString();
    this.error = null;
  }

  // status can only move forward, not backwards
  updateStatus(newStatus) {
    const validTransitions = {
      'uploaded': ['queued'],
      'queued': ['waiting', 'processing'],
      'waiting': ['processing'],
      'processing': ['completed', 'error'],
    };

    const allowed = validTransitions[this.status];
    if (allowed && allowed.includes(newStatus)) {
      this.status = newStatus;
      return true;
    }

    // always allow moving to error state
    if (newStatus === 'error') {
      this.status = 'error';
      return true;
    }

    return false;
  }

  updateProgress(percent) {
    this.progress = Math.min(100, Math.max(0, percent));
  }

  complete(resultValue) {
    this.status = 'completed';
    this.progress = 100;
    this.result = resultValue;
  }

  // serialize for sending to frontend
  toJSON() {
    return {
      id: this.id,
      originalName: this.originalName,
      priority: this.priority,
      status: this.status,
      progress: this.progress,
      result: this.result,
      processId: this.processId,
      createdAt: this.createdAt,
      error: this.error,
    };
  }
}

module.exports = Task;
