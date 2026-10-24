const express = require('express');
const { randomUUID } = require('crypto');
const { GetCommand, PutCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('./db');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3001;
const TABLE = process.env.MENU_ITEMS_TABLE || 'MenuItems';
const P = '/api/menu';
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get(P + '/health', (req, res) => {
  res.json({ status: 'up', service: 'menu-service' });
});

// List menu items. Scan is suitable for this small starter project.
app.get(P, wrap(async (req, res) => {
  const result = await db.send(new ScanCommand({ TableName: TABLE }));
  res.json({ items: result.Items || [] });
}));

app.get(P + '/:id', wrap(async (req, res) => {
  const result = await db.send(new GetCommand({
    TableName: TABLE,
    Key: { id: req.params.id }
  }));
  if (!result.Item) return res.status(404).json({ error: 'menu item not found' });
  res.json(result.Item);
}));

app.post(P, wrap(async (req, res) => {
  const { name, description = '', category, price, available = true } = req.body;
  if (typeof name !== 'string' || !name.trim() ||
      typeof category !== 'string' || !category.trim() ||
      typeof price !== 'number' || !Number.isFinite(price) || price < 0 ||
      typeof available !== 'boolean') {
    return res.status(400).json({
      error: 'name and category must be non-empty strings; price must be a non-negative number; available must be a boolean'
    });
  }

  const item = {
    id: randomUUID(),
    name: name.trim(),
    description: typeof description === 'string' ? description.trim() : '',
    category: category.trim(),
    price,
    available,
    createdAt: new Date().toISOString()
  };
  await db.send(new PutCommand({ TableName: TABLE, Item: item }));
  res.status(201).json(item);
}));

app.patch(P + '/:id', wrap(async (req, res) => {
  const allowed = ['name', 'description', 'category', 'price', 'available'];
  const entries = Object.entries(req.body).filter(([key]) => allowed.includes(key));
  if (entries.length === 0) {
    return res.status(400).json({ error: 'provide at least one supported field to update' });
  }

  for (const [key, value] of entries) {
    if (['name', 'category'].includes(key) && (typeof value !== 'string' || !value.trim())) {
      return res.status(400).json({ error: key + ' must be a non-empty string' });
    }
    if (key === 'description' && typeof value !== 'string') {
      return res.status(400).json({ error: 'description must be a string' });
    }
    if (key === 'price' && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      return res.status(400).json({ error: 'price must be a non-negative number' });
    }
    if (key === 'available' && typeof value !== 'boolean') {
      return res.status(400).json({ error: 'available must be a boolean' });
    }
  }

  const names = {};
  const values = {};
  const assignments = entries.map(([key, value], index) => {
    names['#field' + index] = key;
    values[':value' + index] = typeof value === 'string' ? value.trim() : value;
    return '#field' + index + ' = :value' + index;
  });

  try {
    const result = await db.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id: req.params.id },
      UpdateExpression: 'SET ' + assignments.join(', '),
      ConditionExpression: 'attribute_exists(id)',
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW'
    }));
    res.json(result.Attributes);
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return res.status(404).json({ error: 'menu item not found' });
    }
    throw err;
  }
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

app.listen(PORT, () => console.log('menu-service listening on ' + PORT));
