import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, deleteField, query, orderBy,
} from 'firebase/firestore';

/* ── Icons ─────────────────────────────────────────────────────────────────── */
const mk = (ch) => ({ className = '' }) =>
  <span className={`inline-flex items-center justify-center leading-none select-none ${className}`}>{ch}</span>;

const CalendarIcon = mk('📅'), PlusIcon = mk('+'), EyeIcon = mk('👁'),
  GridIcon = mk('▦'), ChartIcon = mk('▥'), PlayIcon = mk('▶'),
  PauseIcon = mk('Ⅱ'), CheckIcon = mk('✓'), ClockIcon = mk('⏱'),
  FilterIcon = mk('⏷'), SearchIcon = mk('⌕'), AlertIcon = mk('!'),
  FileIcon = mk('▤'), LinkIcon = mk('🔗'),
  ChevLeft = mk('‹'), ChevRight = mk('›'), CloseIcon = mk('×'),
  DlIcon = mk('↓'), BanIcon = mk('⊘');

/* ── Constants ──────────────────────────────────────────────────────────────── */
const BRANDS = [
  { name: 'All Brands',  color: 'bg-slate-800'  },
  { name: 'Landy Home',  color: 'bg-red-600'    },
  { name: 'Landy Grand', color: 'bg-yellow-500' },
  { name: 'Trendy Home', color: 'bg-pink-500'   },
  { name: 'Capplus',     color: 'bg-sky-500'    },
  { name: 'Rudolf',      color: 'bg-emerald-400'},
];

const SLA_TYPES = [
  { type: 'Social Media – Template + AI',           minHours: 10/60, stdHours: 25/60, note: 'ต่อ 1 Post' },
  { type: 'Social Media – New Design',              minHours: 1,     stdHours: 2,     note: 'ต่อ 1 Post' },
  { type: 'Resize Online (ปรับขนาดเท่านั้น)',       minHours: 0.5,   stdHours: 0.75,  note: 'ต่อ 1 ไฟล์ (6-10 sizes)' },
  { type: 'Resize Online + New Artwork',            minHours: 1,     stdHours: 2,     note: 'ต่อ 1 ไฟล์' },
  { type: 'Resize Offline / Billboard',             minHours: 1,     stdHours: 2,     note: 'ต่อ 1 ไฟล์' },
  { type: 'ปรับสี / ข้อความเล็กน้อย',               minHours: 0.25,  stdHours: 0.5,   note: 'ต่อ 1 ชิ้น' },
  { type: 'New Design',                             minHours: 2,     stdHours: 3.5,   note: 'ต่อ 1 ชิ้น' },
  { type: 'New Design – Complex / Key Visual',      minHours: 3.5,   stdHours: 4,     note: 'ต่อ 1 ชิ้น' },
  { type: 'ชุดภาพ (> 3 ชิ้น, Style เดียว)',         minHours: 2.5,   stdHours: 4,     note: 'ชิ้นแรกเต็ม + 20 นาที/ชิ้นถัดไป' },
  { type: 'E-Catalog New Design (≤ 40 Slides)',     minHours: 5,     stdHours: 8,     note: 'ต่อ 1 ชิ้น' },
  { type: 'ป้ายราคา / Label (ทุกสาขา)',             minHours: 1/3,   stdHours: 1,     note: 'ต่อ 1 ครั้ง' },
  { type: 'Video – Cut / ตัดต่อ Footage',           minHours: 1.5,   stdHours: 3,     note: 'ต่อ VDO ≤ 60 วิ' },
  { type: 'Video – Motion Graphic / Animation',     minHours: 2.5,   stdHours: 5,     note: 'ต่อ VDO ≤ 60 วิ' },
  { type: 'Video – Full Production',                minHours: 16,    stdHours: 28,    note: 'ต่อ VDO ≤ 3 นาที' },
  { type: 'Presentation Template เดิม (≤ 10 Slides)',minHours: 0.5,  stdHours: 1,     note: '' },
  { type: 'Presentation New Design (≤ 10 Slides)',  minHours: 2.5,   stdHours: 3,     note: '' },
  { type: 'Banner / Signage ขนาดใหญ่ (Print-ready)',minHours: 2,    stdHours: 4.5,   note: 'ต่อ 1 ชิ้น' },
];

