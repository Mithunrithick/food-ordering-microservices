const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const health = (prefix) => app.get(prefix + '/health', (req, res) => res.json({ status: 'up' }));

const P = '/api/users';
const SECRET = process.env.JWT_SECRET || 'dev-secret';
health(P);

app.post(P + '/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  const found = await db.send(new GetCommand({ TableName: 'Users', Key: { email } }));
  if (found.Item) return res.status(409).json({ error: 'user already exists' });

  await db.send(new PutCommand({
    TableName: 'Users',
    Item: { email, name, passwordHash: await bcrypt.hash(password, 8) }
  }));

  res.status(201).json({ message: 'registered' });
}));

app.post(P + '/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const { Item } = await db.send(new GetCommand({ TableName: 'Users', Key: { email } }));

  if (!Item || !(await bcrypt.compare(password, Item.passwordHash))) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  res.json({
    name: Item.name,
    token: jwt.sign({ email, name: Item.name }, SECRET, { expiresIn: '2h' })
  });
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

app.listen(3000, () => console.log('listening on 3000'));
