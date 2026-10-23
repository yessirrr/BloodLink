# BloodLink

**Blood Donation and Emergency Donor Management System**

BloodLink is a full-stack academic DBMS project for managing blood donors, recipients, hospitals, blood banks, inventory, blood requests, donation records, and operational reports.

> **Project scope:** BloodLink is an academic management prototype, not a clinical decision system. Donor eligibility, blood compatibility, and transfusion decisions must be verified by qualified healthcare professionals.

## Features

- Dashboard with blood inventory and request summaries
- Donor and recipient record management
- Hospital and blood bank management
- Blood inventory tracking by blood group
- Blood request processing and urgency tracking
- Donation history management
- Reports for operational monitoring
- MySQL relational database with foreign keys, unique constraints, indexes, and validation checks
- REST API built with Express
- Responsive React interface

## Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend | Node.js, Express |
| Database | MySQL 8 |
| Database driver | mysql2 |
| Package manager | pnpm |

## Architecture

The application uses a React frontend to communicate with an Express REST API. The API accesses MySQL through a connection pool.

```text
Browser
   |
   v
React + TypeScript + Vite
   |
   | HTTP / REST API
   v
Node.js + Express
   |
   v
MySQL 8
```

Database credentials belong in the server-side `.env` file. They must never be exposed through frontend variables or committed to the repository.

## Project structure

```text
BloodLink/
├── database/
│   ├── schema.sql
│   └── seed.sql
├── public/
├── server/
│   ├── db.js
│   └── index.js
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── pnpm-lock.yaml
└── vite.config.ts
```

## Prerequisites

- Node.js compatible with the versions required by the project dependencies
- pnpm
- MySQL 8
- macOS, Linux, or another environment capable of running Node.js and MySQL

On macOS with Homebrew:

```bash
brew install node pnpm mysql
brew services start mysql
```

Verify the installations:

```bash
node --version
pnpm --version
mysql --version
```

## Local installation

### 1. Clone the repository

```bash
git clone https://github.com/yessirrr/BloodLink.git
cd BloodLink
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Create the database

For a local MySQL root account without a password:

```bash
mysql -u root < database/schema.sql
```

If the account requires a password:

```bash
mysql -u root -p < database/schema.sql
```

The schema creates the `bloodlink_db` database and its application tables.

### 4. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env
```

Edit `.env` and enter the credentials for your local MySQL installation.

The example configuration uses these settings:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bloodlink_db
API_PORT=3001
FRONTEND_URL=http://localhost:8443
VITE_API_URL=http://localhost:3001/api
```

These values are for local development. Adjust them to match your environment. Never commit `.env` or put database credentials in frontend code.

### 5. Start the application

Start both the frontend and API:

```bash
pnpm dev:all
```

Open the application at:

- **Frontend:** http://localhost:8443
- **API health check:** http://localhost:3001/api/health

Alternatively, use two terminals:

```bash
# Terminal 1: frontend
pnpm dev
```

```bash
# Terminal 2: backend
pnpm dev:api
```

If a port is already occupied, stop the conflicting process or configure an available port consistently across the frontend, API, and CORS settings.

## Database and demo data

The database includes tables for:

- `DONORS`
- `RECIPIENTS`
- `HOSPITALS`
- `BLOOD_BANKS`
- `BLOOD_INVENTORY`
- `BLOOD_REQUESTS`
- `DONATIONS`
- `STAFF_USERS`

To load the optional demonstration dataset after creating the schema:

```bash
mysql -u root -p < database/seed.sql
```

Use the appropriate MySQL username and authentication options for your local installation.

The seed file contains fictional sample records and a demonstration staff account. Its credentials are for local demonstration only and must not be reused in a real deployment. Do not import the seed into a database containing records you want to preserve.

## Available scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite development server |
| `pnpm dev:api` | Start the Express API with Nodemon |
| `pnpm dev:all` | Start the frontend and API together |
| `pnpm start` | Start the API |
| `pnpm build` | Build the frontend for production |
| `pnpm preview` | Preview the production frontend build |
| `pnpm format` | Run the configured source formatter |

## Data integrity and security

The project schema and backend include mechanisms such as:

- Parameterized SQL queries
- Foreign-key relationships between related records
- Unique constraints for selected fields
- Checks for non-negative inventory and positive request quantities
- Transaction-based handling of selected inventory and donation operations
- Password-hash storage for staff records

These mechanisms support the academic demonstration; they do not by themselves establish production readiness. Authentication, authorization, deployment security, monitoring, testing, and operational safeguards must be reviewed before real-world use.

## Production build

Build the frontend:

```bash
pnpm build
```

The generated frontend files are written to `dist/`.

A successful frontend build does not deploy the Express API or MySQL database. A hosted deployment requires a separately configured API, a reachable database, and the correct production environment variables.

## Troubleshooting

### Database connection fails

1. Check that MySQL is running.
2. Verify the credentials in `.env`.
3. Confirm that `bloodlink_db` exists and the schema has been imported.
4. Check the backend terminal for the underlying error.

### Port already in use

Check which process is using the port and stop it if appropriate. Ensure the frontend port, API port, `VITE_API_URL`, and `FRONTEND_URL` agree with the local configuration.

### Reset the demonstration database

**Warning:** This permanently deletes the existing `bloodlink_db` database and its data.

Only do this if you are certain the database contains no records you need to keep.

```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS bloodlink_db;"
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

## Disclaimer

BloodLink is intended for educational demonstration and database-management practice. It is not a substitute for professional medical judgment or a validated clinical blood-management system.
