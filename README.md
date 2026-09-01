# Binaire_Freznel_Assessment

A multi-user queueing system that processes CSV files with priority scheduling, real-time status tracking, and worker thread-based parallel processing.

## Features

- **CSV File Upload** — Upload one or more CSV files filled with numeric values (integers and floats)
- **Priority Queue** — Choose between high and low priority; high priority files are always processed first
- **Web Worker Processing** — Server uses Node.js `worker_threads` to sum all numbers in each CSV file (all-reduce)
- **Multi-User Support** — Any number of clients can connect and upload files simultaneously
- **Real-Time Status** — Live status updates via Socket.IO:
  1. File uploading
  2. File uploaded
  3. File added to queue
  4. Waiting for processing (shows process ID)
  5. Processing... (shows completion %)
  6. Completed (shows final sum)
- **Deadlock Prevention** — Bounded worker pool and non-blocking queue design (see below)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend  | React (Vite) |
| Backend   | Node.js, Express |
| Real-time | Socket.IO |
| Processing | `worker_threads` |
| Styling   | Vanilla CSS |

## Architecture

```
Client (React)                     Server (Node.js/Express)
┌──────────────┐                  ┌──────────────────────┐
│ FileUploader │ ── HTTP POST ──> │ Upload Route (multer)│
│              │                  │         │             │
│ QueueDash    │ <── Socket.IO ── │   TaskQueue (OOP)    │
│ board        │    (real-time)   │   ┌─────┴──────┐     │
│              │                  │   │HighQ │LowQ │     │
└──────────────┘                  │   └─────┬──────┘     │
                                  │         │             │
                                  │   WorkerPool (4 max) │
                                  │   ┌──┬──┬──┬──┐      │
                                  │   │W1│W2│W3│W4│      │
                                  │   └──┴──┴──┴──┘      │
                                  │  (worker_threads)    │
                                  └──────────────────────┘
```

**How it works:**

1. Client uploads a CSV file with a priority (high/low) via HTTP POST
2. Server stores the file and creates a Task object, then adds it to the TaskQueue
3. TaskQueue maintains two separate FIFO queues — one for high and one for low priority
4. When a worker is available, the next task is dequeued (high priority first)
5. A `worker_thread` is spawned to process the CSV — it reads the file, sums all numeric values, and reports progress
6. Status updates are broadcast to all connected clients via Socket.IO
7. When processing completes, the result (total sum) is sent back

## Deadlock Analysis

### What types of deadlocks could occur?

In a multi-user file processing system, several types of deadlocks are theoretically possible:

1. **Resource Exhaustion Deadlock**: If the system spawned unlimited worker threads, it could exhaust system memory/CPU, causing all threads to stall. No thread would complete because the OS can't allocate enough resources to any of them.

2. **Circular Wait Deadlock**: If workers needed to communicate with each other or share intermediate results, a situation could arise where Worker A waits for Worker B's output while Worker B waits for Worker A. Classic dining philosophers scenario.

3. **File System Lock Deadlock**: If multiple workers try to read/write the same file simultaneously with exclusive locks, they could block each other indefinitely.

4. **Queue Lock Deadlock**: If the queue uses mutex locks for thread safety and a lock is acquired but never released (due to an error or crash), all other operations waiting for that lock would be stuck forever.

5. **Priority Inversion**: A low-priority task holding a shared resource needed by a high-priority task. The high-priority task can't proceed, and the low-priority task can't finish because medium-priority tasks keep preempting it.

### How do deadlocks affect user productivity?

- **System Freeze**: Users can't upload new files or get results for existing ones. The entire system becomes unresponsive.
- **Resource Waste**: CPU and memory are consumed by stalled workers that aren't making progress. Users experience slow response times across the board.
- **Starvation**: Some users' files may never get processed if the deadlock affects only certain queue positions. Users have no visibility into why their files are stuck.
- **Cascading Failures**: A deadlock in one part of the system can cause timeouts and failures in other parts, leading to data loss or corrupted results.

