import express from "express"
import cors from "cors"
import "dotenv/config"
import { pool, transaction } from "./db.js"

const app = express()
const port = Number(process.env.API_PORT || 3001)
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173" }))
app.use(express.json({ limit: "200kb" }))

const resources = {
  donors: {
    table: "DONORS",
    id: "donor_id",
    fields: [
      "first_name",
      "last_name",
      "date_of_birth",
      "gender",
      "blood_group",
      "phone",
      "email",
      "address",
      "city",
      "last_donation_date",
      "is_active",
    ],
    required: [
      "first_name",
      "last_name",
      "date_of_birth",
      "gender",
      "blood_group",
      "phone",
      "address",
      "city",
    ],
    search: ["first_name", "last_name", "email", "phone", "city"],
    filters: ["blood_group", "is_active"],
    select: "SELECT * FROM DONORS",
  },
  recipients: {
    table: "RECIPIENTS",
    id: "recipient_id",
    fields: [
      "hospital_id",
      "first_name",
      "last_name",
      "date_of_birth",
      "gender",
      "blood_group",
      "phone",
      "medical_reference",
    ],
    required: [
      "hospital_id",
      "first_name",
      "last_name",
      "date_of_birth",
      "gender",
      "blood_group",
      "medical_reference",
    ],
    search: [
      "r.first_name",
      "r.last_name",
      "r.phone",
      "r.medical_reference",
      "h.name",
    ],
    filters: ["r.blood_group", "r.hospital_id"],
    select:
      "SELECT r.*, h.name AS hospital_name FROM RECIPIENTS r JOIN HOSPITALS h ON h.hospital_id=r.hospital_id",
    prefix: "r",
  },
  hospitals: {
    table: "HOSPITALS",
    id: "hospital_id",
    fields: ["name", "address", "city", "phone", "email"],
    required: ["name", "address", "city", "phone"],
    search: ["name", "address", "city", "phone"],
    filters: [],
    select: "SELECT * FROM HOSPITALS",
  },
  "blood-banks": {
    table: "BLOOD_BANKS",
    id: "blood_bank_id",
    fields: ["name", "address", "city", "phone", "email", "license_number"],
    required: ["name", "address", "city", "phone", "license_number"],
    search: ["name", "address", "city", "phone", "license_number"],
    filters: [],
    select: "SELECT * FROM BLOOD_BANKS",
  },
  inventory: {
    table: "BLOOD_INVENTORY",
    id: "inventory_id",
    fields: [
      "blood_bank_id",
      "blood_group",
      "units_available",
      "minimum_threshold",
    ],
    required: [
      "blood_bank_id",
      "blood_group",
      "units_available",
      "minimum_threshold",
    ],
    search: ["b.name", "i.blood_group"],
    filters: ["i.blood_group", "i.blood_bank_id"],
    select:
      "SELECT i.*, b.name AS blood_bank_name FROM BLOOD_INVENTORY i JOIN BLOOD_BANKS b ON b.blood_bank_id=i.blood_bank_id",
    prefix: "i",
  },
  requests: {
    table: "BLOOD_REQUESTS",
    id: "request_id",
    fields: [
      "recipient_id",
      "hospital_id",
      "blood_bank_id",
      "blood_group",
      "units_requested",
      "urgency",
      "status",
      "required_by",
      "notes",
    ],
    required: [
      "recipient_id",
      "hospital_id",
      "blood_bank_id",
      "blood_group",
      "units_requested",
      "urgency",
      "status",
      "required_by",
    ],
    search: ["r.first_name", "r.last_name", "h.name", "q.blood_group"],
    filters: ["q.status", "q.urgency", "q.blood_group"],
    select: `SELECT q.*, CONCAT(r.first_name,' ',r.last_name) AS recipient_name, h.name AS hospital_name, b.name AS blood_bank_name
      FROM BLOOD_REQUESTS q JOIN RECIPIENTS r ON r.recipient_id=q.recipient_id
      JOIN HOSPITALS h ON h.hospital_id=q.hospital_id JOIN BLOOD_BANKS b ON b.blood_bank_id=q.blood_bank_id`,
    prefix: "q",
  },
}

