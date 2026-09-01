import Header from './components/Header';
import FileUploader from './components/FileUploader';
import QueueDashboard from './components/QueueDashboard';
import useSocket from './hooks/useSocket';
import './App.css';

function App() {
  const { tasks, connected, socketId } = useSocket();

  return (
    <div className="app-container">
      <Header />

      <div className="connection-bar">
        <span className={`status-dot ${connected ? 'online' : 'offline'}`}></span>
        <span>{connected ? 'Connected to server' : 'Connecting...'}</span>
      </div>

      <main className="main-layout">
        <aside className="sidebar">
          <FileUploader socketId={socketId} />
        </aside>
        <section className="content">
          <QueueDashboard tasks={tasks} />
        </section>
      </main>
    </div>
  );
}

export default App;
