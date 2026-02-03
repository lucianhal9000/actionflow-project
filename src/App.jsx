import { useState, useEffect, useCallback, useMemo } from "react";
import { Bell, Mail, Calendar, Flag, Plus, Trash2, Check, Filter, Search, Wifi, WifiOff, ChevronDown, Clock, Edit3, X, Star } from "lucide-react";

// ─── Persistent Storage Layer (with offline queue) ───
const DB_KEY = "aim_items";
const QUEUE_KEY = "aim_offline_queue";

async function loadItems() {
  try {
    const res = await window.storage.get(DB_KEY);
    return res ? JSON.parse(res.value) : [];
  } catch { return []; }
}
async function saveItems(items) {
  try { await window.storage.set(DB_KEY, JSON.stringify(items)); } catch (e) { console.error(e); }
}
async function loadQueue() {
  try {
    const res = await window.storage.get(QUEUE_KEY);
    return res ? JSON.parse(res.value) : [];
  } catch { return []; }
}
async function saveQueue(q) {
  try { await window.storage.set(QUEUE_KEY, JSON.stringify(q)); } catch (e) { console.error(e); }
}

// ─── Constants ───
const PRIORITIES = ["None", "Low", "Medium", "High", "Urgent"];
const PRIO_COLOR = { None: "#555", Low: "#4ade80", Medium: "#facc15", High: "#fb923c", Urgent: "#f43f5e" };
const ACTION_TYPES = [
  { key: "remind", label: "Remind", icon: Bell, color: "#818cf8" },
  { key: "email", label: "Email", icon: Mail, color: "#38bdf8" },
  { key: "calendar", label: "Calendar", icon: Calendar, color: "#a78bfa" },
  { key: "prioritize", label: "Prioritize", icon: Flag, color: "#fb923c" },
];
const FILTERS = ["All", "remind", "email", "calendar", "prioritize"];

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ─── Subtle animated background mesh ───
function BgMesh() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: "-30%", left: "-20%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", filter: "blur(40px)", animation: "meshDrift1 18s ease-in-out infinite alternate" }} />
      <div style={{ position: "absolute", bottom: "-20%", right: "-15%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 70%)", filter: "blur(50px)", animation: "meshDrift2 22s ease-in-out infinite alternate" }} />
      <div style={{ position: "absolute", top: "40%", left: "50%", width: "350px", height: "350px", background: "radial-gradient(circle, rgba(251,146,60,0.08) 0%, transparent 70%)", filter: "blur(60px)", animation: "meshDrift3 15s ease-in-out infinite alternate" }} />
      <style>{`
        @keyframes meshDrift1 { from { transform: translate(0,0) scale(1); } to { transform: translate(60px,40px) scale(1.1); } }
        @keyframes meshDrift2 { from { transform: translate(0,0) scale(1); } to { transform: translate(-50px,30px) scale(1.05); } }
        @keyframes meshDrift3 { from { transform: translate(0,0) scale(1); } to { transform: translate(30px,-50px) scale(1.15); } }
      `}</style>
    </div>
  );
}

