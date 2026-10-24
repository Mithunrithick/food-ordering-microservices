# Crumb — Food Ordering Web UI

React + Vite frontend for the food-ordering microservices learning project.

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
- A small demo delivery fee is displayed by the UI; the backend order total contains menu item totals only.
- No real payment is collected and no real delivery is arranged.

This is a learning/demo UI, not a production ordering system.
