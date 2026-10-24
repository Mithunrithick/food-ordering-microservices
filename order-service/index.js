const express = require('express');
const { randomUUID } = require('crypto');
const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('./db');

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3003;
const ORDERS_TABLE = process.env.ORDERS_TABLE || 'Orders';
const MENU_TABLE = process.env.MENU_ITEMS_TABLE || 'MenuItems';
const P = '/api/orders';

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get(P + '/health', (req, res) => {
  res.json({ status: 'up', service: 'order-service' });
});

// Create an order. Prices are read from DynamoDB, never trusted from the client.
app.post(P, wrap(async (req, res) => {
  const { customerEmail, items } = req.body;

  if (typeof customerEmail !== 'string' || !customerEmail.trim()) {
    return res.status(400).json({ error: 'customerEmail is required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  if (items.some((item) =>
    !item || typeof item.menuItemId !== 'string' ||
    !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99
  )) {
    return res.status(400).json({
      error: 'each item must have a menuItemId string and a quantity from 1 to 99'
    });
  }

  // Resolve each menu item from the database so clients cannot choose their own prices.
  const orderItems = [];
  for (const requested of items) {
    const result = await db.send(new GetCommand({
      TableName: MENU_TABLE,
      Key: { id: requested.menuItemId }
    }));

    if (!result.Item) {
      return res.status(400).json({ error: 'menu item not found: ' + requested.menuItemId });
    }
    if (result.Item.available === false) {
      return res.status(400).json({ error: 'menu item is unavailable: ' + result.Item.name });
    }
    if (typeof result.Item.price !== 'number' || result.Item.price < 0) {
      return res.status(500).json({ error: 'menu item has an invalid price configuration' });
    }

    orderItems.push({
      menuItemId: result.Item.id,
      name: result.Item.name,
      unitPrice: result.Item.price,
      quantity: requested.quantity,
      lineTotal: Math.round(result.Item.price * requested.quantity * 100) / 100
    });
  }

  const total = Math.round(orderItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  const order = {
    id: randomUUID(),
    customerEmail: customerEmail.trim().toLowerCase(),
    items: orderItems,
    total,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  await db.send(new PutCommand({ TableName: ORDERS_TABLE, Item: order }));
  res.status(201).json(order);
}));

app.get(P + '/:id', wrap(async (req, res) => {
  const result = await db.send(new GetCommand({
    TableName: ORDERS_TABLE,
    Key: { id: req.params.id }
  }));

  if (!result.Item) return res.status(404).json({ error: 'order not found' });
  res.json(result.Item);
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

app.listen(PORT, () => console.log('order-service listening on ' + PORT));
