function FileStatusCard({ task }) {
  // different visual config for each status
  const statusMap = {
    'uploading': { label: 'Uploading...', color: '#58a6ff', icon: '⬆️' },
    'uploaded':  { label: 'File Uploaded', color: '#58a6ff', icon: '✅' },
    'queued':    { label: 'Added to Queue', color: '#d29922', icon: '📋' },
    'waiting':   { label: 'Waiting for Processing', color: '#d29922', icon: '⏳' },
    'processing':{ label: `Processing... ${task.progress}%`, color: '#bc8cff', icon: '⚙️' },
    'completed': { label: 'Completed', color: '#3fb950', icon: '✔️' },
    'error':     { label: 'Error', color: '#f85149', icon: '❌' },
  };

  const config = statusMap[task.status] || statusMap['queued'];

  return (
    <div className={`status-card ${task.status}`}>
      <div className="card-top">
        <div className="file-info">
          <span className="card-icon">{config.icon}</span>
          <span className="card-filename">{task.originalName}</span>
        </div>
        <span className={`priority-badge ${task.priority}`}>
          {task.priority}
        </span>
      </div>

      <div className="card-status" style={{ color: config.color }}>
        {config.label}
      </div>

      {task.processId && (
        <div className="card-process-id">
          Process ID: {task.processId}
        </div>
      )}

      {(task.status === 'processing' || task.status === 'completed') && (
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{
              width: `${task.progress}%`,
              backgroundColor: config.color
            }}
          />
        </div>
      )}

      {task.status === 'completed' && task.result !== null && (
        <div className="card-result">
          Sum of all values: <strong>{task.result}</strong>
        </div>
      )}

      {task.error && (
        <div className="card-error">{task.error}</div>
      )}

      <div className="card-time">
        {new Date(task.createdAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

export default FileStatusCard;
