const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Task = require('../classes/Task');

const router = express.Router();

// make sure the uploads folder exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// configure multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // timestamp prefix to avoid name collisions
    const safeName = Date.now() + '_' + file.originalname;
    cb(null, safeName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      return cb(new Error('Only .csv files are allowed'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// POST /api/upload - upload a CSV file for processing
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file was uploaded' });
    }

    const priority = req.body.priority === 'high' ? 'high' : 'low';
    const clientId = req.body.clientId || 'anonymous';

    const task = new Task(
      req.file.filename,
      req.file.originalname,
      priority,
      clientId
    );

    // grab references from the app context
    const allTasks = req.app.get('allTasks');
    const queue = req.app.get('taskQueue');
    const processNext = req.app.get('processNext');
    const broadcast = req.app.get('broadcast');

    allTasks.set(task.id, task);
    queue.enqueue(task);
    broadcast();

    // kick off processing if workers are available
    processNext();

    return res.json({
      success: true,
      task: task.toJSON()
    });

  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks - fetch current state of all tasks
router.get('/tasks', (req, res) => {
  const allTasks = req.app.get('allTasks');
  const tasks = Array.from(allTasks.values()).map(t => t.toJSON());
  res.json(tasks);
});

module.exports = router;
