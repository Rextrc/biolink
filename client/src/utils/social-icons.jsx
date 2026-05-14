/**
 * Social icon renderer using simple-icons.
 * Named imports only → Rollup tree-shakes everything else out.
 */
import {
  siInstagram, siTiktok, siX, siYoutube, siSnapchat,
  siDiscord, siFacebook, siLinkedin, siTwitch, siPinterest,
  siReddit, siSpotify, siSoundcloud, siBehance, siDribbble,
  siGithub, siOnlyfans, siKick, siTelegram, siWhatsapp,
  siVsco, siSubstack, siPatreon, siCashapp, siPaypal,
  siAmazon, siEtsy, siShopify,
} from 'simple-icons';

const ICON_MAP = {
  instagram:  siInstagram,
  tiktok:     siTiktok,
  twitter:    siX,
  youtube:    siYoutube,
  snapchat:   siSnapchat,
  discord:    siDiscord,
  facebook:   siFacebook,
  linkedin:   siLinkedin,
  twitch:     siTwitch,
  pinterest:  siPinterest,
  reddit:     siReddit,
  spotify:    siSpotify,
  soundcloud: siSoundcloud,
  behance:    siBehance,
  dribbble:   siDribbble,
  github:     siGithub,
  onlyfans:   siOnlyfans,
  kick:       siKick,
  telegram:   siTelegram,
  whatsapp:   siWhatsapp,
  vsco:       siVsco,
  substack:   siSubstack,
  patreon:    siPatreon,
  cashapp:    siCashapp,
  paypal:     siPaypal,
  amazon:     siAmazon,
  etsy:       siEtsy,
  shopify:    siShopify,
};

export function getSimpleIcon(slug) {
  return slug ? (ICON_MAP[slug] ?? null) : null;
}

/**
 * @param {string} platform      - slug from PLATFORMS
 * @param {number} size          - px size
 * @param {string|null} overrideColor - hex with #; null = brand colour
 */
export function SocialIconSvg({ platform, size = 24, overrideColor = null }) {
  const icon = getSimpleIcon(platform);

  if (!icon) {
    return (
      <div style={{
        width: size, height: size,
        background: overrideColor || '#555',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff',
        fontSize: Math.round(size * 0.45),
        fontWeight: 700,
        flexShrink: 0,
        lineHeight: 1,
        userSelect: 'none',
      }}>
        {platform?.slice(0, 1).toUpperCase() ?? '?'}
      </div>
    );
  }

  const fill = overrideColor || `#${icon.hex}`;

  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
      aria-label={icon.title}
    >
      <path d={icon.path} />
    </svg>
  );
}
