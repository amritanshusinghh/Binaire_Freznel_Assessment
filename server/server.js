const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const TaskQueue = require('./classes/TaskQueue');
const WorkerPool = require('./classes/WorkerPool');
const uploadRouter = require('./routes/upload');

// ---- setup ----

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));
app.use(express.json());

// make sure uploads folder exists on startup
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ---- queue + workers ----

const taskQueue = new TaskQueue();
const workerPool = new WorkerPool(4);   // max 4 concurrent workers
const allTasks = new Map();              // stores every task (including finished ones)

// ---- helpers ----

// push current task state to everyone connected
function broadcast() {
  const taskList = Array.from(allTasks.values()).map(t => t.toJSON());
  io.emit('queue:update', taskList);
}

// whenever a worker finishes, see if there's more work to do
function processNext() {
  while (workerPool.canAcceptWork() && !taskQueue.isEmpty()) {
    const task = taskQueue.dequeue();
    if (!task) break;

    const filePath = path.join(uploadsDir, task.fileName);

    const started = workerPool.runTask(task, filePath, {
      onProgress: function () {
        broadcast();
      },
      onComplete: function (finishedTask) {
        console.log(`Task ${finishedTask.id} done -> sum = ${finishedTask.result}`);
        broadcast();
        // check if more tasks are waiting
        processNext();
      },
      onError: function (failedTask, err) {
        console.error(`Task ${failedTask.id} failed:`, err.message);
        broadcast();
        processNext();
      }
    });

    if (started) {
      broadcast();
    }
  }
}

// ---- attach things to app so routes can access them ----

app.set('taskQueue', taskQueue);
app.set('workerPool', workerPool);
app.set('allTasks', allTasks);
app.set('processNext', processNext);
app.set('broadcast', broadcast);

// ---- routes ----

app.use('/api', uploadRouter);

// serve the react build when running in production
if (process.env.NODE_ENV === 'production') {
  const clientBuild = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientBuild)) {
    app.use(express.static(clientBuild));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuild, 'index.html'));
    });
  }
}

// ---- socket.io events ----

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // send current queue state to the newly connected client
  const taskList = Array.from(allTasks.values()).map(t => t.toJSON());
  socket.emit('queue:update', taskList);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ---- start the server ----

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Worker pool size: ${workerPool.maxWorkers}`);
});
