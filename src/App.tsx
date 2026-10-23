import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  Building2,
  ChevronDown,
  ClipboardList,
  Droplets,
  FileBarChart,
  HeartPulse,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react"

const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api"
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

type Row = Record<string, any>
type Field = {
  key: string
  label: string
  type?: string
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
}
type Column = { key: string; label: string; render?: (row: Row) => ReactNode }

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "donors", label: "Donors", icon: Users },
  { id: "recipients", label: "Recipients", icon: UserRound },
  { id: "facilities", label: "Hospitals & blood banks", icon: Building2 },
  { id: "inventory", label: "Blood inventory", icon: Droplets },
  { id: "requests", label: "Blood requests", icon: ClipboardList },
  { id: "donations", label: "Donations", icon: ArrowDownToLine },
  { id: "reports", label: "Reports", icon: FileBarChart },
]

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${response.status})`)
  }
  return response.status === 204 ? undefined as T : response.json()
}

function formatDate(value?: string) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: string
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

function Button({
  children,
  variant = "primary",
  icon,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string
  icon?: ReactNode
}) {
  return (
    <button className={`button button-${variant}`} {...props}>
      {icon}
      {children}
    </button>
  )
}

function EmptyState({
  title = "No records found",
  copy = "Try adjusting your search or add a new record.",
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Search size={20} />
      </div>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  )
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="error-state">
      <AlertTriangle size={20} />
      <div>
        <strong>Unable to load data</strong>
        <p>{message}</p>
      </div>
      <Button variant="quiet" onClick={retry} icon={<RefreshCw size={15} />}>
        Retry
      </Button>
    </div>
  )
}

function Table({
  columns,
  rows,
  onEdit,
  onDelete,
}: {
  columns: Column[]
  rows: Row[]
  onEdit?: (row: Row) => void
  onDelete?: (row: Row) => void
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
            {(onEdit || onDelete) && <th className="align-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={
                row[
                  Object.keys(row).find((key) => key.endsWith("_id")) || "id"
                ] ?? index
              }
            >
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : (row[column.key] ?? "—")}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td>
                  <div className="row-actions">
                    {onEdit && (
                      <button
                        className="icon-button"
                        onClick={() => onEdit(row)}
                        aria-label="Edit record"
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        className="icon-button danger"
                        onClick={() => onDelete(row)}
                        aria-label="Delete record"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Modal({
  title,
  fields,
  initial,
  onClose,
  onSave,
}: {
  title: string
  fields: Field[]
  initial?: Row
  onClose: () => void
  onSave: (data: Row) => Promise<void>
}) {
  const [form, setForm] = useState<Row>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.key,
        initial?.[f.key] ?? (f.type === "checkbox" ? true : ""),
      ]),
    ),
  )
  const [error, setError] = useState(""),
    [saving, setSaving] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError("")
    try {
      await onSave(form)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save record")
      setSaving(false)
    }
  }
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <div>
            <span className="eyebrow">BloodLink record</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            {fields.map((field) => (
              <label
                className={field.type === "textarea" ? "span-2" : ""}
                key={field.key}
              >
                <span>
                  {field.label}
                  {field.required && <b> *</b>}
                </span>
                {field.type === "select" ? (
                  <select
                    required={field.required}
                    value={form[field.key]}
                    onChange={(e) =>
                      setForm({ ...form, [field.key]: e.target.value })
                    }
                  >
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    rows={3}
                    value={form[field.key]}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setForm({ ...form, [field.key]: e.target.value })
                    }
                  />
                ) : field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(form[field.key])}
                    onChange={(e) =>
                      setForm({ ...form, [field.key]: e.target.checked })
                    }
                  />
                ) : (
                  <input
                    required={field.required}
                    type={field.type || "text"}
                    min={field.type === "number" ? 0 : undefined}
                    value={form[field.key]}
                    placeholder={field.placeholder}
                    onChange={(e) =>
                      setForm({ ...form, [field.key]: e.target.value })
                    }
                  />
                )}
              </label>
            ))}
          </div>
          {error && (
            <div className="form-error">
              <AlertTriangle size={15} />
              {error}
            </div>
          )}
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save record"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const genderOptions = ["Male", "Female", "Other", "Prefer not to say"].map(
  (x) => ({ value: x, label: x }),
)
const groupOptions = bloodGroups.map((x) => ({ value: x, label: x }))

function ResourcePage({
  endpoint,
  title,
  description,
  singular,
  idKey,
  fields,
  columns,
  filter,
  canEdit = true,
}: {
  endpoint: string
  title: string
  description: string
  singular: string
  idKey: string
  fields: Field[]
  columns: Column[]
  filter?: Field
  canEdit?: boolean
}) {
  const [rows, setRows] = useState<Row[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("")
  const [search, setSearch] = useState(""),
    [filterValue, setFilterValue] = useState(""),
    [modal, setModal] = useState<Row | null | "new">(null)
  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const query = new URLSearchParams()
      if (search) query.set("search", search)
      if (filterValue && filter) query.set(filter.key, filterValue)
      setRows(await api<Row[]>(`/${endpoint}?${query}`))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed")
    } finally {
      setLoading(false)
    }
  }, [endpoint, search, filterValue, filter])
  useEffect(() => {
    const timer = setTimeout(load, 250)
    return () => clearTimeout(timer)
  }, [load])
  const save = async (data: Row) => {
    const editing = modal !== "new" && modal
    await api(`/${endpoint}${editing ? `/${editing[idKey]}` : ""}`, {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(data),
    })
    setModal(null)
    await load()
  }
  const remove = async (row: Row) => {
    if (
      !window.confirm(
        `Delete this ${singular.toLowerCase()}? This cannot be undone.`,
      )
    )
      return
    try {
      await api(`/${endpoint}/${row[idKey]}`, { method: "DELETE" })
      await load()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Delete failed")
    }
  }
  return (
    <PageFrame
      title={title}
      description={description}
      action={
        <Button icon={<Plus size={16} />} onClick={() => setModal("new")}>
          Add {singular.toLowerCase()}
        </Button>
      }
    >
      <div className="card table-card">
        <div className="toolbar">
          <div className="search-box">
            <Search size={17} />
            <input
              aria-label={`Search ${title}`}
              placeholder={`Search ${title.toLowerCase()}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {filter && (
            <div className="select-wrap">
              <select
                aria-label={`Filter by ${filter.label}`}
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
              >
                <option value="">All {filter.label.toLowerCase()}</option>
                {filter.options?.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
    
            </div>
          )}
          <span className="result-count">
            {rows.length} record{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        {error ? (
          <ErrorState message={error} retry={load} />
        ) : loading ? (
          <div className="loading-rows">
            {[1, 2, 3, 4].map((x) => (
              <span key={x} />
            ))}
          </div>
        ) : rows.length ? (
          <Table
            columns={columns}
            rows={rows}
            onEdit={canEdit ? (r) => setModal(r) : undefined}
            onDelete={remove}
          />
        ) : (
          <EmptyState />
        )}
      </div>
      {modal && (
        <Modal
          title={`${
            modal === "new" ? "Add" : "Edit"
          } ${singular.toLowerCase()}`}
          fields={fields}
          initial={modal === "new" ? undefined : modal}
          onClose={() => setModal(null)}
          onSave={save}
        />
      )}
    </PageFrame>
  )
}

