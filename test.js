var Monitor = require('./');
var expect = require('chai').expect;
var sqs = require('ya-sqs');
var Promise = require('promise');

describe('SQS monitor', function () {
  var monitor;

  this.timeout(4000);

  beforeEach(function () {
    monitor = new Monitor();
  });

  beforeEach(function (done) {
    monitor.redis.flushdb(done);
  });

  describe('#get', function () {
    beforeEach(function (done) {
      monitor.redis.multi()
      .set('sqsmon:total:info-batch', 100)
      .set('sqsmon:processed:info-batch', 40)
      .exec(done);
    });

    it('should return information on a batch', function () {
      return monitor.get('info-batch')
      .then(function (res) {
        expect(res).to.have.property('total', 100);
        expect(res).to.have.property('processed', 40);
        expect(res).to.have.property('progress', 0.4);
      });
    });
  });

  describe('#watch', function () {
    var queue;

    beforeEach(function () {
      queue = sqs.createQueue({
        aws: {
          region: process.env.AWS_REGION,
          accessKeyId: process.env.AWS_ACCESS_KEY,
          secretAccessKey: process.env.AWS_SECRET
        },
        name: 'ya-sqs-monitor-test-' + Date.now()
      });
    });

    it('should increment the total count', function () {
      monitor.watch(queue);

      return queue.push({batchId: 'sqs-mon-test', data: {id: 1}})
      .then(function () {
        return queue.mpush([
          {batchId: 'sqs-mon-test', data: {id: 2}},
          {batchId: 'sqs-mon-test2', data: {id: 3}}
        ]);
      })
      .then(function () {
        // Wait for event and redis.
        return new Promise(function (resolve) {
          setTimeout(resolve, 100);
        });
      })
      .then(function () {
        return monitor.get('sqs-mon-test');
      })
      .then(function (info) {
        expect(info.total).to.equal(2);
        return monitor.get('sqs-mon-test2');
      })
      .then(function (info) {
        expect(info.total).to.equal(1);
      });
    });

    it('should increment the processed count', function (done) {
      monitor.watch(queue);

      queue.push({batchId: 'sqs-mon-test-process', data: {id: 1}});

      queue.pull(function (message, next) {
        next();

        // Wait for events and redis.
        setTimeout(function () {
          monitor.get('sqs-mon-test-process')
          .then(function (info) {
            expect(info).to.have.property('total', 1);
            expect(info).to.have.property('processed', 1);
            expect(info).to.have.property('progress', 1);
          })
          .nodeify(done);
        }, 300);
      });
    });
  });
});