// ─── Toast ───
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 2200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: "#1e293b", color: "#e2e8f0", padding: "10px 22px", borderRadius: 10, fontSize: 13, boxShadow: "0 4px 24px rgba(0,0,0,.45)", border: "1px solid #334155", animation: "toastIn .25s ease", whiteSpace: "nowrap" }}>
      {msg}
      <style>{`@keyframes toastIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ─── Modal ───
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)" }} onClick={onClose}>
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 16, width: "min(92vw, 460px)", padding: 28, position: "relative", animation: "modalIn .2s ease", boxShadow: "0 24px 64px rgba(0,0,0,.5)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "#f1f5f9", fontFamily: "'Playfair Display', serif", fontSize: 20, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}><X size={18} /></button>
        </div>
        {children}
      </div>
      <style>{`@keyframes modalIn { from { opacity:0; transform:scale(.94); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>
  );
}

// ─── Input ───
function Input({ label, value, onChange, placeholder, type = "text", style: s = {} }) {
  return (
    <div style={{ marginBottom: 14, ...s }}>
      {label && <label style={{ display: "block", color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>{label}</label>}
      <input value={value} onChange={onChange} placeholder={placeholder} type={type}
        style={{ width: "100%", background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, padding: "9px 12px", boxSizing: "border-box", outline: "none", fontFamily: "'DM Sans', sans-serif" }}
        onFocus={e => e.target.style.borderColor = "#6366f1"} onBlur={e => e.target.style.borderColor = "#334155"} />
    </div>
  );
}

// ─── Chip ───
function Chip({ active, onClick, color, children }) {
  return (
    <button onClick={onClick} style={{ background: active ? (color || "#6366f1") + "22" : "transparent", border: `1px solid ${active ? (color || "#6366f1") : "#334155"}`, color: active ? (color || "#818cf8") : "#64748b", borderRadius: 20, padding: "5px 13px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all .18s" }}>
      {children}
    </button>
  );
}

// ─── ActionItem Card ───
function ItemCard({ item, onEdit, onDelete, onToggle }) {
  const type = ACTION_TYPES.find(t => t.key === item.type);
  const Icon = type?.icon || Bell;
  const typeColor = type?.color || "#818cf8";
  const prioColor = PRIO_COLOR[item.priority] || "#555";
  const isOverdue = item.dueDate && new Date(item.dueDate) < new Date() && !item.done;

  return (
    <div style={{ background: item.done ? "#111827" : "#1e293b", border: `1px solid ${isOverdue ? "#f43f5e33" : "#334155"}`, borderLeft: `3px solid ${typeColor}`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start", opacity: item.done ? 0.5 : 1, transition: "all .2s", animation: "cardIn .25s ease" }}>
      {/* checkbox */}
      <button onClick={() => onToggle(item.id)} style={{ marginTop: 2, width: 22, height: 22, borderRadius: 6, border: `2px solid ${item.done ? typeColor : "#475569"}`, background: item.done ? typeColor : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .18s" }}>
        {item.done && <Check size={13} color="#fff" strokeWidth={3} />}
      </button>

      {/* icon */}
      <div style={{ width: 34, height: 34, borderRadius: 8, background: typeColor + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={17} color={typeColor} />
      </div>

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: item.done ? "#64748b" : "#f1f5f9", fontSize: 14, fontWeight: 600, textDecoration: item.done ? "line-through" : "none", fontFamily: "'DM Sans', sans-serif" }}>{item.title}</span>
          {item.starred && <Star size={13} color="#facc15" fill="#facc15" />}
        </div>
        {item.description && <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0", lineHeight: 1.4 }}>{item.description}</p>}

        {/* meta row */}
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, color: typeColor, background: typeColor + "15", padding: "2px 8px", borderRadius: 12 }}>{type?.label}</span>
          {item.priority !== "None" && <span style={{ fontSize: 11, color: prioColor, display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: prioColor, display: "inline-block" }} />{item.priority}</span>}
          {item.dueDate && <span style={{ fontSize: 11, color: isOverdue ? "#f43f5e" : "#64748b", display: "flex", alignItems: "center", gap: 3 }}><Clock size={11} />{new Date(item.dueDate).toLocaleDateString()}{isOverdue && " (overdue)"}</span>}
          {item.type === "email" && item.emailTo && <span style={{ fontSize: 11, color: "#64748b" }}>→ {item.emailTo}</span>}
        </div>
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button onClick={() => onEdit(item)} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 5 }}><Edit3 size={15} /></button>
        <button onClick={() => onDelete(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 5 }}><Trash2 size={15} /></button>
      </div>

      <style>{`@keyframes cardIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}

// ─── Create / Edit Form ───
function ItemForm({ item, onSave, onClose }) {
  const [title, setTitle] = useState(item?.title || "");
  const [desc, setDesc] = useState(item?.description || "");
  const [type, setType] = useState(item?.type || "remind");
  const [priority, setPriority] = useState(item?.priority || "None");
  const [dueDate, setDueDate] = useState(item?.dueDate || "");
  const [emailTo, setEmailTo] = useState(item?.emailTo || "");
  const [calTitle, setCalTitle] = useState(item?.calTitle || "");
  const [calStart, setCalStart] = useState(item?.calStart || "");

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: item?.id || uid(),
      title: title.trim(), description: desc.trim(), type, priority, dueDate,
      emailTo, calTitle, calStart,
      done: item?.done || false,
      starred: item?.starred || false,
      createdAt: item?.createdAt || Date.now(),
    });
  };

  return (
    <div>
      <Input label="Title" value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" />
      <Input label="Description" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional details…" />

      {/* type chips */}
      <label style={{ display: "block", color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Action Type</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {ACTION_TYPES.map(t => (
          <Chip key={t.key} active={type === t.key} color={t.color} onClick={() => setType(t.key)}>
            {t.label}
          </Chip>
        ))}
      </div>

      {/* priority */}
      <label style={{ display: "block", color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Priority</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {PRIORITIES.map(p => (
          <Chip key={p} active={priority === p} color={PRIO_COLOR[p]} onClick={() => setPriority(p)}>{p}</Chip>
        ))}
      </div>

      <Input label="Due Date" value={dueDate} onChange={e => setDueDate(e.target.value)} type="date" />

      {/* conditional fields */}
      {type === "email" && <Input label="Send To (email)" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="someone@example.com" />}
      {type === "calendar" && <>
        <Input label="Event Title" value={calTitle} onChange={e => setCalTitle(e.target.value)} placeholder="Meeting with…" />
        <Input label="Event Date/Time" value={calStart} onChange={e => setCalStart(e.target.value)} type="datetime-local" />
      </>}

      <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
        <button onClick={handleSave} style={{ flex: 1, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", borderRadius: 8, padding: "10px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          {item ? "Update" : "Create"} Action
        </button>
        <button onClick={onClose} style={{ background: "#0f172a", border: "1px solid #334155", color: "#64748b", borderRadius: 8, padding: "10px 18px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Stats Bar ───
function StatsBar({ items }) {
  const total = items.length;
  const done = items.filter(i => i.done).length;
  const urgent = items.filter(i => i.priority === "Urgent" && !i.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
      {[
        { label: "Total", val: total, color: "#818cf8" },
        { label: "Done", val: done, color: "#4ade80" },
        { label: "Urgent", val: urgent, color: "#f43f5e" },
        { label: "Progress", val: pct + "%", color: "#38bdf8", wide: true },
      ].map(s => (
        <div key={s.label} style={{ flex: s.wide ? 2 : 1, minWidth: 80, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: 1 }}>{s.label}</div>
          <div style={{ color: s.color, fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif", marginTop: 2 }}>{s.val}</div>
          {s.wide && <div style={{ marginTop: 6, height: 4, background: "#0f172a", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: "linear-gradient(90deg,#6366f1,#38bdf8)", borderRadius: 2, transition: "width .4s" }} />
          </div>}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN APP ───
export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [sortBy, setSortBy] = useState("createdAt"); // createdAt | priority | dueDate
  const [showDone, setShowDone] = useState(true);
  const [toast, setToast] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueue, setOfflineQueue] = useState([]);

  // ─ load on mount
  useEffect(() => {
    (async () => {
      const saved = await loadItems();
      setItems(saved);
      const q = await loadQueue();
      setOfflineQueue(q);
      setLoading(false);
    })();
  }, []);

  // ─ persist whenever items change (after initial load)
  useEffect(() => {
    if (loading) return;
    saveItems(items);
  }, [items, loading]);

  // ─ simulate online/offline toggle (user-controlled for demo)
  const toggleOnline = () => {
    setIsOnline(prev => {
      if (!prev) {
        // coming back online → flush queue
        setItems(prev2 => {
          const merged = [...prev2];
          offlineQueue.forEach(op => {
            if (op.action === "add") merged.push(op.item);
            else if (op.action === "delete") { const i = merged.findIndex(x => x.id === op.id); if (i !== -1) merged.splice(i, 1); }
            else if (op.action === "toggle") { const i = merged.findIndex(x => x.id === op.id); if (i !== -1) merged[i] = { ...merged[i], done: !merged[i].done }; }
            else if (op.action === "update") { const i = merged.findIndex(x => x.id === op.id); if (i !== -1) merged[i] = op.item; }
            else if (op.action === "star") { const i = merged.findIndex(x => x.id === op.id); if (i !== -1) merged[i] = { ...merged[i], starred: !merged[i].starred }; }
          });
          return merged;
        });
        setOfflineQueue([]);
        saveQueue([]);
        setToast("Back online — queue synced!");
      }
      return !prev;
    });
  };

  const addToQueue = useCallback((op) => {
    setOfflineQueue(prev => { const n = [...prev, op]; saveQueue(n); return n; });
  }, []);

  // ─ CRUD
  const handleSave = (item) => {
    if (editItem) {
      if (isOnline) setItems(prev => prev.map(i => i.id === item.id ? item : i));
      else { addToQueue({ action: "update", id: item.id, item }); }
    } else {
      if (isOnline) setItems(prev => [...prev, item]);
      else { addToQueue({ action: "add", item }); setItems(prev => [...prev, item]); }
    }
    setModalOpen(false);
    setEditItem(null);
    setToast(editItem ? "Updated!" : "Action item created!");
  };

  const handleDelete = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
    if (!isOnline) addToQueue({ action: "delete", id });
    setToast("Deleted");
  };

  const handleToggle = (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));
    if (!isOnline) addToQueue({ action: "toggle", id });
  };

  const handleStar = (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, starred: !i.starred } : i));
    if (!isOnline) addToQueue({ action: "star", id });
  };

  // ─ filter + sort
  const filtered = useMemo(() => {
    let res = items;
    if (filterType !== "All") res = res.filter(i => i.type === filterType);
    if (search) res = res.filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || (i.description || "").toLowerCase().includes(search.toLowerCase()));
    if (!showDone) res = res.filter(i => !i.done);
    res = [...res].sort((a, b) => {
      if (sortBy === "priority") return PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority);
      if (sortBy === "dueDate") return (a.dueDate || "z") < (b.dueDate || "z") ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
    // starred first
    res.sort((a, b) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0));
    return res;
  }, [items, filterType, search, showDone, sortBy]);

  if (loading) return <div style={{ background: "#0f172a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontFamily: "'DM Sans', sans-serif" }}>Loading…</div>;

  return (
    <div style={{ background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>
      <BgMesh />

      {/* ── Header ── */}
      <header style={{ position: "relative", zIndex: 1, background: "rgba(15,23,42,.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1e293b", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Flag size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontFamily: "'Playfair Display', serif", color: "#f1f5f9", letterSpacing: "-.5px" }}>ActionFlow</h1>
            <span style={{ fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: 1 }}>Action Item Manager</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* online toggle */}
          <button onClick={toggleOnline} title={isOnline ? "Go Offline" : "Come Online"} style={{ background: isOnline ? "#166534" : "#7c2d12", border: "none", borderRadius: 20, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, color: "#fff", fontSize: 12 }}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? "Online" : "Offline"}
          </button>
          {!isOnline && offlineQueue.length > 0 && <span style={{ fontSize: 11, color: "#fb923c", background: "#7c2d1222", padding: "3px 9px", borderRadius: 12 }}>{offlineQueue.length} queued</span>}
          {/* add button */}
          <button onClick={() => { setEditItem(null); setModalOpen(true); }} style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", borderRadius: 9, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <Plus size={15} /> New
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto", padding: "22px 16px 40px" }}>
        {/* offline banner */}
        {!isOnline && (
          <div style={{ background: "#451a03", border: "1px solid #92400e", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <WifiOff size={16} color="#fb923c" />
            <span style={{ color: "#fdba74", fontSize: 13 }}>You're offline. Changes are saved locally and will sync when you reconnect.</span>
          </div>
        )}

        {/* stats */}
        <StatsBar items={items} />

        {/* search + filter bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 140, position: "relative" }}>
            <Search size={15} color="#475569" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 13, padding: "8px 12px 8px 32px", boxSizing: "border-box", outline: "none" }} />
          </div>
          <button onClick={() => setShowDone(p => !p)} style={{ background: showDone ? "#334155" : "#1e293b", border: "1px solid #334155", borderRadius: 8, color: showDone ? "#e2e8f0" : "#64748b", fontSize: 12, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Check size={13} /> {showDone ? "Showing done" : "Done hidden"}
          </button>
        </div>

        {/* type filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          {FILTERS.map(f => {
            const t = ACTION_TYPES.find(x => x.key === f);
            return <Chip key={f} active={filterType === f} color={t?.color} onClick={() => setFilterType(f)}>{f === "All" ? "All Types" : t?.label}</Chip>;
          })}
        </div>

        {/* sort */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 18 }}>
          <Filter size={13} color="#475569" />
          <span style={{ color: "#64748b", fontSize: 12 }}>Sort by</span>
          {["createdAt", "priority", "dueDate"].map(s => (
            <button key={s} onClick={() => setSortBy(s)} style={{ background: sortBy === s ? "#6366f122" : "transparent", border: `1px solid ${sortBy === s ? "#6366f1" : "#334155"}`, borderRadius: 16, color: sortBy === s ? "#818cf8" : "#64748b", fontSize: 11, padding: "3px 10px", cursor: "pointer" }}>
              {s === "createdAt" ? "Newest" : s === "priority" ? "Priority" : "Due Date"}
            </button>
          ))}
        </div>

        {/* list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#475569" }}>
            <Flag size={36} style={{ opacity: .3, marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No action items here yet.<br /><span style={{ color: "#64748b" }}>Tap <strong style={{ color: "#818cf8" }}>+ New</strong> to get started.</span></p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(item => (
              <div key={item.id} style={{ position: "relative" }}>
                <ItemCard item={item} onEdit={i => { setEditItem(i); setModalOpen(true); }} onDelete={handleDelete} onToggle={handleToggle} />
                {/* star button overlay */}
                <button onClick={() => handleStar(item.id)} style={{ position: "absolute", top: 10, right: 68, background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <Star size={14} color={item.starred ? "#facc15" : "#475569"} fill={item.starred ? "#facc15" : "none"} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ── Create / Edit Modal ── */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} title={editItem ? "Edit Action" : "New Action Item"}>
        <ItemForm item={editItem} onSave={handleSave} onClose={() => { setModalOpen(false); setEditItem(null); }} />
      </Modal>

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* ── Google Fonts ── */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
    </div>
  );
}
