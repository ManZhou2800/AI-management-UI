/**
 * Demo backend used only when the real local cloud proxy (/api/cloud) is unreachable,
 * e.g. in the Lovable preview. Data lives in this browser's localStorage.
 */
const KEY = "admin-demo-db-v2";
type R = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type DB = Record<string, R[]> & { _settings?: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const iso = (daysFromNow: number, h = 10) => { const d = new Date(); d.setDate(d.getDate() + daysFromNow); d.setHours(h, 0, 0, 0); return d.toISOString(); };
const day = (n: number) => iso(n).slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): DB {
  const lead = (id: string, name: string, phone: string, extra: R): R => ({
    id, name, phone, education: "高三", budget: "30-50万", country: "英国", project: "英国2+2", source: "小程序",
    owner: "", level: "C", status: "新线索", tags: [], created_at: iso(-1), ...extra,
  });
  const leads = [
    lead("l1", "王子涵家长", "13856001234", { created_at: iso(0, 9), level: "A", tags: ["高意向", "关注奖学金"] }),
    lead("l2", "李明轩", "13955102233", { created_at: iso(0, 8), country: "澳洲", project: "澳洲3+1", source: "开放日" }),
    lead("l3", "陈思雨家长", "18756003344", { owner: "张老师", level: "A", status: "跟进中", next_follow_at: day(-2), last_contact_at: day(-6), tags: ["家长决策"], booked: true }),
    lead("l4", "赵一鸣", "15256104455", { owner: "张老师", level: "B", status: "跟进中", next_follow_at: day(0), last_contact_at: day(-3), country: "香港", project: "香港硕士", education: "本科大三" }),
    lead("l5", "孙佳怡", "13685105566", { owner: "刘老师", level: "B", status: "跟进中", next_follow_at: day(2), last_contact_at: day(-1), tags: ["价格敏感"] }),
    lead("l6", "周浩然家长", "13956106677", { owner: "刘老师", level: "A", status: "已报名", booked: true, visited: true, enrolled: true, last_contact_at: day(-4) }),
    lead("l7", "吴雨桐", "18256107788", { owner: "张老师", level: "C", status: "无效", tags: ["空号"] }),
    lead("l8", "郑凯文", "13856001234", { created_at: iso(-3), source: "公众号" }),
    lead("l9", "黄心怡家长", "17756108899", { owner: "刘老师", level: "A", status: "跟进中", next_follow_at: day(-1), last_contact_at: day(-8), booked: true, visited: true, country: "新加坡", project: "新加坡直博" }),
    lead("l10", "林子墨", "15056109900", { created_at: iso(-2), source: "朋友推荐", level: "B" }),
  ];
  return {
    leads,
    lead_notes: [
      { id: "n1", lead_id: "l3", author: "张老师", note: "电话沟通，家长关心住宿和安全，约了周六到校。", created_at: iso(-6) },
      { id: "n2", lead_id: "l4", author: "张老师", note: "微信发送了香港硕士项目介绍。", created_at: iso(-3) },
      { id: "n3", lead_id: "l9", author: "刘老师", note: "已到访，对新加坡项目很感兴趣，等家长商量。", created_at: iso(-8) },
    ],
    bookings: [
      { id: "b1", name: "陈思雨家长", phone: "18756003344", people: 2, visit_date: day(3), slot: "上午", status: "待确认", created_at: iso(-1) },
      { id: "b3", name: "赵一鸣", phone: "15256104455", people: 1, visit_date: day(0), slot: "下午", status: "已确认", created_at: iso(-2) },
      { id: "b4", name: "孙佳怡", phone: "13685105566", people: 2, visit_date: day(1), slot: "上午", status: "待确认", created_at: iso(-1) },
      { id: "b5", name: "李明轩", phone: "13955102233", people: 4, visit_date: day(12), slot: "下午", status: "待确认", created_at: iso(0) },
      { id: "b2", name: "黄心怡家长", phone: "17756108899", people: 3, visit_date: day(-8), slot: "下午", status: "已到访", created_at: iso(-10) },
    ],
    events: [{ id: "e1", name: "2026秋季校园开放日", starts_at: iso(4, 9), created_at: iso(-10) }],
    event_signups: [], ads: [], images: [], tags: [], projects: [],
    profiles: [{ id: "u1", account: "admin", name: "管理员", role: "super_admin", active: true }],
    user_roles: [],
  };
}

function load(): DB {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "null"); if (v) return v; } catch { /* reseed */ }
  const db = seed(); save(db); return db;
}
function save(db: DB) { localStorage.setItem(KEY, JSON.stringify(db)); }

export async function demoCloud(action: string, data: R): Promise<unknown> {
  const db = load();
  const t = (name: string) => (db[name] ||= []);
  switch (action) {
    case "loginAdmin":
    case "registerAdmin":
      return { account: data.account || "admin", name: data.name || "管理员", token: "demo", role: "super_admin" };
    case "logoutAdmin": return null;
    case "listAdmins": return t("profiles");
    case "createAdvisor": t("profiles").push({ id: uid(), account: data.account, name: data.name, role: "advisor", active: true }); break;
    case "adminBundle": return { ...db, school: db._settings?.school || {}, system: db._settings?.system || {} };
    case "adminSaveSetting": db._settings = { ...(db._settings || {}), [data.key]: data.value }; break;
    case "adminSave": {
      const { note, author, ...values } = data.values || {};
      const rows = t(data.table);
      const id = data.id || uid();
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) rows[i] = { ...rows[i], ...values }; else rows.push({ id, created_at: new Date().toISOString(), ...values });
      if (data.table === "leads" && note) t("lead_notes").unshift({ id: uid(), lead_id: id, author: author || "", note, created_at: new Date().toISOString() });
      save(db); return { id };
    }
    case "adminRemove": db[data.table] = t(data.table).filter((r) => r.id !== data.id); break;
    case "adminAssignLeads": t("leads").forEach((l) => { if (data.ids.includes(l.id)) { l.owner = data.owner; if (l.status === "新线索") l.status = "跟进中"; } }); break;
    case "adminMergeLeads": t("leads").forEach((l) => { if (data.dropIds.includes(l.id)) l.mergedInto = data.keepId; }); t("lead_notes").forEach((n) => { if (data.dropIds.includes(n.lead_id)) n.lead_id = data.keepId; }); break;
    case "saveOpenDay": { const id = uid(); t("events").push({ id, ...data, created_at: new Date().toISOString() }); save(db); return { id }; }
    case "adminKeepUpload": t("images").push({ id: uid(), url: data.url, created_at: new Date().toISOString() }); break;
    default: break;
  }
  save(db);
  return null;
}
