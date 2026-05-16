import { useState, useRef, useCallback } from 'react';
import { PLATFORMS } from '../utils/platforms';
import { SocialIconSvg } from '../utils/social-icons.jsx';

/* ══ Style helpers ═══════════════════════════════════════════════ */

function getBgStyle(d) {
  if (!d) return { background: '#0a0a0a' };
  if (d.bg_type === 'video') return { background: '#000' };
  if (d.bg_type === 'image' && d.bg_image_url)
    return { backgroundImage: `url(${d.bg_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  if (d.bg_type === 'gradient') {
    if (d.bg_gradient_dir === 'radial')
      return { background: `radial-gradient(circle at 50% 30%, ${d.bg_gradient_start}, ${d.bg_gradient_end})` };
    const deg = d.bg_gradient_dir === 'diagonal' ? '135deg' : '180deg';
    return { background: `linear-gradient(${deg}, ${d.bg_gradient_start}, ${d.bg_gradient_end})` };
  }
  return { background: d.bg_color || '#0a0a0a' };
}

function getBtnClass(d) {
  if (!d) return 'rounded-full';
  return { rounded: 'rounded-xl', pill: 'rounded-full', square: 'rounded-none', sharp: 'rounded-sm' }[d.btn_shape] || 'rounded-full';
}

function getBtnStyle(d) {
  if (!d) return { background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' };
  const base = { transition: 'all 0.2s ease' };
  switch (d.btn_style) {
    case 'outline': return { ...base, background: 'transparent', color: d.btn_text, border: `2px solid ${d.btn_border}` };
    case 'shadow':  return { ...base, background: d.btn_bg, color: d.btn_text, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' };
    case 'glass':   return { ...base, background: d.btn_bg || 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', color: d.btn_text, border: `1px solid ${d.btn_border || 'rgba(255,255,255,0.15)'}` };
    case 'neon':    return { ...base, background: 'transparent', color: d.btn_bg, border: `2px solid ${d.btn_bg}`, boxShadow: `0 0 14px ${d.btn_bg}80` };
    default:        return { ...base, background: d.btn_bg, color: d.btn_text };
  }
}

function getAvatarStyle(d) {
  if (!d) return { border: '3px solid rgba(255,255,255,0.25)' };
  const bw = { none: 0, thin: 2, medium: 3, thick: 5 }[d.avatar_border_size] ?? 3;
  const style = { borderWidth: bw, borderStyle: 'solid', borderColor: d.avatar_border_color || 'rgba(255,255,255,0.25)' };
  if (d.avatar_glow) style.boxShadow = `0 0 24px ${d.avatar_glow_color || '#6366f1'}90`;
  return style;
}

function getAvatarClass(d) {
  if (!d || d.avatar_shape === 'circle') return 'rounded-full';
  if (d.avatar_shape === 'rounded') return 'rounded-2xl';
  if (d.avatar_shape === 'hexagon') return 'rounded-[35%]';
  return 'rounded-full';
}

const SPACING = { compact: 8, normal: 12, relaxed: 18 };

function onBtnEnter(e, d) {
  if (!d) return;
  if (d.btn_hover === 'lift') { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)'; }
  if (d.btn_hover === 'glow') e.currentTarget.style.boxShadow = `0 0 24px ${d.btn_bg}90`;
  if (d.btn_hover === 'fill') { e.currentTarget.style.background = d.btn_text; e.currentTarget.style.color = d.btn_bg; }
}
function onBtnLeave(e, d) {
  if (!d) return;
  const s = getBtnStyle(d);
  e.currentTarget.style.transform = '';
  e.currentTarget.style.background = s.background || '';
  e.currentTarget.style.color = s.color || '';
  e.currentTarget.style.boxShadow = s.boxShadow || '';
}

/* ══ Social link icon ════════════════════════════════════════════ */
function SocialLink({ link, overrideColor }) {
  const p = PLATFORMS.find(x => x.slug === link.platform);
  const color = overrideColor || (p ? p.color : null);
  return (
    <a
      href={link.url} target="_blank" rel="noreferrer"
      title={link.title || link.platform}
      style={{ transition: 'transform 0.2s, opacity 0.2s', display: 'inline-flex' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.opacity = '1'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '0.9'; }}
    >
      <SocialIconSvg platform={link.platform} size={34} overrideColor={color} />
    </a>
  );
}

/* ══ Spotify embed ═══════════════════════════════════════════════ */
function SpotifyPlayer({ url }) {
  if (!url) return null;
  // Extract embed URL from any Spotify link
  const match = url.match(/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  const embedUrl = `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`;
  return (
    <div style={{ width: '100%', marginTop: 16, borderRadius: 12, overflow: 'hidden' }}>
      <iframe
        src={embedUrl}
        width="100%"
        height="80"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ display: 'block', borderRadius: 12 }}
      />
    </div>
  );
}

/* ══ Tilt card wrapper ═══════════════════════════════════════════ */
function TiltWrapper({ children, glowColor = '#6366f1' }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [hovered, setHovered] = useState(false);

  const onMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setTilt({ x: (y - 0.5) * -14, y: (x - 0.5) * 14 });
    setGlow({ x: x * 100, y: y * 100 });
  }, []);

  const onLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setHovered(false);
  }, []);

  return (
    <div ref={ref} onMouseMove={onMove} onMouseEnter={() => setHovered(true)} onMouseLeave={onLeave}
      style={{ perspective: 1000, width: '100%', maxWidth: 420 }}>
      <div style={{
        transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${hovered ? 1.018 : 1})`,
        transition: hovered ? 'transform 0.08s ease-out' : 'transform 0.55s cubic-bezier(.22,.68,0,1.2)',
        transformStyle: 'preserve-3d',
        position: 'relative',
        borderRadius: 24,
        width: '100%',
      }}>
        {/* Mouse-tracked glow */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 24, zIndex: 0, pointerEvents: 'none',
          opacity: hovered ? 1 : 0, transition: 'opacity 0.35s',
          background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${glowColor}28 0%, transparent 65%)`,
        }} />
        {children}
      </div>
    </div>
  );
}

/* ══ Main ProfileView ════════════════════════════════════════════ */
export default function ProfileView({ data, minHeight = '100%' }) {
  const { profile, design: d, links, is_admin } = data;
  const bannerUrl  = profile?.banner_url;
  const avatarUrl  = profile?.avatar_url;
  const hasBanner  = !!bannerUrl;
  const isAnimated = d?.bg_animated && d?.bg_type === 'gradient';

  const EMOJI_STACK = ", 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji'";
  const fontH   = (d?.font_heading || 'Syne')  + EMOJI_STACK;
  const fontB   = (d?.font_body    || 'Inter') + EMOJI_STACK;
  const fontSz  = d?.font_size === 'large' ? '1rem' : '0.875rem';
  const bioAlign = d?.layout_bio_align === 'left' ? 'left' : 'center';
  const avatarPos = d?.layout_avatar || 'top-center';
  const iconColor = d?.social_icon_color || null;
  const gap = SPACING[d?.link_spacing] ?? 12;

  const visibleLinks = (links || []).filter(l => l.visible);
  const socialLinks  = visibleLinks.filter(l => l.type === 'social');
  const customLinks  = visibleLinks.filter(l => l.type === 'custom');

  const showAvatar  = avatarPos !== 'hidden' && !!avatarUrl;
  const avatarLeft  = avatarPos === 'top-left';

  return (
    <div
      className={isAnimated ? 'animate-gradient' : ''}
      style={{
        ...getBgStyle(d),
        minHeight,
        position: 'relative',
        overflowX: 'hidden',
        overflowY: 'auto',
        fontFamily: fontB,
      }}
    >
      {/* ── Video background ─────────────────────────────── */}
      {d?.bg_type === 'video' && d?.bg_video_url && (
        <>
          <video
            src={d.bg_video_url}
            autoPlay muted loop playsInline
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', zIndex: 0,
              filter: d.bg_video_blur !== 0 ? 'blur(12px) brightness(0.5) saturate(1.4)' : 'brightness(0.7)',
              transform: d.bg_video_blur !== 0 ? 'scale(1.08)' : 'none',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 0 }} />
        </>
      )}

      {/* ── Blurred backdrop from banner ─────────────────── */}
      {hasBanner && (
        <>
          {/* blurred photo layer */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${bannerUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(60px) brightness(0.45) saturate(2)',
            transform: 'scale(1.25)',
            zIndex: 0,
          }} />
          {/* subtle dark vignette */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 100%)',
            zIndex: 0,
          }} />
        </>
      )}

      {/* ── Content ──────────────────────────────────────── */}
      <div
        className="fade-in"
        style={{
          position: 'relative', zIndex: 1,
          minHeight,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: hasBanner ? '40px 16px 56px' : '32px 16px 48px',
        }}
      >
        {/* ── Profile card ─────────────────────────────── */}
        <TiltWrapper glowColor={d?.card_glow_color || d?.btn_bg || '#6366f1'}>
        <div style={{
          width: '100%',
          background: d?.card_transparent
            ? 'transparent'
            : hasBanner
              ? 'rgba(10,10,16,0.78)'
              : 'transparent',
          backdropFilter: (!d?.card_transparent && hasBanner) ? 'blur(28px) saturate(1.6)' : 'none',
          WebkitBackdropFilter: (!d?.card_transparent && hasBanner) ? 'blur(28px) saturate(1.6)' : 'none',
          border: (!d?.card_transparent && hasBanner) ? '1px solid rgba(255,255,255,0.08)' : 'none',
          borderRadius: hasBanner ? 24 : 0,
          overflow: 'visible',
          boxShadow: (!d?.card_transparent && hasBanner)
            ? `0 40px 100px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.05)${d?.card_glow ? `, 0 0 80px ${d.card_glow_color || '#6366f1'}45` : ''}`
            : d?.card_glow ? `0 0 80px ${d.card_glow_color || '#6366f1'}45` : 'none',
        }}>

          {/* ── Banner image ───────────────────────────── */}
          {hasBanner && (
            <div style={{ position: 'relative' }}>
              {/* Clip only the image, not the avatar */}
              <div style={{ height: 140, borderRadius: '24px 24px 0 0', overflow: 'hidden' }}>
                <img
                  src={bannerUrl}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              {/* Avatar sits outside overflow:hidden so it isn't clipped */}
              {showAvatar && (
                <div style={{
                  position: 'absolute',
                  bottom: -40,
                  left: avatarLeft ? 24 : '50%',
                  transform: avatarLeft ? 'none' : 'translateX(-50%)',
                  zIndex: 3,
                }}>
                  <img
                    src={avatarUrl}
                    alt={profile?.display_name || ''}
                    style={{ width: 80, height: 80, objectFit: 'cover', ...getAvatarStyle(d) }}
                    className={getAvatarClass(d)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Card body ──────────────────────────────── */}
          <div style={{
            padding: hasBanner ? '0 22px 26px' : '0 0 0',
            paddingTop: (hasBanner && showAvatar) ? 52 : hasBanner ? 20 : 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: avatarLeft ? 'flex-start' : 'center',
          }}>

            {/* Avatar (no-banner case) */}
            {!hasBanner && showAvatar && (
              <div
                className="fade-in"
                style={{ marginBottom: 14, alignSelf: avatarLeft ? 'flex-start' : 'center' }}
              >
                <img
                  src={avatarUrl}
                  alt={profile?.display_name || ''}
                  style={{ width: 88, height: 88, objectFit: 'cover', ...getAvatarStyle(d) }}
                  className={getAvatarClass(d)}
                />
              </div>
            )}

            {/* Name */}
            {profile?.display_name && (
              <div className="fade-in-delay-1" style={{ display: 'flex', alignItems: 'center', justifyContent: bioAlign === 'left' ? 'flex-start' : 'center', gap: 6, width: '100%' }}>
                <h1
                  style={{
                    fontFamily: fontH,
                    color: d?.text_color || '#fff',
                    fontSize: d?.font_size === 'large' ? '1.45rem' : '1.25rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    margin: 0,
                  }}
                >
                  {profile.display_name}
                </h1>
                {is_admin && (
                  <svg width="20" height="20" viewBox="0 0 40 40" fill="none" title="Verified">
                    <path d="M20 2.5L24.33 7.13L30.5 5.77L31.87 11.94L37.5 16.27L34.9 22L37.5 27.73L31.87 32.06L30.5 38.23L24.33 36.87L20 41.5L15.67 36.87L9.5 38.23L8.13 32.06L2.5 27.73L5.1 22L2.5 16.27L8.13 11.94L9.5 5.77L15.67 7.13L20 2.5Z" fill="#0095F6"/>
                    <path d="M13 21.5L17.5 26L27 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            )}

            {/* Bio */}
            {profile?.bio && (
              <p
                className="fade-in-delay-1"
                style={{
                  color: d?.bio_color || '#9999bb',
                  fontSize: fontSz,
                  margin: '6px 0 0',
                  lineHeight: 1.65,
                  textAlign: bioAlign,
                  width: '100%',
                  opacity: 0.9,
                }}
              >
                {profile.bio}
              </p>
            )}

            {/* Social icons */}
            {socialLinks.length > 0 && (
              <div
                className="fade-in-delay-1"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: avatarLeft ? 'flex-start' : 'center',
                  gap: 14,
                  marginTop: 16,
                  width: '100%',
                }}
              >
                {socialLinks.map(link => (
                  <SocialLink key={link.id} link={link} overrideColor={iconColor} />
                ))}
              </div>
            )}

            {/* Custom links */}
            {customLinks.length > 0 && (
              <div
                className="fade-in-delay-2"
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap,
                  marginTop: socialLinks.length > 0 ? 16 : 18,
                }}
              >
                {customLinks.map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className={getBtnClass(d)}
                    style={{
                      ...getBtnStyle(d),
                      display: 'block',
                      textAlign: 'center',
                      padding: '13px 20px',
                      fontSize: fontSz,
                      fontWeight: 500,
                      textDecoration: 'none',
                      width: '100%',
                    }}
                    onMouseEnter={e => onBtnEnter(e, d)}
                    onMouseLeave={e => onBtnLeave(e, d)}
                  >
                    {link.title || link.url}
                  </a>
                ))}
              </div>
            )}

            {/* Spotify player */}
            {profile?.spotify_url && <SpotifyPlayer url={profile.spotify_url} />}

            {/* Empty-state hint (preview only) */}
            {!profile?.display_name && !profile?.bio && customLinks.length === 0 && socialLinks.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
                Your profile will appear here
              </div>
            )}
          </div>
        </div>
        </TiltWrapper>
      </div>
    </div>
  );
}
