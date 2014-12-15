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
var Monitor = require('ya-sqs-monitor');

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
var monitor = new Monitor(options);

// Monitor queue to to get updates.
monitor.watch(queue);

// Push tasks linked to the same batch.
queue.push({batchId: 'my-batch', data: 'my message'});
queue.push({batchId: 'my-batch', data: 'my second message'});

// Get progression of the batch.
monitor.info('my-batch').then(function (info) {
  console.log(info); // {progress: 0.4, total: 100, processed: 40}
});
```

### new Monitor(options)

Create a new monitor with some options.

#### redis

Type: `Object` or `Function`

If you specify an **object**, the properties will be used to call `redis.createClient` method.

```js
new Monitor({
  redis: {
    port: 6379,
    host: '127.0.0.1',
    connect_timeout: 200
  }
})
```

If you specify a **function**, it will be called to create redis clients.

```js
var redis = require('redis');

new Monitor({
  redis: createClient
})

function createClient() {
  var client = redis.createClient();
  client.select(1); // Choose a custom database.
  return client;
}
```

#### prefix

Custom prefix for redis key. Defaults to "sqsmon".

```js
new Monitor({prefix: 'custom-prefix'})
```

### monitor.watch(queue)

Watch a queue in order to update batch in redis. You must watch a queue either you push into the queue or if you pull the queue.

```js
monitor.watch(queue);
```

### monitor.get(batchId, [cb])

Get the state of the batch (total, processed and progress). This method supports promises and callback.

```js
monitor.get('my-batch').then(function (info) {
  console.log('info'); // {total: 10, processed: 4, progress: 0.4}
});
```

## License

MIT
