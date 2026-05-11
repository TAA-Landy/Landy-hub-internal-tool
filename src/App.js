import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { db } from './firebase';
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, deleteField, query, orderBy,
} from 'firebase/firestore';

/* ── Cloudinary (free file upload — no Firebase Storage needed) ── */
const CLOUDINARY_CLOUD  = 'denqjqqly';
const CLOUDINARY_PRESET = 'landy_hub';

/* ── Icons ─────────────────────────────────────────────────────────────────── */
const mk = (ch) => ({ className = '' }) =>
  <span className={`inline-flex items-center justify-center leading-none select-none ${className}`}>{ch}</span>;

const CalendarIcon = mk('📅'), PlusIcon = mk('+'), EyeIcon = mk('👁'),
  GridIcon = mk('▦'), ChartIcon = mk('▥'), PlayIcon = mk('▶'),
  PauseIcon = mk('Ⅱ'), CheckIcon = mk('✓'), ClockIcon = mk('⏱'),
  FilterIcon = mk('⏷'), SearchIcon = mk('⌕'), AlertIcon = mk('!'),
  FileIcon = mk('▤'), LinkIcon = mk('🔗'),
  ChevLeft = mk('‹'), ChevRight = mk('›'), CloseIcon = mk('×'),
  DlIcon = mk('↓'), BanIcon = mk('⊘'), UserIcon = mk('👤'), TagIcon = mk('🏷');

/* ── Constants ──────────────────────────────────────────────────────────────── */
const JOB_CATEGORIES = [
  'Content Portfolio (รับมอบบ้าน / บ้านสวย)',
  'VDO Social (FB, IG, LINE, Web, iPad)',
  'Website Improvement (CI AB ส่งโซน)',
  'VDO บ้านระหว่างก่อสร้าง / พาตรวจบ้าน',
  'Creative Content (YouTube, TikTok)',
  'งานอื่นๆ',
];

const MONTHLY_TARGETS = {
  'Content Portfolio (รับมอบบ้าน / บ้านสวย)': 20,
  'VDO Social (FB, IG, LINE, Web, iPad)':       12,
  'Website Improvement (CI AB ส่งโซน)':          5,
  'VDO บ้านระหว่างก่อสร้าง / พาตรวจบ้าน':        8,
  'Creative Content (YouTube, TikTok)':           4,
  'งานอื่นๆ':                                    10,
};

const VIDEO_SLA = new Set([
  'Video – Cut / ตัดต่อ Footage',
  'Video – Motion Graphic / Animation',
  'Video – Full Production',
]);

const BRANDS = [
  { name: 'All Brands',  color: 'bg-slate-800'   },
  { name: 'Landy Home',  color: 'bg-red-600'     },
  { name: 'Landy Grand', color: 'bg-yellow-500'  },
  { name: 'Trendy Home', color: 'bg-pink-500'    },
  { name: 'Capplus',     color: 'bg-sky-500'     },
  { name: 'Rudolf',      color: 'bg-emerald-400' },
  { name: 'MM',          color: 'bg-violet-500'  },
  { name: 'CR',          color: 'bg-teal-500'    },
];

const SLA_TYPES = [
  { type: 'Social Media – Template + AI',            minHours: 10/60, stdHours: 25/60, note: 'ต่อ 1 Post' },
  { type: 'Social Media – New Design',               minHours: 1,     stdHours: 2,     note: 'ต่อ 1 Post' },
  { type: 'Resize Online (ปรับขนาดเท่านั้น)',        minHours: 0.5,   stdHours: 0.75,  note: 'ต่อ 1 ไฟล์ (6-10 sizes)' },
  { type: 'Resize Online + New Artwork',             minHours: 1,     stdHours: 2,     note: 'ต่อ 1 ไฟล์' },
  { type: 'Resize Offline / Billboard',              minHours: 1,     stdHours: 2,     note: 'ต่อ 1 ไฟล์' },
  { type: 'ปรับสี / ข้อความเล็กน้อย',                minHours: 0.25,  stdHours: 0.5,   note: 'ต่อ 1 ชิ้น' },
  { type: 'New Design',                              minHours: 2,     stdHours: 3.5,   note: 'ต่อ 1 ชิ้น' },
  { type: 'New Design – Complex / Key Visual',       minHours: 3.5,   stdHours: 4,     note: 'ต่อ 1 ชิ้น' },
  { type: 'ชุดภาพ (> 3 ชิ้น, Style เดียว)',          minHours: 2.5,   stdHours: 4,     note: 'ชิ้นแรกเต็ม + 20 นาที/ชิ้นถัดไป' },
  { type: 'E-Catalog New Design (≤ 40 Slides)',      minHours: 5,     stdHours: 8,     note: 'ต่อ 1 ชิ้น' },
  { type: 'ป้ายราคา / Label (ทุกสาขา)',              minHours: 1/3,   stdHours: 1,     note: 'ต่อ 1 ครั้ง' },
  { type: 'Video – Cut / ตัดต่อ Footage',            minHours: 1.5,   stdHours: 3,     note: 'ต่อ VDO ≤ 60 วิ' },
  { type: 'Video – Motion Graphic / Animation',      minHours: 2.5,   stdHours: 5,     note: 'ต่อ VDO ≤ 60 วิ' },
  { type: 'Video – Full Production',                 minHours: 16,    stdHours: 28,    note: 'ต่อ VDO ≤ 3 นาที' },
  { type: 'Presentation Template เดิม (≤ 10 Slides)',minHours: 0.5,   stdHours: 1,     note: '' },
  { type: 'Presentation New Design (≤ 10 Slides)',   minHours: 2.5,   stdHours: 3,     note: '' },
  { type: 'Banner / Signage ขนาดใหญ่ (Print-ready)', minHours: 2,    stdHours: 4.5,   note: 'ต่อ 1 ชิ้น' },
];

const GRAPHICS = [
  { id: 'B01', name: 'Landy Home'  },
  { id: 'B02', name: 'Landy Grand' },
  { id: 'B03', name: 'Trendy Home' },
  { id: 'B04', name: 'Capplus'     },
  { id: 'B05', name: 'Rudolf'      },
  { id: 'B06', name: 'MM'          },
  { id: 'B07', name: 'CR'          },
];

const PC = {
  1: { label: 'P1 Critical', color: 'text-red-700',    bg: 'bg-red-100 border-red-300',       dot: 'bg-red-500'    },
  2: { label: 'P2 High',     color: 'text-orange-700', bg: 'bg-orange-100 border-orange-300', dot: 'bg-orange-500' },
  3: { label: 'P3 Normal',   color: 'text-blue-700',   bg: 'bg-blue-100 border-blue-300',     dot: 'bg-blue-500'   },
  4: { label: 'P4 Low',      color: 'text-slate-500',  bg: 'bg-slate-100 border-slate-300',   dot: 'bg-slate-400'  },
};

const BRAND_THEMES = {
  'Landy Home':  { pageBg:'bg-red-50',     panelBg:'bg-white', panelBorder:'border-red-200',     softBg:'bg-red-50',     text:'text-red-700',    button:'bg-red-600',    buttonHover:'hover:bg-red-700'    },
  'Landy Grand': { pageBg:'bg-yellow-50',  panelBg:'bg-white', panelBorder:'border-yellow-200',  softBg:'bg-yellow-50',  text:'text-yellow-700', button:'bg-yellow-500', buttonHover:'hover:bg-yellow-600' },
  'Trendy Home': { pageBg:'bg-pink-50',    panelBg:'bg-white', panelBorder:'border-pink-200',    softBg:'bg-pink-50',    text:'text-pink-700',   button:'bg-pink-500',   buttonHover:'hover:bg-pink-600'   },
  'Capplus':     { pageBg:'bg-sky-50',     panelBg:'bg-white', panelBorder:'border-sky-200',     softBg:'bg-sky-50',     text:'text-sky-700',    button:'bg-sky-500',    buttonHover:'hover:bg-sky-600'    },
  'Rudolf':      { pageBg:'bg-emerald-50', panelBg:'bg-white', panelBorder:'border-emerald-200', softBg:'bg-emerald-50', text:'text-emerald-700',button:'bg-emerald-400',buttonHover:'hover:bg-emerald-500' },
  'MM':          { pageBg:'bg-violet-50',  panelBg:'bg-white', panelBorder:'border-violet-200',  softBg:'bg-violet-50',  text:'text-violet-700', button:'bg-violet-500', buttonHover:'hover:bg-violet-600' },
  'CR':          { pageBg:'bg-teal-50',    panelBg:'bg-white', panelBorder:'border-teal-200',    softBg:'bg-teal-50',    text:'text-teal-700',   button:'bg-teal-500',   buttonHover:'hover:bg-teal-600'   },
};

