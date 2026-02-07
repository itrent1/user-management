import { useEffect, useMemo, useState } from "react";
import { http } from "../api/http";
import "./users.css";

function formatLastSeen(iso) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return "Just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function statusClass(status) {
  const s = (status || "").toLowerCase();
  if (s === "active") return "status-pill status-active";
  if (s === "blocked") return "status-pill status-blocked";
  return "status-pill status-unverified";
}

function stringToColor(string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - c.length) + c;
}

function Avatar({ name }) {
  const initials = name ? name.substring(0, 2).toUpperCase() : "??";
  const bg = stringToColor(name || "");
  return (
    <div className="user-avatar" style={{ backgroundColor: bg }}>
      {initials}
    </div>
  );
}

function Spark() {
  const bars = [4, 8, 5, 12, 6, 14, 8, 10];
  return (
    <div className="spark" aria-hidden="true">
      {bars.map((h, i) => (
        <span key={i} style={{ height: h }} />
      ))}
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [msg, setMsg] = useState("");
  const [filter, setFilter] = useState("");
  const [sortEmailAsc, setSortEmailAsc] = useState(true);
  const [includeCurrent, setIncludeCurrent] = useState(true);

  async function load() {
    setMsg("");
    try {
      const url = includeCurrent ? "/users" : "/users?includeCurrent=false";
      const res = await http.get(url);
      setUsers(res.data);
      setSelected(new Set());
    } catch (e) {
      const force = e?.response?.data?.forceLogout;
      if (e?.response?.status === 401 || force) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      setMsg(e?.response?.data?.message || "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, [includeCurrent]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);
  const disabled = selectedIds.length === 0;

  async function action(path, body) {
    setMsg("");
    try {
      await http.post(path, body);
      await load();
      setMsg("Action completed successfully.");
    } catch (e) {
      const force = e?.response?.data?.forceLogout;
      if (e?.response?.status === 401 || force) {
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }
      setMsg(e?.response?.data?.message || "Error");
    }
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let list = users;
    if (q) {
      list = list.filter(
        (u) =>
          (u.name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const ea = (a.email || "").toLowerCase();
      const eb = (b.email || "").toLowerCase();
      return sortEmailAsc ? ea.localeCompare(eb) : eb.localeCompare(ea);
    });
    return list;
  }, [users, filter, sortEmailAsc]);

  const allSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id));

  function toggleAll() {
    const next = new Set(selected);
    if (allSelected) filtered.forEach((u) => next.delete(u.id));
    else filtered.forEach((u) => next.add(u.id));
    setSelected(next);
  }

  function toggleOne(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="users-page min-vh-100 min-vw-100 bg-light">
      <div
        className="container-fluid px-4 py-3 bg-white border-bottom sticky-top shadow-sm"
        style={{ zIndex: 10 }}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h4 className="fw-bold m-0 text-dark">User Management</h4>
            <div className="text-muted small">Manage access and permissions</div>
          </div>

          <button
            className="btn btn-light border text-danger fw-semibold"
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
          >
            Log out
          </button>
        </div>
      </div>

      <div className="container-fluid px-4 py-4">
        <div className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
          <div className="action-bar d-flex gap-2 flex-wrap">
            <button
              className="btn btn-white shadow-sm fw-medium text-dark"
              disabled={disabled}
              onClick={() => action("/users/block", { ids: selectedIds })}
            >
              🔒 Block
            </button>
            <button
              className="btn btn-white shadow-sm fw-medium text-dark"
              disabled={disabled}
              onClick={() => action("/users/unblock", { ids: selectedIds })}
            >
              🔓 Unblock
            </button>
            <button
              className="btn btn-danger shadow-sm"
              disabled={disabled}
              onClick={() => action("/users/delete", { ids: selectedIds })}
            >
              🗑 Delete
            </button>

            <button
              className="btn btn-danger shadow-sm"
              onClick={() => action("/users/block-all", {})}
            >
              🚫 Block All
            </button>
          </div>

          <div className="d-flex align-items-center gap-3 flex-wrap">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="includeCurrent"
                checked={includeCurrent}
                onChange={(e) => setIncludeCurrent(e.target.checked)}
              />
              <label className="form-check-label small text-muted" htmlFor="includeCurrent">
                Include current user
              </label>
            </div>

            <div className="search-bar position-relative">
              <input
                className="form-control form-control-lg border-0 shadow-sm ps-4"
                style={{ minWidth: "300px", fontSize: "15px" }}
                placeholder="Search users..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        {msg && <div className="alert alert-info border-0 shadow-sm mb-4">{msg}</div>}

        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ minWidth: "800px" }}>
              <thead className="bg-light">
                <tr>
                  <th className="ps-4 py-3" style={{ width: "50px" }}>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                      />
                    </div>
                  </th>
                  <th className="py-3 text-uppercase small text-muted fw-bold">User</th>
                  <th
                    className="py-3 text-uppercase small text-muted fw-bold cursor-pointer"
                    onClick={() => setSortEmailAsc(!sortEmailAsc)}
                  >
                    Email {sortEmailAsc ? "↓" : "↑"}
                  </th>
                  <th className="py-3 text-uppercase small text-muted fw-bold">Status</th>
                  <th className="py-3 text-uppercase small text-muted fw-bold">Activity</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className={selected.has(u.id) ? "table-active-custom" : ""}>
                    <td className="ps-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggleOne(u.id)}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <Avatar name={u.name} />
                        <div>
                          <div className="fw-bold text-dark">{u.name}</div>
                          <div className="small text-muted">ID: {u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-dark">{u.email}</td>
                    <td>
                      <span className={statusClass(u.status)}>{u.status}</span>
                    </td>
                    <td>
                      <div className="d-flex flex-column align-items-start">
                        <span className="small fw-semibold text-dark mb-1">
                          {formatLastSeen(u.lastLoginAt)}
                        </span>
                        <Spark />
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-5 text-muted">
                      <div className="fs-1 mb-2">🔍</div>
                      No users found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}