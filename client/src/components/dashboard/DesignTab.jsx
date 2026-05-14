import { useState } from 'react';
import { Save, Check } from 'lucide-react';

/* ── Preset full themes ───────────────────────────────────────── */
const PRESET_THEMES = {
  midnight:   { bg_type:'gradient', bg_gradient_start:'#0a0a0a', bg_gradient_end:'#1a1a2e', bg_gradient_dir:'top', text_color:'#ffffff', bio_color:'#8888aa', btn_bg:'#16213e', btn_text:'#ffffff', btn_border:'#0f3460', btn_shape:'rounded', btn_style:'filled', btn_hover:'lift', font_heading:'Inter', font_body:'Inter', avatar_glow:0 },
  neon_tokyo: { bg_type:'gradient', bg_gradient_start:'#0d0221', bg_gradient_end:'#1a0533', bg_gradient_dir:'top', text_color:'#f0f0ff', bio_color:'#ff6ab0', btn_bg:'transparent', btn_text:'#00ffcc', btn_border:'#00ffcc', btn_shape:'pill', btn_style:'neon', btn_hover:'glow', font_heading:'Space Grotesk', font_body:'Inter', avatar_glow:1, avatar_glow_color:'#ff6ab0' },
  clean_white:{ bg_type:'solid', bg_color:'#ffffff', text_color:'#111111', bio_color:'#555555', btn_bg:'#111111', btn_text:'#ffffff', btn_border:'#111111', btn_shape:'rounded', btn_style:'filled', btn_hover:'lift', font_heading:'Inter', font_body:'Inter', avatar_glow:0 },
  sunset:     { bg_type:'gradient', bg_gradient_start:'#ff6b35', bg_gradient_end:'#f7c59f', bg_gradient_dir:'diagonal', text_color:'#1a0a00', bio_color:'#3a1500', btn_bg:'#1a0a00', btn_text:'#ffffff', btn_border:'#1a0a00', btn_shape:'pill', btn_style:'filled', btn_hover:'lift', font_heading:'Poppins', font_body:'DM Sans', avatar_glow:0 },
  forest:     { bg_type:'gradient', bg_gradient_start:'#1a2e1a', bg_gradient_end:'#2d5a27', bg_gradient_dir:'top', text_color:'#e8f5e8', bio_color:'#90c090', btn_bg:'#2d7a2d', btn_text:'#ffffff', btn_border:'#3d9a3d', btn_shape:'rounded', btn_style:'filled', btn_hover:'lift', font_heading:'Montserrat', font_body:'DM Sans', avatar_glow:0 },
  ocean:      { bg_type:'gradient', bg_gradient_start:'#0077b6', bg_gradient_end:'#023e8a', bg_gradient_dir:'top', text_color:'#caf0f8', bio_color:'#90e0ef', btn_bg:'rgba(255,255,255,0.12)', btn_text:'#ffffff', btn_border:'rgba(255,255,255,0.2)', btn_shape:'pill', btn_style:'glass', btn_hover:'lift', font_heading:'Space Grotesk', font_body:'Inter', avatar_glow:1, avatar_glow_color:'#90e0ef' },
  rose_gold:  { bg_type:'gradient', bg_gradient_start:'#2d1b1b', bg_gradient_end:'#1a0d0d', bg_gradient_dir:'top', text_color:'#f4c5ae', bio_color:'#c9956b', btn_bg:'#b5603a', btn_text:'#fff5ee', btn_border:'#c4704a', btn_shape:'pill', btn_style:'filled', btn_hover:'glow', font_heading:'Playfair Display', font_body:'DM Sans', avatar_glow:1, avatar_glow_color:'#c9956b' },
  hacker:     { bg_type:'solid', bg_color:'#000000', text_color:'#00ff41', bio_color:'#00bb30', btn_bg:'transparent', btn_text:'#00ff41', btn_border:'#00ff41', btn_shape:'square', btn_style:'outline', btn_hover:'fill', font_heading:'Space Grotesk', font_body:'Space Grotesk', avatar_glow:1, avatar_glow_color:'#00ff41' },
  pastel:     { bg_type:'gradient', bg_gradient_start:'#ffecd2', bg_gradient_end:'#fcb69f', bg_gradient_dir:'diagonal', text_color:'#2d1b1b', bio_color:'#7a4a3a', btn_bg:'#ffffff', btn_text:'#2d1b1b', btn_border:'#f0a080', btn_shape:'pill', btn_style:'shadow', btn_hover:'lift', font_heading:'Poppins', font_body:'DM Sans', avatar_glow:0 },
  galaxy:     { bg_type:'gradient', bg_gradient_start:'#0d001a', bg_gradient_end:'#1a0033', bg_gradient_dir:'radial', bg_animated:1, text_color:'#ffffff', bio_color:'#c084fc', btn_bg:'rgba(139,92,246,0.3)', btn_text:'#ffffff', btn_border:'rgba(139,92,246,0.5)', btn_shape:'pill', btn_style:'glass', btn_hover:'glow', font_heading:'Syne', font_body:'Inter', avatar_glow:1, avatar_glow_color:'#7c3aed' },
};

