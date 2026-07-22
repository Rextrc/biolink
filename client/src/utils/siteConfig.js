/* Shared defaults for the public landing page's editable copy.
   Loaded by Landing.jsx (public) and Admin.jsx (the /god "Front Page" editor) so both
   sides always agree on the shape of the site_config JSON blob. */
export const DEFAULT_SITE_CFG = {
  hero_badge: 'available for work',
  hero_name:  'Olik',
  hero_role:  'Developer',
  hero_sub:   'I build things for the web — simple, fast, and made to last. Mostly self-taught, always shipping.',

  about_bio: "Hey, I'm Olik. I'm a developer who likes turning ideas into things people actually use. I care about clean code, good design, and shipping small and often. When I'm not building, I'm usually breaking something to learn how it works.",
  skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Tailwind'],
  links: {
    github:   '',
    linkedin: '',
    twitter:  '',
    email:    'oliverk5578@gmail.com',
  },

  contact_line: "Want to work together, or just say hi? My inbox is open.",
};