const GRAPHICS = [
  { id: 'B01', name: 'Landy Home'  },
  { id: 'B02', name: 'Landy Grand' },
  { id: 'B03', name: 'Trendy Home' },
  { id: 'B04', name: 'Capplus'     },
  { id: 'B05', name: 'Rudolf'      },
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
  const pConf        = PC[ticket.priority] || PC[3];
  const assigneeName = GRAPHICS.find(g => g.id === ticket.assignee)?.name || '-';

  return (
    <div className={`bg-white rounded-3xl border p-6 shadow-sm hover:shadow-md transition-shadow
      ${ticket.status === 'IncompleteRejected' ? 'border-orange-300' : ticket.priority === 1 ? 'border-red-300' : 'border-slate-200'}`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className={`px-2.5 py-1 rounded-full text-white text-[10px] font-bold ${brandColor(ticket.brand)}`}>{ticket.brand}</span>
            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold ${pConf.bg} ${pConf.color}`}>{pConf.label}</span>
            {ticket.isDirectionChange && <span className="px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-[10px] font-bold">⚑ Direction Change</span>}
            {ticket.status === 'IncompleteRejected' && <span className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold">⊘ Brief ไม่ครบ</span>}
          </div>
          <h3 className="font-black text-slate-900 leading-tight">{ticket.title}</h3>
          {ticket.jobNo && <div className="text-[10px] text-slate-400 mt-0.5">{ticket.jobNo}</div>}
          {ticket.parentTicketId && <div className="text-xs text-slate-400 mt-0.5">อ้างอิง: <span className="font-bold text-slate-600">{ticket.parentTicketId}</span></div>}
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
            {ticket.slaType}{ticket.platform ? ` · ${ticket.platform}` : ''}
          </div>
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

      {/* Incomplete reject reason */}
      {ticket.incompleteRejectReason && (
        <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          <span className="font-bold">รายการที่ขาด:</span> {ticket.incompleteRejectReason}
        </div>
      )}

      {/* Artwork link input (Doing) */}
      {ticket.status === 'Doing' && (
        <div className="mt-4 space-y-1">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Final Artwork Link</label>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="ใส่ลิงก์งานที่ทำเสร็จ (Drive / Figma ฯลฯ)"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-100" />
          {link && !validLink(link) && <p className="text-xs text-red-500">ต้องขึ้นต้นด้วย http:// หรือ https://</p>}
        </div>
      )}

      {/* Reject-incomplete input (Waiting — for Graphic) */}
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

      {/* Meta grid */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Target Date</div>
          <div className="font-bold text-slate-800">{fmtDate(ticket.dueDate)}</div>
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

      {/* Timer */}
      <div className="flex items-center justify-between mt-4 text-sm">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-slate-400" />
          <span className={`font-mono font-bold ${overSla ? 'text-red-600' : 'text-slate-900'}`}>{fmtSec(liveTime)}</span>
          <span className="text-slate-400">/ SLA {fmtH(ticket.standardHours)}</span>
          {overSla && <span className="text-xs text-red-500 font-bold">⚠ เกิน SLA</span>}
        </div>
        <span className="text-xs text-slate-500">{assigneeName} · Rev {ticket.revisions}x</span>
      </div>

      {/* Feedback fields (Review) */}
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

      {/* Actions */}
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
  const kpi    = useMemo(() => calcKPIs(tickets), [tickets]);
  const counts = useMemo(() => ({
    total:      tickets.length,
    done:       tickets.filter(t => t.status === 'Done').length,
    review:     tickets.filter(t => t.status === 'Reviewing').length,
    incomplete: tickets.filter(t => t.status === 'IncompleteRejected').length,
  }), [tickets]);

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

      {/* Overview */}
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className={`${theme.panelBg} rounded-3xl border ${theme.panelBorder} p-1`}><StatCard title="Total Tickets"  value={counts.total}      hint="ทั้งหมดในระบบ"          icon={FileIcon}  accent={theme.text} /></div>
        <div className={`${theme.panelBg} rounded-3xl border ${theme.panelBorder} p-1`}><StatCard title="Done"           value={counts.done}       hint="ปิดงานแล้ว"             icon={CheckIcon} accent={theme.text} /></div>
        <div className={`${theme.panelBg} rounded-3xl border ${theme.panelBorder} p-1`}><StatCard title="Pending Review" value={counts.review}     hint="รออนุมัติ"              icon={EyeIcon}   accent={theme.text} /></div>
        <div className={`${theme.panelBg} rounded-3xl border ${theme.panelBorder} p-1`}><StatCard title="Brief ไม่ครบ"   value={counts.incomplete} hint="ถูกปฏิเสธโดย Graphic"  icon={AlertIcon} accent={theme.text} /></div>
      </div>

      {/* KPI Primary */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">KPI หลัก (เป้าหมายรายเดือน)</div>
        <div className="grid md:grid-cols-3 gap-4">
          <KPICard title="On-Time Delivery Rate"    value={kpi.onTimeRate}   target="85" higherGood />
          <KPICard title="First-Pass Approval Rate" value={kpi.firstPassRate} target="70" higherGood />
          <KPICard title="Avg. Revision Rounds"     value={kpi.avgRev}       target="1.5" unit=" รอบ" higherGood={false} />
        </div>
      </div>

      {/* KPI Monitor */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">KPI Monitor (ติดตาม ไม่ตัดสิน)</div>
        <div className="grid md:grid-cols-3 gap-4">
          <KPICard title="Completion Time vs SLA" value={kpi.completionPct} target="120" higherGood={false} monitorOnly />
          <KPICard title="Incomplete Brief Rate"  value={kpi.incompleteRate} target="10" higherGood={false} monitorOnly />
          <KPICard title="Direction Change Rate"  value={kpi.dcRate}        target="-"  monitorOnly />
        </div>
      </div>

      {/* Brand performance + Recent done */}
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
    </div>
  );
}

/* ── Default new job state ──────────────────────────────────────────────────── */
const defaultNewJob = () => ({
  title: '', brand: 'Landy Home', slaType: SLA_TYPES[0].type, priority: 3,
  objective: '', platform: '', sizeFormat: '', copyText: '', constraints: '',
  requester: '', approverName: '', attachment: '', assignee: 'B01',
  dueDate: fmtDateInput(Date.now() + 86400000), reportLink: '',
  isDirectionChange: false, parentTicketId: '', directorApproved: false,
});

/* ── Main Component ─────────────────────────────────────────────────────────── */
export default function App() {
  const [tab,          setTab]    = useState('home');
  const [tickets,      setTickets]= useState([]);
  const [loading,      setLoading]= useState(true);
  const [filterBrand,  setFB]     = useState('All Brands');
  const [search,       setSearch] = useState('');
  const [newJob,       setJob]    = useState(defaultNewJob);
  const [now,          setNow]    = useState(Date.now());
  const [weekOffset,   setWeek]   = useState(0);

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

  /* Live timer — tick every second */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  /* Derived state */
  const filtered = useMemo(() => tickets.filter(t =>
    (filterBrand === 'All Brands' || t.brand === filterBrand) &&
    (!search || [t.title, t.brand, t.objective, t.platform, t.requester]
      .join(' ').toLowerCase().includes(search.toLowerCase()))
  ), [tickets, filterBrand, search]);

  const counts = useMemo(() => ({
    total:  tickets.length,
    active: tickets.filter(t => t.status !== 'Done').length,
    review: tickets.filter(t => t.status === 'Reviewing').length,
    done:   tickets.filter(t => t.status === 'Done').length,
    p1:     tickets.filter(t => t.priority === 1).length,
  }), [tickets]);

  const dashTheme = useMemo(() => getTheme(filterBrand), [filterBrand]);

  const calDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + weekOffset * 7 + i - 2);
      return d;
    })
  , [weekOffset]);

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

    const elapsed    = ticket.startedAt ? Math.floor((Date.now() - ticket.startedAt) / 1000) : 0;
    const ticketRef  = doc(db, 'tickets', id);

    const updates = (() => {
      switch (action) {
        case 'start':
          return { status: 'Doing', startedAt: Date.now() };
        case 'pause':
          return { status: 'Paused', timeSpent: ticket.timeSpent + elapsed, startedAt: deleteField() };
        case 'send_to_review':
          return { status: 'Reviewing', timeSpent: ticket.timeSpent + elapsed, startedAt: deleteField(), attachment: payload.attachment || ticket.attachment };
        case 'approve':
          return { status: 'Done', completedAt: Date.now(), timeSpent: ticket.timeSpent + elapsed, startedAt: deleteField(), feedback: payload.feedback || 'Approved' };
        case 'reject':
          return { status: 'Waiting', revisions: ticket.revisions + 1, timeSpent: ticket.timeSpent + elapsed, startedAt: deleteField(), feedback: payload.feedback || 'ขอปรับก่อนอนุมัติ' };
        case 'reject_incomplete':
          return { status: 'IncompleteRejected', incompleteRejectReason: payload.rejectReason ?? null };
        default:
          return {};
      }
    })();

    await updateDoc(ticketRef, updates);
  }, [tickets]);

  /* ── Deadline validation ──────────────────────────────────────────────────── */
  const selectedSla = useMemo(() => getSla(newJob.slaType), [newJob.slaType]);
  const dueDateMs   = newJob.dueDate ? new Date(newJob.dueDate).getTime() : 0;
  const hoursLeft   = dueDateMs ? (dueDateMs - Date.now()) / 3600000 : 0;
  const belowMin    = dueDateMs > 0 && hoursLeft < selectedSla.minHours;
  const belowStd    = dueDateMs > 0 && hoursLeft < selectedSla.stdHours && !belowMin;

  /* ── Create new ticket ────────────────────────────────────────────────────── */
  const createJob = async (e) => {
    e.preventDefault();
    if (!newJob.title.trim())     { alert('กรุณาระบุชื่องาน'); return; }
    if (!newJob.requester.trim()) { alert('กรุณาระบุชื่อผู้สั่งงาน'); return; }
    if (!newJob.objective.trim()) { alert('กรุณาระบุ Objective'); return; }
    if (!newJob.sizeFormat.trim()){ alert('กรุณาระบุขนาด / Format'); return; }
    if (belowMin && !newJob.directorApproved) {
      alert('Deadline ต่ำกว่าขั้นต่ำ ต้องได้รับอนุมัติจาก Marketing Director ก่อน');
      return;
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
    });

    setJob(defaultNewJob());
    setTab('graphic');
  };

  /* ── Export CSV ───────────────────────────────────────────────────────────── */
  const exportCsv = () => {
    const headers = ['ลำดับ','Job No','วันที่ Request','Brand','Priority','เรื่อง','Objective','Platform','Size/Format','ผู้สั่งงาน','ผู้อนุมัติ','Graphic','ประเภทงาน','SLA std(h)','สถานะ','Deadline','วันที่เริ่ม','วันที่ Approve','เวลาทำงาน','รอบแก้','On-Time','Direction Change','Brief ไม่ครบ','Report Link'];
    const rows = filtered.map((t, i) => [
      i+1, t.jobNo||t.id, fmtDate(t.createdAt), t.brand, (PC[t.priority]||PC[3]).label,
      t.title, t.objective||'', t.platform||'', t.sizeFormat||'',
      t.requester||'', t.approverName||'',
      GRAPHICS.find(g => g.id === t.assignee)?.name||'-',
      t.slaType, t.standardHours, t.status,
      fmtDate(t.dueDate), fmtDateTime(t.startedAt), fmtDateTime(t.completedAt),
      fmtSec(t.timeSpent), t.revisions,
      t.status==='Done'?(t.completedAt&&t.dueDate&&t.completedAt<=t.dueDate?'Yes':'No'):'-',
      t.isDirectionChange?'Yes':'No',
      t.incompleteRejectReason||'-',
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
              <div className="inline-flex items-center gap-1 text-slate-400 text-xs font-bold uppercase whitespace-nowrap">
                <FilterIcon className="w-4 h-4" /> Brand
              </div>
              {BRANDS.map(b => (
                <button key={b.name} onClick={() => setFB(b.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${filterBrand === b.name ? `${b.color} text-white border-transparent` : 'bg-white border-slate-200 text-slate-600'}`}>
                  {b.name}
                </button>
              ))}
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Active"     value={counts.active} hint="งานในคิว"       icon={GridIcon}  />
                <StatCard title="Review"     value={counts.review} hint="รอ approve"      icon={EyeIcon}   />
                <StatCard title="Done"       value={counts.done}   hint="ปิดแล้ว"         icon={CheckIcon} />
                <StatCard title="P1 Critical" value={counts.p1}   hint="งานเร่งด่วนสูงสุด" icon={AlertIcon} accent="text-red-600" />
              </div>
              <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div style={{ minWidth: '1100px' }}>
                  <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: '180px repeat(7, 1fr)' }}>
                    <div className="p-4 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-400">Graphic Team</div>
                    {calDays.map((day, i) => {
                      const isToday = day.toDateString() === new Date().toDateString();
                      return (
                        <div key={i} className={`p-4 text-center border-l border-slate-100 ${isToday ? 'bg-red-50' : ''}`}>
                          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                            {day.toLocaleDateString('th-TH', { weekday:'short' })}
                          </div>
                          <div className={`font-black text-lg mt-0.5 ${isToday ? 'text-red-600' : ''}`}>{day.getDate()}</div>
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
                        </div>
                      </div>
                      {calDays.map((day, i) => {
                        const jobs = jobsByCell(g.id, day);
                        const wl   = workloadByCell(g.id, day);
                        return (
                          <div key={i} className="p-2 border-l border-slate-100 flex flex-col gap-1.5">
                            {wl > 0 && <WorkloadBar hours={wl} />}
                            {jobs.map(job => (
                              <div key={job.id} className={`rounded-xl border px-2 py-2 text-[10px] ${(PC[job.priority]||PC[3]).bg}`}>
                                <div className={`font-bold ${(PC[job.priority]||PC[3]).color}`}>{(PC[job.priority]||PC[3]).label}</div>
                                <div className="font-bold text-slate-800 mt-0.5 line-clamp-2">{job.title}</div>
                                <div className="text-slate-500 mt-0.5">{job.brand}</div>
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
                {/* Section 1 */}
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
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100">
                        {GRAPHICS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
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
                            onChange={() => setJob({...newJob, priority:p})} className="sr-only" />
                          <span className={`w-2.5 h-2.5 rounded-full ${PC[p].dot}`} />
                          <span className="text-xs font-bold">{PC[p].label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Deadline */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Target Deadline <span className="text-red-500">*</span></label>
                      <input type="date" value={newJob.dueDate} onChange={e => setJob({...newJob, dueDate:e.target.value})}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
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
                    <label className="block text-xs font-bold text-slate-600 mb-1">Reference / Concept / Mood Board Link</label>
                    <input value={newJob.attachment} onChange={e => setJob({...newJob, attachment:e.target.value})}
                      placeholder="https://drive.google.com/... หรือ Figma link"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-red-100" />
                    {newJob.attachment && !validLink(newJob.attachment) && <p className="text-xs text-red-500 mt-1">ต้องขึ้นต้นด้วย https://</p>}
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
                    {[['ชื่องาน','title'],['Brand','brand'],['ประเภทงาน','slaType'],['Priority','priority'],['Target Deadline','dueDate'],['Objective','objective'],['ขนาด/Format','sizeFormat'],['ชื่อผู้สั่งงาน','requester']].map(([label,key]) => {
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
                <div>
                  <h1 className="text-3xl font-black">Graphic Board</h1>
                  <p className="text-slate-500 mt-1">เรียงตาม Priority · กด Start เพื่อเริ่มจับเวลา · ปฏิเสธ Brief ไม่ครบได้ที่นี่</p>
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
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
                    ไม่มีงานในคิว — <button onClick={() => setTab('marketing')} className="text-red-600 underline font-bold">สร้าง Ticket ใหม่</button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── DASHBOARD ── */}
          {!loading && tab === 'dashboard' && (
            <DashboardSection theme={dashTheme} tickets={filtered} filterBrand={filterBrand} onExport={exportCsv} />
          )}
        </main>
      </div>
    </div>
  );
}
