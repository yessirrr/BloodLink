# BloodLink

**Blood Donation and Emergency Donor Management System** — a local, full-stack college DBMS project built with React, TypeScript, Express, and MySQL 8.

BloodLink manages donors, recipients, hospitals, blood banks, inventory, requests, donations, and SQL-generated operational reports. It is an academic management prototype, not a clinical decision system. Blood compatibility and donor eligibility must always be verified by qualified professionals.

## Stack

- React 19, Vite, TypeScript, Tailwind CSS
- Node.js and Express
- MySQL 8 with `mysql2`
- Local REST API; no hosted services or paid APIs

## Project structure

```text
database/
  schema.sql        # Creates bloodlink_db and all 8 tables
  seed.sql          # Optional labelled demonstration data
server/
  db.js             # MySQL connection pool and transaction helper
  index.js          # REST API, validation, reports, transactions
src/
  App.tsx           # Responsive application and all pages
  index.css         # Design tokens and responsive styles
.env.example        # Safe configuration template
```

## macOS setup

### 1. Install prerequisites

Install [Homebrew](https://brew.sh/) if it is not already installed, then install Node.js, pnpm, and MySQL 8:

```bash
brew install node pnpm mysql
brew services start mysql
```

Confirm they are available:

```bash
node --version
pnpm --version
mysql --version
```

### 2. Install application dependencies

From this project directory:

```bash
pnpm install
```

### 3. Create the local database

For a default Homebrew installation with no root password:

```bash
mysql -u root < database/schema.sql
```

If your MySQL root account has a password:

```bash
mysql -u root -p < database/schema.sql
```

Optionally load clearly labelled demonstration data:

```bash
mysql -u root -p < database/seed.sql
```

The schema creates the `bloodlink_db` database and exactly eight application tables:

`DONORS`, `RECIPIENTS`, `HOSPITALS`, `BLOOD_BANKS`, `BLOOD_INVENTORY`, `BLOOD_REQUESTS`, `DONATIONS`, and `STAFF_USERS`.

For a least-privilege local account instead of using root:

```sql
CREATE USER 'bloodlink_user'@'localhost' IDENTIFIED BY 'choose_a_local_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON bloodlink_db.* TO 'bloodlink_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Configure local credentials

Copy the example file:

```bash
cp .env.example .env
```

Edit `.env` and set `DB_USER` and `DB_PASSWORD` to your local MySQL credentials. The frontend receives only `VITE_API_URL`; database credentials remain in the server process and are never bundled into browser code.

### 5. Start BloodLink

Run the frontend and backend together:

```bash
pnpm dev:all
```

Then open:

- Frontend: [http://localhost:5173](http://localhost:5173)
- API health check: [http://localhost:3001/api/health](http://localhost:3001/api/health)

Alternatively, use two terminals:

```bash
# Terminal 1
pnpm dev

# Terminal 2
pnpm dev:api
```

## Available scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the Vite frontend |
| `pnpm dev:api` | Start the Express API with auto-reload |
| `pnpm dev:all` | Start frontend and API together |
| `pnpm start` | Start the API without auto-reload |
| `pnpm build` | Create a production frontend build |
| `pnpm format` | Format source files |

## Data integrity and security

- All SQL values use `mysql2` parameter placeholders.
- Donation creation and deletion update donation history and inventory in one transaction.
- Fulfilling a request atomically checks and subtracts stock; reversing fulfilment restores it.
- Inventory cannot become negative.
- A unique constraint prevents duplicate bank/blood-group inventory rows.
- Foreign keys protect linked records.
- Staff records store `password_hash`, never a plaintext password.
- Duplicate and foreign-key errors are returned as useful, non-sensitive API messages.

The optional seed contains fictional demonstration records only. Do not use the seed password or data in a real deployment.

## Troubleshooting

**`Database operation failed` or API health check fails**

1. Run `brew services list` and ensure MySQL is started.
2. Verify `.env` credentials with `mysql -u YOUR_USER -p bloodlink_db`.
3. Confirm the schema was imported.

**Port already in use**

Change `API_PORT` in `.env` and update `VITE_API_URL` to match. Vite can be given another frontend port with `pnpm dev -- --port 5174`; also update `FRONTEND_URL`.

**Reset demonstration data**

For a clean academic demo, drop and recreate the database:

```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS bloodlink_db;"
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```