function PageFrame({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Operations</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </div>
      {children}
    </>
  )
}

function Dashboard() {
  const [data, setData] = useState<Row | null>(null),
    [error, setError] = useState("")
  const load = useCallback(() => {
    setError("")
    api<Row>("/dashboard")
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])
  useEffect(() => {
    load()
  }, [load])
  const max = Math.max(
    1,
    ...(data?.stock?.map((x: Row) => Number(x.units)) || [1]),
  )
  return (
    <PageFrame
      title="Good morning, Coordinator"
      description="Here’s the live pulse of your donation network."
    >
      {error && (
        <ErrorState
          message={`${error}. Start the local Express API and MySQL to view live data.`}
          retry={load}
        />
      )}
      <div className="metric-grid">
        {[
          [
            "Active donors",
            data?.stats?.donor_count,
            Users,
            "Registered and available",
          ],
          [
            "Units in stock",
            data?.stats?.total_units,
            Droplets,
            "Across all blood banks",
          ],
          [
            "Pending requests",
            data?.stats?.pending_requests,
            ClipboardList,
            "Awaiting review",
          ],
          [
            "Urgent requests",
            data?.stats?.urgent_requests,
            AlertTriangle,
            "Needs attention",
          ],
        ].map(([label, value, Icon, note], index) => (
          <div className="metric-card" key={label as string}>
            <div className={`metric-icon metric-${index}`}>
              <Icon size={20} />
            </div>
            <div>
              <p>{label as string}</p>
              <strong>
                {data ? Number(value || 0).toLocaleString() : "—"}
              </strong>
              <span>{note as string}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card chart-card">
          <div className="card-head">
            <div>
              <h2>Blood group availability</h2>
              <p>Combined units across all blood banks</p>
            </div>
            <Badge tone="success">Live inventory</Badge>
          </div>
          <div className="bar-chart">
            {bloodGroups.map((group) => {
              const item = data?.stock?.find(
                (x: Row) => x.blood_group === group,
              )
              const units = Number(item?.units || 0)
              return (
                <div className="bar-item" key={group}>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        height: `${Math.max(units ? 10 : 0, (units / max) * 100)}%`,
                      }}
                    >
                      <span>{units}</span>
                    </div>
                  </div>
                  <b>{group}</b>
                </div>
              )
            })}
          </div>
          <div className="chart-note">
            <Activity size={16} />
            <span>
              Stock is indicative only. Clinical compatibility and release
              require professional verification.
            </span>
          </div>
        </section>
        <section className="card urgent-card">
          <div className="card-head">
            <div>
              <h2>Requests needing attention</h2>
              <p>Prioritized by urgency and due date</p>
            </div>
          </div>
          <div className="request-list">
            {data?.urgentRequests?.length ? (
              data.urgentRequests.map((row: Row) => (
                <div className="request-item" key={row.request_id}>
                  <div className="blood-drop">{row.blood_group}</div>
                  <div className="grow">
                    <strong>{row.recipient_name}</strong>
                    <span>
                      {row.hospital_name} · {row.units_requested} units
                    </span>
                  </div>
                  <div className="request-meta">
                    <Badge
                      tone={
                        row.urgency === "Critical"
                          ? "danger"
                          : row.urgency === "Urgent"
                            ? "warning"
                            : "neutral"
                      }
                    >
                      {row.urgency}
                    </Badge>
                    <small>{formatDate(row.required_by)}</small>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No active requests"
                copy="New pending requests will appear here."
              />
            )}
          </div>
        </section>
      </div>
      <section className="card">
        <div className="card-head padded">
          <div>
            <h2>Recent donations</h2>
            <p>Latest inventory contributions</p>
          </div>
        </div>
        {data?.recentDonations?.length ? (
          <Table
            columns={[
              {
                key: "donor_name",
                label: "Donor",
                render: (r) => (
                  <div className="person-cell">
                    <span>
                      {r.donor_name
                        ?.split(" ")
                        .map((x: string) => x[0])
                        .join("")}
                    </span>
                    <strong>{r.donor_name}</strong>
                  </div>
                ),
              },
              {
                key: "blood_group",
                label: "Blood group",
                render: (r) => <Badge tone="blood">{r.blood_group}</Badge>,
              },
              { key: "blood_bank_name", label: "Blood bank" },
              {
                key: "donation_date",
                label: "Date",
                render: (r) => formatDate(r.donation_date),
              },
              {
                key: "units_donated",
                label: "Units",
                render: (r) =>
                  `${r.units_donated} unit${r.units_donated === 1 ? "" : "s"}`,
              },
            ]}
            rows={data.recentDonations}
          />
        ) : (
          <EmptyState
            title="No donations recorded"
            copy="Recorded donations will appear here."
          />
        )}
      </section>
    </PageFrame>
  )
}

type Lookups = { hospitals: Row[]; banks: Row[]; donors: Row[]; recipients: Row[] }
const lookupOptions = (rows: Row[], id: string, label: (r: Row) => string) =>
  rows.map((r) => ({ value: String(r[id]), label: label(r) }))

function Facilities({ lookups }: { lookups: Lookups }) {
  const [tab, setTab] = useState<"hospitals" | "blood-banks">("hospitals")
  const baseFields: Field[] = [
    { key: "name", label: "Name", required: true },
    { key: "city", label: "City", required: true },
    { key: "address", label: "Address", required: true },
    { key: "phone", label: "Phone", required: true, type: "tel" },
    { key: "email", label: "Email", type: "email" },
  ]
  return (
    <div>
      <div className="facility-tabs">
        <button
          className={tab === "hospitals" ? "active" : ""}
          onClick={() => setTab("hospitals")}
        >
          Hospitals
        </button>
        <button
          className={tab === "blood-banks" ? "active" : ""}
          onClick={() => setTab("blood-banks")}
        >
          Blood banks
        </button>
      </div>
      <ResourcePage
        key={`${tab}-${lookups.hospitals.length}`}
        endpoint={tab}
        title={tab === "hospitals" ? "Hospitals" : "Blood banks"}
        description={
          tab === "hospitals"
            ? "Manage recipient care facilities and contact details."
            : "Manage licensed storage and donation locations."
        }
        singular={tab === "hospitals" ? "Hospital" : "Blood bank"}
        idKey={tab === "hospitals" ? "hospital_id" : "blood_bank_id"}
        fields={
          tab === "hospitals"
            ? baseFields
            : [
                ...baseFields,
                {
                  key: "license_number",
                  label: "License number",
                  required: true,
                },
              ]
        }
        columns={[
          {
            key: "name",
            label: "Facility",
            render: (r) => (
              <div className="person-cell facility">
                <span>
                  <Building2 size={15} />
                </span>
                <strong>{r.name}</strong>
              </div>
            ),
          },
          { key: "city", label: "City" },
          { key: "phone", label: "Phone" },
          { key: "email", label: "Email" },
          ...(tab === "blood-banks"
            ? [{ key: "license_number", label: "License" }]
            : []),
        ]}
      />
    </div>
  )
}

function Reports() {
  const [data, setData] = useState<Row | null>(null),
    [error, setError] = useState(""),
    [tab, setTab] = useState("donors")
  const load = useCallback(
    () =>
      api<Row>("/reports")
        .then(setData)
        .catch((e) => setError(e.message)),
    [],
  )
  useEffect(() => {
    void load()
  }, [load])
  const reports: Row = {
    donors: {
      title: "Donors by blood group",
      rows: data?.donorsByBloodGroup || [],
      columns: [
        {
          key: "blood_group",
          label: "Blood group",
          render: (r: Row) => <Badge tone="blood">{r.blood_group}</Badge>,
        },
        { key: "donor_count", label: "Active donors" },
      ],
    },
    inventory: {
      title: "Inventory summary",
      rows: data?.inventorySummary || [],
      columns: [
        { key: "blood_bank", label: "Blood bank" },
        { key: "blood_group", label: "Group" },
        { key: "units_available", label: "Available units" },
        { key: "minimum_threshold", label: "Threshold" },
        {
          key: "stock_status",
          label: "Status",
          render: (r: Row) => (
            <Badge tone={r.stock_status === "Low" ? "danger" : "success"}>
              {r.stock_status}
            </Badge>
          ),
        },
      ],
    },
    donations: {
      title: "Donation history",
      rows: data?.donationHistory || [],
      columns: [
        {
          key: "donation_date",
          label: "Date",
          render: (r: Row) => formatDate(r.donation_date),
        },
        { key: "donor", label: "Donor" },
        { key: "blood_group", label: "Group" },
        { key: "units_donated", label: "Units" },
        { key: "blood_bank", label: "Blood bank" },
      ],
    },
    pending: {
      title: "Pending requests",
      rows: data?.pendingRequests || [],
      columns: [
        { key: "recipient", label: "Recipient" },
        { key: "hospital", label: "Hospital" },
        { key: "blood_group", label: "Group" },
        { key: "units_requested", label: "Units" },
        {
          key: "urgency",
          label: "Urgency",
          render: (r: Row) => (
            <Badge tone={r.urgency === "Critical" ? "danger" : "warning"}>
              {r.urgency}
            </Badge>
          ),
        },
        {
          key: "required_by",
          label: "Required by",
          render: (r: Row) => formatDate(r.required_by),
        },
      ],
    },
  }
  const current = reports[tab]
  return (
    <PageFrame
      title="Reports"
      description="Operational reports generated directly from SQL queries."
    >
      {error ? (
        <ErrorState message={error} retry={load} />
      ) : (
        <div className="report-layout">
          <aside className="report-nav">
            {Object.entries(reports).map(([id, report]: any) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={tab === id ? "active" : ""}
              >
                <FileBarChart size={17} />
                <span>{report.title}</span>
              </button>
            ))}
          </aside>
          <section className="card table-card">
            <div className="card-head padded">
              <div>
                <h2>{current.title}</h2>
                <p>{current.rows.length} rows from the live database</p>
              </div>
              <Button
                variant="secondary"
                icon={<RefreshCw size={15} />}
                onClick={load}
              >
                Refresh
              </Button>
            </div>
            {current.rows.length ? (
              <Table rows={current.rows} columns={current.columns} />
            ) : (
              <EmptyState />
            )}
          </section>
        </div>
      )}
    </PageFrame>
  )
}

function App() {
  const [page, setPage] = useState("dashboard"),
    [menuOpen, setMenuOpen] = useState(false)
  const [lookups, setLookups] = useState<Lookups>({
    hospitals: [],
    banks: [],
    donors: [],
    recipients: [],
  })
  const loadLookups = useCallback(async () => {
    try {
      const [hospitals, banks, donors, recipients] = await Promise.all([
        api<Row[]>("/hospitals"),
        api<Row[]>("/blood-banks"),
        api<Row[]>("/donors"),
        api<Row[]>("/recipients"),
      ])
      setLookups({ hospitals, banks, donors, recipients })
    } catch {
      /* Page-level states show connection errors. */
    }
  }, [])
  useEffect(() => {
    loadLookups()
  }, [loadLookups, page])
  const hospitalOptions = lookupOptions(
    lookups.hospitals,
    "hospital_id",
    (r) => r.name,
  )
  const bankOptions = lookupOptions(
    lookups.banks,
    "blood_bank_id",
    (r) => r.name,
  )
  const donorOptions = lookupOptions(
    lookups.donors,
    "donor_id",
    (r) => `${r.first_name} ${r.last_name} · ${r.blood_group}`,
  )
  const recipientOptions = lookupOptions(
    lookups.recipients,
    "recipient_id",
    (r) => `${r.first_name} ${r.last_name} · ${r.medical_reference}`,
  )
  const donorFields: Field[] = [
    { key: "first_name", label: "First name", required: true },
    { key: "last_name", label: "Last name", required: true },
    {
      key: "date_of_birth",
      label: "Date of birth",
      type: "date",
      required: true,
    },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      options: genderOptions,
      required: true,
    },
    {
      key: "blood_group",
      label: "Blood group",
      type: "select",
      options: groupOptions,
      required: true,
    },
    { key: "phone", label: "Phone", type: "tel", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "address", label: "Address", required: true },
    { key: "city", label: "City", required: true },
    { key: "last_donation_date", label: "Last donation", type: "date" },
    { key: "is_active", label: "Active donor", type: "checkbox" },
  ]
  const content = useMemo(() => {
    if (page === "dashboard") return <Dashboard />
    if (page === "donors")
      return (
        <ResourcePage
          endpoint="donors"
          title="Donors"
          description="Maintain the registered donor directory and availability."
          singular="Donor"
          idKey="donor_id"
          fields={donorFields}
          filter={{
            key: "blood_group",
            label: "Blood group",
            options: groupOptions,
          }}
          columns={[
            {
              key: "name",
              label: "Donor",
              render: (r) => (
                <div className="person-cell">
                  <span>
                    {r.first_name[0]}
                    {r.last_name[0]}
                  </span>
                  <div>
                    <strong>
                      {r.first_name} {r.last_name}
                    </strong>
                    <small>{r.email || r.phone}</small>
                  </div>
                </div>
              ),
            },
            {
              key: "blood_group",
              label: "Blood group",
              render: (r) => <Badge tone="blood">{r.blood_group}</Badge>,
            },
            { key: "city", label: "City" },
            { key: "phone", label: "Phone" },
            {
              key: "last_donation_date",
              label: "Last donation",
              render: (r) => formatDate(r.last_donation_date),
            },
            {
              key: "is_active",
              label: "Status",
              render: (r) => (
                <Badge tone={r.is_active ? "success" : "neutral"}>
                  {r.is_active ? "Active" : "Inactive"}
                </Badge>
              ),
            },
          ]}
        />
      )
    if (page === "recipients")
      return (
        <ResourcePage
          endpoint="recipients"
          title="Recipients"
          description="Manage recipient records and hospital associations."
          singular="Recipient"
          idKey="recipient_id"
          fields={[
            {
              key: "hospital_id",
              label: "Hospital",
              type: "select",
              options: hospitalOptions,
              required: true,
            },
            { key: "first_name", label: "First name", required: true },
            { key: "last_name", label: "Last name", required: true },
            {
              key: "date_of_birth",
              label: "Date of birth",
              type: "date",
              required: true,
            },
            {
              key: "gender",
              label: "Gender",
              type: "select",
              options: genderOptions,
              required: true,
            },
            {
              key: "blood_group",
              label: "Blood group",
              type: "select",
              options: groupOptions,
              required: true,
            },
            { key: "phone", label: "Phone", type: "tel" },
            {
              key: "medical_reference",
              label: "Medical reference",
              required: true,
            },
          ]}
          filter={{
            key: "blood_group",
            label: "Blood group",
            options: groupOptions,
          }}
          columns={[
            {
              key: "name",
              label: "Recipient",
              render: (r) => (
                <div className="person-cell">
                  <span>
                    {r.first_name[0]}
                    {r.last_name[0]}
                  </span>
                  <strong>
                    {r.first_name} {r.last_name}
                  </strong>
                </div>
              ),
            },
            { key: "medical_reference", label: "Reference" },
            {
              key: "blood_group",
              label: "Group",
              render: (r) => <Badge tone="blood">{r.blood_group}</Badge>,
            },
            { key: "hospital_name", label: "Hospital" },
            { key: "phone", label: "Phone" },
          ]}
        />
      )
    if (page === "facilities") return <Facilities lookups={lookups} />
    if (page === "inventory")
      return (
        <ResourcePage
          endpoint="inventory"
          title="Blood inventory"
          description="Track available units and minimum stock thresholds by location."
          singular="Inventory item"
          idKey="inventory_id"
          fields={[
            {
              key: "blood_bank_id",
              label: "Blood bank",
              type: "select",
              options: bankOptions,
              required: true,
            },
            {
              key: "blood_group",
              label: "Blood group",
              type: "select",
              options: groupOptions,
              required: true,
            },
            {
              key: "units_available",
              label: "Units available",
              type: "number",
              required: true,
            },
            {
              key: "minimum_threshold",
              label: "Minimum threshold",
              type: "number",
              required: true,
            },
          ]}
          filter={{
            key: "blood_group",
            label: "Blood group",
            options: groupOptions,
          }}
          columns={[
            {
              key: "blood_group",
              label: "Group",
              render: (r) => (
                <div className="inventory-group">
                  <span>{r.blood_group}</span>
                  <strong>{r.blood_group}</strong>
                </div>
              ),
            },
            { key: "blood_bank_name", label: "Blood bank" },
            {
              key: "units_available",
              label: "Available",
              render: (r) => <strong>{r.units_available} units</strong>,
            },
            { key: "minimum_threshold", label: "Threshold" },
            {
              key: "status",
              label: "Stock status",
              render: (r) => (
                <Badge
                  tone={
                    Number(r.units_available) <= Number(r.minimum_threshold)
                      ? "danger"
                      : "success"
                  }
                >
                  {Number(r.units_available) <= Number(r.minimum_threshold)
                    ? "Low stock"
                    : "Adequate"}
                </Badge>
              ),
            },
            {
              key: "last_updated",
              label: "Last updated",
              render: (r) => formatDate(r.last_updated),
            },
          ]}
        />
      )
    if (page === "requests")
      return (
        <ResourcePage
          endpoint="requests"
          title="Blood requests"
          description="Coordinate demand, urgency, approval, and fulfilment."
          singular="Request"
          idKey="request_id"
          fields={[
            {
              key: "recipient_id",
              label: "Recipient",
              type: "select",
              options: recipientOptions,
              required: true,
            },
            {
              key: "hospital_id",
              label: "Hospital",
              type: "select",
              options: hospitalOptions,
              required: true,
            },
            {
              key: "blood_bank_id",
              label: "Fulfilling blood bank",
              type: "select",
              options: bankOptions,
              required: true,
            },
            {
              key: "blood_group",
              label: "Blood group",
              type: "select",
              options: groupOptions,
              required: true,
            },
            {
              key: "units_requested",
              label: "Units requested",
              type: "number",
              required: true,
            },
            {
              key: "urgency",
              label: "Urgency",
              type: "select",
              required: true,
              options: ["Routine", "Urgent", "Critical"].map((x) => ({
                value: x,
                label: x,
              })),
            },
            {
              key: "status",
              label: "Status",
              type: "select",
              required: true,
              options: ["Pending", "Approved", "Fulfilled", "Cancelled"].map(
                (x) => ({ value: x, label: x }),
              ),
            },
            {
              key: "required_by",
              label: "Required by",
              type: "date",
              required: true,
            },
            { key: "notes", label: "Notes", type: "textarea" },
          ]}
          filter={{
            key: "status",
            label: "Status",
            options: ["Pending", "Approved", "Fulfilled", "Cancelled"].map(
              (x) => ({ value: x, label: x }),
            ),
          }}
          columns={[
            {
              key: "request_id",
              label: "Request",
              render: (r) => (
                <strong>#{String(r.request_id).padStart(4, "0")}</strong>
              ),
            },
            { key: "recipient_name", label: "Recipient" },
            { key: "hospital_name", label: "Hospital" },
            {
              key: "blood_group",
              label: "Group",
              render: (r) => <Badge tone="blood">{r.blood_group}</Badge>,
            },
            { key: "units_requested", label: "Units" },
            {
              key: "urgency",
              label: "Urgency",
              render: (r) => (
                <Badge
                  tone={
                    r.urgency === "Critical"
                      ? "danger"
                      : r.urgency === "Urgent"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {r.urgency}
                </Badge>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <Badge
                  tone={
                    r.status === "Fulfilled"
                      ? "success"
                      : r.status === "Cancelled"
                        ? "neutral"
                        : "warning"
                  }
                >
                  {r.status}
                </Badge>
              ),
            },
            {
              key: "required_by",
              label: "Required",
              render: (r) => formatDate(r.required_by),
            },
          ]}
        />
      )
    if (page === "donations")
      return (
        <ResourcePage
          endpoint="donations"
          title="Donations"
          description="Record donor contributions and update inventory atomically."
          singular="Donation"
          idKey="donation_id"
          canEdit={false}
          fields={[
            {
              key: "donor_id",
              label: "Registered donor",
              type: "select",
              options: donorOptions,
              required: true,
            },
            {
              key: "blood_bank_id",
              label: "Blood bank",
              type: "select",
              options: bankOptions,
              required: true,
            },
            {
              key: "units_donated",
              label: "Units donated",
              type: "number",
              required: true,
            },
            {
              key: "donation_date",
              label: "Donation date",
              type: "date",
              required: true,
            },
            { key: "notes", label: "Notes", type: "textarea" },
          ]}
          filter={{
            key: "blood_group",
            label: "Blood group",
            options: groupOptions,
          }}
          columns={[
            {
              key: "donor_name",
              label: "Donor",
              render: (r) => (
                <div className="person-cell">
                  <span>
                    {r.donor_name
                      ?.split(" ")
                      .map((x: string) => x[0])
                      .join("")}
                  </span>
                  <strong>{r.donor_name}</strong>
                </div>
              ),
            },
            {
              key: "blood_group",
              label: "Group",
              render: (r) => <Badge tone="blood">{r.blood_group}</Badge>,
            },
            { key: "blood_bank_name", label: "Blood bank" },
            { key: "units_donated", label: "Units" },
            {
              key: "donation_date",
              label: "Date",
              render: (r) => formatDate(r.donation_date),
            },
          ]}
        />
      )
    return <Reports />
  }, [page, lookups])
  const active = navItems.find((item) => item.id === page)
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Droplets size={22} />
          </div>
          <div>
            <strong>BloodLink</strong>
            <span>Donor management</span>
          </div>
        </div>
        <nav>
          <span className="nav-label">Workspace</span>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={page === id ? "active" : ""}
              onClick={() => {
                setPage(id)
                setMenuOpen(false)
              }}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">AC</div>
          <div>
            <strong>Admin Coordinator</strong>

          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <div className="main-area">
        <header>
          <button className="menu-button" onClick={() => setMenuOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            <HeartPulse size={17} />
            <span>BloodLink</span>
            <b>/</b>
            <strong>{active?.label}</strong>
          </div>

        </header>
        <main>{content}</main>
        <footer>
          BloodLink academic management prototype · Compatibility and
          eligibility require professional verification.
        </footer>
      </div>
    </div>
  )
}

export default App