/* ── Utilities ──────────────────────────────────────────────────────────────── */
function fmtSec(s) {
  const n = Number.isFinite(s) && s > 0 ? Math.floor(s) : 0;
  return [Math.floor(n/3600), Math.floor((n%3600)/60), n%60]
    .map(v => String(v).padStart(2,'0')).join(':');
}
function fmtH(h) { return h < 1 ? `${Math.round(h*60)} นาที` : `${h}h`; }
function brandColor(n) { return BRANDS.find(b => b.name === n)?.color || 'bg-slate-500'; }
function getTheme(n) {
  return BRAND_THEMES[n] || { pageBg:'bg-slate-50', panelBg:'bg-white', panelBorder:'border-slate-200', softBg:'bg-slate-50', text:'text-slate-700', button:'bg-slate-900', buttonHover:'hover:bg-slate-800' };
}
function validLink(v) {
  if (!v) return false;
  try { const u = new URL(v); return u.protocol === 'http:' || u.protocol === 'https:'; }
  catch { return false; }
}
function fmtDate(v)     { return v ? new Date(v).toLocaleDateString('th-TH') : '-'; }
function fmtDateTime(v) { return v ? new Date(v).toLocaleString('th-TH', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '-'; }
function fmtDateInput(v) {
  if (!v) return '';
  const d = new Date(v);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function csvEsc(v) {
  const t = String(v ?? '');
  const s = /^[=+\-@]/.test(t) ? `'${t}` : t;
  return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g,'""')}"` : s;
}
function getSla(type) { return SLA_TYPES.find(s => s.type === type) ?? { minHours:1, stdHours:2, note:'' }; }

/* Next working day (skip Sat/Sun) */
function nextWorkday(ms) {
  const d = new Date(ms);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

/* Earliest allowed date string (YYYY-MM-DD) for date input */
function minWorkdayStr() {
  return fmtDateInput(nextWorkday(Date.now()).getTime());
}

/* Add working hours to a timestamp, skipping weekends */
function addWorkingHours(startMs, hours) {
  let remaining = hours * 3600 * 1000;
  let cursor    = new Date(startMs);
  const WORK_START = 9, WORK_END = 18; // 09:00–18:00
  while (remaining > 0) {
    const day = cursor.getDay();
    if (day === 0 || day === 6) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(WORK_START, 0, 0, 0);
      continue;
    }
    const endOfDay = new Date(cursor);
    endOfDay.setHours(WORK_END, 0, 0, 0);
    const avail = endOfDay - cursor;
    if (remaining <= avail) {
      cursor = new Date(cursor.getTime() + remaining);
      remaining = 0;
    } else {
      remaining -= avail;
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(WORK_START, 0, 0, 0);
    }
  }
  return cursor;
}

/* Calendar event style based on status + late check */
function calEventStyle(ticket, now) {
  const isLate = ticket.dueDate && now > ticket.dueDate && ticket.status !== 'Done';
  if (ticket.status === 'Done')
    return 'bg-green-100 border-green-300 text-green-800';
  if (isLate || ticket.status === 'Reviewing')
    return 'bg-red-100 border-red-300 text-red-800';
  if (ticket.status === 'Doing' || ticket.status === 'Paused')
    return 'bg-blue-100 border-blue-300 text-blue-800';
  return 'bg-slate-100 border-slate-300 text-slate-700'; // Waiting / IncompleteRejected
}

