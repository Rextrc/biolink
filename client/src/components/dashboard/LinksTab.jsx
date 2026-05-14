import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, GripVertical, Search, X } from 'lucide-react';
import { api } from '../../utils/api';
import { PLATFORMS } from '../../utils/platforms';
import { SocialIconSvg } from '../../utils/social-icons.jsx';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ── Sortable row ─────────────────────────────────────────────── */
function SortableLink({ link, onToggle, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 glass rounded-xl p-3 group">
      {/* drag handle */}
      <button {...attributes} {...listeners} className="text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing p-0.5">
        <GripVertical size={15} />
      </button>

      {/* platform icon (social) or blank (custom) */}
      {link.type === 'social' && link.platform && (
        <div className="shrink-0">
          <SocialIconSvg platform={link.platform} size={20} />
        </div>
      )}

      {/* editable fields */}
      <div className="flex-1 min-w-0">
        <input
          value={link.title || ''}
          onChange={e => onEdit(link.id, { title: e.target.value })}
          className="w-full bg-transparent text-sm text-white font-medium outline-none placeholder:text-white/20 truncate"
          placeholder={link.type === 'social' ? link.platform : 'Link title'}
        />
        <input
          value={link.url || ''}
          onChange={e => onEdit(link.id, { url: e.target.value })}
          className="w-full bg-transparent text-xs text-white/40 outline-none placeholder:text-white/20 truncate mt-0.5"
          placeholder="https://..."
        />
      </div>

      {/* actions — fade in on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onToggle(link.id)} className="text-white/30 hover:text-white transition-colors p-1" title={link.visible ? 'Hide' : 'Show'}>
          {link.visible ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <button onClick={() => onDelete(link.id)} className="text-white/30 hover:text-red-400 transition-colors p-1" title="Delete">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Main tab ─────────────────────────────────────────────────── */
export default function LinksTab({ links, onChange }) {
  const [showPlatforms, setShowPlatforms]     = useState(false);
  const [platformSearch, setPlatformSearch]   = useState('');
  const [addingPlatform, setAddingPlatform]   = useState(null);
  const [handleInput, setHandleInput]         = useState('');
  const [saving, setSaving]                   = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const customLinks  = links.filter(l => l.type === 'custom');
  const socialLinks  = links.filter(l => l.type === 'social');
  const filteredPlatforms = PLATFORMS.filter(p =>
    p.name.toLowerCase().includes(platformSearch.toLowerCase())
  );

  /* ── CRUD ─────────────────────────────────────────────────── */
  const addCustomLink = async () => {
    const link = await api.addLink({ type: 'custom', title: 'New Link', url: 'https://', position: links.length });
    onChange([...links, link]);
  };

  const addSocialLink = async (platform) => {
    if (!handleInput.trim()) return;
    setSaving(true);
    try {
      const url  = platform.urlBuilder(handleInput.trim());
      const link = await api.addLink({
        type: 'social', platform: platform.slug,
        title: platform.name, url,
        position: links.length,
      });
      onChange([...links, link]);
      setAddingPlatform(null); setHandleInput(''); setShowPlatforms(false); setPlatformSearch('');
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const toggleLink = async (id) => {
    const link    = links.find(l => l.id === id);
    const updated = await api.updateLink(id, { visible: link.visible ? 0 : 1 });
    onChange(links.map(l => l.id === id ? updated : l));
  };

  const deleteLink = async (id) => {
    await api.deleteLink(id);
    onChange(links.filter(l => l.id !== id));
  };

  // Debounce-free optimistic edit: update locally immediately, persist async
  const editLink = (id, changes) => {
    onChange(links.map(l => l.id === id ? { ...l, ...changes } : l));
    api.updateLink(id, changes).catch(console.error);
  };

  const handleDragEnd = async (event, type) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const group     = type === 'custom' ? customLinks : socialLinks;
    const other     = type === 'custom' ? socialLinks : customLinks;
    const reordered = arrayMove(group, group.findIndex(l => l.id === active.id), group.findIndex(l => l.id === over.id));
    const newLinks  = type === 'custom' ? [...reordered, ...other] : [...other, ...reordered];
    onChange(newLinks);
    await api.reorderLinks(newLinks.map((l, i) => ({ id: l.id, position: i }))).catch(console.error);
  };

  /* ── Empty state helper ──────────────────────────────────── */
  const EmptySlot = ({ msg }) => (
    <div className="text-white/20 text-sm text-center py-6 border border-dashed border-white/10 rounded-xl">
      {msg}
    </div>
  );

  return (
    <div className="max-w-lg flex flex-col gap-6">

      {/* ── Custom Links ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Custom Links</h2>
          <button onClick={addCustomLink}
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <Plus size={14} />Add link
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, 'custom')}>
          <SortableContext items={customLinks.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {customLinks.map(link => (
                <SortableLink key={link.id} link={link}
                  onToggle={toggleLink} onDelete={deleteLink} onEdit={editLink} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {customLinks.length === 0 && <EmptySlot msg="No links yet. Add your first link above." />}
      </div>

      {/* ── Social Platforms ───────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Social Platforms</h2>
          <button onClick={() => { setShowPlatforms(!showPlatforms); setPlatformSearch(''); setAddingPlatform(null); }}
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            <Plus size={14} />Add social
          </button>
        </div>

        {/* Platform picker */}
        {showPlatforms && (
          <div className="glass rounded-xl p-4 mb-3">
            {addingPlatform ? (
              /* Handle input */
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setAddingPlatform(null); setHandleInput(''); }}
                    className="text-white/40 hover:text-white"><X size={14} /></button>
                  <SocialIconSvg platform={addingPlatform.slug} size={18} />
                  <span className="font-medium text-sm">{addingPlatform.name}</span>
                </div>
                <input
                  value={handleInput}
                  onChange={e => setHandleInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
                  placeholder={addingPlatform.placeholder}
                  onKeyDown={e => e.key === 'Enter' && addSocialLink(addingPlatform)}
                  autoFocus
                />
                <button onClick={() => addSocialLink(addingPlatform)} disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
                  {saving ? 'Adding…' : `Add ${addingPlatform.name}`}
                </button>
              </div>
            ) : (
              /* Platform grid */
              <>
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    value={platformSearch}
                    onChange={e => setPlatformSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white"
                    placeholder="Search platforms…"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto pr-1">
                  {filteredPlatforms.map(p => (
                    <button key={p.slug} onClick={() => setAddingPlatform(p)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-white/70 hover:text-white text-left transition-colors">
                      <SocialIconSvg platform={p.slug} size={17} />
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                  {filteredPlatforms.length === 0 && (
                    <p className="col-span-2 text-white/30 text-xs text-center py-3">No platforms found</p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd(e, 'social')}>
          <SortableContext items={socialLinks.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {socialLinks.map(link => (
                <SortableLink key={link.id} link={link}
                  onToggle={toggleLink} onDelete={deleteLink} onEdit={editLink} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {socialLinks.length === 0 && <EmptySlot msg="No social links yet." />}
      </div>
    </div>
  );
}
