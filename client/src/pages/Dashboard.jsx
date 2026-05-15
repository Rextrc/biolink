import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap, User, Link2, Palette, ExternalLink, LogOut,
  Plus, Trash2, Eye, EyeOff, GripVertical, Search,
  ChevronDown, X, Save, Check, Home, Upload,
} from 'lucide-react';
import { api } from '../utils/api';
import { getAuth, clearAuth } from '../utils/auth';
import { PLATFORMS } from '../utils/platforms';
import { SocialIconSvg } from '../utils/social-icons.jsx';
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ══ Design tokens ══════════════════════════════════════════════ */
const BG         = '#0a0a0a';
const CARD       = '#111111';
const CARD_HOVER = '#141414';
const BORDER     = 'rgba(255,255,255,0.07)';
const INPUT_BG   = '#191919';
const INPUT_B    = 'rgba(255,255,255,0.1)';
const LABEL_C    = 'rgba(255,255,255,0.38)';
const ACCENT     = '#4f46e5';

/* ══ Atoms ══════════════════════════════════════════════════════ */
const inputBase = {
  width: '100%', background: INPUT_BG, border: `1px solid ${INPUT_B}`,
  borderRadius: 8, padding: '10px 14px', color: '#fff',
  fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

function Label({ children }) {
  return (
    <div style={{ color: LABEL_C, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {children}
    </div>
  );
}

function SInput({ value, onChange, placeholder, type = 'text', readOnly }) {
  return (
    <input type={type} value={value ?? ''} onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder} readOnly={readOnly}
      style={{ ...inputBase, ...(readOnly ? { color: 'rgba(255,255,255,0.3)', cursor: 'default' } : {}) }} />
  );
}

function STextarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{ ...inputBase, resize: 'vertical', lineHeight: 1.55 }} />
  );
}

function SSelect({ value, onChange, options }) {
  return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)}
      style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}>
      {options.map(o => <option key={o} value={o} style={{ background: '#1a1a1a' }}>{o}</option>)}
    </select>
  );
}

