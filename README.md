# ya-sqs-monitor
[![Build Status](https://travis-ci.org/neoziro/ya-sqs-monitor.svg?branch=master)](https://travis-ci.org/neoziro/ya-sqs-monitor)
[![Dependency Status](https://david-dm.org/neoziro/ya-sqs-monitor.svg?theme=shields.io)](https://david-dm.org/neoziro/ya-sqs-monitor)
[![devDependency Status](https://david-dm.org/neoziro/ya-sqs-monitor/dev-status.svg?theme=shields.io)](https://david-dm.org/neoziro/ya-sqs-monitor#info=devDependencies)

Monitor SQS tasks and batches using redis.

## Install

```
npm install ya-sqs-monitor
```

## Usage

```js
var sqs = require('ya-sqs');
var sqsMonitor = require('ya-sqs-monitor');

// Create a basic queue.
var queue = sqs.createQueue({
  aws: {
    region: 'eu-west-1',
    accessKeyId: '...',
    secretAccessKey: '...'
  },
  name: 'sqs-monitor-test'
});

// Create a monitor.
var monitor = sqsMonitor.createClient();

// Monitor queue to to get updates.
monitor.watch(queue);

// Push tasks linked to the same batch.
queue.push({batchId: 'my-batch', data: 'my message'});
queue.push({batchId: 'my-batch', data: 'my second message'});

// Get progression of the batch.
monitor.info('my-batch').then(function (info) {
  console.log(info); // {progress: 0.4, total: 100, processed: 40}
});

// Get event when a task is completed.
monitor.on('message processed', function (message) {
  console.log(message); // message processed
});
```

## License

MIT
