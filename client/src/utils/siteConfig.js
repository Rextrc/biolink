/* Shared defaults for the public landing page's editable copy.
   Loaded by Landing.jsx (public) and Admin.jsx (the /god "Front Page" editor) so both
   sides always agree on the shape of the site_config JSON blob. */
export const DEFAULT_SITE_CFG = {
  hero_badge:   'available for freelance work',
  hero_name:    'Olik',
  hero_role:    'Full-Stack Developer',
  hero_tagline: 'Turning ideas into shipped products.',
  hero_sub:     'I design and build fast, polished web products — from pixel-perfect frontends to the backend systems that power them.',

  about_bio: "I'm a developer who likes taking things from a blank file to something real people use. Comfortable across the stack — React on the front, Node/Python on the back, and whatever database or cloud plumbing gets it shipped.",
  skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'PostgreSQL', 'Docker', 'AWS'],
  links: {
    github:   '',
    linkedin: '',
    twitter:  '',
    email:    'oliverk5578@gmail.com',
  },

  stats: [
    { val: 5,   suffix: '+', label: 'Years coding' },
    { val: 20,  suffix: '+', label: 'Projects shipped' },
    { val: 100, suffix: '%', label: 'Caffeinated' },
  ],

  cta_title: "Let's build something.",
  cta_sub:   "Open to freelance work, collabs, and full-time roles. Say hi and let's talk about what you're building.",
};