### How this system prevents deadlocks

1. **Bounded Worker Pool**: Fixed at 4 workers max. Tasks that can't be processed immediately wait in the queue — they don't hold any resources while waiting. This prevents resource exhaustion.

2. **No Shared Resources Between Workers**: Each worker gets its own copy of the file path and processes independently. Workers never communicate with each other or share data. This eliminates circular wait.

3. **Single-Threaded Queue Access**: Node.js runs the main event loop on a single thread. Queue operations (enqueue/dequeue) are synchronous and atomic within the event loop. No mutex locks are needed, so there's no risk of a lock being held forever.

4. **Independent File Access**: Each uploaded file gets a unique timestamped filename. Workers only read their assigned file. No shared file access, no file system locks.

5. **Worker Lifecycle Management**: Workers have error and exit handlers. If a worker crashes, it's cleaned up and the slot is freed for the next task. No resource leaks.

6. **Fair Scheduling Within Priority**: Within the same priority level, tasks are processed in FIFO (first-in-first-out) order. This prevents starvation of individual tasks within a priority group.

## Project Structure

```
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx       # App header
│   │   │   ├── FileUploader.jsx # File upload with drag-drop
│   │   │   ├── QueueDashboard.jsx # Queue status display
│   │   │   └── FileStatusCard.jsx # Individual file status
│   │   ├── hooks/
│   │   │   └── useSocket.js     # Socket.IO connection hook
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── classes/
│   │   ├── Task.js              # Task model (OOP)
│   │   ├── TaskQueue.js         # Priority queue (OOP)
│   │   └── WorkerPool.js        # Thread pool manager (OOP)
│   ├── workers/
│   │   └── csvProcessor.js      # Worker thread - CSV all-reduce
│   ├── routes/
│   │   └── upload.js            # File upload API endpoint
│   ├── server.js                # Express + Socket.IO server
│   └── package.json
│
├── .gitignore
├── package.json                 # Root scripts
└── README.md
```

## Setup & Running Locally

### Prerequisites

- Node.js 16+ installed
- npm

### Installation

```bash
# clone the repo
git clone https://github.com/YOUR_USERNAME/Binaire_Freznel_Assessment.git
cd Binaire_Freznel_Assessment

# install server dependencies
cd server
npm install

# install client dependencies
cd ../client
npm install
```

### Running in Development

You need two terminal windows:

**Terminal 1 — Start the backend server:**
```bash
cd server
npm run dev
```
Server runs on `http://localhost:5000`

**Terminal 2 — Start the React dev server:**
```bash
cd client
npm run dev
```
Client runs on `http://localhost:3000`

Open `http://localhost:3000` in your browser. You can open multiple tabs to simulate multiple users.

### Testing with Sample CSV

Create a test CSV file like this:

```csv
1,2,3,4,5
6.5,7.2,8,9,10
11,12,13.3,14,15
```

Expected sum: `1+2+3+4+5+6.5+7.2+8+9+10+11+12+13.3+14+15 = 121`

Upload it through the UI and verify the result.

## OOP Design

The system uses three main classes:

- **Task**: Represents a single file processing job. Tracks status, progress, result, and process ID. Has methods for controlled status transitions.
- **TaskQueue**: Priority-based queue with separate internal arrays for high and low priority. Implements enqueue, dequeue, peek, and size operations.
- **WorkerPool**: Manages a bounded pool of `worker_threads`. Spawns workers, tracks active threads, handles lifecycle events (message, error, exit).

## Deployment

### Option 1: Full-Stack on Render

Since the app uses WebSockets and `worker_threads`, it needs a persistent server. Deploy on Render (free tier):

1. Push to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo
4. Settings:
   - **Build command**: `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start command**: `cd server && node server.js`
   - **Environment**: Add `NODE_ENV=production`

### Option 2: Split Deployment

- **Frontend on Vercel**: Deploy `client/` folder, set `VITE_API_URL` env var to your backend URL
- **Backend on Render**: Deploy the `server/` folder as a web service

## License

ISC