function cleanBody(config, body, partial = false) {
  const data = Object.fromEntries(
    config.fields
      .filter((key) => body[key] !== undefined)
      .map((key) => [key, body[key] === "" ? null : body[key]]),
  )
  if (!partial) {
    const missing = config.required.filter(
      (key) => data[key] === undefined || data[key] === null,
    )
    if (missing.length)
      throw Object.assign(new Error(`Required fields: ${missing.join(", ")}`), {
        status: 400,
      })
  }
  if (data.blood_group && !bloodGroups.includes(data.blood_group))
    throw Object.assign(new Error("Invalid blood group"), { status: 400 })
  for (const key of ["units_available", "minimum_threshold"]) {
    if (data[key] !== undefined && Number(data[key]) < 0)
      throw Object.assign(
        new Error(`${key.replaceAll("_", " ")} cannot be negative`),
        { status: 400 },
      )
  }
  if (data.units_requested !== undefined && Number(data.units_requested) < 1)
    throw Object.assign(new Error("Units requested must be at least 1"), {
      status: 400,
    })
  return data
}

app.get("/api/health", async (_req, res, next) => {
  try {
    await pool.query("SELECT 1")
    res.json({ status: "ok", database: "connected" })
  } catch (error) {
    next(error)
  }
})

app.get("/api/dashboard", async (_req, res, next) => {
  try {
    const [[stats], [stock], [recent], [urgent]] = await Promise.all([
      pool.query(`SELECT
        (SELECT COUNT(*) FROM DONORS WHERE is_active=1) donor_count,
        (SELECT COALESCE(SUM(units_available),0) FROM BLOOD_INVENTORY) total_units,
        (SELECT COUNT(*) FROM BLOOD_REQUESTS WHERE status='Pending') pending_requests,
        (SELECT COUNT(*) FROM BLOOD_REQUESTS WHERE status IN ('Pending','Approved') AND urgency IN ('Urgent','Critical')) urgent_requests`),
      pool.query(`SELECT blood_group, SUM(units_available) units, SUM(minimum_threshold) threshold
        FROM BLOOD_INVENTORY GROUP BY blood_group ORDER BY FIELD(blood_group,'A+','A-','B+','B-','AB+','AB-','O+','O-')`),
      pool.query(`SELECT d.donation_id, d.donation_date, d.blood_group, d.units_donated,
        CONCAT(o.first_name,' ',o.last_name) donor_name, b.name blood_bank_name
        FROM DONATIONS d JOIN DONORS o ON o.donor_id=d.donor_id JOIN BLOOD_BANKS b ON b.blood_bank_id=d.blood_bank_id
        ORDER BY d.donation_date DESC, d.donation_id DESC LIMIT 6`),
      pool.query(`SELECT q.request_id, q.blood_group, q.units_requested, q.urgency, q.status, q.required_by,
        CONCAT(r.first_name,' ',r.last_name) recipient_name, h.name hospital_name
        FROM BLOOD_REQUESTS q JOIN RECIPIENTS r ON r.recipient_id=q.recipient_id JOIN HOSPITALS h ON h.hospital_id=q.hospital_id
        WHERE q.status IN ('Pending','Approved') ORDER BY FIELD(q.urgency,'Critical','Urgent','Routine'), q.required_by LIMIT 5`),
    ])
    res.json({
      stats: stats[0],
      stock,
      recentDonations: recent,
      urgentRequests: urgent,
    })
  } catch (error) {
    next(error)
  }
})

