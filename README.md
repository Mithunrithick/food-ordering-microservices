# Food Ordering Microservices

A learning/demo project with a React + Vite web UI, Menu Service, Order Service, and AWS DynamoDB storage.

## Start everything with Docker Compose

Prerequisites: Docker Engine with the Compose plugin, plus working AWS credentials on the host with permission to read/write the project's DynamoDB tables in `ap-south-1`.

From the repository root:

```bash
docker compose up --build
```

Open **http://localhost:5173**. Compose starts:

- React web UI: `http://localhost:5173`
- Menu Service: `http://localhost:3002/api/menu`
- Order Service: `http://localhost:3004/api/orders`

The backend containers read AWS credentials from `~/.aws` via a read-only mount. The frontend does not receive AWS credentials. If you use AWS IAM Identity Center/SSO and the session has expired, refresh it on the host before starting Compose.

Useful commands:

```bash
docker compose ps                 # check service status
docker compose logs -f            # follow logs
docker compose down               # stop the stack
```

To rebuild after code changes, run `docker compose up --build` again. DynamoDB data is stored in AWS and is not removed by `docker compose down`.

## Run the frontend outside Docker

If you run the backend services separately on host ports 3002 and 3004, the frontend still defaults to those addresses:

```bash
cd web-ui
npm install
npm run dev -- --port 5173
```

The Vite proxy targets can be overridden with `MENU_SERVICE_URL` and `ORDER_SERVICE_URL` when needed.

## Demo limitations

This is not a production system. The Manage Orders panel and order-status update endpoint intentionally have no login or authorization for this local learning demo. Keep the app on your own machine or a trusted network; do not expose it publicly. No real payment is collected and no real delivery is arranged.
