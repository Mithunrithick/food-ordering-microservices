# Crumb — Food Ordering Web UI

React + Vite frontend for the food-ordering microservices learning project.

## Seed demo menu items

Start the Menu Service on host port **3002**, then run from the repository root:

```bash
node scripts/seed-demo-menu.js
```

The script creates sample dishes in the `MenuItems` DynamoDB table. It skips dishes that already exist, so it can be run again without duplicating the sample menu. It also renames the temporary burger used during API checks. The unavailable temporary pizza record is left untouched.

## Run locally

Start the Menu Service on host port **3002** and the Order Service on host port **3004**. Both services should have access to the AWS credentials needed for DynamoDB.

Then run:

```bash
cd web-ui
npm install
npm run dev -- --port 5173
```

Open **http://localhost:5173**.

Vite proxies `/api/menu` to `http://127.0.0.1:3002` and `/api/orders` to `http://127.0.0.1:3004`. If your service ports change, update `vite.config.js`.

## Demo behavior

- Menu items are loaded from the `MenuItems` DynamoDB table through Menu Service.
- The cart and quantities are kept in the browser while you use the page.
- Checkout asks for an email only; no account or login is required.
- Orders are created by Order Service and stored in the `Orders` table.
- The UI shows menu-item totals; the backend calculates and saves the order total from DynamoDB prices.
- No real payment is collected and no real delivery is arranged.

This is a learning/demo UI, not a production ordering system.