/* Large colour-rectangle picker — the key e-z.gg visual signature */
function ColorBlock({ label, value, onChange }) {
  const hex = value || '#111111';
  return (
    <div>
      {label && <Label>{label}</Label>}
      <label style={{ display: 'block', position: 'relative', height: 46, borderRadius: 9, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${INPUT_B}` }}>
        <div style={{ position: 'absolute', inset: 0, background: hex }} />
        <input type="color" value={hex} onChange={e => onChange(e.target.value)}
          style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', padding: 0, border: 0 }} />
      </label>
    </div>
  );
}

function ColorPair({ a, b }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <ColorBlock {...a} />
      <ColorBlock {...b} />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <div onClick={() => onChange(!checked)} style={{
        width: 38, height: 20, borderRadius: 10, flexShrink: 0,
        background: checked ? ACCENT : 'rgba(255,255,255,0.1)',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
        }} />
      </div>
      {label && <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{label}</span>}
    </label>
  );
}

function Pills({ label, value, onChange, options }) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(o => {
          const on = value === o;
          return (
            <button key={o} onClick={() => onChange(o)} style={{
              padding: '6px 13px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              border: `1px solid ${on ? ACCENT : INPUT_B}`,
              background: on ? ACCENT : 'rgba(255,255,255,0.04)',
              color: on ? '#fff' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'inherit',
            }}>
              {o.charAt(0).toUpperCase() + o.slice(1).replace(/-/g, ' ')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '6px 0' }} />;
}

function SubHead({ children }) {
  return (
    <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', paddingTop: 4 }}>
      {children}
    </div>
  );
}

function Section({ title, children, id, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div id={id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, marginBottom: 12, overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer',
        color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', letterSpacing: '-0.01em',
      }}>
        <span>{title}</span>
        <ChevronDown size={14} style={{ opacity: 0.3, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '2px 20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {children}
        </div>
      )}
    </div>
  );
}

/* ══ Sortable link row ══════════════════════════════════════════ */
function SortableRow({ link, onToggle, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: INPUT_BG, border: `1px solid ${INPUT_B}`, borderRadius: 10, padding: '10px 12px',
      }}>
        <button {...attributes} {...listeners} style={{ color: 'rgba(255,255,255,0.2)', cursor: 'grab', background: 'none', border: 'none', display: 'flex', padding: 2, flexShrink: 0 }}>
          <GripVertical size={14} />
        </button>
        {link.type === 'social' && link.platform && (
          <div style={{ flexShrink: 0 }}><SocialIconSvg platform={link.platform} size={17} /></div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <input value={link.title || ''} onChange={e => onEdit(link.id, { title: e.target.value })}
            style={{ width: '100%', background: 'none', border: 'none', color: '#fff', fontSize: 13, fontWeight: 500, outline: 'none', fontFamily: 'inherit', padding: 0 }}
            placeholder={link.type === 'social' ? link.platform : 'Link title'} />
          <input value={link.url || ''} onChange={e => onEdit(link.id, { url: e.target.value })}
            style={{ width: '100%', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, outline: 'none', fontFamily: 'inherit', marginTop: 3, padding: 0 }}
            placeholder="https://…" />
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={() => onToggle(link.id)} title={link.visible ? 'Hide' : 'Show'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: link.visible ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)', padding: 5 }}>
            {link.visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button onClick={() => onDelete(link.id)} title="Delete"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 5 }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══ Sidebar ════════════════════════════════════════════════════ */
function Sidebar({ username, onLogout, view, setView }) {
  const navItems = [
    { icon: Home,    id: 'home',      title: 'Home'    },
    { icon: User,    id: 's-profile', title: 'Profile' },
    { icon: Link2,   id: 's-links',   title: 'Links'   },
    { icon: Palette, id: 's-design',  title: 'Design'  },
  ];

  const handleClick = (id) => {
    if (id === 'home') { setView('home'); return; }
    setView('edit');
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <div style={{
      width: 58, flexShrink: 0, background: '#0c0c0c', borderRight: `1px solid ${BORDER}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 18, paddingBottom: 18, gap: 3,
      position: 'sticky', top: 0, height: '100vh', zIndex: 60,
    }}>
      <div style={{ marginBottom: 18 }}><Zap size={19} color={ACCENT} /></div>
      {navItems.map(({ icon: Icon, id, title }) => {
        const isActive = id === 'home' ? view === 'home' : view === 'edit';
        return (
          <button key={id} onClick={() => handleClick(id)} title={title}
            style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive && (id === 'home' ? view === 'home' : view === 'edit') ? `${ACCENT}20` : 'none', border: 'none', cursor: 'pointer', color: isActive ? ACCENT : 'rgba(255,255,255,0.3)', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = isActive ? ACCENT : 'rgba(255,255,255,0.3)'; }}>
            <Icon size={16} />
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <a href={`/${username}`} target="_blank" rel="noreferrer" title="View Bio"
        style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
        <ExternalLink size={15} />
      </a>
      <button onClick={onLogout} title="Logout"
        style={{ width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
        <LogOut size={15} />
      </button>
    </div>
  );
}

/* ══ Image Upload Button ════════════════════════════════════════ */
function ImageUpload({ value, onChange, shape = 'circle', label }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await res.json();
      if (data.url) onChange(data.url);
    } catch {}
    finally { setUploading(false); }
  };

  const isCircle = shape === 'circle';
  return (
    <label style={{ display: 'block', cursor: 'pointer', position: 'relative' }}>
      <input type="file" accept="image/*" onChange={pick} style={{ display: 'none' }} />
      {value ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={value} alt="" style={{ width: isCircle ? 72 : '100%', height: isCircle ? 72 : 80, borderRadius: isCircle ? '50%' : 10, objectFit: 'cover', border: `2px solid ${BORDER}`, display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: isCircle ? '50%' : 10, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}>
            <Upload size={16} color="#fff" />
          </div>
        </div>
      ) : (
        <div style={{ width: isCircle ? 72 : '100%', height: isCircle ? 72 : 80, borderRadius: isCircle ? '50%' : 10, border: `2px dashed rgba(255,255,255,0.15)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
          {uploading ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : <><Upload size={16} />{label}</>}
        </div>
      )}
      {uploading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /></div>}
    </label>
  );
}

/* ══ Home screen ════════════════════════════════════════════════ */
function HomeScreen({ username, profile, links, setView, keyExpiry }) {
  const totalLinks = links.length;
  const visibleLinks = links.filter(l => l.visible).length;

  const daysLeft = keyExpiry != null
    ? Math.ceil((new Date(keyExpiry) - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const expiryColor = daysLeft === null ? '#6ee7b7'
    : daysLeft <= 7 ? '#f87171'
    : daysLeft <= 30 ? '#fbbf24'
    : '#6ee7b7';

  const expiryLabel = daysLeft === null ? 'Lifetime access'
    : daysLeft <= 0 ? 'Access expired'
    : daysLeft === 1 ? '1 day left'
    : `${daysLeft} days left`;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '48px 24px' }}>
      {/* Profile card */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '32px 28px', marginBottom: 20, textAlign: 'center' }}>
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 14px', display: 'block', border: `2px solid ${BORDER}` }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 28, fontWeight: 700, color: ACCENT }}>
            {username?.[0]?.toUpperCase()}
          </div>
        )}
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{profile.display_name || `@${username}`}</div>
        {profile.bio && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16, lineHeight: 1.5 }}>{profile.bio}</div>}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#818cf8' }}>
          olik.app/{username}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[['Total Links', totalLinks], ['Visible', visibleLinks]].map(([label, val]) => (
          <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{val}</div>
          </div>
        ))}
        {keyExpiry !== undefined && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Access</div>
            <div style={{ fontSize: daysLeft === null ? 22 : 28, fontWeight: 700, color: expiryColor }}>{expiryLabel}</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button onClick={() => setView('edit')} style={{ width: '100%', background: ACCENT, border: 'none', color: '#fff', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
          Edit Profile & Links
        </button>
        <a href={`/${username}`} target="_blank" rel="noreferrer" style={{ display: 'block', width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: '13px', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', textAlign: 'center' }}>
          View My Page
        </a>
      </div>
    </div>
  );
}

/* ══ Preset themes data ═════════════════════════════════════════ */
const PRESETS = {
  Midnight:      { bg_type:'gradient', bg_gradient_start:'#0a0a0a', bg_gradient_end:'#1a1a2e', bg_gradient_dir:'top', text_color:'#ffffff', bio_color:'#8888aa', btn_bg:'#16213e', btn_text:'#ffffff', btn_border:'#0f3460', btn_shape:'rounded', btn_style:'filled', btn_hover:'lift', font_heading:'Inter', font_body:'Inter', avatar_glow:0 },
  'Neon Tokyo':  { bg_type:'gradient', bg_gradient_start:'#0d0221', bg_gradient_end:'#1a0533', bg_gradient_dir:'top', text_color:'#f0f0ff', bio_color:'#ff6ab0', btn_bg:'transparent', btn_text:'#00ffcc', btn_border:'#00ffcc', btn_shape:'pill', btn_style:'neon', btn_hover:'glow', font_heading:'Space Grotesk', font_body:'Inter', avatar_glow:1, avatar_glow_color:'#ff6ab0' },
  'Clean White': { bg_type:'solid', bg_color:'#ffffff', text_color:'#111111', bio_color:'#555555', btn_bg:'#111111', btn_text:'#ffffff', btn_border:'#111111', btn_shape:'rounded', btn_style:'filled', btn_hover:'lift', font_heading:'Inter', font_body:'Inter', avatar_glow:0 },
  Sunset:        { bg_type:'gradient', bg_gradient_start:'#ff6b35', bg_gradient_end:'#f7c59f', bg_gradient_dir:'diagonal', text_color:'#1a0a00', bio_color:'#3a1500', btn_bg:'#1a0a00', btn_text:'#ffffff', btn_border:'#1a0a00', btn_shape:'pill', btn_style:'filled', btn_hover:'lift', font_heading:'Poppins', font_body:'DM Sans', avatar_glow:0 },
  Forest:        { bg_type:'gradient', bg_gradient_start:'#1a2e1a', bg_gradient_end:'#2d5a27', bg_gradient_dir:'top', text_color:'#e8f5e8', bio_color:'#90c090', btn_bg:'#2d7a2d', btn_text:'#ffffff', btn_border:'#3d9a3d', btn_shape:'rounded', btn_style:'filled', btn_hover:'lift', font_heading:'Montserrat', font_body:'DM Sans', avatar_glow:0 },
  Ocean:         { bg_type:'gradient', bg_gradient_start:'#0077b6', bg_gradient_end:'#023e8a', bg_gradient_dir:'top', text_color:'#caf0f8', bio_color:'#90e0ef', btn_bg:'rgba(255,255,255,0.12)', btn_text:'#ffffff', btn_border:'rgba(255,255,255,0.2)', btn_shape:'pill', btn_style:'glass', btn_hover:'lift', font_heading:'Space Grotesk', font_body:'Inter', avatar_glow:1, avatar_glow_color:'#90e0ef' },
  'Rose Gold':   { bg_type:'gradient', bg_gradient_start:'#2d1b1b', bg_gradient_end:'#1a0d0d', bg_gradient_dir:'top', text_color:'#f4c5ae', bio_color:'#c9956b', btn_bg:'#b5603a', btn_text:'#fff5ee', btn_border:'#c4704a', btn_shape:'pill', btn_style:'filled', btn_hover:'glow', font_heading:'Playfair Display', font_body:'DM Sans', avatar_glow:1, avatar_glow_color:'#c9956b' },
  Hacker:        { bg_type:'solid', bg_color:'#000000', text_color:'#00ff41', bio_color:'#00bb30', btn_bg:'transparent', btn_text:'#00ff41', btn_border:'#00ff41', btn_shape:'square', btn_style:'outline', btn_hover:'fill', font_heading:'Space Grotesk', font_body:'Space Grotesk', avatar_glow:1, avatar_glow_color:'#00ff41' },
  Pastel:        { bg_type:'gradient', bg_gradient_start:'#ffecd2', bg_gradient_end:'#fcb69f', bg_gradient_dir:'diagonal', text_color:'#2d1b1b', bio_color:'#7a4a3a', btn_bg:'#ffffff', btn_text:'#2d1b1b', btn_border:'#f0a080', btn_shape:'pill', btn_style:'shadow', btn_hover:'lift', font_heading:'Poppins', font_body:'DM Sans', avatar_glow:0 },
  Galaxy:        { bg_type:'gradient', bg_gradient_start:'#0d001a', bg_gradient_end:'#1a0033', bg_gradient_dir:'radial', bg_animated:1, text_color:'#ffffff', bio_color:'#c084fc', btn_bg:'rgba(139,92,246,0.3)', btn_text:'#ffffff', btn_border:'rgba(139,92,246,0.5)', btn_shape:'pill', btn_style:'glass', btn_hover:'glow', font_heading:'Syne', font_body:'Inter', avatar_glow:1, avatar_glow_color:'#7c3aed' },
};

const FONTS   = ['Inter','Poppins','Space Grotesk','Syne','DM Sans','Playfair Display','Bebas Neue','Montserrat'];
const BG_DIRS = ['top','diagonal','radial'];
const SHAPES  = ['rounded','pill','square','sharp'];
const STYLES  = ['filled','outline','shadow','glass','neon'];
const HOVERS  = ['lift','glow','fill','none'];
const AV_SH   = ['circle','rounded','hexagon','none'];
const AV_BOR  = ['none','thin','medium','thick'];
const LAY_AV  = ['top-center','top-left','hidden'];
const BIO_AL  = ['center','left'];
const SPACING = ['compact','normal','relaxed'];
const SIZES   = ['normal','large'];

/* ══ Dashboard ══════════════════════════════════════════════════ */
export default function Dashboard() {
  const { username } = getAuth();
  const navigate = useNavigate();

  const [view,     setView]     = useState('home');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [profile,  setProfile]  = useState({ display_name: '', bio: '', avatar_url: '', banner_url: '' });
  const [design,   setDesign]   = useState(null);
  const [links,    setLinks]    = useState([]);
  const [keyExpiry, setKeyExpiry] = useState(undefined);

  const [showPlatforms,   setShowPlatforms]   = useState(false);
  const [platformSearch,  setPlatformSearch]  = useState('');
  const [addingPlatform,  setAddingPlatform]  = useState(null);
  const [handleInput,     setHandleInput]     = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  useEffect(() => {
    Promise.all([api.getPublicProfile(username), api.getDesign(), api.me()])
      .then(([pub, des, me]) => {
        setProfile(pub.profile || {});
        setDesign(des);
        setLinks(pub.links || []);
        setKeyExpiry(me.key_expires_at || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

  /* ── Save (profile + design together) ──── */
  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all([api.updateProfile(profile), api.updateDesign(design)]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const setD = (k, v) => setDesign(d => ({ ...d, [k]: v }));

  /* ── Link ops ───────────────────────────── */
  const addCustomLink = async () => {
    const lnk = await api.addLink({ type: 'custom', title: 'New Link', url: 'https://', position: links.length });
    setLinks(l => [...l, lnk]);
  };
  const addSocial = async (platform) => {
    if (!handleInput.trim()) return;
    const url = platform.urlBuilder(handleInput.trim());
    const lnk = await api.addLink({ type: 'social', platform: platform.slug, title: platform.name, url, position: links.length });
    setLinks(l => [...l, lnk]);
    setAddingPlatform(null); setHandleInput(''); setShowPlatforms(false); setPlatformSearch('');
  };
  const toggleLink = async (id) => {
    const lnk = links.find(l => l.id === id);
    const up  = await api.updateLink(id, { visible: lnk.visible ? 0 : 1 });
    setLinks(l => l.map(x => x.id === id ? up : x));
  };
  const deleteLink = async (id) => {
    await api.deleteLink(id);
    setLinks(l => l.filter(x => x.id !== id));
  };
  const editLink = (id, ch) => {
    setLinks(l => l.map(x => x.id === id ? { ...x, ...ch } : x));
    api.updateLink(id, ch).catch(console.error);
  };
  const onDragEnd = async (event, type) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const grp  = links.filter(l => l.type === type);
    const rest = links.filter(l => l.type !== type);
    const ren  = arrayMove(grp, grp.findIndex(l => l.id === active.id), grp.findIndex(l => l.id === over.id));
    const nxt  = type === 'custom' ? [...ren, ...rest] : [...rest, ...ren];
    setLinks(nxt);
    await api.reorderLinks(nxt.map((l, i) => ({ id: l.id, position: i }))).catch(console.error);
  };

  const applyPreset = (name) => {
    if (!window.confirm(`Apply "${name}"? This overwrites all design settings.`)) return;
    const p = PRESETS[name];
    if (p) setDesign(d => ({ ...d, ...p, preset_name: name }));
  };

  /* ── Loading state ──────────────────────── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const customs = links.filter(l => l.type === 'custom');
  const socials = links.filter(l => l.type === 'social');
  const filtered = PLATFORMS.filter(p => p.name.toLowerCase().includes(platformSearch.toLowerCase()));

  /* ── Render ─────────────────────────────── */
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG, color: '#fff', fontFamily: "'Inter', sans-serif" }}>

      {/* ─── Sidebar ──────────────────────────────── */}
      <Sidebar username={username} onLogout={() => { clearAuth(); navigate('/'); }} view={view} setView={setView} />

      {/* ─── Main content ─────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {view === 'home' && <HomeScreen username={username} profile={profile} links={links} setView={setView} keyExpiry={keyExpiry} />}
        {view === 'edit' && (<>

        {/* Sticky top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 28px',
          background: 'rgba(10,10,10,0.9)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${BORDER}`,
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>Manage Bio</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>/{username}</span>
          <a href={`/${username}`} target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 15px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}>
            <ExternalLink size={13} />View Bio
          </a>
          <button onClick={saveAll} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 20px', borderRadius: 8,
            background: saved ? '#16a34a' : ACCENT, border: 'none', color: '#fff',
            fontSize: 13, fontWeight: 600, cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.7 : 1, transition: 'background 0.2s', fontFamily: 'inherit',
          }}>
            {saved ? <><Check size={13} />Saved!</> : <><Save size={13} />{saving ? 'Saving…' : 'Save Changes'}</>}
          </button>
        </div>

        {/* Two-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 390px',
          gap: 18,
          padding: '22px 28px 60px',
          maxWidth: 1320,
          alignItems: 'start',
        }}>

          {/* ══ LEFT COLUMN ══════════════════════════ */}
          <div>

            {/* Profile section */}
            <Section title="Profile" id="s-profile">
              {/* URL (read-only) */}
              <div>
                <Label>Your URL</Label>
                <div style={{ display: 'flex', borderRadius: 8, border: `1px solid ${INPUT_B}`, overflow: 'hidden' }}>
                  <span style={{ padding: '10px 12px', background: '#141414', color: 'rgba(255,255,255,0.25)', fontSize: 13, whiteSpace: 'nowrap', borderRight: `1px solid ${INPUT_B}` }}>
                    olik.app/
                  </span>
                  <input readOnly value={username || ''} style={{ flex: 1, background: '#141414', border: 'none', color: 'rgba(255,255,255,0.35)', fontSize: 13, padding: '10px 12px', outline: 'none', fontFamily: 'inherit' }} />
                </div>
              </div>

              {/* Avatar */}
              <div>
                <Label>Avatar</Label>
                <ImageUpload value={profile.avatar_url} onChange={v => setProfile(p => ({ ...p, avatar_url: v }))} shape="circle" label="Upload photo" />
              </div>

              {/* Banner */}
              <div>
                <Label>Banner <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>supports GIF</span></Label>
                <ImageUpload value={profile.banner_url} onChange={v => setProfile(p => ({ ...p, banner_url: v }))} shape="banner" label="Upload banner / GIF" />
              </div>

              {/* Spotify */}
              <div>
                <Label>Spotify Track / Playlist URL</Label>
                <SInput value={profile.spotify_url} onChange={v => setProfile(p => ({ ...p, spotify_url: v }))} placeholder="https://open.spotify.com/track/..." />
              </div>

              {/* Display name */}
              <div>
                <Label>Display Name</Label>
                <SInput value={profile.display_name} onChange={v => setProfile(p => ({ ...p, display_name: v }))} placeholder="Your Name" />
              </div>

              {/* Bio */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                  <Label>Description</Label>
                  <span style={{ color: 'rgba(255,255,255,0.18)', fontSize: 11 }}>{(profile.bio || '').length}/160</span>
                </div>
                <STextarea value={profile.bio} onChange={v => { if (v.length <= 160) setProfile(p => ({ ...p, bio: v })); }} placeholder="Tell your story…" rows={4} />
              </div>
            </Section>

            {/* Custom Links */}
            <Section title="Custom Links" id="s-links">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => onDragEnd(e, 'custom')}>
                <SortableContext items={customs.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {customs.map(l => (
                      <SortableRow key={l.id} link={l} onToggle={toggleLink} onDelete={deleteLink} onEdit={editLink} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {customs.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.14)', fontSize: 13, textAlign: 'center', padding: '22px 0', border: `1px dashed rgba(255,255,255,0.07)`, borderRadius: 10 }}>
                  No links yet
                </div>
              )}
              <button onClick={addCustomLink} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px', borderRadius: 9, background: 'rgba(79,70,229,0.1)',
                border: `1px solid rgba(79,70,229,0.25)`, color: '#818cf8',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.1)'; }}>
                <Plus size={14} />Add Link
              </button>
            </Section>

            {/* Social Platforms */}
            <Section title="Social Platforms">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => onDragEnd(e, 'social')}>
                <SortableContext items={socials.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {socials.map(l => (
                      <SortableRow key={l.id} link={l} onToggle={toggleLink} onDelete={deleteLink} onEdit={editLink} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {socials.length === 0 && (
                <div style={{ color: 'rgba(255,255,255,0.14)', fontSize: 13, textAlign: 'center', padding: '22px 0', border: `1px dashed rgba(255,255,255,0.07)`, borderRadius: 10 }}>
                  No social links yet
                </div>
              )}

              {/* Platform picker */}
              {showPlatforms ? (
                <div style={{ background: '#141414', border: `1px solid ${INPUT_B}`, borderRadius: 10, padding: 14 }}>
                  {addingPlatform ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => { setAddingPlatform(null); setHandleInput(''); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 2 }}><X size={14} /></button>
                        <SocialIconSvg platform={addingPlatform.slug} size={16} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{addingPlatform.name}</span>
                      </div>
                      <SInput value={handleInput} onChange={v => setHandleInput(v)} placeholder={addingPlatform.placeholder} />
                      <button onClick={() => addSocial(addingPlatform)}
                        style={{ padding: '9px', borderRadius: 8, background: ACCENT, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Add {addingPlatform.name}
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={{ position: 'relative', marginBottom: 10 }}>
                        <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                        <input value={platformSearch} onChange={e => setPlatformSearch(e.target.value)} placeholder="Search platforms…" autoFocus
                          style={{ ...inputBase, padding: '8px 10px 8px 28px' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, maxHeight: 210, overflowY: 'auto' }}>
                        {filtered.map(p => (
                          <button key={p.slug} onClick={() => setAddingPlatform(p)}
                            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 8px', borderRadius: 7, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'inherit', transition: 'all 0.1s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; }}>
                            <SocialIconSvg platform={p.slug} size={14} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowPlatforms(true)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '10px', borderRadius: 9, background: 'rgba(79,70,229,0.1)',
                  border: `1px solid rgba(79,70,229,0.25)`, color: '#818cf8',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', width: '100%',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.18)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.1)'; }}>
                  <Plus size={14} />Add Social Platform
                </button>
              )}
            </Section>
          </div>

          {/* ══ RIGHT COLUMN ═════════════════════════ */}
          {design && (
            <div id="s-design" style={{ position: 'sticky', top: 70 }}>

              {/* Cosmetic Settings */}
              <Section title="Cosmetic Settings">

                {/* Background */}
                <SubHead>Background</SubHead>
                <Pills value={design.bg_type} onChange={v => setD('bg_type', v)} options={['solid', 'gradient', 'image']} />
                {design.bg_type === 'solid' && (
                  <ColorBlock label="Color" value={design.bg_color} onChange={v => setD('bg_color', v)} />
                )}
                {design.bg_type === 'gradient' && (
                  <>
                    <ColorPair
                      a={{ label: 'Start', value: design.bg_gradient_start, onChange: v => setD('bg_gradient_start', v) }}
                      b={{ label: 'End',   value: design.bg_gradient_end,   onChange: v => setD('bg_gradient_end',   v) }}
                    />
                    <Pills label="Direction" value={design.bg_gradient_dir} onChange={v => setD('bg_gradient_dir', v)} options={BG_DIRS} />
                    <Toggle label="Animated" checked={!!design.bg_animated} onChange={v => setD('bg_animated', v ? 1 : 0)} />
                  </>
                )}
                {design.bg_type === 'image' && (
                  <div>
                    <Label>Image URL</Label>
                    <SInput value={design.bg_image_url} onChange={v => setD('bg_image_url', v)} placeholder="https://…" />
                  </div>
                )}

                <Divider />

                {/* Colors */}
                <SubHead>Colors</SubHead>
                <ColorPair
                  a={{ label: 'Text Color',    value: design.text_color, onChange: v => setD('text_color', v) }}
                  b={{ label: 'Bio Text Color', value: design.bio_color,  onChange: v => setD('bio_color',  v) }}
                />
                <ColorPair
                  a={{ label: 'Button BG',   value: design.btn_bg,     onChange: v => setD('btn_bg',   v) }}
                  b={{ label: 'Button Text',  value: design.btn_text,   onChange: v => setD('btn_text', v) }}
                />
                <ColorBlock label="Button Border" value={design.btn_border} onChange={v => setD('btn_border', v)} />
                <div>
                  <Toggle label="Custom social icon color"
                    checked={!!design.social_icon_color}
                    onChange={v => setD('social_icon_color', v ? '#ffffff' : null)} />
                  {design.social_icon_color && (
                    <div style={{ marginTop: 10 }}>
                      <ColorBlock value={design.social_icon_color} onChange={v => setD('social_icon_color', v)} />
                    </div>
                  )}
                </div>

                <Divider />

                {/* Button Style */}
                <SubHead>Button Style</SubHead>
                <Pills label="Shape"  value={design.btn_shape} onChange={v => setD('btn_shape', v)} options={SHAPES} />
                <Pills label="Style"  value={design.btn_style} onChange={v => setD('btn_style', v)} options={STYLES} />
                <Pills label="Hover"  value={design.btn_hover} onChange={v => setD('btn_hover', v)} options={HOVERS} />

                <Divider />

                {/* Fonts */}
                <SubHead>Font</SubHead>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <Label>Heading</Label>
                    <SSelect value={design.font_heading} onChange={v => setD('font_heading', v)} options={FONTS} />
                  </div>
                  <div>
                    <Label>Body</Label>
                    <SSelect value={design.font_body} onChange={v => setD('font_body', v)} options={FONTS} />
                  </div>
                </div>
                <Pills label="Size" value={design.font_size} onChange={v => setD('font_size', v)} options={SIZES} />

                <Divider />

                {/* Avatar */}
                <SubHead>Avatar</SubHead>
                <Pills label="Shape"  value={design.avatar_shape}       onChange={v => setD('avatar_shape',       v)} options={AV_SH} />
                <ColorBlock label="Border Color" value={design.avatar_border_color} onChange={v => setD('avatar_border_color', v)} />
                <Pills label="Border" value={design.avatar_border_size} onChange={v => setD('avatar_border_size', v)} options={AV_BOR} />
                <Toggle label="Glow effect" checked={!!design.avatar_glow} onChange={v => setD('avatar_glow', v ? 1 : 0)} />
                {!!design.avatar_glow && (
                  <ColorBlock label="Glow Color" value={design.avatar_glow_color} onChange={v => setD('avatar_glow_color', v)} />
                )}

                <Divider />

                {/* Card glow */}
                <SubHead>Card</SubHead>
                <Toggle label="Card glow" checked={!!design.card_glow} onChange={v => setD('card_glow', v ? 1 : 0)} />
                {!!design.card_glow && (
                  <ColorBlock label="Card Glow Color" value={design.card_glow_color} onChange={v => setD('card_glow_color', v)} />
                )}

                <Divider />

                {/* Layout */}
                <SubHead>Layout</SubHead>
                <Pills label="Avatar Position" value={design.layout_avatar}    onChange={v => setD('layout_avatar',    v)} options={LAY_AV} />
                <Pills label="Bio Alignment"   value={design.layout_bio_align} onChange={v => setD('layout_bio_align', v)} options={BIO_AL} />
                <Pills label="Link Spacing"    value={design.link_spacing}     onChange={v => setD('link_spacing',     v)} options={SPACING} />
              </Section>

              {/* Preset Themes */}
              <Section title="Preset Themes" defaultOpen={false}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Object.entries(PRESETS).map(([name, t]) => {
                    const bg = t.bg_type === 'gradient'
                      ? `linear-gradient(135deg, ${t.bg_gradient_start}, ${t.bg_gradient_end})`
                      : t.bg_color;
                    return (
                      <button key={name} onClick={() => applyPreset(name)}
                        style={{ background: bg, height: 54, borderRadius: 10, display: 'flex', alignItems: 'flex-end', padding: '8px 12px', border: `1px solid rgba(255,255,255,0.1)`, cursor: 'pointer', transition: 'transform 0.15s', fontFamily: 'inherit' }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>
                        <span style={{ color: t.text_color || '#fff', fontSize: 11, fontWeight: 700, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </Section>

            </div>
          )}
        </div>
        </>)}
      </div>
    </div>
  );
}
