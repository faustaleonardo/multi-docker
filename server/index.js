// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const redis = require('redis');
const {
  redisHost,
  redisPort,
  pgUser,
  pgHost,
  pgDatabase,
  pgPassword,
  pgPort
} = require('./keys');

const app = express();
app.use(cors()); // -> to handle accessing resources from different domain name
app.use(bodyParser.json()); // -> convert post data from front-end into JSON

// PostgresSQL Client Setup
const { Pool } = require('pg');
// establish a connection
const pgClient = new Pool({
  user: pgUser,
  host: pgHost,
  database: pgDatabase,
  password: pgPassword,
  port: pgPort
});

pgClient.on('error', () => {
  console.log('Lost PG connection');
});

pgClient
  .query('CREATE TABLE IF NOT EXISTS values (number INT)')
  .catch(err => console.log(err));

// Redis Client Setup
const redisClient = redis.createClient({
  host: redisHost,
  port: redisPort,
  retry_strategy: () => 1000
});

// we need to duplicate redisClient in order to publish changes in redis or listen to changes in redis
const redisPublisher = redisClient.duplicate();

// Routing
app.get('/', (req, res) => {
  res.send('Hello World');
});

// access to the DB
app.get('/values/all', async (req, res) => {
  const values = await pgClient.query('SELECT * FROM values');
  res.send(values.row); // .row -> make sure to return record only
});

// access to the redis
app.get('/values/current', async (req, res) => {
  // using callback as redis has not supported promise for node.js yet
  redisClient.hgetall('values', (err, values) => {
    res.send(values);
  });
});

app.post('/values', async (req, res) => {
  const index = req.body.index;

  if (parseInt(index) > 40)
    return res.status(422).send('Index is too high! Put below 41');

  redisClient.hset('values', index, 'Nothing yet!');
  redisPublisher.publish('insert', index);
  pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

  res.send({ working: true });
});

app.listen(5000, () => {
  console.log('App is listening on port:5000');
});