for (const [path, config] of Object.entries(resources)) {
  app.get(`/api/${path}`, async (req, res, next) => {
    try {
      const conditions = [],
        values = []
      if (req.query.search) {
        conditions.push(
          `(${config.search.map((field) => `${field} LIKE ?`).join(" OR ")})`,
        )
        config.search.forEach(() => values.push(`%${req.query.search}%`))
      }
      for (const field of config.filters) {
        const key = field.split(".").at(-1)
        if (req.query[key]) {
          conditions.push(`${field}=?`)
          values.push(req.query[key])
        }
      }
      const id = config.prefix ? `${config.prefix}.${config.id}` : config.id
      const sql = `${config.select}${
        conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""
      } ORDER BY ${id} DESC`
      const [rows] = await pool.query(sql, values)
      res.json(rows)
    } catch (error) {
      next(error)
    }
  })
  app.get(`/api/${path}/:id`, async (req, res, next) => {
    try {
      const id = config.prefix ? `${config.prefix}.${config.id}` : config.id
      const [rows] = await pool.query(`${config.select} WHERE ${id}=?`, [
        req.params.id,
      ])
      if (!rows[0]) return res.status(404).json({ error: "Record not found" })
      res.json(rows[0])
    } catch (error) {
      next(error)
    }
  })
  app.post(`/api/${path}`, async (req, res, next) => {
    try {
      const data = cleanBody(config, req.body)
      if (path === "requests" && data.status === "Fulfilled") {
        const record = await transaction(async (connection) => {
          const [stock] = await connection.query(
            `UPDATE BLOOD_INVENTORY SET units_available=units_available-?
            WHERE blood_bank_id=? AND blood_group=? AND units_available>=?`,
            [
              data.units_requested,
              data.blood_bank_id,
              data.blood_group,
              data.units_requested,
            ],
          )
          if (!stock.affectedRows)
            throw Object.assign(
              new Error("Insufficient inventory to fulfil this request"),
              { status: 409 },
            )
          const [created] = await connection.query(
            `INSERT INTO ${config.table} (${Object.keys(data).join(",")}) VALUES (${Object.keys(
              data,
            )
              .map(() => "?")
              .join(",")})`,
            Object.values(data),
          )
          return { request_id: created.insertId, ...data }
        })
        return res.status(201).json(record)
      }
      const [result] = await pool.query(
        `INSERT INTO ${config.table} (${Object.keys(data).join(",")}) VALUES (${Object.keys(
          data,
        )
          .map(() => "?")
          .join(",")})`,
        Object.values(data),
      )
      const [rows] = await pool.query(
        `SELECT * FROM ${config.table} WHERE ${config.id}=?`,
        [result.insertId],
      )
      res.status(201).json(rows[0])
    } catch (error) {
      next(error)
    }
  })
  app.patch(`/api/${path}/:id`, async (req, res, next) => {
    try {
      const data = cleanBody(config, req.body, true)
      if (!Object.keys(data).length)
        return res.status(400).json({ error: "No valid fields supplied" })
      if (path === "requests" && data.status) {
        const result = await updateRequestStatus(req.params.id, data)
        return res.json(result)
      }
      const [result] = await pool.query(
        `UPDATE ${config.table} SET ${Object.keys(data)
          .map((key) => `${key}=?`)
          .join(",")} WHERE ${config.id}=?`,
        [...Object.values(data), req.params.id],
      )
      if (!result.affectedRows)
        return res.status(404).json({ error: "Record not found" })
      res.json({ id: Number(req.params.id), ...data })
    } catch (error) {
      next(error)
    }
  })
  app.delete(`/api/${path}/:id`, async (req, res, next) => {
    try {
      if (path === "requests") {
        await transaction(async (connection) => {
          const [rows] = await connection.query(
            "SELECT * FROM BLOOD_REQUESTS WHERE request_id=? FOR UPDATE",
            [req.params.id],
          )
          const request = rows[0]
          if (!request)
            throw Object.assign(new Error("Record not found"), { status: 404 })
          if (request.status === "Fulfilled") {
            await connection.query(
              `INSERT INTO BLOOD_INVENTORY (blood_bank_id,blood_group,units_available,minimum_threshold)
              VALUES (?,?,?,5) ON DUPLICATE KEY UPDATE units_available=units_available+VALUES(units_available)`,
              [
                request.blood_bank_id,
                request.blood_group,
                request.units_requested,
              ],
            )
          }
          await connection.query(
            "DELETE FROM BLOOD_REQUESTS WHERE request_id=?",
            [req.params.id],
          )
        })
        return res.status(204).end()
      }
      if (path === "donors") {
        const donorId = Number(req.params.id)
        const [donations] = await pool.query(
          "SELECT donation_id FROM DONATIONS WHERE donor_id=? LIMIT 1",
          [donorId],
        )

        if (donations.length) {
          const [result] = await pool.query(
            "UPDATE DONORS SET is_active=0 WHERE donor_id=?",
            [donorId],
          )
          if (!result.affectedRows) {
            const [rows] = await pool.query(
              "SELECT donor_id FROM DONORS WHERE donor_id=?",
              [donorId],
            )
            if (!rows.length) {
              return res.status(404).json({ error: "Donor not found" })
            }
          }
          return res.status(200).json({
            message: "Donor deactivated; donation history preserved",
          })
        }
      }

      const [result] = await pool.query(
        `DELETE FROM ${config.table} WHERE ${config.id}=?`,
        [req.params.id],
      )
      if (!result.affectedRows)
        return res.status(404).json({ error: "Record not found" })
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  })
}

async function updateRequestStatus(id, changes) {
  return transaction(async (connection) => {
    const [rows] = await connection.query(
      "SELECT * FROM BLOOD_REQUESTS WHERE request_id=? FOR UPDATE",
      [id],
    )
    const request = rows[0]
    if (!request)
      throw Object.assign(new Error("Request not found"), { status: 404 })
    const nextStatus = changes.status
    if (request.status === "Fulfilled" && nextStatus === "Fulfilled") {
      const allocationFields = [
        "blood_bank_id",
        "blood_group",
        "units_requested",
      ]
      if (
        allocationFields.some(
          (field) =>
            changes[field] !== undefined &&
            String(changes[field]) !== String(request[field]),
        )
      ) {
        throw Object.assign(
          new Error(
            "Reopen the fulfilled request before changing its allocation",
          ),
          { status: 409 },
        )
      }
    }
    if (request.status !== "Fulfilled" && nextStatus === "Fulfilled") {
      const [result] = await connection.query(
        `UPDATE BLOOD_INVENTORY SET units_available=units_available-?
        WHERE blood_bank_id=? AND blood_group=? AND units_available>=?`,
        [
          request.units_requested,
          request.blood_bank_id,
          request.blood_group,
          request.units_requested,
        ],
      )
      if (!result.affectedRows)
        throw Object.assign(
          new Error("Insufficient inventory to fulfil this request"),
          { status: 409 },
        )
    } else if (request.status === "Fulfilled" && nextStatus !== "Fulfilled") {
      await connection.query(
        `INSERT INTO BLOOD_INVENTORY (blood_bank_id,blood_group,units_available,minimum_threshold)
        VALUES (?,?,?,5) ON DUPLICATE KEY UPDATE units_available=units_available+VALUES(units_available)`,
        [request.blood_bank_id, request.blood_group, request.units_requested],
      )
    }
    const allowed = cleanBody(resources.requests, changes, true)
    await connection.query(
      `UPDATE BLOOD_REQUESTS SET ${Object.keys(allowed)
        .map((key) => `${key}=?`)
        .join(",")} WHERE request_id=?`,
      [...Object.values(allowed), id],
    )
    return { request_id: Number(id), ...allowed }
  })
}

app.get("/api/donations", async (req, res, next) => {
  try {
    const values = [],
      conditions = []
    if (req.query.search) {
      conditions.push(
        `(CONCAT(o.first_name,' ',o.last_name) LIKE ? OR b.name LIKE ? OR d.blood_group LIKE ?)`,
      )
      values.push(...Array(3).fill(`%${req.query.search}%`))
    }
    if (req.query.blood_group) {
      conditions.push("d.blood_group=?")
      values.push(req.query.blood_group)
    }
    const [rows] = await pool.query(
      `SELECT d.*, CONCAT(o.first_name,' ',o.last_name) donor_name, b.name blood_bank_name
      FROM DONATIONS d JOIN DONORS o ON o.donor_id=d.donor_id JOIN BLOOD_BANKS b ON b.blood_bank_id=d.blood_bank_id
      ${
        conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""
      } ORDER BY d.donation_date DESC,d.donation_id DESC`,
      values,
    )
    res.json(rows)
  } catch (error) {
    next(error)
  }
})

app.post("/api/donations", async (req, res, next) => {
  try {
    const { donor_id, blood_bank_id, units_donated, donation_date, notes } =
      req.body
    if (
      !donor_id ||
      !blood_bank_id ||
      Number(units_donated) < 1 ||
      !donation_date
    )
      return res
        .status(400)
        .json({
          error: "Donor, blood bank, date, and positive units are required",
        })
    const donation = await transaction(async (connection) => {
      const [donors] = await connection.query(
        "SELECT donor_id,blood_group FROM DONORS WHERE donor_id=? AND is_active=1 FOR UPDATE",
        [donor_id],
      )
      if (!donors[0])
        throw Object.assign(new Error("Active donor not found"), {
          status: 404,
        })
      const group = donors[0].blood_group
      const [result] = await connection.query(
        `INSERT INTO DONATIONS (donor_id,blood_bank_id,blood_group,units_donated,donation_date,notes) VALUES (?,?,?,?,?,?)`,
        [
          donor_id,
          blood_bank_id,
          group,
          units_donated,
          donation_date,
          notes || null,
        ],
      )
      await connection.query(
        `INSERT INTO BLOOD_INVENTORY (blood_bank_id,blood_group,units_available,minimum_threshold) VALUES (?,?,?,5)
        ON DUPLICATE KEY UPDATE units_available=units_available+VALUES(units_available)`,
        [blood_bank_id, group, units_donated],
      )
      await connection.query(
        "UPDATE DONORS SET last_donation_date=? WHERE donor_id=?",
        [donation_date, donor_id],
      )
      return {
        donation_id: result.insertId,
        donor_id,
        blood_bank_id,
        blood_group: group,
        units_donated,
        donation_date,
        notes,
      }
    })
    res.status(201).json(donation)
  } catch (error) {
    next(error)
  }
})

app.delete("/api/donations/:id", async (req, res, next) => {
  try {
    await transaction(async (connection) => {
      const [rows] = await connection.query(
        "SELECT * FROM DONATIONS WHERE donation_id=? FOR UPDATE",
        [req.params.id],
      )
      const donation = rows[0]
      if (!donation)
        throw Object.assign(new Error("Donation not found"), { status: 404 })
      const [result] = await connection.query(
        `UPDATE BLOOD_INVENTORY SET units_available=units_available-?
        WHERE blood_bank_id=? AND blood_group=? AND units_available>=?`,
        [
          donation.units_donated,
          donation.blood_bank_id,
          donation.blood_group,
          donation.units_donated,
        ],
      )
      if (!result.affectedRows)
        throw Object.assign(
          new Error("Cannot delete: donated units have already been allocated"),
          { status: 409 },
        )
      await connection.query("DELETE FROM DONATIONS WHERE donation_id=?", [
        req.params.id,
      ])
      const [last] = await connection.query(
        "SELECT MAX(donation_date) last_date FROM DONATIONS WHERE donor_id=?",
        [donation.donor_id],
      )
      await connection.query(
        "UPDATE DONORS SET last_donation_date=? WHERE donor_id=?",
        [last[0].last_date, donation.donor_id],
      )
    })
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.get("/api/reports", async (_req, res, next) => {
  try {
    const [[donors], [inventory], [history], [pending]] = await Promise.all([
      pool.query(
        `SELECT blood_group,COUNT(*) donor_count FROM DONORS WHERE is_active=1 GROUP BY blood_group ORDER BY donor_count DESC`,
      ),
      pool.query(`SELECT b.name blood_bank,b.city,i.blood_group,i.units_available,i.minimum_threshold,
        CASE WHEN i.units_available<=i.minimum_threshold THEN 'Low' ELSE 'Adequate' END stock_status
        FROM BLOOD_INVENTORY i JOIN BLOOD_BANKS b ON b.blood_bank_id=i.blood_bank_id ORDER BY b.name,i.blood_group`),
      pool.query(`SELECT d.donation_date,CONCAT(o.first_name,' ',o.last_name) donor,d.blood_group,d.units_donated,b.name blood_bank
        FROM DONATIONS d JOIN DONORS o ON o.donor_id=d.donor_id JOIN BLOOD_BANKS b ON b.blood_bank_id=d.blood_bank_id ORDER BY d.donation_date DESC LIMIT 100`),
      pool.query(`SELECT q.request_id,CONCAT(r.first_name,' ',r.last_name) recipient,h.name hospital,q.blood_group,q.units_requested,q.urgency,q.status,q.required_by
        FROM BLOOD_REQUESTS q JOIN RECIPIENTS r ON r.recipient_id=q.recipient_id JOIN HOSPITALS h ON h.hospital_id=q.hospital_id
        WHERE q.status IN ('Pending','Approved') ORDER BY FIELD(q.urgency,'Critical','Urgent','Routine'),q.required_by`),
    ])
    res.json({
      donorsByBloodGroup: donors,
      inventorySummary: inventory,
      donationHistory: history,
      pendingRequests: pending,
    })
  } catch (error) {
    next(error)
  }
})

app.use((_req, res) => res.status(404).json({ error: "API route not found" }))
app.use((error, _req, res, _next) => {
  console.error(error.code || error.message)
  const duplicate = error.code === "ER_DUP_ENTRY"
  const foreignKey =
    error.code === "ER_ROW_IS_REFERENCED_2" ||
    error.code === "ER_NO_REFERENCED_ROW_2"
  const status = error.status || (duplicate ? 409 : foreignKey ? 409 : 500)
  const message = duplicate
    ? "A record with that unique value already exists"
    : foreignKey
      ? "This record is linked to other data and cannot be changed or removed"
      : status === 500
        ? "Database operation failed"
        : error.message
  res.status(status).json({ error: message })
})

app.listen(port, () =>
  console.log(`BloodLink API listening on http://localhost:${port}`),
)
