/* Shared defaults for the public landing page's editable copy.
   Loaded by Landing.jsx (public) and Admin.jsx (the /god "Front Page" editor) so both
   sides always agree on the shape of the site_config JSON blob. */
export const DEFAULT_SITE_CFG = {
  avatar_url: '',
  verified: true,
  hero_badge: 'available for work',
  hero_name:  'Olik',
  hero_role:  'Developer',
  hero_sub:   'I build things for the web — fast, minimal, made with care.',
  skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Tailwind'],
  links: {
    github:    '',
    twitter:   '',
    linkedin:  '',
    instagram: '',
    youtube:   '',
    twitch:    '',
    discord:   '',
    website:   '',
    email:     'oliverk5578@gmail.com',
  },
};
