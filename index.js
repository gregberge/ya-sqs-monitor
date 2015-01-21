var redis = require('redis');
var _ = require('lodash');
var util = require('util');
var Promise = require('promise');
var pipeEvent = require('pipe-event');
var EventEmitter = require('events').EventEmitter;

/**
 * Expose module.
 */

module.exports = Monitor;

/**
 * Create a new monitor.
 *
 * @param {object} options Options
 * @param {object|function} redis Redis options or createClient function
 * @param {string} [prefix='sqsmon'] Prefix
 */

function Monitor(options) {
  options = options || {};

  this.redis = this._createRedisClient(options.redis || {});
  this.prefix = options.prefix || 'sqsmon';
  this.watchedQueues = [];

  pipeEvent('error', this.redis, this);
}

util.inherits(Monitor, EventEmitter);

/**
 * Watch a queue.
 *
 * @param {Queue} queue Queue
 */

Monitor.prototype.watch = function (queue) {
  var monitor = this;

  if (_.contains(this.watchedQueues, queue)) return;

  this.watchedQueues.push(queue);

  queue.on('message pushed', monitor._processMessage.bind(monitor, 'total'));
  queue.on('message processed', function (message) {
    queue.formatter.parse(message).then(function (message) {
      monitor._processMessage('processed', message);
    });
  });
};

/**
 * Get informations on a batch.
 *
 * @param {string} batchId Batch id
 * @param {function} [cb] Optional callback
 * @returns {Promise}
 */

Monitor.prototype.get = function (batchId, cb) {
  var monitor = this;
  var totalKey = this._formatKey(batchId, 'total');
  var processedKey = this._formatKey(batchId, 'processed');

  return new Promise(function (resolve, reject) {
    monitor.redis.multi()
    .get(totalKey)
    .get(processedKey)
    .exec(function (err, replies) {
      if (err) return reject(err);
      var total = +replies[0];
      var processed = +replies[1];
      var progress = 0;

      if (total > 0)
        progress = Math.round(processed / total * 100) / 100;

      resolve({
        total: total,
        processed: processed,
        progress: progress
      });
    });
  }).nodeify(cb);
};

/**
 * Process message.
 *
 * @param {object} message Message
 */

Monitor.prototype._processMessage = function (type, message) {
  // Ignore message that are not containing a batch id.
  if (!message || !message.batchId) return;

  var monitor = this;

  var key = this._formatKey(message.batchId, type);
  this.redis.incr(key, function (err) {
    if (err) monitor.emit('error', err);
  });
};

/**
 * Format redis key.
 *
 * @param {string} batchId Batch id.
 * @param {string} type Type (total or processed).
 * @returns {string}
 */

Monitor.prototype._formatKey = function (batchId, type) {
  return util.format('%s:%s:%s', this.prefix, type, batchId);
};

/**
 * Create the redis client.
 *
 * @param {object} options Options
 * @returns {RedisClient}
 */

Monitor.prototype._createRedisClient = function _createRedisClient(options) {
  if (_.isFunction(options)) return options();

  if (options.port && options.host)
    return redis.createClient(
      options.port,
      options.host,
      _.omit(options, 'port', 'host')
    );

  return redis.createClient(options);
};
