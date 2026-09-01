import FileStatusCard from './FileStatusCard';

function QueueDashboard({ tasks }) {
  // sort tasks: active ones first, completed last
  const sortedTasks = [...tasks].sort((a, b) => {
    const order = {
      'processing': 0,
      'waiting': 1,
      'queued': 2,
      'uploaded': 3,
      'completed': 4,
      'error': 5
    };
    const rankA = order[a.status] !== undefined ? order[a.status] : 3;
    const rankB = order[b.status] !== undefined ? order[b.status] : 3;

    if (rankA !== rankB) return rankA - rankB;
    // within same status, newer tasks first
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // count tasks by category
  const activeCount = tasks.filter(
    t => ['queued', 'waiting', 'processing', 'uploaded'].includes(t.status)
  ).length;
  const doneCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="dashboard-panel">
      <div className="dashboard-header">
        <h2>Processing Queue</h2>
        <div className="dashboard-stats">
          {activeCount > 0 && (
            <span className="stat-badge active">{activeCount} active</span>
          )}
          {doneCount > 0 && (
            <span className="stat-badge done">{doneCount} done</span>
          )}
          {tasks.length === 0 && (
            <span className="stat-badge">{tasks.length} tasks</span>
          )}
        </div>
      </div>

      {sortedTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>No tasks in the queue yet</p>
          <p className="hint">Upload a CSV file to get started</p>
        </div>
      ) : (
        <div className="task-list">
          {sortedTasks.map(task => (
            <FileStatusCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

export default QueueDashboard;