/* ── Preset backgrounds (background-only quick-swatches) ─────── */
const PRESET_BACKGROUNDS = [
  { label: 'Pure Dark',    bg_type:'solid',    bg_color:'#0a0a0a' },
  { label: 'Deep Blue',    bg_type:'gradient', bg_gradient_start:'#0d1117', bg_gradient_end:'#1a1a2e', bg_gradient_dir:'top' },
  { label: 'Neon Night',   bg_type:'gradient', bg_gradient_start:'#0d0221', bg_gradient_end:'#1a0533', bg_gradient_dir:'top' },
  { label: 'Warm White',   bg_type:'solid',    bg_color:'#fafafa' },
  { label: 'Aurora',       bg_type:'gradient', bg_gradient_start:'#0f3443', bg_gradient_end:'#34e89e', bg_gradient_dir:'diagonal' },
  { label: 'Smoke',        bg_type:'gradient', bg_gradient_start:'#1a1a1a', bg_gradient_end:'#2d2d2d', bg_gradient_dir:'top' },
  { label: 'Crimson',      bg_type:'gradient', bg_gradient_start:'#1a0000', bg_gradient_end:'#3d0000', bg_gradient_dir:'top' },
  { label: 'Lavender',     bg_type:'gradient', bg_gradient_start:'#f3e7ff', bg_gradient_end:'#e8d5ff', bg_gradient_dir:'top' },
];

const FONTS          = ['Inter','Poppins','Space Grotesk','Syne','DM Sans','Playfair Display','Bebas Neue','Montserrat'];
const BTN_SHAPES     = ['rounded','pill','square','sharp'];
const BTN_STYLES     = ['filled','outline','shadow','glass','neon'];
const BTN_HOVERS     = ['lift','glow','fill','none'];
const AVATAR_SHAPES  = ['circle','rounded','hexagon','none'];
const AVATAR_BORDERS = ['none','thin','medium','thick'];
const LINK_SPACINGS  = ['compact','normal','relaxed'];
const FONT_SIZES     = ['normal','large'];
const LAYOUT_AVATARS = ['top-center','top-left','hidden'];
const BIO_ALIGNS     = ['center','left'];
const GRADIENT_DIRS  = ['top','diagonal','radial'];

/* ── Mini helpers ─────────────────────────────────────────────── */
function Label({ children }) {
  return <label className="text-white/50 text-xs font-medium uppercase tracking-wider">{children}</label>;
}

function ColorInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" style={{ padding: 2 }} />
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-white" />
      </div>
    </div>
  );
}

function NullableColorInput({ label, value, onChange, placeholder = 'Brand color (auto)' }) {
  const checked = value != null && value !== '';
  return (
    <div className="flex flex-col gap-1">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked ? '#ffffff' : null)}
          className="accent-indigo-500" />
        <span className="text-xs text-white/40">{checked ? 'Custom' : placeholder}</span>
        {checked && (
          <>
            <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" style={{ padding: 2 }} />
            <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-white" />
          </>
        )}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <Label>{label}</Label>}
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white">
        {options.map(o => (
          <option key={o} value={o} className="bg-[#1a1a2e]">
            {o.charAt(0).toUpperCase() + o.slice(1).replace(/-/g,' ')}
          </option>
        ))}
      </select>
    </div>
  );
}

