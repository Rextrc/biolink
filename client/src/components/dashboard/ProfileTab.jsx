import { useState } from 'react';
import { Save, Check, Image } from 'lucide-react';

export default function ProfileTab({ profile, onChange, onSave }) {
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const save = async () => {
    setSaving(true);
    try { await onSave(); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const set = (key, val) => onChange({ ...profile, [key]: val });

  return (
    <div className="max-w-lg flex flex-col gap-5">
      <h2 className="text-base font-semibold">Profile</h2>

      {/* Avatar */}
      <div>
        <label className="text-white/50 text-sm block mb-2">Avatar URL</label>
        <input
          type="url"
          value={profile.avatar_url || ''}
          onChange={e => set('avatar_url', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white"
          placeholder="https://…"
        />
        {profile.avatar_url && (
          <img src={profile.avatar_url} alt="" className="mt-3 w-14 h-14 rounded-full object-cover border border-white/10" />
        )}
      </div>

      {/* Banner */}
      <div>
        <label className="text-white/50 text-sm block mb-1.5 flex items-center gap-1.5">
          <Image size={13} className="text-indigo-400" />
          Banner URL
          <span className="text-white/20 text-xs ml-1">— wide image shown at top of card + blurs the background</span>
        </label>
        <input
          type="url"
          value={profile.banner_url || ''}
          onChange={e => set('banner_url', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white"
          placeholder="https://…"
        />
        {profile.banner_url && (
          <img src={profile.banner_url} alt="" className="mt-3 w-full h-20 rounded-xl object-cover border border-white/10" />
        )}
      </div>

      {/* Display name */}
      <div>
        <label className="text-white/50 text-sm block mb-2">Display Name</label>
        <input
          type="text"
          value={profile.display_name || ''}
          onChange={e => set('display_name', e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors text-white"
          placeholder="Your Name"
        />
      </div>

      {/* Bio */}
      <div>
        <label className="text-white/50 text-sm block mb-2">
          Bio <span className="text-white/20">({(profile.bio || '').length}/160)</span>
        </label>
        <textarea
          value={profile.bio || ''}
          onChange={e => { if (e.target.value.length <= 160) set('bio', e.target.value); }}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none text-white"
          rows={3}
          placeholder="Tell your story…"
        />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 self-start"
      >
        {saved
          ? <><Check size={14} />Saved!</>
          : <><Save size={14} />{saving ? 'Saving…' : 'Save Changes'}</>}
      </button>
    </div>
  );
}