function calcKPIs(tickets) {
  const done  = tickets.filter(t => t.status === 'Done');
  const total = tickets.length || 1;
  const onTime      = done.filter(t => t.completedAt && t.dueDate && t.completedAt <= t.dueDate).length;
  const onTimeRate  = done.length ? Math.round(onTime / done.length * 100) : 0;
  const firstPass   = done.filter(t => t.revisions === 0).length;
  const firstPassRate = done.length ? Math.round(firstPass / done.length * 100) : 0;
  const avgRev      = done.length ? (done.reduce((s,t) => s + t.revisions, 0) / done.length).toFixed(1) : '0.0';
  const withTime    = done.filter(t => t.startedAt && t.completedAt);
  const avgMs       = withTime.length ? withTime.reduce((s,t) => s + (t.completedAt - t.startedAt), 0) / withTime.length : 0;
  const avgStd      = done.length ? done.reduce((s,t) => s + t.standardHours, 0) / done.length : 0;
  const completionPct = avgStd > 0 ? Math.round(avgMs / 3600000 / avgStd * 100) : 0;
  const incompleteCount = tickets.filter(t => t.status === 'IncompleteRejected' || t.incompleteRejectReason).length;
  const incompleteRate  = Math.round(incompleteCount / total * 100);
  const dcCount   = tickets.filter(t => t.isDirectionChange).length;
  const dcRate    = Math.round(dcCount / total * 100);
  return { onTimeRate, firstPassRate, avgRev, completionPct, incompleteRate, dcRate };
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */
function WorkloadBar({ hours }) {
  const pct = Math.min(hours / 8 * 100, 100);
  const c   = hours > 8 ? 'bg-red-500' : hours > 6 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] mb-0.5">
        <span className="text-slate-400">{hours.toFixed(1)}h / 8h</span>
        {hours > 8 && <span className="text-red-500 font-bold">Overload!</span>}
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${c}`} style={{ width:`${pct}%` }} />
      </div>
    </div>
  );
}

function StatCard({ title, value, hint, icon: Icon, accent = 'text-slate-900' }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</div>
          <div className={`text-3xl font-black mt-2 ${accent}`}>{value}</div>
          <div className="text-sm text-slate-500 mt-2">{hint}</div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, target, unit = '%', higherGood = true, monitorOnly = false }) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const tgt = parseFloat(target);
  const ok  = monitorOnly ? null : (higherGood ? num >= tgt : num <= tgt);
  const bg  = monitorOnly ? 'bg-slate-50 border-slate-200' : ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const vc  = monitorOnly ? 'text-slate-800' : ok ? 'text-green-700' : 'text-red-600';
  return (
    <div className={`rounded-3xl border p-5 ${bg}`}>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</div>
      <div className={`text-3xl font-black ${vc}`}>{value}{unit}</div>
      <div className={`text-xs mt-1 font-medium ${monitorOnly ? 'text-slate-500' : ok ? 'text-green-600' : 'text-red-500'}`}>
        {monitorOnly ? 'Monitor only' : `เป้า ${higherGood ? '≥' : '≤'} ${target}${unit} ${ok ? '✓' : '⚠ ต่ำกว่าเป้า'}`}
      </div>
    </div>
  );
}

function TicketCard({ ticket, onAction, showReviewFields = false, now }) {
  const [link,         setLink]         = useState('');
  const [fb,           setFb]           = useState('');
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => { setLink(ticket.attachment || ''); },          [ticket.attachment]);
  useEffect(() => { setFb(ticket.feedback || ''); },              [ticket.feedback, ticket.status]);
  useEffect(() => { setRejectReason(''); },                       [ticket.status]);

  const sla          = getSla(ticket.slaType);
  const liveTime     = ticket.status === 'Doing' && ticket.startedAt
    ? ticket.timeSpent + Math.floor((now - ticket.startedAt) / 1000) : ticket.timeSpent;
  const overSla      = liveTime > ticket.standardHours * 3600;
  const isLate       = ticket.dueDate && now > ticket.dueDate && ticket.status !== 'Done';
  const pConf        = PC[ticket.priority] || PC[3];
  const assigneeName = GRAPHICS.find(g => g.id === ticket.assignee)?.name || '-';

  return (
    <div className={`bg-white rounded-3xl border p-6 shadow-sm hover:shadow-md transition-shadow
      ${ticket.status === 'IncompleteRejected' ? 'border-orange-300' : isLate ? 'border-red-400' : ticket.priority === 1 ? 'border-red-300' : 'border-slate-200'}`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-white text-[10px] font-bold ${brandColor(ticket.brand)}`}>{ticket.brand}</span>
            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${pConf.bg} ${pConf.color}`}>{pConf.label}</span>
            {ticket.isDirectionChange && <span className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold">⚑ Direction Change</span>}
            {ticket.status === 'IncompleteRejected' && <span className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold">⊘ Brief ไม่ครบ</span>}
            {isLate && <span className="px-2.5 py-1 rounded-full bg-red-50 border border-red-300 text-red-700 text-[10px] font-bold">⚠ เลย Deadline</span>}
          </div>
          <h3 className="font-black text-slate-900 leading-tight">{ticket.title}</h3>
          {ticket.jobNo && <div className="text-[10px] text-slate-400 mt-0.5">{ticket.jobNo}</div>}
          {ticket.parentTicketId && <div className="text-xs text-slate-400 mt-0.5">อ้างอิง: <span className="font-bold text-slate-600">{ticket.parentTicketId}</span></div>}
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            {ticket.slaType}{ticket.platform ? ` · ${ticket.platform}` : ''}
          </div>
          {ticket.urgentReason && (
            <div className="mt-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
              <span className="font-bold">เหตุผลด่วน:</span> {ticket.urgentReason}
            </div>
          )}
        </div>
        <button
          onClick={() => { if (window.confirm(`ลบ ticket "${ticket.title}"?`)) onAction(ticket.id, 'delete'); }}
          aria-label="ลบ ticket"
          className="text-slate-300 hover:text-red-500 shrink-0"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Brief Summary */}
      {(ticket.objective || ticket.sizeFormat || ticket.copyText) && (
        <div className="mt-3 space-y-1 text-xs">
          {ticket.objective   && <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"><span className="font-bold text-slate-500">Objective:</span> {ticket.objective}</div>}
          {ticket.sizeFormat  && <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"><span className="font-bold text-slate-500">Size/Format:</span> {ticket.sizeFormat}</div>}
          {ticket.copyText    && <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2"><span className="font-bold text-slate-500">Copy:</span> {ticket.copyText}</div>}
          {ticket.constraints && <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2"><span className="font-bold text-amber-600">⚠ {ticket.constraints}</span></div>}
        </div>
      )}

      {ticket.incompleteRejectReason && (
        <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          <span className="font-bold">รายการที่ขาด:</span> {ticket.incompleteRejectReason}
        </div>
      )}

      {ticket.status === 'Doing' && (
        <div className="mt-4 space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Final Artwork Link</label>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="ใส่ลิงก์งานที่ทำเสร็จ (Drive / Figma ฯลฯ)"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          {link && !validLink(link) && <p className="text-xs text-red-500">ต้องขึ้นต้นด้วย http:// หรือ https://</p>}
        </div>
      )}

      {ticket.status === 'Waiting' && (
        <div className="mt-4 space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-orange-400">เหตุผลปฏิเสธ Brief ไม่ครบ (กรอกก่อนกด ปฏิเสธ)</label>
          <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            placeholder="ระบุรายการที่ขาด เช่น ยังไม่แนบ Reference file, ไม่ระบุ Platform"
            className="w-full rounded-2xl border border-orange-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-100" />
        </div>
      )}

      {ticket.attachment && ticket.status !== 'Doing' && (
        <div className="mt-3 text-sm">
          <a href={ticket.attachment} target="_blank" rel="noreferrer" className="text-blue-600 underline break-all">ดูงานที่ส่ง →</a>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Target Date</div>
          <div className={`font-bold ${isLate ? 'text-red-600' : 'text-slate-800'}`}>{fmtDate(ticket.dueDate)}</div>
          <div className="text-slate-400">std: {fmtH(sla.stdHours)} / min: {fmtH(sla.minHours)}</div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Report</div>
          {ticket.reportLink
            ? <a href={ticket.reportLink} target="_blank" rel="noreferrer" className="font-bold text-blue-600 underline break-all">เปิด report</a>
            : <div className="font-bold text-slate-400">ยังไม่มี</div>}
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Requester</div>
          <div className="font-bold text-slate-700">{ticket.requester || '-'}</div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Approver</div>
          <div className="font-bold text-slate-700">{ticket.approverName || '-'}</div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-slate-400" />
          <span className={`font-mono font-bold ${overSla ? 'text-red-600' : 'text-slate-900'}`}>{fmtSec(liveTime)}</span>
          <span className="text-slate-400">/ SLA {fmtH(ticket.standardHours)}</span>
          {overSla && <span className="text-xs text-red-500 font-bold">⚠ เกิน SLA</span>}
        </div>
        <span className="text-xs text-slate-500">{assigneeName} · Rev {ticket.revisions}x</span>
      </div>

      {showReviewFields && ticket.status === 'Reviewing' && (
        <div className="mt-4 space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Feedback — ระบุ อะไร / ที่ไหน / แก้เป็นอะไร
          </label>
          <textarea value={fb} onChange={e => setFb(e.target.value)} rows={3}
            placeholder="เช่น: headline บรรทัดแรก เปลี่ยนจาก 'Healthy' → 'สุขภาพดี' และย้ายโลโก้ไปมุมขวาล่าง"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          <p className="text-[10px] text-slate-400">รวม feedback จากทุก stakeholder ก่อนส่ง ห้ามทยอยส่งหลายรอบ</p>
        </div>
      )}

      {ticket.feedback && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <span className="font-bold">Feedback:</span> {ticket.feedback}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-5">
        {ticket.status === 'Waiting' && <>
          <button onClick={() => onAction(ticket.id, 'start')}
            className="flex-1 rounded-2xl bg-slate-900 text-white py-3 text-xs font-bold uppercase flex items-center justify-center gap-1">
            <PlayIcon className="w-3 h-3" /> Start
          </button>
          <button onClick={() => {
              if (!rejectReason.trim()) { alert('ระบุเหตุผลก่อนปฏิเสธ'); return; }
              onAction(ticket.id, 'reject_incomplete', { rejectReason });
            }}
            className="flex-1 rounded-2xl bg-orange-500 text-white py-3 text-xs font-bold uppercase flex items-center justify-center gap-1">
            <BanIcon className="w-3 h-3" /> ปฏิเสธ – Brief ไม่ครบ
          </button>
        </>}
        {ticket.status === 'Paused' && (
          <button onClick={() => onAction(ticket.id, 'start')}
            className="flex-1 rounded-2xl bg-slate-900 text-white py-3 text-xs font-bold uppercase flex items-center justify-center gap-1">
            <PlayIcon className="w-3 h-3" /> Resume
          </button>
        )}
        {ticket.status === 'Doing' && <>
          <button onClick={() => onAction(ticket.id, 'pause')}
            className="flex-1 rounded-2xl bg-amber-500 text-white py-3 text-xs font-bold uppercase flex items-center justify-center gap-1">
            <PauseIcon className="w-3 h-3" /> Pause
          </button>
          <button onClick={() => onAction(ticket.id, 'send_to_review', { attachment: link })}
            className="flex-1 rounded-2xl bg-green-600 text-white py-3 text-xs font-bold uppercase flex items-center justify-center gap-1">
            <EyeIcon className="w-3 h-3" /> ส่งตรวจ
          </button>
        </>}
        {ticket.status === 'Reviewing' && <>
          <button onClick={() => onAction(ticket.id, 'approve', { feedback: fb })}
            className="flex-1 rounded-2xl bg-green-600 text-white py-3 text-xs font-bold uppercase flex items-center justify-center gap-1">
            <CheckIcon className="w-3 h-3" /> Approve
          </button>
          <button onClick={() => onAction(ticket.id, 'reject', { feedback: fb })}
            className="flex-1 rounded-2xl bg-rose-600 text-white py-3 text-xs font-bold uppercase">
            Reject – แก้ใหม่
          </button>
        </>}
        {ticket.status === 'IncompleteRejected' && (
          <div className="w-full rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 py-3 text-xs font-bold text-center">
            รอผู้สั่งงานเพิ่มข้อมูลที่ขาด
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSection({ theme, tickets, filterBrand, onExport }) {
  const [dashTab,     setDashTab]     = useState('overview');
  const [monthOffset, setMonthOffset] = useState(0);

  const kpi    = useMemo(() => calcKPIs(tickets), [tickets]);
  const counts = useMemo(() => ({
    total:      tickets.length,
    done:       tickets.filter(t => t.status === 'Done').length,
    review:     tickets.filter(t => t.status === 'Reviewing').length,
    incomplete: tickets.filter(t => t.status === 'IncompleteRejected').length,
  }), [tickets]);

  /* ── Monthly KPI helpers ── */
  const selectedMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthLabel = selectedMonth.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

  const monthTickets = useMemo(() => {
    const y = selectedMonth.getFullYear();
    const m = selectedMonth.getMonth();
    return tickets.filter(t => {
      const d = new Date(t.createdAt);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [tickets, selectedMonth]);

  const deliveryKPI = useMemo(() => {
    const done = monthTickets.filter(t => t.status === 'Done');
    const artDone = done.filter(t => !VIDEO_SLA.has(t.slaType));
    const vidDone = done.filter(t =>  VIDEO_SLA.has(t.slaType));
    const onTime = (arr) => arr.filter(t => t.completedAt && t.dueDate && t.completedAt <= t.dueDate).length;
    return {
      artRate:  artDone.length ? Math.round(onTime(artDone) / artDone.length * 100) : null,
      vidRate:  vidDone.length ? Math.round(onTime(vidDone) / vidDone.length * 100) : null,
      artCount: artDone.length,
      vidCount: vidDone.length,
    };
  }, [monthTickets]);

  const categoryVolume = useMemo(() =>
    JOB_CATEGORIES.map(cat => {
      const all  = monthTickets.filter(t => t.jobCategory === cat);
      const done = all.filter(t => t.status === 'Done').length;
      const target = MONTHLY_TARGETS[cat] || 10;
      return { cat, done, total: all.length, target, pct: Math.min(Math.round(done / target * 100), 100) };
    })
  , [monthTickets]);

  const overallDone   = categoryVolume.reduce((s, c) => s + c.done, 0);
  const overallTarget = categoryVolume.reduce((s, c) => s + c.target, 0);
  const overallPct    = Math.min(Math.round(overallDone / overallTarget * 100), 100);

  return (
    <div className={`space-y-8 rounded-[2rem] p-4 md:p-6 ${theme.pageBg}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Analytics Dashboard</h1>
          <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${theme.softBg} ${theme.text}`}>
            {filterBrand === 'All Brands' ? 'All Business Units' : `Unit: ${filterBrand}`}
          </div>
        </div>
        <button onClick={onExport}
          className={`inline-flex items-center gap-2 rounded-2xl text-white px-5 py-3 text-sm font-bold ${theme.button} ${theme.buttonHover}`}>
          <DlIcon className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {[['overview','ภาพรวม KPI'],['monthly','Monthly Summary']].map(([id,label]) => (
          <button key={id} onClick={() => setDashTab(id)}
            className={`px-5 py-2.5 rounded-2xl text-sm font-bold border transition ${dashTab === id ? `${theme.button} text-white border-transparent` : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {dashTab === 'overview' && <><div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={`${theme.panelBg} rounded-3xl border ${theme.panelBorder} p-1`}><StatCard title="Total Tickets"  value={counts.total}      hint="ทั้งหมดในระบบ"          icon={FileIcon}  accent={theme.text} /></div>
        <div className={`${theme.panelBg} rounded-3xl border ${theme.panelBorder} p-1`}><StatCard title="Done"           value={counts.done}       hint="ปิดงานแล้ว"             icon={CheckIcon} accent={theme.text} /></div>
        <div className={`${theme.panelBg} rounded-3xl border ${theme.panelBorder} p-1`}><StatCard title="Pending Review" value={counts.review}     hint="รออนุมัติ"              icon={EyeIcon}   accent={theme.text} /></div>
        <div className={`${theme.panelBg} rounded-3xl border ${theme.panelBorder} p-1`}><StatCard title="Brief ไม่ครบ"   value={counts.incomplete} hint="ถูกปฏิเสธโดย Graphic"  icon={AlertIcon} accent={theme.text} /></div>
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">KPI หลัก (เป้าหมายรายเดือน)</div>
        <div className="grid md:grid-cols-3 gap-4">
          <KPICard title="On-Time Delivery Rate"    value={kpi.onTimeRate}    target="85" higherGood />
          <KPICard title="First-Pass Approval Rate" value={kpi.firstPassRate} target="70" higherGood />
          <KPICard title="Avg. Revision Rounds"     value={kpi.avgRev}        target="1.5" unit=" รอบ" higherGood={false} />
        </div>
      </div>

      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">KPI Monitor (ติดตาม ไม่ตัดสิน)</div>
        <div className="grid md:grid-cols-3 gap-4">
          <KPICard title="Completion Time vs SLA" value={kpi.completionPct}  target="120" higherGood={false} monitorOnly />
          <KPICard title="Incomplete Brief Rate"  value={kpi.incompleteRate} target="10"  higherGood={false} monitorOnly />
          <KPICard title="Direction Change Rate"  value={kpi.dcRate}         target="-"   monitorOnly />
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <div className={`${theme.panelBg} rounded-3xl border ${theme.panelBorder} p-6`}>
          <div className={`font-black text-lg mb-4 ${theme.text}`}>Performance by Brand</div>
          <div className="space-y-4">
            {BRANDS.filter(b => b.name !== 'All Brands').map(brand => {
              const list = tickets.filter(t => t.brand === brand.name);
              const done = list.filter(t => t.status === 'Done').length;
              const pct  = Math.round(done / (list.length || 1) * 100);
              const p1   = list.filter(t => t.priority === 1).length;
              return (
                <div key={brand.name} className={`rounded-2xl px-3 py-3 ${filterBrand === brand.name ? theme.softBg : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-bold text-slate-700">{brand.name}</span>
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      {p1 > 0 && <span className="text-red-500 font-bold">P1×{p1}</span>}
                      <span>{done}/{list.length}</span>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${brand.color}`} style={{ width:`${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className={`${theme.panelBg} rounded-3xl border ${theme.panelBorder} p-6`}>
          <div className={`font-black text-lg mb-4 ${theme.text}`}>Recent Completed</div>
          <div className="space-y-3">
            {tickets.filter(t => t.status === 'Done').slice(-5).reverse().map(t => (
              <div key={t.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-slate-800 text-sm">{t.title}</div>
                  <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold border ${(PC[t.priority]||PC[3]).bg} ${(PC[t.priority]||PC[3]).color}`}>
                    {(PC[t.priority]||PC[3]).label}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{t.brand} · {fmtSec(t.timeSpent)} · Rev {t.revisions}x</div>
                {t.completedAt && t.dueDate && (
                  <div className={`text-xs mt-1 font-bold ${t.completedAt <= t.dueDate ? 'text-green-600' : 'text-red-500'}`}>
                    {t.completedAt <= t.dueDate ? '✓ On-Time' : '⚠ Late'}
                  </div>
                )}
              </div>
            ))}
            {tickets.filter(t => t.status === 'Done').length === 0 && (
              <div className="text-slate-400 text-sm">ยังไม่มีงานที่ปิดแล้ว</div>
            )}
          </div>
        </div>
      </div>
      </>}

      {/* ── MONTHLY SUMMARY TAB ── */}
      {dashTab === 'monthly' && (
        <div className="space-y-8">
          {/* Month selector */}
          <div className="flex items-center gap-3">
            <button onClick={() => setMonthOffset(o => o-1)} className="w-9 h-9 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"><ChevLeft /></button>
            <div className="text-lg font-black">{monthLabel}</div>
            <button onClick={() => setMonthOffset(o => o+1)} className="w-9 h-9 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"><ChevRight /></button>
            {monthOffset !== 0 && <button onClick={() => setMonthOffset(0)} className="text-xs text-slate-400 underline">กลับเดือนนี้</button>}
          </div>

          {/* Content Delivery Rate */}
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Content Delivery Rate — เป้าหมาย 100%</div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { label: 'Artwork Delivery', rate: deliveryKPI.artRate, count: deliveryKPI.artCount, color: 'bg-blue-500' },
                { label: 'Video Delivery',   rate: deliveryKPI.vidRate, count: deliveryKPI.vidCount, color: 'bg-violet-500' },
              ].map(({ label, rate, count, color }) => (
                <div key={label} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</div>
                  {rate === null ? (
                    <div className="text-2xl font-black text-slate-300">— <span className="text-sm font-normal">ยังไม่มีข้อมูล</span></div>
                  ) : (
                    <>
                      <div className={`text-4xl font-black mt-1 ${rate === 100 ? 'text-green-600' : rate >= 80 ? 'text-amber-600' : 'text-red-600'}`}>{rate}%</div>
                      <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width:`${rate}%`, transition:'width 0.5s' }} />
                      </div>
                      <div className="text-xs text-slate-400 mt-2">{count} งานที่ Done ในเดือนนี้</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Scorecard */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Monthly Scorecard — จำนวนงานจริง vs เป้าหมาย</div>
              <div className={`text-xs font-bold px-3 py-1 rounded-full ${overallPct >= 100 ? 'bg-green-100 text-green-700' : overallPct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                รวม {overallDone} / {overallTarget} งาน ({overallPct}%)
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
              {categoryVolume.map(({ cat, done, total, target, pct }) => (
                <div key={cat}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-bold text-slate-700 flex-1 min-w-0 truncate pr-2">{cat}</span>
                    <div className="shrink-0 flex items-center gap-2 text-xs">
                      <span className={`font-black ${pct >= 100 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-slate-400'}`}>{done}</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-slate-400">{target} เป้า</span>
                      <span className={`ml-1 font-bold px-2 py-0.5 rounded-full text-[10px] ${pct >= 100 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{pct}%</span>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-400' : 'bg-blue-400'}`}
                      style={{ width:`${pct}%` }}
                    />
                  </div>
                  {total > done && <div className="text-[10px] text-slate-400 mt-1">{total - done} งานยังไม่ Done</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Production Volume detail */}
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Production Volume — รายละเอียดงานเดือนนี้</div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {categoryVolume.map(({ cat, done, total }) => (
                <div key={cat} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 line-clamp-2">{cat}</div>
                  <div className="text-3xl font-black text-slate-900">{total} <span className="text-slate-300 text-lg font-normal">งาน</span></div>
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="text-green-600 font-bold">✓ Done {done}</span>
                    <span className="text-slate-400">· In Progress {total - done}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Default new job state ──────────────────────────────────────────────────── */
const defaultNewJob = () => ({
  title: '', brand: 'Landy Home', slaType: SLA_TYPES[0].type, priority: 3,
  objective: '', platform: '', sizeFormat: '', copyText: '', constraints: '',
  requester: '', approverName: '', attachment: '', assignee: 'B01',
  dueDate: fmtDateInput(nextWorkday(Date.now() + 86400000).getTime()),
  reportLink: '', isDirectionChange: false, parentTicketId: '',
  directorApproved: false,
  urgentReason: '', headApproved: false,
  jobCategory: JOB_CATEGORIES[0],
});

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function App() {
  const [tab,        setTab]    = useState('home');
  const [tickets,    setTickets]= useState([]);
  const [loading,    setLoading]= useState(true);
  const [filterBrand,setFB]     = useState('All Brands');
  const [quickView,  setQuickView] = useState(null); // 'brand' | 'graphic' | null
  const [brandViewBrand, setBVBrand] = useState('Landy Home');
  const [graphicViewId,  setGVId]   = useState('B01');
  const [search,     setSearch] = useState('');
  const [newJob,       setJob]       = useState(defaultNewJob);
  const [now,          setNow]       = useState(Date.now());
  const [weekOffset,   setWeek]      = useState(0);
  const [uploadState,  setUpload]    = useState(null); // null | number(%) | 'done' | 'error'
  const fileInputRef = useRef(null);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/jpg','image/png','application/pdf'];
    if (!allowed.includes(file.type)) { alert('รองรับเฉพาะ JPG, PNG, PDF'); return; }
    if (file.size > 20 * 1024 * 1024)  { alert('ไฟล์ต้องไม่เกิน 20 MB'); return; }
    setUpload(0);
    const fd = new FormData();
    fd.append('file',         file);
    fd.append('upload_preset', CLOUDINARY_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setUpload(Math.round(ev.loaded / ev.total * 100));
    };
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (res.secure_url) {
          setJob(prev => ({ ...prev, attachment: res.secure_url }));
          setUpload('done');
        } else { setUpload('error'); }
      } catch { setUpload('error'); }
    };
    xhr.onerror = () => setUpload('error');
    xhr.send(fd);
  }, []);

  /* Real-time Firestore listener */
  useEffect(() => {
    const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Firestore error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  /* Live timer */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* Derived state */
  const filtered = useMemo(() => {
    let base = tickets;

    // Quick view overrides brand filter
    if (quickView === 'brand') {
      base = base.filter(t => t.brand === brandViewBrand);
    } else if (quickView === 'graphic') {
      base = base.filter(t => t.assignee === graphicViewId && t.status !== 'Done');
    } else {
      if (filterBrand !== 'All Brands') base = base.filter(t => t.brand === filterBrand);
    }

    if (search) {
      base = base.filter(t =>
        [t.title, t.brand, t.objective, t.platform, t.requester]
          .join(' ').toLowerCase().includes(search.toLowerCase())
      );
    }
    return base;
  }, [tickets, filterBrand, search, quickView, brandViewBrand, graphicViewId]);

  const counts = useMemo(() => ({
    total:  tickets.length,
    active: tickets.filter(t => t.status !== 'Done').length,
    review: tickets.filter(t => t.status === 'Reviewing').length,
    done:   tickets.filter(t => t.status === 'Done').length,
    p1:     tickets.filter(t => t.priority === 1).length,
  }), [tickets]);

  const dashTheme = useMemo(() => getTheme(filterBrand), [filterBrand]);

  const calDays = useMemo(() => {
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7); // เริ่มจาก อาทิตย์
    sunday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const jobsByCell = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      if (!t.dueDate) continue;
      const key = `${t.assignee}__${new Date(t.dueDate).toDateString()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return (gid, d) => map.get(`${gid}__${d.toDateString()}`) ?? [];
  }, [filtered]);

  const workloadByCell = useMemo(() => {
    const map = new Map();
    for (const t of tickets) {
      if (!t.dueDate || t.status === 'Done') continue;
      const key = `${t.assignee}__${new Date(t.dueDate).toDateString()}`;
      map.set(key, (map.get(key) ?? 0) + (t.standardHours || 0));
    }
    return (gid, d) => map.get(`${gid}__${d.toDateString()}`) ?? 0;
  }, [tickets]);

  /* Workload warning: active hours per graphic */
  const workloadByGraphic = useMemo(() => {
    const map = {};
    for (const g of GRAPHICS) {
      const active = tickets.filter(t => t.assignee === g.id && (t.status === 'Doing' || t.status === 'Paused' || t.status === 'Waiting'));
      map[g.id] = { count: active.length, hours: active.reduce((s,t) => s + (t.standardHours||0), 0) };
    }
    return map;
  }, [tickets]);

  /* ── Firebase Actions ─────────────────────────────────────────────────────── */
  const onAction = useCallback(async (id, action, payload = {}) => {
    if (action === 'send_to_review' && !validLink(payload.attachment || '')) {
      alert('ต้องใส่ลิงก์งานที่ถูกต้องก่อนส่งตรวจ');
      return;
    }
    if (action === 'delete') {
      if (window.confirm('ลบ ticket นี้?')) await deleteDoc(doc(db, 'tickets', id));
      return;
    }
    const ticket  = tickets.find(t => t.id === id);
    if (!ticket) return;
    const elapsed   = ticket.startedAt ? Math.floor((Date.now() - ticket.startedAt) / 1000) : 0;
    const ticketRef = doc(db, 'tickets', id);
    const updates = (() => {
      switch (action) {
        case 'start':           return { status: 'Doing', startedAt: Date.now() };
        case 'pause':           return { status: 'Paused', timeSpent: ticket.timeSpent + elapsed, startedAt: deleteField() };
        case 'send_to_review':  return { status: 'Reviewing', timeSpent: ticket.timeSpent + elapsed, startedAt: deleteField(), attachment: payload.attachment || ticket.attachment };
        case 'approve':         return { status: 'Done', completedAt: Date.now(), timeSpent: ticket.timeSpent + elapsed, startedAt: deleteField(), feedback: payload.feedback || 'Approved' };
        case 'reject':          return { status: 'Waiting', revisions: ticket.revisions + 1, timeSpent: ticket.timeSpent + elapsed, startedAt: deleteField(), feedback: payload.feedback || 'ขอปรับก่อนอนุมัติ' };
        case 'reject_incomplete': return { status: 'IncompleteRejected', incompleteRejectReason: payload.rejectReason ?? null };
        default: return {};
      }
    })();
    await updateDoc(ticketRef, updates);
  }, [tickets]);

  /* ── Deadline validation — ตัดที่ 18:00 ของวันที่เลือก ไม่ใช่ midnight ── */
  const selectedSla = useMemo(() => getSla(newJob.slaType), [newJob.slaType]);
  const dueDateMs   = useMemo(() => {
    if (!newJob.dueDate) return 0;
    const d = new Date(newJob.dueDate);
    d.setHours(18, 0, 0, 0); // ถือว่าสิ้นสุดวันทำการที่ 18:00
    return d.getTime();
  }, [newJob.dueDate]);
  const hoursLeft   = dueDateMs ? (dueDateMs - Date.now()) / 3600000 : 0;
  const belowMin    = dueDateMs > 0 && hoursLeft < selectedSla.minHours;
  const belowStd    = dueDateMs > 0 && hoursLeft < selectedSla.stdHours && !belowMin;

  /* SLA suggested deadline (working days) */
  const suggestedDeadline = useMemo(() => {
    const d = addWorkingHours(Date.now(), selectedSla.stdHours);
    return fmtDateInput(d.getTime());
  }, [selectedSla]);

  /* Workload warning: เช็คเฉพาะวันที่เลือก (ไม่เตือนทันทีก่อนเลือกวัน) */
  const selectedDateWorkload = useMemo(() => {
    if (!newJob.dueDate || !newJob.assignee) return 0;
    const selDate = new Date(newJob.dueDate).toDateString();
    return tickets
      .filter(t => t.assignee === newJob.assignee && t.status !== 'Done' && t.dueDate
        && new Date(t.dueDate).toDateString() === selDate)
      .reduce((s, t) => s + (t.standardHours || 0), 0);
  }, [tickets, newJob.assignee, newJob.dueDate]);
  const assigneeOverloaded = newJob.dueDate && selectedDateWorkload >= 8;

  /* ── Create new ticket ────────────────────────────────────────────────────── */
  const createJob = async (e) => {
    e.preventDefault();
    if (!newJob.title.trim())      { alert('กรุณาระบุชื่องาน'); return; }
    if (!newJob.requester.trim())  { alert('กรุณาระบุชื่อผู้สั่งงาน'); return; }
    if (!newJob.objective.trim())  { alert('กรุณาระบุ Objective'); return; }
    if (!newJob.sizeFormat.trim()) { alert('กรุณาระบุขนาด / Format'); return; }
    if (belowMin && !newJob.directorApproved) {
      alert('Deadline ต่ำกว่าขั้นต่ำ ต้องได้รับอนุมัติจาก Marketing Director ก่อน');
      return;
    }
    if (newJob.priority === 1) {
      if (!newJob.urgentReason.trim()) { alert('งาน P1 ต้องระบุเหตุผลที่ต้องแทรกด่วน'); return; }
      if (!newJob.headApproved)        { alert('งาน P1 ต้องได้รับอนุมัติจากหัวหน้าฝ่ายก่อน'); return; }
    }

    const sla   = getSla(newJob.slaType);
    const jobNo = `JOB-${Date.now().toString(36).toUpperCase()}`;

    await addDoc(collection(db, 'tickets'), {
      jobNo,
      title: newJob.isDirectionChange && newJob.parentTicketId
        ? `[แก้ไข] #${newJob.parentTicketId} – ${newJob.title}`
        : newJob.title,
      brand:          newJob.brand,
      slaType:        newJob.slaType,
      minHours:       sla.minHours,
      standardHours:  sla.stdHours,
      priority:       newJob.priority,
      objective:      newJob.objective,
      platform:       newJob.platform       || null,
      sizeFormat:     newJob.sizeFormat,
      copyText:       newJob.copyText       || null,
      constraints:    newJob.constraints    || null,
      requester:      newJob.requester,
      approverName:   newJob.approverName   || null,
      attachment:     newJob.attachment     || null,
      assignee:       newJob.assignee,
      status:         'Waiting',
      createdAt:      Date.now(),
      startedAt:      null,
      completedAt:    null,
      dueDate:        dueDateMs             || null,
      reportLink:     newJob.reportLink     || null,
      timeSpent:      0,
      revisions:      0,
      feedback:       null,
      isDirectionChange: newJob.isDirectionChange,
      parentTicketId: newJob.parentTicketId || null,
      incompleteRejectReason: null,
      urgentReason:   newJob.priority === 1 ? newJob.urgentReason : null,
      jobCategory:    newJob.jobCategory,
    });

    setJob(defaultNewJob());
    setUpload(null);
    setTab('graphic');
  };

  /* ── Export CSV ───────────────────────────────────────────────────────────── */
  const exportCsv = () => {
    const headers = ['ลำดับ','Job No','วันที่ Request','Brand','หมวดหมู่งาน','Priority','เรื่อง','Objective','Platform','Size/Format','ผู้สั่งงาน','ผู้อนุมัติ','Graphic','ประเภทงาน','SLA std(h)','สถานะ','Deadline','วันที่เริ่ม','วันที่ Approve','เวลาทำงาน','รอบแก้','On-Time','Direction Change','Brief ไม่ครบ','เหตุผลด่วน','Report Link'];
    const rows = filtered.map((t, i) => [
      i+1, t.jobNo||t.id, fmtDate(t.createdAt), t.brand, t.jobCategory||'-', (PC[t.priority]||PC[3]).label,
      t.title, t.objective||'', t.platform||'', t.sizeFormat||'',
      t.requester||'', t.approverName||'',
      GRAPHICS.find(g => g.id === t.assignee)?.name||'-',
      t.slaType, t.standardHours, t.status,
      fmtDate(t.dueDate), fmtDateTime(t.startedAt), fmtDateTime(t.completedAt),
      fmtSec(t.timeSpent), t.revisions,
      t.status==='Done'?(t.completedAt&&t.dueDate&&t.completedAt<=t.dueDate?'Yes':'No'):'-',
      t.isDirectionChange?'Yes':'No',
      t.incompleteRejectReason||'-',
      t.urgentReason||'-',
      t.reportLink||'-',
    ]);
    const csv = [headers, ...rows].map(r => r.map(csvEsc).join(',')).join('\n');
    const a   = document.createElement('a');
    a.href    = URL.createObjectURL(new Blob(['﻿'+csv], { type:'text/csv;charset=utf-8;' }));
    a.download= `landyhub_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /* ── Nav ──────────────────────────────────────────────────────────────────── */
  const nav = [
    { id:'home',     label:'Master Calendar', icon:CalendarIcon },
    { id:'marketing',label:'New Request',     icon:PlusIcon     },
    { id:'review',   label:'Review Center',   icon:EyeIcon      },
    { id:'graphic',  label:'Graphic Board',   icon:GridIcon     },
    { id:'dashboard',label:'Analytics KPI',   icon:ChartIcon    },
  ];

  /* ── Render ───────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-200 bg-white p-6 hidden lg:flex lg:flex-col sticky top-0 h-screen">
        <div className="mb-8">
          <div className="text-2xl font-black">LANDY <span className="text-red-600">HUB</span></div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 font-bold mt-1">INTERNAL TOOL · PL-LD-013</div>
        </div>
        <div className="space-y-1 flex-1">
          {nav.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${tab === item.id ? 'bg-red-600 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="w-4 h-4" /><span className="font-bold text-sm">{item.label}</span>
              </button>
            );
          })}

          {/* Quick View shortcuts */}
          <div className="pt-4 pb-1">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold px-4 mb-2">Quick View</div>
          </div>
          <div className="space-y-2 px-1">
            {/* Brand View */}
            <div className={`rounded-2xl border p-3 ${quickView === 'brand' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
              <button onClick={() => { setQuickView(quickView === 'brand' ? null : 'brand'); setTab('graphic'); }}
                className="flex items-center gap-2 w-full text-left">
                <TagIcon className="w-4 h-4" />
                <span className={`font-bold text-xs ${quickView === 'brand' ? 'text-red-700' : 'text-slate-600'}`}>Brand View</span>
                {quickView === 'brand' && <span className="ml-auto text-[10px] text-red-500 font-bold">ON</span>}
              </button>
              {quickView === 'brand' && (
                <select value={brandViewBrand} onChange={e => setBVBrand(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-red-200 px-2 py-1.5 text-xs outline-none">
                  {BRANDS.filter(b => b.name !== 'All Brands').map(b => <option key={b.name}>{b.name}</option>)}
                </select>
              )}
            </div>

            {/* Graphic View */}
            <div className={`rounded-2xl border p-3 ${quickView === 'graphic' ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
              <button onClick={() => { setQuickView(quickView === 'graphic' ? null : 'graphic'); setTab('graphic'); }}
                className="flex items-center gap-2 w-full text-left">
                <UserIcon className="w-4 h-4" />
                <span className={`font-bold text-xs ${quickView === 'graphic' ? 'text-blue-700' : 'text-slate-600'}`}>Graphic View</span>
                {quickView === 'graphic' && <span className="ml-auto text-[10px] text-blue-500 font-bold">ON</span>}
              </button>
              {quickView === 'graphic' && (
                <select value={graphicViewId} onChange={e => setGVId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-blue-200 px-2 py-1.5 text-xs outline-none">
                  {GRAPHICS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Queue summary */}
        <div className="rounded-3xl bg-slate-900 text-white p-5 mt-6 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Queue Status</div>
          {loading
            ? <div className="text-slate-400 text-sm">กำลังโหลด...</div>
            : <>
                <div className="text-3xl font-black">{counts.active} <span className="text-slate-400 text-sm font-normal">active</span></div>
                <div className="space-y-1 text-sm">
                  {[1,2,3,4].map(p => {
                    const n = tickets.filter(t => t.priority === p && t.status !== 'Done').length;
                    return n > 0 && (
                      <div key={p} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${PC[p].dot}`} />
                        <span className="text-slate-300">{PC[p].label}</span>
                        <span className="ml-auto font-bold">{n}</span>
                      </div>
                    );
                  })}
                </div>
                {counts.p1 > 0 && (
                  <div className="rounded-2xl bg-red-900/50 border border-red-700 p-2 text-xs text-red-300 font-bold">
                    ⚠ {counts.p1} Critical job{counts.p1 > 1 ? 's' : ''} !
                  </div>
                )}
              </>
          }
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200 px-5 lg:px-8 py-4">
          <div className="flex flex-col xl:flex-row xl:items-center gap-4 xl:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto">
              {quickView ? (
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${quickView === 'brand' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    {quickView === 'brand' ? `Brand View: ${brandViewBrand}` : `Graphic View: ${GRAPHICS.find(g=>g.id===graphicViewId)?.name}`}
                  </span>
                  <button onClick={() => setQuickView(null)} className="text-slate-400 hover:text-slate-700 text-xs underline">ล้าง</button>
                </div>
              ) : (
                <>
                  <div className="inline-flex items-center gap-1 text-slate-400 text-xs font-bold uppercase whitespace-nowrap">
                    <FilterIcon className="w-4 h-4" /> Brand
                  </div>
                  {BRANDS.map(b => (
                    <button key={b.name} onClick={() => setFB(b.name)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${filterBrand === b.name ? `${b.color} text-white border-transparent` : 'bg-white border-slate-200 text-slate-600'}`}>
                      {b.name}
                    </button>
                  ))}
                </>
              )}
            </div>
            <div className="relative max-w-md w-full">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาชื่องาน / brand / requester"
                className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-100" />
            </div>
          </div>
        </div>

        <main className="p-5 lg:p-8">
          {loading && (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              กำลังโหลดข้อมูลจาก Firestore...
            </div>
          )}

          {/* ── CALENDAR ── */}
          {!loading && tab === 'home' && (
            <div className="space-y-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black">Graphic Master Calendar</h1>
                  <p className="text-slate-500 mt-1">คิวงานตาม Graphic Team · workload capacity 8h / วัน</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setWeek(w => w-1)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center"><ChevLeft className="w-4 h-4"/></button>
                  <button onClick={() => setWeek(0)} className="px-4 h-10 rounded-2xl border border-slate-200 bg-white text-xs font-bold">Today</button>
                  <button onClick={() => setWeek(w => w+1)} className="w-10 h-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center"><ChevRight className="w-4 h-4"/></button>
                </div>
              </div>

              {/* Status color legend */}
              <div className="flex flex-wrap gap-3 text-xs">
                {[
                  { label: 'Waiting',  cls: 'bg-slate-100 border-slate-300 text-slate-700' },
                  { label: 'Doing / Paused', cls: 'bg-blue-100 border-blue-300 text-blue-800' },
                  { label: 'Reviewing / Late', cls: 'bg-red-100 border-red-300 text-red-800' },
                  { label: 'Done',     cls: 'bg-green-100 border-green-300 text-green-800' },
                ].map(s => (
                  <span key={s.label} className={`px-2.5 py-1 rounded-full border font-bold ${s.cls}`}>{s.label}</span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Active"      value={counts.active} hint="งานในคิว"        icon={GridIcon}  />
                <StatCard title="Review"      value={counts.review} hint="รอ approve"       icon={EyeIcon}   />
                <StatCard title="Done"        value={counts.done}   hint="ปิดแล้ว"          icon={CheckIcon} />
                <StatCard title="P1 Critical" value={counts.p1}     hint="งานเร่งด่วนสูงสุด" icon={AlertIcon} accent="text-red-600" />
              </div>
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div style={{ minWidth: '1100px' }}>
                  <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: '180px repeat(7, 1fr)' }}>
                    <div className="p-4 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">Graphic Team</div>
                    {calDays.map((day, i) => {
                      const isToday   = day.toDateString() === new Date().toDateString();
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <div key={i} className={`p-4 text-center border-l border-slate-100 ${isToday ? 'bg-red-50' : isWeekend ? 'bg-slate-50/80' : ''}`}>
                          <div className={`text-[10px] uppercase tracking-widest font-bold ${isWeekend ? 'text-slate-300' : 'text-slate-400'}`}>
                            {day.toLocaleDateString('th-TH', { weekday:'short' })}
                          </div>
                          <div className={`font-black text-lg mt-0.5 ${isToday ? 'text-red-600' : isWeekend ? 'text-slate-300' : ''}`}>{day.getDate()}</div>
                          {isWeekend && <div className="text-[9px] text-slate-300 font-bold">หยุด</div>}
                        </div>
                      );
                    })}
                  </div>
                  {GRAPHICS.map(g => (
                    <div key={g.id} className="grid border-b border-slate-100 last:border-b-0" style={{ gridTemplateColumns: '180px repeat(7, 1fr)', minHeight: '140px' }}>
                      <div className="p-4 bg-slate-50/60 border-r border-slate-100 flex flex-col justify-between">
                        <div>
                          <div className="font-black text-slate-900 text-sm">{g.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {filtered.filter(t => t.assignee === g.id && t.status !== 'Done').length} active
                          </div>
                          {workloadByGraphic[g.id]?.hours >= 8 && (
                            <div className="mt-1 text-[10px] text-red-500 font-bold">⚠ งานเต็มมือ</div>
                          )}
                        </div>
                      </div>
                      {calDays.map((day, i) => {
                        const jobs      = jobsByCell(g.id, day);
                        const wl        = workloadByCell(g.id, day);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <div key={i} className={`p-2 border-l border-slate-100 flex flex-col gap-1.5 ${isWeekend ? 'bg-slate-50/60' : ''}`}>
                            {wl > 0 && <WorkloadBar hours={wl} />}
                            {jobs.map(job => (
                              <div key={job.id} className={`rounded-xl border px-2 py-2 text-[10px] ${calEventStyle(job, now)}`}>
                                <div className="font-bold">{(PC[job.priority]||PC[3]).label}</div>
                                <div className="font-bold mt-0.5 line-clamp-2">{job.title}</div>
                                <div className="mt-0.5 opacity-70">{job.brand} · {job.status}</div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── NEW REQUEST ── */}
          {!loading && tab === 'marketing' && (
            <div className="grid xl:grid-cols-[1.3fr_0.7fr] gap-6">
              <form onSubmit={createJob} className="space-y-5">
                {/* Section 1: Job Identity */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-red-600 text-xs uppercase tracking-widest font-bold">
                    <FileIcon className="w-4 h-4" /> Job Identity
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อ Campaign / Project <span className="text-red-500">*</span></label>
                    <input value={newJob.title} onChange={e => setJob({...newJob, title:e.target.value})} required
                      placeholder="เช่น: KV โปรโมชันสงกรานต์ 2569"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Brand <span className="text-red-500">*</span></label>
                      <select value={newJob.brand} onChange={e => setJob({...newJob, brand:e.target.value})}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100">
                        {BRANDS.filter(b => b.name !== 'All Brands').map(b => <option key={b.name}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Graphic Queue <span className="text-red-500">*</span></label>
                      <select value={newJob.assignee} onChange={e => setJob({...newJob, assignee:e.target.value})}
                        className={`w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 ${assigneeOverloaded ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                        {GRAPHICS.map(g => {
                          const wl = workloadByGraphic[g.id];
                          return <option key={g.id} value={g.id}>{g.name}{wl?.hours >= 8 ? ' ⚠ งานเต็ม' : wl?.hours >= 6 ? ' · งานหนัก' : ''}</option>;
                        })}
                      </select>
                      {assigneeOverloaded && (
                        <p className="text-xs text-red-600 mt-1 font-bold">⚠ วันที่เลือก ({newJob.dueDate}) งานเต็ม {selectedDateWorkload.toFixed(1)}h / 8h แล้ว — หากสั่งแทรกอาจกระทบงานอื่น</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ประเภทงาน (SLA) <span className="text-red-500">*</span></label>
                      <select value={newJob.slaType} onChange={e => setJob({...newJob, slaType:e.target.value})}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100">
                        {SLA_TYPES.map(s => <option key={s.type} value={s.type}>{s.type}</option>)}
                      </select>
                      {selectedSla.note && <p className="text-xs text-slate-400 mt-1">{selectedSla.note} · std {fmtH(selectedSla.stdHours)} · min {fmtH(selectedSla.minHours)}</p>}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Priority Level <span className="text-red-500">*</span></label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[1,2,3,4].map(p => (
                        <label key={p} className={`flex items-center gap-2 rounded-2xl border px-3 py-3 cursor-pointer transition ${newJob.priority === p ? `${PC[p].bg} ${PC[p].color} font-bold` : 'bg-white border-slate-200 text-slate-500'}`}>
                          <input type="radio" name="priority" value={p} checked={newJob.priority === p}
                            onChange={() => setJob({...newJob, priority:p, urgentReason:'', headApproved:false})} className="sr-only" />
                          <span className={`w-2.5 h-2.5 rounded-full ${PC[p].dot}`} />
                          <span className="text-xs font-bold">{PC[p].label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Job Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">หมวดหมู่งาน (Job Category) <span className="text-red-500">*</span></label>
                    <select value={newJob.jobCategory} onChange={e => setJob({...newJob, jobCategory:e.target.value})}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100">
                      {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">ใช้สำหรับคำนวณ Monthly KPI Dashboard</p>
                  </div>

                  {/* P1 urgent protection */}
                  {newJob.priority === 1 && (
                    <div className="rounded-2xl border border-red-300 bg-red-50 p-4 space-y-3">
                      <div className="flex items-center gap-2 text-red-700 text-xs font-bold uppercase tracking-widest">
                        <AlertIcon className="w-4 h-4" /> งานแทรกด่วน — ต้องกรอกข้อมูลให้ครบ
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-red-700 mb-1">เหตุผลที่ต้องแทรกด่วน <span className="text-red-500">*</span></label>
                        <textarea value={newJob.urgentReason} onChange={e => setJob({...newJob, urgentReason:e.target.value})} rows={2}
                          placeholder="เช่น: งานประชุมบอร์ดพรุ่งนี้ 09:00 / Event สื่อมวลชนด่วนที่ไม่สามารถเลื่อนได้"
                          className="w-full rounded-2xl border border-red-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200 bg-white" />
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={newJob.headApproved}
                          onChange={e => setJob({...newJob, headApproved:e.target.checked})}
                          className="w-4 h-4 accent-red-600" />
                        <span className="text-sm font-bold text-red-700">ยืนยัน: ผ่านการอนุมัติจากหัวหน้าฝ่ายแล้ว</span>
                      </label>
                      {!newJob.headApproved && (
                        <p className="text-xs text-red-500">ต้องติ๊ก checkbox นี้ก่อนถึงจะส่ง P1 ได้</p>
                      )}
                    </div>
                  )}

                  {/* Deadline */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Target Deadline <span className="text-red-500">*</span></label>
                      <input type="date" value={newJob.dueDate}
                        min={minWorkdayStr()}
                        onChange={e => {
                          const d = new Date(e.target.value);
                          const day = d.getDay();
                          if (day === 0 || day === 6) { alert('ไม่สามารถเลือกวันเสาร์–อาทิตย์ได้ กรุณาเลือกวันทำการ'); return; }
                          setJob({...newJob, dueDate:e.target.value});
                        }}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                      <p className="text-[10px] text-slate-400 mt-1">แนะนำ: {suggestedDeadline} (SLA std นับเฉพาะวันทำการ)</p>
                      {belowMin && <p className="text-xs text-red-600 mt-1 font-bold">⚠ ต่ำกว่าขั้นต่ำ ({fmtH(selectedSla.minHours)}) — ต้องอนุมัติจาก Marketing Director</p>}
                      {belowStd && <p className="text-xs text-amber-600 mt-1">⚠ ต่ำกว่าเวลามาตรฐาน ({fmtH(selectedSla.stdHours)}) — อาจกระทบคุณภาพ</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Report Link</label>
                      <input value={newJob.reportLink} onChange={e => setJob({...newJob, reportLink:e.target.value})}
                        placeholder="https://..."
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                      {newJob.reportLink && !validLink(newJob.reportLink) && <p className="text-xs text-red-500 mt-1">ต้องขึ้นต้นด้วย https://</p>}
                    </div>
                  </div>
                  {belowMin && (
                    <label className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 cursor-pointer">
                      <input type="checkbox" checked={newJob.directorApproved} onChange={e => setJob({...newJob, directorApproved:e.target.checked})} />
                      <span className="text-sm font-bold text-red-700">ยืนยัน: ได้รับอนุมัติจาก Marketing Director แล้ว</span>
                    </label>
                  )}
                </div>

                {/* Section 2: Brief */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-red-600 text-xs uppercase tracking-widest font-bold">
                    <FileIcon className="w-4 h-4" /> Brief Details
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Objective (วัตถุประสงค์) <span className="text-red-500">*</span></label>
                    <input value={newJob.objective} onChange={e => setJob({...newJob, objective:e.target.value})} required
                      placeholder="เช่น: ยิง Lead แคมเปญ / สื่อสำหรับ Event / Print ประจำเดือน"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Platform ที่จะใช้งาน</label>
                      <input value={newJob.platform} onChange={e => setJob({...newJob, platform:e.target.value})}
                        placeholder="Facebook, Instagram, Website, Offline"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ขนาด / Format / Resolution <span className="text-red-500">*</span></label>
                      <input value={newJob.sizeFormat} onChange={e => setJob({...newJob, sizeFormat:e.target.value})} required
                        placeholder="1080x1080, 1920x1080, A4 Portrait"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ข้อความ / Copy ในงาน</label>
                    <textarea value={newJob.copyText} onChange={e => setJob({...newJob, copyText:e.target.value})} rows={2}
                      placeholder="วางข้อความที่ต้องใช้ในงาน"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ข้อจำกัดพิเศษ (Safe Zone, Legal, ภาษีป้าย)</label>
                    <input value={newJob.constraints} onChange={e => setJob({...newJob, constraints:e.target.value})}
                      placeholder="เช่น: ต้องผ่าน Legal / Safe zone 5%"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อผู้สั่งงาน <span className="text-red-500">*</span></label>
                      <input value={newJob.requester} onChange={e => setJob({...newJob, requester:e.target.value})} required
                        placeholder="ชื่อ-นามสกุล"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ผู้อนุมัติ (Approver)</label>
                      <input value={newJob.approverName} onChange={e => setJob({...newJob, approverName:e.target.value})}
                        placeholder="Brand Manager / Marketing Director"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                    </div>
                  </div>
                </div>

                {/* Section 3: References */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-red-600 text-xs uppercase tracking-widest font-bold">
                    <LinkIcon className="w-4 h-4" /> References & Revision
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Reference / Concept / Mood Board</label>

                    {/* Upload zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { fileInputRef.current.files = e.dataTransfer.files; handleFileUpload({ target: { files: e.dataTransfer.files } }); } }}
                      className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 hover:border-red-300 transition bg-slate-50 px-4 py-5 text-center"
                    >
                      <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFileUpload} />
                      {uploadState === null && !newJob.attachment && (
                        <div>
                          <div className="text-2xl mb-1">📎</div>
                          <div className="text-sm font-bold text-slate-500">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเลือก</div>
                          <div className="text-xs text-slate-400 mt-1">รองรับ JPG, PNG, PDF · ไม่เกิน 20 MB</div>
                        </div>
                      )}
                      {typeof uploadState === 'number' && (
                        <div>
                          <div className="text-sm font-bold text-blue-600 mb-2">กำลังอัปโหลด {uploadState}%</div>
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-blue-500 rounded-full transition-all" style={{ width:`${uploadState}%` }} /></div>
                        </div>
                      )}
                      {uploadState === 'done' && newJob.attachment && (
                        <div className="flex items-center justify-center gap-2 text-green-700">
                          <span className="text-xl">✓</span>
                          <span className="text-sm font-bold">อัปโหลดสำเร็จ</span>
                          <a href={newJob.attachment} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs" onClick={e => e.stopPropagation()}>ดูไฟล์</a>
                          <button type="button" className="text-slate-400 hover:text-red-500 text-xs underline" onClick={e => { e.stopPropagation(); setJob({...newJob, attachment:''}); setUpload(null); }}>ลบ</button>
                        </div>
                      )}
                      {uploadState === 'error' && <div className="text-red-500 text-sm font-bold">⚠ อัปโหลดไม่สำเร็จ กดเพื่อลองใหม่</div>}
                    </div>

                    {/* OR: paste a link */}
                    <div className="flex items-center gap-3 my-3">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">หรือใส่ลิงก์</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <input
                      value={uploadState === 'done' ? '' : (newJob.attachment || '')}
                      onChange={e => { setJob({...newJob, attachment:e.target.value}); setUpload(null); }}
                      placeholder="https://drive.google.com/... หรือ Figma link"
                      disabled={uploadState === 'done'}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    {newJob.attachment && uploadState !== 'done' && !validLink(newJob.attachment) && <p className="text-xs text-red-500 mt-1">ต้องขึ้นต้นด้วย https://</p>}
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 px-4 py-3 cursor-pointer">
                    <input type="checkbox" checked={newJob.isDirectionChange} onChange={e => setJob({...newJob, isDirectionChange:e.target.checked})} />
                    <div>
                      <div className="text-sm font-bold text-purple-700">⚑ Direction Change</div>
                      <div className="text-xs text-purple-500">เปลี่ยน Concept / Layout / KV / Style หลักจาก Brief เดิม</div>
                    </div>
                  </label>
                  {newJob.isDirectionChange && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Ticket เดิมที่อ้างอิง (เช่น JOB-2402)</label>
                      <input value={newJob.parentTicketId} onChange={e => setJob({...newJob, parentTicketId:e.target.value})}
                        placeholder="JOB-XXXXX"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-100" />
                    </div>
                  )}
                </div>

                <button type="submit" className="w-full rounded-3xl bg-red-600 text-white font-black py-4 shadow-lg hover:bg-red-700 transition">
                  SUBMIT TO BOARD
                </button>
              </form>

              {/* Sidebar panel */}
              <div className="space-y-5">
                <div className="bg-slate-900 rounded-3xl text-white p-6">
                  <div className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mb-3">SLA Guideline · PL-LD-013</div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {SLA_TYPES.map(s => (
                      <div key={s.type} className={`rounded-xl px-3 py-2 text-xs ${newJob.slaType === s.type ? 'bg-white/20' : 'bg-white/5'}`}>
                        <div className="font-bold text-white">{s.type}</div>
                        <div className="text-slate-400 mt-0.5">min {fmtH(s.minHours)} · std {fmtH(s.stdHours)}{s.note ? ` · ${s.note}` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200 p-5">
                  <div className="font-black text-slate-900 mb-3">Brief Checklist</div>
                  <div className="space-y-1.5 text-sm">
                    {[['ชื่องาน','title'],['Brand','brand'],['หมวดหมู่งาน','jobCategory'],['ประเภทงาน','slaType'],['Priority','priority'],['Target Deadline','dueDate'],['Objective','objective'],['ขนาด/Format','sizeFormat'],['ชื่อผู้สั่งงาน','requester']].map(([label,key]) => {
                      const val    = newJob[key];
                      const filled = key === 'priority' ? true : val && String(val).trim() !== '';
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${filled ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                            {filled ? '✓' : '·'}
                          </span>
                          <span className={filled ? 'text-slate-700' : 'text-slate-400'}>{label}</span>
                        </div>
                      );
                    })}
                    {newJob.priority === 1 && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${newJob.urgentReason.trim() ? 'bg-green-500 text-white' : 'bg-red-200 text-red-400'}`}>
                            {newJob.urgentReason.trim() ? '✓' : '!'}
                          </span>
                          <span className={newJob.urgentReason.trim() ? 'text-slate-700' : 'text-red-500'}>เหตุผลด่วน (P1)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${newJob.headApproved ? 'bg-green-500 text-white' : 'bg-red-200 text-red-400'}`}>
                            {newJob.headApproved ? '✓' : '!'}
                          </span>
                          <span className={newJob.headApproved ? 'text-slate-700' : 'text-red-500'}>อนุมัติจากหัวหน้า (P1)</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── REVIEW CENTER ── */}
          {!loading && tab === 'review' && (() => {
            const reviewTickets = filtered.filter(t => t.status === 'Reviewing');
            return (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-black">Review Center</h1>
                  <p className="text-slate-500 mt-1">ตรวจงานภายใน 1 วันทำการ · ระบุ Feedback แบบ อะไร/ที่ไหน/แก้เป็นอะไร</p>
                </div>
                <div className="grid gap-5">
                  {reviewTickets.length === 0
                    ? <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">ยังไม่มีงานรอ review</div>
                    : reviewTickets.map(t => <TicketCard key={t.id} ticket={t} onAction={onAction} showReviewFields now={now} />)
                  }
                </div>
              </div>
            );
          })()}

          {/* ── GRAPHIC BOARD ── */}
          {!loading && tab === 'graphic' && (() => {
            const active = filtered.filter(t => t.status !== 'Done');
            const p1     = active.filter(t => t.priority === 1);
            const rest   = active.filter(t => t.priority !== 1);
            return (
              <div className="space-y-6">
                <div className="flex items-end justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-3xl font-black">
                      {quickView === 'brand' ? `Brand View · ${brandViewBrand}` :
                       quickView === 'graphic' ? `Graphic View · ${GRAPHICS.find(g=>g.id===graphicViewId)?.name}` :
                       'Graphic Board'}
                    </h1>
                    <p className="text-slate-500 mt-1">เรียงตาม Priority · กด Start เพื่อเริ่มจับเวลา · ปฏิเสธ Brief ไม่ครบได้ที่นี่</p>
                  </div>
                </div>
                {p1.length > 0 && (
                  <>
                    <div className="text-xs font-bold uppercase tracking-widest text-red-600">⚠ P1 Critical — จัดการก่อน</div>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {p1.map(t => <TicketCard key={t.id} ticket={t} onAction={onAction} now={now} />)}
                    </div>
                  </>
                )}
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {rest.map(t => <TicketCard key={t.id} ticket={t} onAction={onAction} now={now} />)}
                </div>
                {active.length === 0 && (
                  <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center">
                    <div className="text-4xl mb-4">📭</div>
                    <div className="text-slate-500 font-bold text-lg">ไม่มีงานในคิว</div>
                    <div className="text-slate-400 text-sm mt-1">
                      {quickView ? 'ลองเปลี่ยน filter หรือ' : ''}{' '}
                      <button onClick={() => { setQuickView(null); setTab('marketing'); }} className="text-red-600 underline font-bold">สร้าง Ticket ใหม่</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── DASHBOARD ── */}
          {!loading && tab === 'dashboard' && (
            <DashboardSection theme={dashTheme} tickets={filtered} filterBrand={quickView === 'brand' ? brandViewBrand : filterBrand} onExport={exportCsv} />
          )}
        </main>
      </div>
    </div>
  );
}