function Pills({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      <div className="flex flex-wrap gap-1.5">
        {options.map(o => (
          <button key={o} onClick={() => onChange(o)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              value === o ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10'
            }`}>
            {o.charAt(0).toUpperCase() + o.slice(1).replace(/-/g,' ')}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-4 pb-5 border-b border-white/5">
      <h3 className="text-sm font-semibold text-white/80">{title}</h3>
      {children}
    </div>
  );
}

/* ── Helper: gradient CSS for a preset-background swatch ──────── */
function bgSwatchStyle(p) {
  if (p.bg_type === 'solid') return { background: p.bg_color };
  const dir = p.bg_gradient_dir === 'radial' ? 'radial-gradient(circle' :
              `linear-gradient(${p.bg_gradient_dir === 'diagonal' ? '135deg' : '180deg'}`;
  if (p.bg_gradient_dir === 'radial')
    return { background: `radial-gradient(circle, ${p.bg_gradient_start}, ${p.bg_gradient_end})` };
  return { background: `linear-gradient(${p.bg_gradient_dir === 'diagonal' ? '135deg' : '180deg'}, ${p.bg_gradient_start}, ${p.bg_gradient_end})` };
}

/* ── Main export ──────────────────────────────────────────────── */
export default function DesignTab({ design, onChange, onSave }) {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  if (!design) return <div className="text-white/30 text-sm">Loading…</div>;

  const set = (key, val) => onChange({ ...design, [key]: val });

  const applyPreset = (name) => {
    if (!window.confirm(`Apply the "${name}" preset? This will overwrite all your design settings.`)) return;
    const key    = name.toLowerCase().replace(/ /g,'_');
    const preset = PRESET_THEMES[key];
    if (preset) onChange({ ...design, ...preset, preset_name: name });
  };

  const applyBg = (p) => {
    const bgFields = { bg_type: p.bg_type, bg_color: p.bg_color, bg_gradient_start: p.bg_gradient_start, bg_gradient_end: p.bg_gradient_end, bg_gradient_dir: p.bg_gradient_dir };
    onChange({ ...design, ...bgFields });
  };

  const save = async () => {
    setSaving(true);
    try { await onSave(); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg flex flex-col gap-5">

      {/* Header + save */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Design</h2>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all disabled:opacity-50">
          {saved ? <><Check size={13}/>Saved!</> : <><Save size={13}/>{saving ? 'Saving…' : 'Save'}</>}
        </button>
      </div>

      {/* ── Preset Themes ─────────────────────────────────── */}
      <Section title="Preset Themes">
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(PRESET_THEMES).map(key => {
            const t       = PRESET_THEMES[key];
            const display = key.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
            const style   = t.bg_type === 'gradient'
              ? { background: `linear-gradient(135deg, ${t.bg_gradient_start}, ${t.bg_gradient_end})` }
              : { background: t.bg_color };
            return (
              <button key={key} onClick={() => applyPreset(display)}
                style={style}
                className="h-14 rounded-xl flex items-end pb-2 px-3 text-xs font-semibold transition-all hover:scale-105 border border-white/10 overflow-hidden">
                <span style={{ color: t.text_color, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>{display}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Background ────────────────────────────────────── */}
      <Section title="Background">
        <Pills label="Type" value={design.bg_type} onChange={v => set('bg_type', v)} options={['solid','gradient','image']} />

        {/* Preset background swatches */}
        <div>
          <Label>Quick Presets</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {PRESET_BACKGROUNDS.map(p => (
              <button key={p.label} onClick={() => applyBg(p)} title={p.label}
                style={{ ...bgSwatchStyle(p), width: 40, height: 40 }}
                className="rounded-lg border border-white/20 hover:scale-110 transition-transform shrink-0" />
            ))}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {PRESET_BACKGROUNDS.map(p => (
              <span key={p.label} className="text-[10px] text-white/30 w-[42px] text-center truncate">{p.label}</span>
            ))}
          </div>
        </div>

        {design.bg_type === 'solid' && (
          <ColorInput label="Color" value={design.bg_color} onChange={v => set('bg_color', v)} />
        )}
        {design.bg_type === 'gradient' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <ColorInput label="Start" value={design.bg_gradient_start} onChange={v => set('bg_gradient_start', v)} />
              <ColorInput label="End"   value={design.bg_gradient_end}   onChange={v => set('bg_gradient_end',   v)} />
            </div>
            <Pills label="Direction" value={design.bg_gradient_dir} onChange={v => set('bg_gradient_dir', v)} options={GRADIENT_DIRS} />
            <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer select-none">
              <input type="checkbox" checked={!!design.bg_animated} onChange={e => set('bg_animated', e.target.checked ? 1 : 0)} className="accent-indigo-500" />
              Animated gradient
            </label>
          </div>
        )}
        {design.bg_type === 'image' && (
          <div>
            <Label>Image URL</Label>
            <input type="url" value={design.bg_image_url || ''} onChange={e => set('bg_image_url', e.target.value)}
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-white"
              placeholder="https://…" />
          </div>
        )}
      </Section>

      {/* ── Colors ────────────────────────────────────────── */}
      <Section title="Colors">
        <div className="grid grid-cols-2 gap-3">
          <ColorInput label="Text"         value={design.text_color} onChange={v => set('text_color', v)} />
          <ColorInput label="Bio text"     value={design.bio_color}  onChange={v => set('bio_color',  v)} />
          <ColorInput label="Button bg"    value={design.btn_bg}     onChange={v => set('btn_bg',     v)} />
          <ColorInput label="Button text"  value={design.btn_text}   onChange={v => set('btn_text',   v)} />
          <ColorInput label="Button border" value={design.btn_border} onChange={v => set('btn_border', v)} />
        </div>
        <NullableColorInput
          label="Social icon color"
          value={design.social_icon_color ?? null}
          onChange={v => set('social_icon_color', v)}
          placeholder="Per-brand colors (auto)"
        />
      </Section>

      {/* ── Button Style ──────────────────────────────────── */}
      <Section title="Button Style">
        <Pills label="Shape"        value={design.btn_shape} onChange={v => set('btn_shape', v)} options={BTN_SHAPES} />
        <Pills label="Style"        value={design.btn_style} onChange={v => set('btn_style', v)} options={BTN_STYLES} />
        <Pills label="Hover Effect" value={design.btn_hover} onChange={v => set('btn_hover', v)} options={BTN_HOVERS} />
      </Section>

      {/* ── Fonts ─────────────────────────────────────────── */}
      <Section title="Fonts">
        <Select label="Heading Font" value={design.font_heading} onChange={v => set('font_heading', v)} options={FONTS} />
        <Select label="Body Font"    value={design.font_body}    onChange={v => set('font_body',    v)} options={FONTS} />
        <Pills  label="Font Size"    value={design.font_size}    onChange={v => set('font_size',    v)} options={FONT_SIZES} />
      </Section>

      {/* ── Avatar ────────────────────────────────────────── */}
      <Section title="Avatar Style">
        <Pills label="Shape"        value={design.avatar_shape}       onChange={v => set('avatar_shape',       v)} options={AVATAR_SHAPES} />
        <ColorInput label="Border Color" value={design.avatar_border_color} onChange={v => set('avatar_border_color', v)} />
        <Pills label="Border Size"  value={design.avatar_border_size} onChange={v => set('avatar_border_size', v)} options={AVATAR_BORDERS} />
        <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer select-none">
          <input type="checkbox" checked={!!design.avatar_glow} onChange={e => set('avatar_glow', e.target.checked ? 1 : 0)} className="accent-indigo-500" />
          Glow effect
        </label>
        {!!design.avatar_glow && (
          <ColorInput label="Glow Color" value={design.avatar_glow_color} onChange={v => set('avatar_glow_color', v)} />
        )}
      </Section>

      {/* ── Layout ────────────────────────────────────────── */}
      <Section title="Layout">
        <Pills label="Avatar Position" value={design.layout_avatar}   onChange={v => set('layout_avatar',   v)} options={LAYOUT_AVATARS} />
        <Pills label="Bio Alignment"   value={design.layout_bio_align} onChange={v => set('layout_bio_align', v)} options={BIO_ALIGNS} />
        <Pills label="Link Spacing"    value={design.link_spacing}    onChange={v => set('link_spacing',    v)} options={LINK_SPACINGS} />
      </Section>
    </div>
  );
}
