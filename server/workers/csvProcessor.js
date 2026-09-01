const { workerData, parentPort } = require('worker_threads');
const fs = require('fs');

// worker thread for csv processing
// reads the file, adds up all numbers, sends progress updates

function processCSV(filePath) {
  try {
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const rows = rawData.trim().split('\n');
    const totalRows = rows.length;
    let totalSum = 0;
    let lastReportedPercent = -1;

    for (let i = 0; i < totalRows; i++) {
      const cells = rows[i].split(',');

      for (let j = 0; j < cells.length; j++) {
        const val = parseFloat(cells[j].trim());
        if (!isNaN(val)) {
          totalSum += val;
        }
      }

      // report progress roughly every 10%
      const percent = Math.round(((i + 1) / totalRows) * 100);
      if (percent !== lastReportedPercent &&
          (percent % 10 === 0 || i === totalRows - 1)) {
        parentPort.postMessage({ type: 'progress', percent: percent });
        lastReportedPercent = percent;
      }

      // add a tiny delay per row for small files so the progress
      // is actually visible in the UI, otherwise it finishes instantly
      if (totalRows < 200) {
        const wait = Date.now();
        while (Date.now() - wait < 40) {
          // busy wait ~40ms per row
        }
      }
    }

    parentPort.postMessage({ type: 'done', sum: totalSum });

  } catch (err) {
    throw new Error('CSV processing failed: ' + err.message);
  }
}

processCSV(workerData.filePath);
