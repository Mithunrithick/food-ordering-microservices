const express = require('express');
const { randomUUID } = require('crypto');
const { GetCommand, PutCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const db = require('./db');

const app = express();
app.use(express.json({ limit: '100kb' }));

const PORT = Number(process.env.PORT) || 3003;
const ORDERS_TABLE = process.env.ORDERS_TABLE || 'Orders';
const MENU_TABLE = process.env.MENU_ITEMS_TABLE || 'MenuItems';
const P = '/api/orders';
const ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'DELIVERED', 'CANCELLED'];
const STATUS_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: []
};

const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get(P + '/health', (req, res) => {
  res.json({ status: 'up', service: 'order-service' });
});

// Create an order. Prices are always read from DynamoDB, not trusted from the browser.
app.post(P, wrap(async (req, res) => {
  const { customerEmail, items } = req.body || {};

  if (typeof customerEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
    return res.status(400).json({ error: 'A valid customerEmail is required' });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ error: 'items must be a non-empty array with at most 50 entries' });
  }
  if (items.some((item) =>
    !item || typeof item.menuItemId !== 'string' ||
    !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99
  )) {
    return res.status(400).json({
      error: 'each item must have a menuItemId string and a quantity from 1 to 99'
    });
  }

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
    if (typeof result.Item.price !== 'number' || !Number.isFinite(result.Item.price) || result.Item.price < 0) {
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    statusHistory: [{ status: 'PENDING', at: new Date().toISOString() }]
  };

  await db.send(new PutCommand({ TableName: ORDERS_TABLE, Item: order }));
  res.status(201).json(order);
}));

// Demo-only order list for the lightweight management panel.
app.get(P, wrap(async (req, res) => {
  const result = await db.send(new ScanCommand({
    TableName: ORDERS_TABLE,
    Limit: 100
  }));
  const orders = (result.Items || []).sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  );
  res.json({ items: orders });
}));

// Retrieve an order by ID for the demo tracking page.
app.get(P + '/:id', wrap(async (req, res) => {
  const result = await db.send(new GetCommand({
    TableName: ORDERS_TABLE,
    Key: { id: req.params.id }
  }));

  if (!result.Item) return res.status(404).json({ error: 'order not found' });
  res.json(result.Item);
}));

// Demo-only status update endpoint. No login is implemented for this learning project.
app.patch(P + '/:id/status', wrap(async (req, res) => {
  const status = req.body && req.body.status;
  if (typeof status !== 'string' || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'status must be one of: ' + ALLOWED_STATUSES.join(', ') });
  }

  const existing = await db.send(new GetCommand({
    TableName: ORDERS_TABLE,
    Key: { id: req.params.id }
  }));
  if (!existing.Item) return res.status(404).json({ error: 'order not found' });

  const currentStatus = existing.Item.status || 'PENDING';
  if (status === currentStatus) return res.json(existing.Item);
  if (!(STATUS_TRANSITIONS[currentStatus] || []).includes(status)) {
    return res.status(409).json({
      error: 'cannot change order from ' + currentStatus + ' to ' + status,
      allowedNextStatuses: STATUS_TRANSITIONS[currentStatus] || []
    });
  }

  const now = new Date().toISOString();
  const history = [...(existing.Item.statusHistory || [{ status: currentStatus, at: existing.Item.createdAt || now }]),
    { status, at: now }];

  const updated = await db.send(new UpdateCommand({
    TableName: ORDERS_TABLE,
    Key: { id: req.params.id },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, statusHistory = :history',
    ConditionExpression: '#status = :expectedStatus',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': now,
      ':history': history,
      ':expectedStatus': currentStatus
    },
    ReturnValues: 'ALL_NEW'
  }));

  res.json(updated.Attributes);
}));

app.use((err, req, res, next) => {
  if (err.statusCode === 409) return res.status(409).json({ error: err.message, order: err.latestOrder });
  if (err.name === 'ConditionalCheckFailedException') {
    return res.status(409).json({ error: 'order status changed; reload and try again' });
  }
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

app.listen(PORT, () => console.log('order-service listening on ' + PORT));
