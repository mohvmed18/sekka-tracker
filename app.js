(() => {
  const PEOPLE = ["Sohila", "Nour", "Shahd"];
  const STATES = ["todo", "doing", "done", "blocked"];
  const SL = { todo: "To do", doing: "In progress", done: "Done", blocked: "Blocked" };
  const DAYS = ["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-08","2026-11-09","2026-11-10","2026-11-11","2026-11-12",
    "2026-11-15","2026-11-16","2026-11-17","2026-11-18","2026-11-19","2026-11-22","2026-11-23","2026-11-24","2026-11-25","2026-11-26"];
  const GROUPS = ["Before kickoff", "Week 1 · Discovery", "Week 2 · Flows and wireframes", "Week 3 · UI design", "Week 4 · Delivery"];
  const PAGES = [{ id: "mine", label: "My tasks", ic: "i-user" }, { id: "overview", label: "Overview", ic: "i-home" }, { id: "tasks", label: "Tasks", ic: "i-list" }, { id: "meetings", label: "Meetings", ic: "i-cal" }, { id: "log", label: "Daily log", ic: "i-msg" }, { id: "team", label: "Team", ic: "i-team" }, { id: "account", label: "Account", ic: "i-user" }];
  const SB_URL = "https://jesmxsxpufklyzvnrpda.supabase.co", SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Implc214c3hwdWZrbHl6dm5ycGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM1NjIxOTUsImV4cCI6MjEwOTEzODE5NX0.epUbwdAONjAWLiFXzIEiJx9kj7A_E979eC8_tH-Hlkc", DOMAIN = "sekka.team";
  const sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  const S = { tasks: [], meetings: [], log: {}, loaded: {}, ro: false, db: true, offline: false, owner: false, me: "", profile: null, profiles: [], team: { coordinator: "", parts: {} }, notes: {} };
  const pages = () => PAGES.filter((x) => x.id !== "account" && (S.owner ? x.id !== "mine" : x.id !== "team" && (x.id !== "log" || isCoord())));
  const coordName = () => S.team.coordinator;
  const isCoord = () => !!S.profile?.is_coordinator;
  const canPost = () => S.owner || isCoord();
  const canEdit = (k) => S.owner || k === S.me || k === "Team" || (k === "Coordinator" && isCoord());
  const cairoDay = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date(iso));
  const cairoHour = (iso) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", hourCycle: "h23" }).format(new Date(iso)));
  function logStatus(d, e) {
    if (e && e.txt && e.at) return cairoDay(e.at) === d && cairoHour(e.at) < 10 ? "On time" : "Late";
    if (e && e.rcv) return e.rcv;
    return d === today() && hour() < 10 ? "Expected" : "Missing";
  }
  const ui = { filter: "week", open: null };

  // ---------- helpers ----------
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const ic = (id, cls = "") => `<svg class="i ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
  const sic = (s) => `<svg class="i s" aria-hidden="true"><use href="#s-${s}"/></svg>`;
  const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());
  const hour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"], WDL = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const D = (iso) => new Date(iso + "T12:00:00Z");
  const fmt = (iso) => `${WD[D(iso).getUTCDay()]} ${D(iso).getUTCDate()} ${MON[D(iso).getUTCMonth()]}`;
  const fmtL = (iso) => `${WDL[D(iso).getUTCDay()]} ${D(iso).getUTCDate()} ${MON[D(iso).getUTCMonth()]}`;
  const between = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
  const owners = (t) => Object.keys(t.st || {});
  const name = (k) => k === "Team" ? "Team" : k === "Sayed" ? (S.owner ? "You" : "Sayed") : k;
  const done = (t, k) => t.st[k] === "done";
  const allDone = (t) => owners(t).every((k) => done(t, k));
  const lateFor = (t, k) => t.d < today() && !done(t, k);
  const anyLate = (t) => owners(t).some((k) => lateFor(t, k) && t.st[k] !== "blocked");
  const groupOf = (d) => { const i = DAYS.indexOf(d); return i < 0 ? 0 : Math.floor(i / 5) + 1; };
  const short = (m) => m.title.replace(/^[CR]\d · /, "");

  function phase() {
    const t = today();
    if (t < DAYS[0]) return { kind: "before", days: between(t, DAYS[0]) };
    if (t > DAYS.at(-1)) return { kind: "after" };
    let n = 0; DAYS.forEach((d, i) => { if (d <= t) n = i + 1; });
    return { kind: DAYS.includes(t) ? "work" : "weekend", day: n, week: Math.ceil(n / 5), name: n <= 5 ? "Discovery" : n <= 8 ? "UX architecture" : n <= 10 ? "UX design" : n <= 17 ? "UI design" : "Delivery" };
  }
  const nextWorkday = () => DAYS.find((d) => d > today()) || null;
  const currentGroup = () => { const t = today(); if (t < DAYS[0]) return 1; if (t > DAYS.at(-1)) return 4; const d = DAYS.includes(t) ? t : nextWorkday(); return groupOf(d); };

  function attention() {
    const t = today(), h = hour(), out = [];
    if (canPost() && DAYS.includes(t) && h >= 10 && !(S.log[t]?.txt || S.log[t]?.rcv)) out.push({ ic: "i-msg", red: true, t: "No daily update logged today", d: "The coordinator's update was due at 10:00", r: "Today", go: "log" });
    for (const m of S.owner ? S.meetings : []) {
      if (m.kind === "review" && m.d < t && !m.decision) out.push({ ic: "i-flag", t: `${m.id} has no result yet`, d: `Mark Pass or Fix for the ${short(m).toLowerCase()}`, r: fmt(m.d), go: "meetings" });
      if (m.kind === "review" && m.decision === "Fix within 2 days") {
        const due = DAYS[Math.min(DAYS.indexOf(m.d) + 2, DAYS.length - 1)];
        if (t <= due) out.push({ ic: "i-flag", t: `Fixes from ${m.id} are due`, d: "The team must fix the gaps before moving on", r: fmt(due), go: "meetings" });
      }
    }
    const blocked = [], late = [];
    for (const task of S.tasks) for (const k of owners(task)) {
      if (task.st[k] === "blocked") blocked.push({ ic: "s-blocked", st: "blocked", red: true, t: `${name(k)} is blocked`, d: task.t, r: fmt(task.d), go: "tasks" });
      else if (lateFor(task, k)) late.push({ ic: "i-clock", red: true, t: `${name(k)} is late`, d: task.t, r: fmt(task.d), go: "tasks", sort: task.d });
    }
    late.sort((a, b) => a.sort.localeCompare(b.sort));
    return [...blocked, ...out.filter((x) => x.red), ...out.filter((x) => !x.red), ...late];
  }
  function counts() {
    let total = 0, nDone = 0, nLate = 0, nBlocked = 0;
    for (const x of S.tasks) for (const k of owners(x)) { total++; if (done(x, k)) nDone++; else if (x.st[k] === "blocked") nBlocked++; else if (lateFor(x, k)) nLate++; }
    return { total, nDone, nLate, nBlocked };
  }
  const nextMeeting = () => { const t = today(), h = hour(); return [...S.meetings].sort((a, b) => a.d.localeCompare(b.d)).find((m) => m.d > t || (m.d === t && h < 23)) || null; };

  // ---------- nav + head ----------
  function renderNav() {
    const v = current(), lateN = S.loaded.tasks ? counts().nLate + counts().nBlocked : 0;
    const item = (p) => `<a href="#${p.id}" ${v === p.id ? 'aria-current="page"' : ""}>${ic(p.ic)}<span>${p.label}</span>${p.id === "tasks" && lateN ? `<span class="count" aria-label="${lateN} late or blocked">${lateN}</span>` : ""}</a>`;
    const P = pages();
    $("#nav-side").innerHTML = P.map(item).join("");
    $("#nav-bottom").innerHTML = P.map(item).join("");
    $("#nav-bottom").style.gridTemplateColumns = `repeat(${P.length}, 1fr)`;
  }
  function renderHead() {
    const v = current(), p = phase();
    const sub = {
      overview: p.kind === "before" ? `Kickoff ${p.days === 1 ? "tomorrow" : `in ${p.days} days`} · Sunday 1 November` : p.kind === "after" ? "Project finished on Thursday 26 November" : `${fmtL(today())} · ${p.kind === "weekend" ? "Weekend" : `Day ${p.day} of 20`}`,
      mine: `${S.me}${isCoord() ? " · Coordinator" : ""}${S.profile?.part ? " · " + S.profile.part : ""}`,
      team: "Accounts for the team. Only you can see this page.",
      account: "Change the password you sign in with.",
      tasks: S.owner ? "Every task by week. Tap a status to change it." : "Every task and who does it. You only change your own status, the rest is there so you can see how the team is doing.",
      meetings: S.owner ? "Tuesday check-ins and Thursday reviews, all at 10 pm." : "When the team meets. Every meeting is at 10 pm.",
      log: canPost() ? "The coordinator's update, one row per working day." : `${coordName() || "The coordinator"} posts the team update here every day by 10:00.`,
    }[v];
    $("#h1").textContent = PAGES.find((x) => x.id === v).label; $("#hsub").textContent = sub;
    $("#banner").innerHTML = S.offline ? `<div class="banner" role="status">${ic("i-alert")}<span>Can't reach the saved data right now, so what you see may be out of date. Changes won't save until it reconnects.</span></div>` : "";
  }

  // ---------- overview ----------
  const skel = (n = 3) => `<div style="display:grid;gap:14px;padding:16px 0">${Array.from({ length: n }, (_, i) => `<div class="skel" style="width:${[70, 90, 55, 80][i % 4]}%"></div>`).join("")}</div>`;
  function card(cls, title, aside, body, foot) {
    return `<section class="card ${cls}"><div class="card-h"><h2>${title}</h2>${aside ? `<span class="aside">${aside}</span>` : ""}</div><div class="card-b">${body}</div>${foot ? `<div class="card-f">${foot}</div>` : ""}</section>`;
  }
  function viewOverview() {
    const ready = S.loaded.tasks && S.loaded.meetings && S.loaded.log;
    const p = phase();
    if (!ready) return `<div class="grid">${[0, 1, 2, 3].map(() => `<section class="card c3 stat">${skel(2)}</section>`).join("")}${card("c8", "Needs attention", "", skel(4))}${card("c4", "Next meeting", "", skel(3))}${card("c8", "Due", "", skel(3))}${card("c4", "Team progress", "", skel(3))}</div>`;
    if (!S.tasks.length) return `<div class="grid">${card("c12", "No schedule yet", "", `<div class="empty-st">${ic("i-list")}<b>The schedule hasn't been loaded</b><span>Ask Claude to load the Sekka schedule into this tracker.</span></div>`)}</div>`;
    const c = counts(), t = today();

    // stats
    const dayVal = p.kind === "before" ? `${p.days}<small>${p.days === 1 ? "day" : "days"} to kickoff</small>` : p.kind === "after" ? `Done<small>20 of 20 days</small>` : `${p.day}<small>of 20 days</small>`;
    const dayHint = p.kind === "before" ? "Starts Sunday 1 November" : p.kind === "after" ? "Finished 26 November" : `Week ${p.week} · ${p.name}`;
    const dayPct = p.kind === "before" ? 0 : p.kind === "after" ? 100 : p.day / 20 * 100;
    const pct = c.total ? Math.round(c.nDone / c.total * 100) : 0;
    const stats = `
      <section class="card c3 stat"><span class="label">Project day</span><span class="value">${dayVal}</span><div class="meter"><i style="width:${dayPct}%"></i></div><span class="hint">${dayHint}</span></section>
      <section class="card c3 stat"><span class="label">Tasks done</span><span class="value">${c.nDone}<small>of ${c.total}</small></span><div class="meter"><i style="width:${pct}%"></i></div><span class="hint">${pct}% complete</span></section>
      <section class="card c3 stat"><span class="label">Late</span><span class="value ${c.nLate ? "red" : ""}">${c.nLate}</span><div class="meter" style="visibility:hidden"></div><span class="hint">${c.nLate ? "Past their due date" : "Nothing overdue"}</span></section>
      <section class="card c3 stat"><span class="label">Blocked</span><span class="value ${c.nBlocked ? "red" : ""}">${c.nBlocked}</span><div class="meter" style="visibility:hidden"></div><span class="hint">${c.nBlocked ? "Waiting on help" : "No one is stuck"}</span></section>`;

    // attention
    const A = attention(), MAX = 6;
    const attnBody = A.length ? `<ul class="rows">${A.slice(0, MAX).map((a) => `<li><span class="dot-ic" style="color:${a.st ? "var(--blocked)" : a.red ? "var(--late)" : "var(--ink-2)"}">${a.st ? sic(a.st) : ic(a.ic, "s")}</span>
        <div><div class="t">${esc(a.t)}</div><div class="d">${esc(a.d)}</div></div><a class="r link" href="#${a.go}">${esc(a.r)} ${ic("i-right", "s")}</a></li>`).join("")}</ul>`
      : p.kind === "before" ? `<div class="empty-st">${ic("i-ok")}<b>Nothing yet</b><span>Alerts start once the project begins on Sunday.</span></div>`
      : p.kind === "after" && c.nDone === c.total ? `<div class="empty-st">${ic("i-ok")}<b>All tasks are done</b><span>The project is complete.</span></div>`
      : `<div class="empty-st">${ic("i-ok")}<b>Everything is on track</b><span>No late tasks, blockers or missing updates.</span></div>`;
    const attnFoot = A.length > MAX ? `<a class="link" href="#tasks">View all ${A.length} in Tasks ${ic("i-right", "s")}</a>` : "";

    // meeting
    const m = nextMeeting();
    let meetBody;
    if (!m) meetBody = `<div class="empty-st">${ic("i-cal")}<b>No meetings left</b><span>The final presentation was on 26 November.</span></div>`;
    else {
      const n = between(t, m.d), when = n === 0 ? "Tonight" : n === 1 ? "Tomorrow" : fmtL(m.d);
      const dur = m.id === "R4" ? 60 : m.kind === "review" ? 45 : 30;
      meetBody = `<div class="mt"><div class="mt-top"><span class="code ${m.kind === "review" ? "r" : ""}">${m.id}</span><div><b>${esc(short(m))}</b><span>${when}, 10 pm · ${dur} min</span></div></div>
        <div class="chips">${n === 0 ? `<span class="chip dark">Tonight</span>` : n === 1 ? `<span class="chip">Tomorrow</span>` : `<span class="chip">In ${n} days</span>`}<span class="chip">${m.kind === "review" ? "Phase review" : "Check-in"}</span></div>
        ${S.owner ? "" : "<!--"}<ul class="mini-checks">${(m.expect || []).map((e, i) => `<li class="${m.chk?.[i] ? "on" : ""}">${ic(m.chk?.[i] ? "i-sqc" : "i-sq", "s")}<span>${esc(e)}</span></li>`).join("")}</ul>${S.owner ? "" : "-->"}</div>`;
    }
    const meetFoot = m ? `<a class="link" href="#meetings" data-open="${m.id}">Open in Meetings ${ic("i-right", "s")}</a>` : "";

    // due
    let dueTitle, dueAside, dueList;
    if (p.kind === "after") { dueTitle = "Due"; dueAside = ""; dueList = null; }
    else if (p.kind === "work") { dueTitle = "Due today"; dueAside = fmtL(t); dueList = S.tasks.filter((x) => x.d === t); }
    else if (p.kind === "before") { const pre = S.tasks.filter((x) => x.d < DAYS[0]); dueTitle = pre.length ? "Before kickoff" : "Due on day 1"; dueAside = pre.length ? "Saturday 31 October" : fmtL(DAYS[0]); dueList = pre.length ? pre : S.tasks.filter((x) => x.d === DAYS[0]); }
    else { const nw = nextWorkday(); dueTitle = "Due next working day"; dueAside = fmtL(nw); dueList = S.tasks.filter((x) => x.d === nw); }
    const dueBody = dueList === null ? `<div class="empty-st">${ic("i-ok")}<b>Nothing left on the schedule</b><span>${c.total - c.nDone ? `${c.total - c.nDone} task statuses were never marked done.` : "Every task was completed."}</span></div>`
      : !dueList.length ? `<div class="empty-st">${ic("i-ok")}<b>Nothing due</b><span>No tasks are scheduled for this day.</span></div>`
      : `<ul class="rows">${dueList.map((x) => { const ks = owners(x), d = ks.filter((k) => done(x, k)).length;
          const ds = d === ks.length ? "done" : ks.some((k) => x.st[k] === "blocked") ? "blocked" : ks.some((k) => x.st[k] !== "todo") ? "doing" : "todo";
          return `<li><span class="dot-ic" data-s="${ds}">${sic(ds)}</span>
          <div><div class="t">${esc(x.t)}</div><div class="d">${ks.length > 1 ? ks.map(name).join(", ") : name(ks[0])}${x.del ? " · Deliverable" : ""}</div></div><span class="r">${d}/${ks.length} done</span></li>`; }).join("")}</ul>`;
    const dueFoot = dueList && dueList.length ? `<a class="link" href="#tasks">Open Tasks ${ic("i-right", "s")}</a>` : "";

    // team
    const team = PEOPLE.map((pp) => {
      const mine = S.tasks.filter((x) => pp in x.st), d = mine.filter((x) => done(x, pp)).length, l = mine.filter((x) => lateFor(x, pp) && x.st[pp] !== "blocked").length, b = mine.filter((x) => x.st[pp] === "blocked").length;
      const pc = mine.length ? Math.round(d / mine.length * 100) : 0;
      return `<div class="person"><span class="ava" aria-hidden="true">${pp[0]}</span><div><div class="nm">${pp}${b ? `<span class="chip red">${b} blocked</span>` : l ? `<span class="chip red">${l} late</span>` : ""}</div><div class="meter"><i style="width:${pc}%"></i></div></div><span class="pc">${d}/${mine.length}</span></div>`;
    }).join("");

    return `<div class="grid">${stats}
      ${card("c8", `Needs attention ${A.length ? `<span class="num-badge red">${A.length}</span>` : ""}`, "", attnBody, attnFoot)}
      ${card("c4", "Next meeting", "", meetBody, meetFoot)}
      ${card("c8", dueTitle, dueAside, dueBody, dueFoot)}
      ${card("c4", "Team progress", "Own tasks", `<div>${team}</div>`)}
    </div>`;
  }

  // ---------- tasks ----------
  // editable status: outlined pill with a chevron. read-only status: plain text, no pill
  function statusBtn(x, k) {
    const s = x.st[k] || "todo", late = lateFor(x, k) && s !== "blocked";
    if (S.ro || !canEdit(k)) return stView(x, k);
    return `<button class="st edit ${late ? "late" : ""}" data-act="status" data-id="${esc(x.id)}" data-k="${esc(k)}" data-s="${s}" aria-haspopup="menu" aria-label="${esc(name(k))}: ${SL[s]}${late ? ", late" : ""}. Change status">${sic(s)}<span>${late && s === "todo" ? "Late" : SL[s]}</span>${ic("i-down", "s chev")}</button>`;
  }
  function stView(x, k) {
    const s = x.st[k] || "todo", late = lateFor(x, k) && s !== "blocked";
    return `<span class="st-ro ${late ? "late" : ""}" data-s="${s}">${sic(s)}${late && s === "todo" ? "Late" : SL[s]}</span>`;
  }
  const kindOf = (x) => { const ks = owners(x); return PEOPLE.every((p) => ks.includes(p)) ? "each" : ks[0]; };
  function assignedCell(x) {
    const kind = kindOf(x);
    const theirs = kind !== "each" && !canEdit(kind) ? (() => { const st = x.st[kind] || "todo", late = lateFor(x, kind) && st !== "blocked"; return `<div class="people"><span class="pp ${late ? "late" : ""}" data-s="${st}">${sic(st)}${late && st === "todo" ? "Late" : SL[st]}</span></div>`; })() : "";
    if (kind === "each") {
      const people = PEOPLE.map((p) => {
        const s = x.st[p] || "todo", late = lateFor(x, p) && s !== "blocked", label = p === S.me ? "You" : p;
        return S.owner && !S.ro
          ? `<button class="pp edit ${late ? "late" : ""}" data-act="status" data-id="${esc(x.id)}" data-k="${p}" data-s="${s}" aria-haspopup="menu" aria-label="${p}: ${SL[s]}. Change status">${sic(s)}${label}</button>`
          : `<span class="pp ${late ? "late" : ""}" data-s="${s}" title="${p}: ${late && s === "todo" ? "Late" : SL[s]}">${sic(s)}${label}</span>`;
      }).join("");
      return `<div class="assign"><span class="tag">${ic("i-user", "s")}Each designer does her own</span><div class="people">${people}</div></div>`;
    }
    if (kind === "Team") return `<div class="assign"><span class="tag team">${ic("i-team", "s")}Whole team · one shared task</span></div>`;
    if (kind === "Coordinator") return `<div class="assign"><span class="tag">${ic("i-flag", "s")}Coordinator · ${S.owner ? esc(coordName() || "not set") : isCoord() ? "You" : esc(coordName() || "not set")}</span>${theirs}</div>`;
    return `<div class="assign"><span class="tag">${ic("i-user", "s")}${esc(name(kind))}${kind === "Sayed" && !S.owner ? " · team lead" : ""}</span>${theirs}</div>`;
  }
  function statusCell(x) {
    const kind = kindOf(x);
    if (kind === "each") {
      if (!S.owner) return statusBtn(x, S.me);
      const d = PEOPLE.filter((p) => done(x, p)).length;
      return `<span class="sum">${d} of 3 done</span>`;
    }
    return canEdit(kind) ? statusBtn(x, kind) : `<span class="not-yours">Not your task</span>`;
  }
  function viewTasks() {
    if (!S.loaded.tasks) return `<section class="card"><div class="card-b">${skel(6)}</div></section>`;
    const t = today(), cg = currentGroup();
    const lateCount = S.tasks.filter((x) => anyLate(x) || owners(x).some((k) => x.st[k] === "blocked")).length;
    const rows = S.tasks.filter((x) => ui.filter === "all" ? true : ui.filter === "late" ? anyLate(x) || owners(x).some((k) => x.st[k] === "blocked") : groupOf(x.d) === cg || (cg === 1 && groupOf(x.d) === 0));
    const groups = GROUPS.map(() => []); rows.forEach((x) => groups[groupOf(x.d)].push(x));
    const body = groups.map((g, gi) => !g.length ? "" : `<tr class="grp"><td colspan="4">${GROUPS[gi]}<span class="n">${g.filter(allDone).length} of ${g.length} done</span>${gi === cg && ui.filter !== "week" ? `<span class="chip now">Current</span>` : ""}</td></tr>` + g.map((x) => {
        const late = anyLate(x);
        return `<tr class="row"><td class="w-task"><div class="tt">${esc(x.t)}</div><div class="ts"><span class="m-only ${late ? "due-late" : x.d === t ? "due-today" : ""}">Due ${x.d === t ? "today" : fmt(x.d)} · </span>${esc(x.ph)}${x.del ? ` · Deliverable: ${esc(x.del)}` : ""}</div></td>
          <td class="w-due ${late ? "due-late" : x.d === t ? "due-today" : ""}">${x.d === t ? "Today" : fmt(x.d)}</td>
          <td class="w-assign">${assignedCell(x)}</td>
          <td class="w-stat ${kindOf(x) !== "each" && !canEdit(kindOf(x)) ? "na" : ""}"><span class="m-only st-lbl">${S.owner ? "Status" : "Your status"}</span>${statusCell(x)}</td></tr>`;
      }).join("")).join("");
    const empty = `<tr class="empty-row"><td colspan="4">${ui.filter === "late" ? "Nothing is late or blocked." : "No tasks this week."}</td></tr>`;
    return `<section class="card">
      <div class="toolbar"><div class="seg" role="group" aria-label="Filter tasks">
        <button data-act="filter" data-v="week" aria-pressed="${ui.filter === "week"}">This week</button>
        <button data-act="filter" data-v="all" aria-pressed="${ui.filter === "all"}">All weeks</button>
        <button data-act="filter" data-v="late" aria-pressed="${ui.filter === "late"}"><span class="d-only">Late and blocked</span><span class="m-only">Late</span>${lateCount ? ` <span class="n">${lateCount}</span>` : ""}</button></div>
        <div class="legend">${STATES.map((s) => `<span class="st-ro" data-s="${s}">${sic(s)}${SL[s]}</span>`).join("")}</div></div>
      <div class="scroll"><table class="tbl tasks"><thead><tr><th>Task</th><th>Due</th><th>Who does it</th><th>${S.owner ? "Status" : "Your status"}</th></tr></thead><tbody>${body || empty}</tbody></table></div>
    </section>`;
  }

  function viewMine() {
    if (!S.loaded.tasks) return `<section class="card"><div class="card-b">${skel(5)}</div></section>`;
    const me = S.me, t = today(), coord = isCoord(), cg = currentGroup();
    const keys = (x) => owners(x).filter((k) => k === me || k === "Team" || (k === "Coordinator" && coord));
    const mine = S.tasks.filter((x) => keys(x).length);
    const open = (x) => keys(x).some((k) => !done(x, k));
    const own = S.tasks.filter((x) => me in x.st), ownDone = own.filter((x) => done(x, me)).length;
    const late = mine.filter((x) => x.d < t && open(x));
    const todays = mine.filter((x) => x.d === t);
    const week = mine.filter((x) => x.d > t && (groupOf(x.d) === cg || (cg === 1 && groupOf(x.d) === 0)));
    const nextW = DAYS.find((d) => d > t && groupOf(d) !== cg);
    const upcoming = !todays.length && !week.length && nextW ? mine.filter((x) => groupOf(x.d) === groupOf(nextW)) : [];
    const line = (x) => `<li class="ml"><div><div class="t">${esc(x.t)}</div><div class="d"><span class="${x.d < t && open(x) ? "due-late" : ""}">${x.d === t ? "Due today" : "Due " + fmt(x.d)}</span>${x.del ? " · Deliverable" : ""}${keys(x).some((k) => k !== me) ? ` · ${keys(x).includes("Coordinator") ? "Your coordinator task" : "Shared by the whole team"}` : ""}</div></div>
      <span class="r mine-st">${keys(x).map((k) => statusBtn(x, k)).join("")}</span></li>`;
    const block = (title, list, aside, emptyText) => card("c12 mine", title, aside, list.length ? `<ul class="rows">${list.map(line).join("")}</ul>` : `<div class="empty-st" style="padding:18px 10px"><span>${emptyText}</span></div>`);
    const pct = own.length ? Math.round(ownDone / own.length * 100) : 0;
    const p = phase();
    return `<div class="grid">
      <section class="card c4 stat"><span class="label">My tasks done</span><span class="value">${ownDone}<small>of ${own.length}</small></span><div class="meter"><i style="width:${pct}%"></i></div><span class="hint">${pct}% complete</span></section>
      <section class="card c4 stat"><span class="label">Late</span><span class="value ${late.length ? "red" : ""}">${late.length}</span><div class="meter" style="visibility:hidden"></div><span class="hint">${late.length ? "Finish these first" : "Nothing overdue"}</span></section>
      <section class="card c4 stat"><span class="label">Next meeting</span><span class="value" style="font-size:20px">${(() => { const m = nextMeeting(); return m ? `${m.id}<small>${m.d === t ? "tonight" : fmt(m.d)}, 10 pm</small>` : "None"; })()}</span><div class="meter" style="visibility:hidden"></div><span class="hint">${(() => { const m = nextMeeting(); return m ? esc(short(m)) : "Project complete"; })()}</span></section>
      ${late.length ? block(`Late <span class="num-badge red">${late.length}</span>`, late, "", "") : ""}
      ${p.kind === "work" || todays.length ? block("Today", todays, fmtL(t), "Nothing due today.") : ""}
      ${upcoming.length ? block("Next week", upcoming, "", "") : block("Rest of this week", week, "", p.kind === "after" ? "The project is finished." : "Nothing else this week.")}
    </div>`;
  }

  function viewSchedule() {
    const t = today(), h = hour(), list = [...S.meetings].sort((a, b) => a.d.localeCompare(b.d));
    const body = list.map((m) => {
      const n = between(t, m.d);
      const st = m.d < t || (m.d === t && h >= 23) ? `<span class="chip">Done</span>` : n === 0 ? `<span class="chip dark">Tonight</span>` : n === 1 ? `<span class="chip">Tomorrow</span>` : `<span class="chip" style="background:none;padding:0;color:var(--muted)">In ${n} days</span>`;
      return `<tr class="row"><td class="w-code"><span class="code ${m.kind === "review" ? "r" : ""}" style="width:34px;height:34px;font-size:12px">${m.id}</span></td>
        <td><span class="tt" style="display:block">${esc(short(m))}</span><span class="ts"><span class="m-only">${fmt(m.d)}, 10 pm · </span>${m.kind === "review" ? "Phase review" : "Check-in"} · ${m.id === "R4" ? 60 : m.kind === "review" ? 45 : 30} min</span></td>
        <td class="w-when">${fmt(m.d)}, 10 pm</td><td class="w-res">${st}</td></tr>`;
    }).join("");
    return `<section class="card"><div class="scroll"><table class="tbl meets sched"><thead><tr><th></th><th>Meeting</th><th>When</th><th></th></tr></thead><tbody>${body || `<tr class="empty-row"><td colspan="4">No meetings yet.</td></tr>`}</tbody></table></div></section>`;
  }
  function viewMeetings() {
    if (!S.loaded.meetings) return `<section class="card"><div class="card-b">${skel(6)}</div></section>`;
    if (!S.owner) return viewSchedule();
    const t = today(), list = [...S.meetings].sort((a, b) => a.d.localeCompare(b.d)), dis = S.ro ? "disabled" : "";
    const body = list.map((m) => {
      const open = ui.open === m.id, seen = (m.chk || []).filter(Boolean).length, total = (m.expect || []).length;
      const res = m.kind === "review" && m.decision ? `<span class="chip ${m.decision === "Pass" ? "green" : "amber"}">${esc(m.decision === "Pass" ? "Passed" : "Fix in 2 days")}</span>`
        : m.d === t ? `<span class="chip dark">Tonight</span>` : m.d < t ? (m.kind === "review" ? `<span class="chip red">No result</span>` : `<span class="chip">Held</span>`) : `<span class="chip" style="background:none;padding:0;color:var(--muted)">Upcoming</span>`;
      const row = `<tr class="row ${open ? "open" : ""}" data-toggle="${m.id}"><td class="w-chev"><button class="rowbtn" data-act="toggle" data-id="${m.id}" aria-expanded="${open}" aria-label="${open ? "Close" : "Open"} ${esc(m.title)}">${ic(open ? "i-down" : "i-right", "s")}</button></td>
        <td class="w-code"><span class="code ${m.kind === "review" ? "r" : ""}" style="width:34px;height:34px;font-size:12px">${m.id}</span></td>
        <td><button class="rowbtn" data-act="toggle" data-id="${m.id}"><span><span class="tt" style="display:block">${esc(short(m))}</span><span class="ts"><span class="m-only">${fmt(m.d)}, 10 pm · ${seen}/${total} seen · </span>${m.kind === "review" ? "Phase review" : "Check-in"} · ${m.id === "R4" ? 60 : m.kind === "review" ? 45 : 30} min</span></span></button></td>
        <td class="w-when">${fmt(m.d)}, 10 pm</td><td class="w-chk">${seen} of ${total} seen</td><td class="w-res">${res}</td></tr>`;
      if (!open) return row;
      return row + `<tr class="expand"><td colspan="6"><div class="detail">
        <div><h3>What to see</h3><div class="checks">${(m.expect || []).map((e, i) => `<label><input type="checkbox" data-act="chk" data-m="${m.id}" data-i="${i}" ${m.chk?.[i] ? "checked" : ""} ${dis || (S.owner ? "" : "disabled")}><span>${esc(e)}</span></label>`).join("")}</div></div>
        ${m.kind === "review" && S.owner ? `<div><h3>Result</h3><div class="radio">${[["Pass", "Pass"], ["Fix within 2 days", "Fix within 2 days"]].map(([v, l]) => `<label><input type="radio" name="dec-${m.id}" data-act="dec" data-m="${m.id}" value="${v}" ${m.decision === v ? "checked" : ""} ${dis}>${l}</label>`).join("")}</div></div>` : ""}
        ${S.owner ? `<div><h3><label for="n-${m.id}">Private notes</label> · only you can see these</h3><textarea id="n-${m.id}" rows="3" data-act="notes" data-m="${m.id}" ${dis} placeholder="Scores, feedback and action items">${esc(S.notes[m.id] ?? m.notes ?? "")}</textarea></div>` : `<p class="ts" style="margin:0">Have everything on this list ready before the meeting.</p>`}
      </div></td></tr>`;
    }).join("");
    return `<section class="card"><div class="scroll"><table class="tbl meets"><thead><tr><th></th><th></th><th>Meeting</th><th>When</th><th>Checklist</th><th>Result</th></tr></thead><tbody>${body || `<tr class="empty-row"><td colspan="6">No meetings loaded.</td></tr>`}</tbody></table></div></section>`;
  }

  // ---------- daily log ----------
  function viewLog() {
    if (!S.loaded.log) return `<section class="card"><div class="card-b">${skel(6)}</div></section>`;
    const t = today(), h = hour(), dis = S.ro ? "disabled" : "";
    const days = DAYS.filter((d) => d <= t).reverse();
    if (!days.length) return `<section class="card"><div class="card-b"><div class="empty-st">${ic("i-msg")}<b>No updates yet</b><span>The first update arrives on Sunday 1 November by 10:00.</span></div></div></section>`;
    const body = days.map((d) => {
      const e = S.log[d] || {}, key = "log-" + d, open = ui.open === key;
      const ls = logStatus(d, e);
      const st = ls === "On time" ? `<span class="chip green">On time</span>` : ls === "Late" ? `<span class="chip amber">Late</span>` : ls === "Expected" ? `<span class="chip" style="background:none;padding:0;color:var(--muted)">Expected by 10:00</span>` : `<span class="chip red">Missing</span>`;
      const row = `<tr class="row ${open ? "open" : ""}" data-toggle="${key}"><td class="w-chev"><button class="rowbtn" data-act="toggle" data-id="${key}" aria-expanded="${open}" aria-label="${open ? "Close" : "Open"} ${fmt(d)}">${ic(open ? "i-down" : "i-right", "s")}</button></td>
        <td class="w-when"><button class="rowbtn" data-act="toggle" data-id="${key}"><span><span class="tt" style="display:block;color:var(--ink)">${d === t ? "Today" : fmt(d)}</span><span class="ts">Day ${DAYS.indexOf(d) + 1}</span></span></button></td>
        <td class="w-res">${st}</td><td class="w-prev"><div class="preview">${e.txt ? esc(e.txt.split("\n")[0]) : `<span style="color:var(--muted)">—</span>`}</div></td></tr>`;
      if (!open) return row;
      return row + `<tr class="expand"><td colspan="4"><div class="detail">
        <div><h3><label for="t-${d}">Team update</label>${e.at ? ` · posted ${new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" }).format(new Date(e.at))}${e.by ? " by " + esc(e.by) : ""}` : ""}</h3>${canPost() ? `<textarea id="t-${d}" rows="7" data-act="txt" data-d="${d}" ${dis} placeholder="What each of you did yesterday, what you're doing today, and anything blocking you">${esc(e.txt || "")}</textarea><p class="ts" style="margin:6px 0 0">Saves when you tap outside the box. Posting before 10:00 counts as on time.</p>` : e.txt ? `<p class="logtext">${esc(e.txt)}</p>` : `<p class="ts" style="margin:0">Nothing posted for this day.</p>`}</div>
      </div></td></tr>`;
    }).join("");
    return `<section class="card"><div class="scroll"><table class="tbl logs"><thead><tr><th></th><th>Day</th><th>Status</th><th>Update</th></tr></thead><tbody>${body}</tbody></table></div></section>`;
  }

  // ---------- team (lead only) ----------
  const tf = { open: null, msg: "", err: "", busy: false };
  async function teamCall(payload) {
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch(SB_URL + "/functions/v1/team-admin", { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + (session?.access_token || SB_KEY) }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || "Something went wrong");
    return j;
  }
  function viewTeam() {
    if (!S.owner) return "";
    const designers = S.profiles.filter((p) => p.role === "designer"), lead = S.profiles.find((p) => p.role === "lead");
    const free = PEOPLE.filter((n) => !designers.some((p) => p.name === n));
    const row = (p) => `<div class="member"><span class="ava" aria-hidden="true">${esc(p.name[0])}</span>
      <div><div class="nm">${esc(p.name)}${p.role === "lead" ? `<span class="chip">Team lead</span>` : ""}${p.is_coordinator ? `<span class="chip dark">Coordinator</span>` : ""}</div><div class="sub">Username ${esc(p.username)}${p.part ? " · " + esc(p.part) : ""}</div></div>
      <div class="acts">${p.role === "designer" && !p.is_coordinator ? `<button class="btn ghost sm" data-act="t-coord" data-id="${p.id}">Make coordinator</button>` : ""}<button class="btn ghost sm" data-act="t-open" data-id="${p.id}">${tf.open === p.id ? "Cancel" : "Reset password"}</button>${p.role === "designer" ? `<button class="btn danger sm" data-act="t-del" data-id="${p.id}">Remove</button>` : ""}</div>
      ${tf.open === p.id ? `<form class="inline-form" data-form="pw" data-id="${p.id}"><input type="password" name="pw" placeholder="New password, 8 or more characters" minlength="8" required autocomplete="new-password"><button class="btn sm" ${tf.busy ? "disabled" : ""}>Save password</button></form>` : ""}</div>`;
    const add = free.length ? card("c12", "Add a designer", "", `<form data-form="add" autocomplete="off"><div class="form-grid">
        <label class="field"><span>Name</span><select name="name">${free.map((n) => `<option>${n}</option>`).join("")}</select></label>
        <label class="field"><span>Username</span><input name="username" placeholder="for example nour" pattern="[A-Za-z0-9]{3,20}" required autocapitalize="none"></label>
        <label class="field"><span>Password</span><input name="password" type="password" minlength="8" required autocomplete="new-password" placeholder="8 or more characters"></label>
        <label class="field"><span>Part of the product</span><input name="part" placeholder="for example Cash settlement"></label></div>
        <label class="check-row"><input type="checkbox" name="coord">She is the coordinator</label>
        <p class="err">${esc(tf.err)}</p><button class="btn" ${tf.busy ? "disabled" : ""}>Create account</button></form><p class="ts" style="margin:12px 0 16px">Usernames are letters and numbers only. Send each girl her username and password privately.</p>`) : "";
    return `<div class="grid">${card("c12", "Team", `${designers.length} of 3 designers`, `<div>${[lead, ...designers].filter(Boolean).map(row).join("")}</div>${tf.msg ? `<p class="okmsg" style="margin:8px 0 12px">${esc(tf.msg)}</p>` : ""}${tf.open && tf.err ? `<p class="err" style="margin:8px 0 12px">${esc(tf.err)}</p>` : ""}`)}${add}</div>`;
  }
  function viewAccount() {
    return `<div class="grid">${card("c6", "Change password", "", `<form data-form="mypw" style="padding-top:16px">
      <label class="field"><span>New password</span><input type="password" name="pw" minlength="8" required autocomplete="new-password"></label>
      <label class="field"><span>Type it again</span><input type="password" name="pw2" minlength="8" required autocomplete="new-password"></label>
      <p class="${tf.msg ? "okmsg" : "err"}">${esc(tf.msg || tf.err)}</p><button class="btn" ${tf.busy ? "disabled" : ""}>Save password</button></form><div style="height:16px"></div>`)}</div>`;
  }
  document.addEventListener("submit", async (e) => {
    const f = e.target.closest("form[data-form]"); if (!f) return;
    e.preventDefault(); const fd = new FormData(f), kind = f.dataset.form;
    tf.err = ""; tf.msg = ""; tf.busy = true; render();
    try {
      if (kind === "add") { await teamCall({ action: "create", name: fd.get("name"), username: fd.get("username"), password: fd.get("password"), part: fd.get("part"), is_coordinator: !!fd.get("coord") }); tf.msg = `Account created for ${fd.get("name")}. Username ${String(fd.get("username")).toLowerCase()}`; }
      if (kind === "pw") { await teamCall({ action: "password", id: f.dataset.id, password: fd.get("pw") }); tf.open = null; tf.msg = "Password changed."; }
      if (kind === "mypw") { if (fd.get("pw") !== fd.get("pw2")) throw new Error("The two passwords don't match"); const { error } = await sb.auth.updateUser({ password: String(fd.get("pw")) }); if (error) throw error; tf.msg = "Your password is changed."; }
      await loadProfiles();
    } catch (err) { tf.err = err.message || "Something went wrong"; }
    tf.busy = false; render();
  });

  // ---------- render ----------
  const VIEWS = { mine: viewMine, overview: viewOverview, tasks: viewTasks, meetings: viewMeetings, log: viewLog, team: viewTeam, account: viewAccount };
  const current = () => { const h = location.hash.slice(1); if (pages().some((p) => p.id === h)) return h; return S.owner ? "overview" : "mine"; };
  function render() { if (!S.profile) return; renderNav(); renderHead(); renderUser(); $("#view").innerHTML = VIEWS[current()](); }
  function renderUser() {
    const p = S.profile, role = p.role === "lead" ? "Team lead" : isCoord() ? "Designer · Coordinator" : "Designer";
    const acts = `<button class="signout" data-act="signout">Sign out</button>`;
    $("#side-foot").innerHTML = `<div class="side-user"><span>Signed in as</span><span class="nm">${esc(p.name)}</span><span>${role}</span><div class="acts">${acts}</div></div>`;
    $("#mobile-user").innerHTML = `<span>Signed in as ${esc(p.name)}</span>${acts}`;
  }
  function safeRender() { const a = document.activeElement; if ((a && a.tagName === "TEXTAREA") || !menu.hidden) return; render(); }
  window.addEventListener("hashchange", () => { closeMenu(); tf.msg = ""; tf.err = ""; tf.open = null; if (current() === "log" && !ui.open?.startsWith("log-")) ui.open = "log-" + today(); render(); window.scrollTo({ top: 0 }); });

  // ---------- status menu ----------
  const menu = $("#menu"); let target = null;
  function openMenu(btn) {
    target = btn; const cur = btn.dataset.s;
    const sheet = matchMedia("(max-width: 780px)").matches;
    const task = S.tasks.find((y) => y.id === btn.dataset.id);
    menu.innerHTML = (sheet ? `<div class="sheet-h"><b>${esc(name(btn.dataset.k))}</b><span>${esc(task ? task.t : "")}</span></div>` : "") +
      STATES.map((s) => `<button role="menuitemradio" aria-checked="${s === cur}" data-set="${s}"><span class="c-${s}">${sic(s)}</span>${SL[s]}${s === cur ? '<span class="cur">Current</span>' : ""}</button>`).join("") +
      (sheet ? `<button class="cancel" data-cancel>Cancel</button>` : "");
    menu.classList.toggle("sheet", sheet); $("#scrim").hidden = !sheet;
    menu.hidden = false;
    if (sheet) { menu.style.left = ""; menu.style.top = ""; }
    else {
      const r = btn.getBoundingClientRect(), h = menu.offsetHeight;
      menu.style.left = Math.max(8, Math.min(r.left, innerWidth - 176)) + "px";
      menu.style.top = (r.bottom + h + 8 > innerHeight ? r.top - h - 4 : r.bottom + 4) + "px";
    }
    btn.setAttribute("aria-expanded", "true");
    menu.querySelector('[aria-checked="true"]')?.focus();
  }
  function closeMenu(refocus) { if (menu.hidden) return; menu.hidden = true; $("#scrim").hidden = true; target?.setAttribute("aria-expanded", "false"); if (refocus) target?.focus(); target = null; }
  menu.addEventListener("click", (e) => {
    if (e.target.closest("[data-cancel]")) return closeMenu(true);
    const b = e.target.closest("[data-set]"); if (!b || !target) return;
    const x = S.tasks.find((y) => y.id === target.dataset.id), k = target.dataset.k, v = b.dataset.set;
    closeMenu(); if (!x || x.st[k] === v) return;
    x.st = { ...x.st, [k]: v }; render();
    save(async () => { const { error } = await sb.rpc("set_task_status", { p_id: x.id, p_key: k, p_status: v }); if (error) throw error; });
  });
  menu.addEventListener("keydown", (e) => {
    const items = [...menu.querySelectorAll("button")], i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(true); });
  window.addEventListener("scroll", () => { if (!menu.classList.contains("sheet")) closeMenu(); }, { passive: true, capture: true });
  document.addEventListener("click", (e) => { if (e.target.id === "scrim") closeMenu(true); });

  // ---------- saving ----------
  let q = Promise.resolve();
  function setSaved(text, cls) { const el = $("#saved"); el.textContent = text; el.className = "saved " + (cls || ""); }
  function save(fn) {
    if (!S.db || S.ro) return;
    setSaved("Saving", "wait");
    q = q.then(fn).then(() => setSaved("All changes saved")).catch(() => { setSaved("Couldn't save. Try again.", "warn"); loadAll(); });
  }

  document.addEventListener("click", (e) => {
    if (!menu.hidden && !e.target.closest("#menu") && !e.target.closest('[data-act="status"]')) closeMenu();
    const op = e.target.closest("[data-open]"); if (op) { ui.open = op.dataset.open; }
    const b = e.target.closest("button[data-act]");
    if (!b) { const tr = e.target.closest("tr[data-toggle]"); if (tr && !e.target.closest("a, input, textarea, label")) { ui.open = ui.open === tr.dataset.toggle ? null : tr.dataset.toggle; render(); } return; }
    const act = b.dataset.act;
    if (act === "status") { if (target === b) return closeMenu(); closeMenu(); return openMenu(b); }
    if (act === "toggle") { ui.open = ui.open === b.dataset.id ? null : b.dataset.id; return render(); }
    if (act === "filter") { ui.filter = b.dataset.v; return render(); }
    if (act === "signout") { sb.auth.signOut(); return; }
    if (act === "t-open") { tf.open = tf.open === b.dataset.id ? null : b.dataset.id; tf.msg = ""; tf.err = ""; return render(); }
    if (act === "t-coord" || act === "t-del") {
      const p = S.profiles.find((x) => x.id === b.dataset.id); if (!p) return;
      if (act === "t-del" && !window.confirm(`Remove ${p.name}'s account? She won't be able to sign in. Her task statuses stay.`)) return;
      tf.msg = ""; tf.err = "";
      teamCall(act === "t-del" ? { action: "delete", id: p.id } : { action: "update", id: p.id, is_coordinator: true })
        .then(() => { tf.msg = act === "t-del" ? `${p.name}'s account was removed.` : `${p.name} is now the coordinator.`; return loadProfiles(); })
        .catch((err) => { tf.err = err.message; }).finally(render);
    }
  });
  document.addEventListener("change", (e) => {
    const el = e.target, act = el.dataset.act; if (!act) return;
    const m = el.dataset.m && S.meetings.find((x) => x.id === el.dataset.m);
    const ok = ({ error }) => { if (error) throw error; };
    if (act === "chk" && m && S.owner) { const chk = [...(m.chk || [])]; chk[Number(el.dataset.i)] = el.checked; m.chk = chk; render(); return save(async () => ok(await sb.from("meetings").update({ chk }).eq("id", m.id))); }
    if (act === "dec" && m && S.owner) { m.decision = el.value; render(); return save(async () => ok(await sb.from("meetings").update({ decision: el.value }).eq("id", m.id))); }
    if (act === "notes" && m && S.owner) { S.notes[m.id] = el.value; return save(async () => ok(await sb.from("meeting_notes").upsert({ meeting_id: m.id, notes: el.value }))); }
    if (act === "txt" && canPost()) { const d = el.dataset.d; S.log[d] = { ...(S.log[d] || {}), txt: el.value }; render();
      return save(async () => { const { data, error } = await sb.from("daily_log").upsert({ d, txt: el.value }).select().single(); if (error) throw error; S.log[d] = mapLog(data); safeRender(); }); }
  });

  // ---------- data ----------
  const mapLog = (r) => ({ txt: r.txt, at: r.posted_at, by: r.posted_by });
  async function loadProfiles() {
    const { data } = await sb.from("profiles").select("id, username, name, role, is_coordinator, part").order("created_at");
    S.profiles = data || [];
    const c = S.profiles.find((p) => p.is_coordinator);
    S.team = { coordinator: c ? c.name : "", parts: Object.fromEntries(S.profiles.map((p) => [p.name, p.part])) };
    const mine = S.profiles.find((p) => p.id === S.uid); if (mine) { S.profile = mine; S.me = mine.name; }
  }
  async function loadAll() {
    const [t, m, l] = await Promise.all([
      sb.from("tasks").select("*").order("d").order("o"),
      S.owner ? sb.from("meetings").select("*").order("d") : sb.rpc("meeting_schedule"),
      canPost() ? sb.from("daily_log").select("*") : Promise.resolve({ data: [], error: null }),
      loadProfiles(),
    ]);
    if (t.error || m.error || l.error) { S.offline = true; setSaved("Not connected", "warn"); safeRender(); return; }
    S.offline = false;
    S.tasks = t.data; S.meetings = m.data;
    S.log = Object.fromEntries(l.data.map((r) => [r.d, mapLog(r)]));
    if (S.owner) { const n = await sb.from("meeting_notes").select("*"); S.notes = Object.fromEntries((n.data || []).map((r) => [r.meeting_id, r.notes])); }
    S.loaded = { tasks: true, meetings: true, log: true };
    setSaved("All changes saved"); safeRender();
  }
  let channel = null, reloadTimer = null;
  const reloadSoon = () => { clearTimeout(reloadTimer); reloadTimer = setTimeout(loadAll, 250); };
  function subscribe() {
    if (channel) sb.removeChannel(channel);
    channel = sb.channel("tracker");
    ["tasks", "profiles"].concat(S.owner ? ["meetings", "meeting_notes"] : []).concat(canPost() ? ["daily_log"] : []).forEach((tb) => channel.on("postgres_changes", { event: "*", schema: "public", table: tb }, reloadSoon));
    channel.subscribe();
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && S.profile) loadAll(); });

  // ---------- sign in ----------
  const toEmail = (u) => `${String(u).trim().toLowerCase()}@${DOMAIN}`;
  function showAuth(mode, err = "") {
    $("#shell").hidden = true; $("#nav-bottom").hidden = true; const a = $("#auth"); a.hidden = false;
    const logo = `<div class="logo"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
    if (mode === "loading") { a.innerHTML = `<div class="auth-card">${logo}<h1>Sekka Tracker</h1><p>Loading</p></div>`; return; }
    if (mode === "setup") {
      a.innerHTML = `<form class="auth-card" id="f-setup">${logo}<h1>Set up the tracker</h1><p>Create the team lead account. This only appears once.</p>
        <label class="field"><span>Your name</span><input name="name" value="Sayed" required></label>
        <label class="field"><span>Username</span><input name="username" required pattern="[A-Za-z0-9]{3,20}" autocapitalize="none" autocomplete="username"></label>
        <label class="field"><span>Password</span><input name="password" type="password" minlength="8" required autocomplete="new-password" placeholder="8 or more characters"></label>
        <p class="err">${esc(err)}</p><button class="btn full">Create account</button></form>`;
      return;
    }
    a.innerHTML = `<form class="auth-card" id="f-login">${logo}<h1>Sekka Tracker</h1><p>Sign in with the username and password Sayed gave you.</p>
      <label class="field"><span>Username</span><input name="username" required autocapitalize="none" autocomplete="username" autofocus></label>
      <label class="field"><span>Password</span><input name="password" type="password" required autocomplete="current-password"></label>
      <p class="err">${esc(err)}</p><button class="btn full">Sign in</button></form>`;
  }
  document.addEventListener("submit", async (e) => {
    const f = e.target; if (f.id !== "f-login" && f.id !== "f-setup") return;
    e.preventDefault(); const fd = new FormData(f), btn = f.querySelector("button"); btn.disabled = true; btn.textContent = "Please wait";
    try {
      if (f.id === "f-setup") {
        const r = await fetch(SB_URL + "/functions/v1/team-admin", { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY }, body: JSON.stringify({ action: "bootstrap", name: fd.get("name"), username: fd.get("username"), password: fd.get("password") }) });
        const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || "Could not create the account");
      }
      const { error } = await sb.auth.signInWithPassword({ email: toEmail(fd.get("username")), password: String(fd.get("password")) });
      if (error) throw new Error(/invalid/i.test(error.message) ? "Wrong username or password" : error.message);
    } catch (err) { showAuth(f.id === "f-setup" ? "setup" : "login", err.message); }
  });
  async function startSession(session) {
    S.uid = session.user.id;
    await loadProfiles();
    if (!S.profile) { await sb.auth.signOut(); showAuth("login", "This account has no access to the tracker."); return; }
    S.owner = S.profile.role === "lead";
    $("#auth").hidden = true; $("#shell").hidden = false; $("#nav-bottom").hidden = false;
    if (current() === "log") ui.open = "log-" + today();
    render(); await loadAll(); subscribe();
  }
  let started = null;
  sb.auth.onAuthStateChange((event, session) => {
    if (session && started !== session.user.id) { started = session.user.id; startSession(session); }
    if (!session && event !== "INITIAL_SESSION_PENDING") {
      if (started || event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        started = null; S.profile = null; if (channel) { sb.removeChannel(channel); channel = null; }
        fetch(SB_URL + "/functions/v1/team-admin", { method: "POST", headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY }, body: JSON.stringify({ action: "status" }) })
          .then((r) => r.json()).then((j) => showAuth(j.needsSetup ? "setup" : "login")).catch(() => showAuth("login"));
      }
    }
  });
  showAuth("loading");
})();
