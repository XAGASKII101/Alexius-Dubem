const fs = require('fs');
const path = require('path');

// Simple in-memory cache for Firestore response
let postsCache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute cache

async function getPosts() {
  const now = Date.now();
  if (postsCache && (now - cacheTime < CACHE_TTL)) {
    return postsCache;
  }

  try {
    const res = await fetch('https://firestore.googleapis.com/v1/projects/alexius-portfolio/databases/(default)/documents/posts');
    if (!res.ok) throw new Error('Firestore response error');
    const data = await res.json();
    
    if (data && data.documents) {
      const posts = data.documents.map(doc => {
        const f = doc.fields || {};
        const id = doc.name ? doc.name.split('/').pop() : '';
        return {
          id: id,
          slug: f.slug ? f.slug.stringValue : '',
          type: f.type ? f.type.stringValue : 'article',
          title: f.title ? f.title.stringValue : '',
          excerpt: f.excerpt ? f.excerpt.stringValue : '',
          coverImage: f.coverImage ? f.coverImage.stringValue : '',
          content: f.content ? f.content.stringValue : ''
        };
      });
      postsCache = posts;
      cacheTime = now;
      return posts;
    }
  } catch (err) {
    console.error('API getPosts error:', err);
  }

  // Fallback to local posts.json if Firestore fails
  try {
    const fallbackPath = path.join(process.cwd(), 'posts.json');
    if (fs.existsSync(fallbackPath)) {
      const fallback = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
      return fallback;
    }
  } catch (e) {}

  return [];
}

function generateSlug(title) {
  if (!title) return '';
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = async (req, res) => {
  const slug = req.query.slug || req.query.article || '';
  const baseUrl = 'https://alexiusdubemdev.vercel.app';
  const defaultImage = `${baseUrl}/me.jpg`;

  let htmlPath = path.join(process.cwd(), 'thoughts.html');
  if (!fs.existsSync(htmlPath)) {
    htmlPath = path.join(process.cwd(), 'thoughts', 'index.html');
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  let title = 'Thoughts & X Posts — Alexius Dubem (@Xagaskii)';
  let desc = 'Technical essays, system architecture notes, and thoughts by Alexius Dubem (@Xagaskii).';
  let image = defaultImage;
  let pageUrl = `${baseUrl}/thoughts`;

  if (slug) {
    const posts = await getPosts();
    const cleanSlug = slug.toLowerCase().trim();
    const post = posts.find(p => 
      (p.slug && p.slug.toLowerCase() === cleanSlug) ||
      (p.id && p.id.toLowerCase() === cleanSlug) ||
      (generateSlug(p.title) === cleanSlug)
    );

    if (post) {
      title = `${post.title} — Alexius Dubem`;
      desc = post.excerpt || (post.content ? post.content.substring(0, 160).replace(/\n/g, ' ') : desc);
      if (post.coverImage && post.coverImage.trim()) {
        image = post.coverImage.trim();
      }
      pageUrl = `${baseUrl}/thoughts/${post.slug || generateSlug(post.title) || post.id}`;
    }
  }

  // Inject metadata into <head>
  const metaTags = `
    <!-- Primary SEO & Social Meta Tags -->
    <title>${escapeHtml(title)}</title>
    <meta name="title" content="${escapeHtml(title)}">
    <meta name="description" content="${escapeHtml(desc)}">
    <link rel="canonical" href="${pageUrl}">

    <!-- Website Icons -->
    <link rel="icon" type="image/jpeg" href="${defaultImage}">
    <link rel="apple-touch-icon" href="${defaultImage}">
    <link rel="shortcut icon" href="${defaultImage}">

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="${pageUrl}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(desc)}">
    <meta property="og:image" content="${image}">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta property="og:site_name" content="Alexius Dubem">

    <!-- Twitter / X Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@Xagaskii">
    <meta name="twitter:creator" content="@Xagaskii">
    <meta name="twitter:url" content="${pageUrl}">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(desc)}">
    <meta name="twitter:image" content="${image}">
  `;

  // Replace existing meta tags or inject before </head>
  if (html.includes('</head>')) {
    // Remove existing og: and twitter: and title tags to avoid duplicates
    html = html.replace(/<title>[\s\S]*?<\/title>/i, '');
    html = html.replace(/<meta\s+property=["']og:[\s\S]*?>/gi, '');
    html = html.replace(/<meta\s+name=["']twitter:[\s\S]*?>/gi, '');
    html = html.replace(/<meta\s+name=["'](title|description)["'][\s\S]*?>/gi, '');
    html = html.replace(/<link\s+rel=["'](canonical|icon|apple-touch-icon|shortcut icon)["'][\s\S]*?>/gi, '');

    html = html.replace('</head>', `${metaTags}\n</head>`);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.status(200).send(html);
};
