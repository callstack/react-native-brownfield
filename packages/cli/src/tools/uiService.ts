// const {terminal} = require('terminal-kit')
// const {workerData, parentPort} = require('worker_threads');

import {terminal} from 'terminal-kit';
import {workerData, parentPort} from 'worker_threads';

const {task, tasksCount} = workerData;

const progressBar = terminal.progressBar({
  width: 80,
  title: 'tasks:',
  eta: true,
  percent: true,
  items: tasksCount,
});

var countDown = workerData.tasksCount;

function start() {
  if (!tasksCount) {
    return;
  }

  progressBar.startItem(task);

  // Finish the task in...
  setTimeout(done.bind(null, task), 500 + Math.random() * 1200);

  // Start another parallel task in...
  setTimeout(start, 400 + Math.random() * 400);
}

function done(doneTask) {
  progressBar.itemDone(doneTask);
  countDown--;

  // Cleanup and exit
  if (!countDown) {
    setTimeout(function() {
      terminal('\n');
      process.exit();
    }, 200);
  }
}

start();

// parentPort.postMessage({hello: workerData});
