/* Shared defaults for the public landing page's editable copy.
   Loaded by Landing.jsx (public) and Admin.jsx (the /god "Front Page" editor) so both
   sides always agree on the shape of the site_config JSON blob. */
export const DEFAULT_SITE_CFG = {
  hero_badge: 'available for work',
  hero_name:  'Olik',
  hero_role:  'Developer',
  hero_sub:   'I design and build things for the web — fast, minimal, and made with care. Currently open to new projects.',

  about_bio: "Self-taught developer who likes taking ideas from a blank file to something real people use. I care about clean code, small details, and shipping often. Lately I've been building web apps, bots, and tools around real-time data.",
  skills: ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'Tailwind'],
  links: {
    github:   '',
    linkedin: '',
    twitter:  '',
    email:    'oliverk5578@gmail.com',
  },

  contact_line: "Got a project, a question, or just want to talk code? My inbox is open.",
};
