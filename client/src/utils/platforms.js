export const PLATFORMS = [
  { name: 'Instagram', slug: 'instagram', color: '#E1306C', placeholder: 'your_handle', urlBuilder: h => `https://instagram.com/${h.replace('@','')}` },
  { name: 'TikTok', slug: 'tiktok', color: '#000000', placeholder: 'your_handle', urlBuilder: h => `https://tiktok.com/@${h.replace('@','')}` },
  { name: 'Twitter / X', slug: 'twitter', color: '#1DA1F2', placeholder: 'your_handle', urlBuilder: h => `https://x.com/${h.replace('@','')}` },
  { name: 'YouTube', slug: 'youtube', color: '#FF0000', placeholder: '@channel or ID', urlBuilder: h => `https://youtube.com/@${h.replace('@','')}` },
  { name: 'Snapchat', slug: 'snapchat', color: '#FFFC00', placeholder: 'your_handle', urlBuilder: h => `https://snapchat.com/add/${h.replace('@','')}` },
  { name: 'Discord', slug: 'discord', color: '#5865F2', placeholder: 'invite code or username', urlBuilder: h => h.startsWith('http') ? h : `https://discord.gg/${h}` },
  { name: 'Facebook', slug: 'facebook', color: '#1877F2', placeholder: 'username or page', urlBuilder: h => `https://facebook.com/${h.replace('@','')}` },
  { name: 'LinkedIn', slug: 'linkedin', color: '#0A66C2', placeholder: 'username', urlBuilder: h => `https://linkedin.com/in/${h.replace('@','')}` },
  { name: 'Twitch', slug: 'twitch', color: '#9146FF', placeholder: 'channel_name', urlBuilder: h => `https://twitch.tv/${h.replace('@','')}` },
  { name: 'Pinterest', slug: 'pinterest', color: '#E60023', placeholder: 'username', urlBuilder: h => `https://pinterest.com/${h.replace('@','')}` },
  { name: 'Reddit', slug: 'reddit', color: '#FF4500', placeholder: 'u/username', urlBuilder: h => `https://reddit.com/u/${h.replace(/^u\//,'')}` },
  { name: 'Spotify', slug: 'spotify', color: '#1DB954', placeholder: 'user ID', urlBuilder: h => `https://open.spotify.com/user/${h}` },
  { name: 'SoundCloud', slug: 'soundcloud', color: '#FF7700', placeholder: 'username', urlBuilder: h => `https://soundcloud.com/${h.replace('@','')}` },
  { name: 'Behance', slug: 'behance', color: '#1769FF', placeholder: 'username', urlBuilder: h => `https://behance.net/${h.replace('@','')}` },
  { name: 'Dribbble', slug: 'dribbble', color: '#EA4C89', placeholder: 'username', urlBuilder: h => `https://dribbble.com/${h.replace('@','')}` },
  { name: 'GitHub', slug: 'github', color: '#181717', placeholder: 'username', urlBuilder: h => `https://github.com/${h.replace('@','')}` },
  { name: 'OnlyFans', slug: 'onlyfans', color: '#00AFF0', placeholder: 'username', urlBuilder: h => `https://onlyfans.com/${h.replace('@','')}` },
  { name: 'Kick', slug: 'kick', color: '#53FC18', placeholder: 'channel_name', urlBuilder: h => `https://kick.com/${h.replace('@','')}` },
  { name: 'Telegram', slug: 'telegram', color: '#26A5E4', placeholder: 'username', urlBuilder: h => `https://t.me/${h.replace('@','')}` },
  { name: 'WhatsApp', slug: 'whatsapp', color: '#25D366', placeholder: 'phone number', urlBuilder: h => `https://wa.me/${h.replace(/\D/g,'')}` },
  { name: 'VSCO', slug: 'vsco', color: '#000000', placeholder: 'username', urlBuilder: h => `https://vsco.co/${h.replace('@','')}` },
  { name: 'Substack', slug: 'substack', color: '#FF6719', placeholder: 'subdomain', urlBuilder: h => `https://${h.replace('@','')}.substack.com` },
  { name: 'Patreon', slug: 'patreon', color: '#FF424D', placeholder: 'username', urlBuilder: h => `https://patreon.com/${h.replace('@','')}` },
  { name: 'Cash App', slug: 'cashapp', color: '#00D64F', placeholder: '$cashtag', urlBuilder: h => `https://cash.app/$${h.replace(/^\$/,'')}` },
  { name: 'PayPal', slug: 'paypal', color: '#003087', placeholder: 'username', urlBuilder: h => `https://paypal.me/${h.replace('@','')}` },
  { name: 'Amazon', slug: 'amazon', color: '#FF9900', placeholder: 'shop name or URL', urlBuilder: h => h.startsWith('http') ? h : `https://amazon.com/shop/${h}` },
  { name: 'Etsy', slug: 'etsy', color: '#F1641E', placeholder: 'shop name', urlBuilder: h => `https://etsy.com/shop/${h.replace('@','')}` },
  { name: 'Shopify', slug: 'shopify', color: '#96BF48', placeholder: 'store URL', urlBuilder: h => h.startsWith('http') ? h : `https://${h}` },
];

export function getPlatform(slug) {
  return PLATFORMS.find(p => p.slug === slug);
}
