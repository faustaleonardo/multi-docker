const redis = require('redis');
const { redisHost, redisPort } = require('./keys');

const redisClient = redis.createClient({
  host: redisHost,
  port: redisPort,
  retry_strategy: () => 1000 // retry every one second if the redis connection fails
});

const sub = redisClient.duplicate(); // create a duplicate of redisClient to listen to changes in redis

const fib = index => (index < 2 ? 1 : fib(index - 1) + fib(index - 2));

// listening on changes
sub.on('message', (channel, message) => {
  // message -> index
  // hash -> object. Code below is similar to values = { index: fib(index) }
  redisClient.hset('values', message, fib(parseInt(message)));
});
sub.subscribe('insert');
