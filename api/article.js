const fs = require('fs');
const path = require('path');

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
        const tags = f.tags && f.tags.arrayValue && f.tags.arrayValue.values
          ? f.tags.arrayValue.values.map(v => v.stringValue).filter(Boolean)
          : (f.tags && f.tags.stringValue ? f.tags.stringValue.split(',').map(s => s.trim()) : ['Engineering']);

        return {
          id: id,
          slug: f.slug ? f.slug.stringValue : '',
          type: f.type ? f.type.stringValue : 'article',
          title: f.title ? f.title.stringValue : '',
          excerpt: f.excerpt ? f.excerpt.stringValue : '',
          coverImage: f.coverImage ? f.coverImage.stringValue : '',
          content: f.content ? f.content.stringValue : '',
          date: f.date ? f.date.stringValue : 'RECENT',
          readTime: f.readTime ? f.readTime.stringValue : '3 min read',
          tags: tags
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

function formatArticleContent(raw) {
  if (!raw) return '';

  let text = raw.trim();

  // 1. Code blocks: ```lang \n code \n ```
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="article-code-block"><div class="code-lang-tag">${escapeHtml(lang || 'code')}</div><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // 2. Markdown Images: ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g, (match, alt, url) => {
    const caption = alt ? `<figcaption>${escapeHtml(alt)}</figcaption>` : '';
    return `<figure class="article-inline-media"><img src="${url}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.parentElement.style.display='none'">${caption}</figure>`;
  });

  // 3. Standalone Image URLs on their own line
  text = text.replace(/(^|\n)(https?:\/\/[^\s<>]+\.(?:png|jpe?g|gif|webp|svg)(\?[^\s<>]*)?)(\n|$)/gi, (match, before, url, query, after) => {
    return `${before}<figure class="article-inline-media"><img src="${url}" alt="Article Image" loading="lazy" onerror="this.parentElement.style.display='none'"></figure>${after}`;
  });

  // 4. Headings
  text = text.replace(/^### (.*$)/gim, '<h4 class="article-h4">$1</h4>');
  text = text.replace(/^## (.*$)/gim, '<h3 class="article-h3">$1</h3>');
  text = text.replace(/^# (.*$)/gim, '<h2 class="article-h2">$1</h2>');

  // 5. Quotes
  text = text.replace(/^> (.*$)/gim, '<blockquote class="article-quote">$1</blockquote>');

  // 6. Bold & Italics
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 7. Inline code
  text = text.replace(/`([^`]+)`/g, '<code class="article-inline-code">$1</code>');

  // 8. Bullet lists
  text = text.replace(/^[*-] (.*$)/gim, '<li class="article-li">$1</li>');
  text = text.replace(/(<li class="article-li">[\s\S]*?<\/li>)/gi, (match) => {
    return `<ul class="article-ul">${match}</ul>`;
  });

  // 9. Auto-link standalone URLs
  text = text.replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, (match, prefix, url) => {
    if (url.match(/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i)) return match;
    return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" class="article-link">${url}</a>`;
  });

  // 10. Intelligent Paragraphs and Line Breaks
  const blocks = text.split(/\n{2,}/);
  const formatted = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (/^<(h[1-6]|pre|figure|blockquote|ul|ol|div)/i.test(trimmed)) {
      return trimmed;
    }
    return `<p class="article-p">${trimmed.replace(/\n/g, '<br>')}</p>`;
  });

  return formatted.filter(Boolean).join('\n\n');
}

module.exports = async (req, res) => {
  const slug = req.query.slug || req.query.article || '';
  const baseUrl = 'https://alexiusdubemdev.vercel.app';
  const defaultImage = `${baseUrl}/me.jpg`;

  // If no slug requested, serve thoughts.html
  if (!slug) {
    let thoughtsHtmlPath = path.join(process.cwd(), 'thoughts.html');
    if (!fs.existsSync(thoughtsHtmlPath)) {
      thoughtsHtmlPath = path.join(process.cwd(), 'thoughts', 'index.html');
    }
    const html = fs.readFileSync(thoughtsHtmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  // Look up post for dedicated article page
  const posts = await getPosts();
  const cleanSlug = slug.toLowerCase().trim();
  const post = posts.find(p => 
    (p.slug && p.slug.toLowerCase() === cleanSlug) ||
    (p.id && p.id.toLowerCase() === cleanSlug) ||
    (generateSlug(p.title) === cleanSlug)
  );

  // If post not found, serve thoughts.html
  if (!post) {
    let thoughtsHtmlPath = path.join(process.cwd(), 'thoughts.html');
    if (!fs.existsSync(thoughtsHtmlPath)) {
      thoughtsHtmlPath = path.join(process.cwd(), 'thoughts', 'index.html');
    }
    const html = fs.readFileSync(thoughtsHtmlPath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  // Generate DEDICATED ARTICLE PAGE
  const pageTitle = `${post.title} — Alexius Dubem`;
  const pageDesc = post.excerpt || (post.content ? post.content.substring(0, 160).replace(/\n/g, ' ') : 'Technical essay by Alexius Dubem');
  const coverImg = (post.coverImage && post.coverImage.trim()) ? post.coverImage.trim() : defaultImage;
  const canonicalUrl = `${baseUrl}/thoughts/${post.slug || generateSlug(post.title) || post.id}`;
  const formattedContent = formatArticleContent(post.content || post.excerpt || '');

  const tagsHTML = post.tags && Array.isArray(post.tags)
    ? post.tags.map(t => `<span class="note-tag">${escapeHtml(t)}</span>`).join('')
    : '<span class="note-tag">Engineering</span>';

  const coverHTML = (post.coverImage && post.coverImage.trim())
    ? `<div class="article-page-cover-wrap"><img src="${post.coverImage.trim()}" alt="${escapeHtml(post.title)}" class="article-page-cover-img" onerror="this.parentElement.style.display='none'"></div>`
    : '';

  const tweetShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`"${post.title}" by @Xagaskii`)}&url=${encodeURIComponent(canonicalUrl)}`;
  const waShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Read "${post.title}" by Alexius Dubem:\n${canonicalUrl}`)}`;
  const liShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonicalUrl)}`;
  const mailShareUrl = `mailto:?subject=${encodeURIComponent(`Article: ${post.title}`)}&body=${encodeURIComponent(`Hi,\n\nI thought you might find this article interesting:\n\n"${post.title}" by Alexius Dubem\n\nRead here:\n${canonicalUrl}`)}`;

  const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="title" content="${escapeHtml(pageTitle)}">
  <meta name="description" content="${escapeHtml(pageDesc)}">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Favicons & Website App Icons -->
  <link rel="icon" type="image/jpeg" href="/me.jpg">
  <link rel="apple-touch-icon" href="/me.jpg">
  <link rel="shortcut icon" href="/me.jpg">

  <!-- Open Graph / WhatsApp / Facebook / LinkedIn -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDesc)}">
  <meta property="og:image" content="${coverImg}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Alexius Dubem">

  <!-- Twitter / X Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@Xagaskii">
  <meta name="twitter:creator" content="@Xagaskii">
  <meta name="twitter:url" content="${canonicalUrl}">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDesc)}">
  <meta name="twitter:image" content="${coverImg}">

  <!-- Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

  <!-- Main Stylesheet (Absolute Path) -->
  <link rel="stylesheet" href="/css/styles.css">
</head>

<body>
  <!-- TOP PILL HEADER -->
  <header>
    <nav class="desktop-pill-nav" aria-label="Main Navigation">
      <div class="logo">
        <a href="/">
          Alexius Dubem
          <span class="logo-badge">DEV</span>
        </a>
      </div>
      <ul class="nav-links">
        <li><a href="/about">About</a></li>
        <li><a href="/#projects">Work</a></li>
        <li><a href="/#expertise">Services</a></li>
        <li><a href="/#approach">Process</a></li>
        <li><a href="/thoughts" class="active">Thoughts</a></li>
      </ul>
      <div style="display:flex; align-items:center; gap:10px;">
        <button class="theme-toggle-pill" aria-label="Toggle Light/Dark Theme">
          <i class="fa-solid fa-sun icon-sun"></i>
          <i class="fa-solid fa-moon icon-moon"></i>
        </button>
        <a href="/contact" class="btn-say-hello">
          Say hello <i class="fa-solid fa-arrow-up-right"></i>
        </a>
      </div>
    </nav>
  </header>

  <!-- FLOATING TOP THEME BUTTON (MOBILE) -->
  <button class="mobile-top-theme-btn" aria-label="Toggle Light/Dark Theme">
    <i class="fa-solid fa-sun icon-sun"></i>
    <i class="fa-solid fa-moon icon-moon"></i>
  </button>

  <!-- MOBILE FLOATING DOCK -->
  <nav class="mobile-floating-dock" aria-label="Mobile Bottom Navigation">
    <div class="mobile-dock-inner">
      <a href="/" class="mobile-dock-item"><i class="fa-solid fa-house"></i><span class="dock-label">Home</span></a>
      <a href="/#projects" class="mobile-dock-item"><i class="fa-solid fa-layer-group"></i><span class="dock-label">Work</span></a>
      <a href="/thoughts" class="mobile-dock-item active"><i class="fa-solid fa-feather"></i><span class="dock-label">Notes</span></a>
      <a href="/about" class="mobile-dock-item"><i class="fa-solid fa-user"></i><span class="dock-label">About</span></a>
      <a href="/contact" class="mobile-dock-item"><i class="fa-solid fa-paper-plane"></i><span class="dock-label">Contact</span></a>
    </div>
  </nav>

  <!-- DEDICATED ARTICLE CONTAINER -->
  <div class="container" style="max-width: 820px;">
    <main class="article-page-layout">
      <!-- Back Navigation -->
      <div class="article-page-nav">
        <a href="/thoughts" class="btn-outline" style="padding: 9px 20px; font-size: 13px;">
          <i class="fa-solid fa-arrow-left"></i> Back to all thoughts
        </a>
      </div>

      <!-- Article Header -->
      <header class="article-page-header">
        <div class="article-page-meta">
          <span class="note-date">${escapeHtml(post.date || 'RECENT')}</span>
          <span class="note-sep">·</span>
          <span class="note-readtime">${escapeHtml(post.readTime || '3 min read')}</span>
        </div>
        <h1 class="article-page-title">${escapeHtml(post.title)}</h1>
        <div class="article-page-author-bar">
          <div class="article-author-info">
            <img src="/me.jpg" alt="Alexius Dubem" class="article-author-avatar">
            <div>
              <div class="article-author-name">Alexius Dubem <i class="fa-solid fa-circle-check" style="color:var(--accent); font-size:13px;"></i></div>
              <div class="article-author-handle"><a href="https://x.com/Xagaskii" target="_blank">@Xagaskii</a></div>
            </div>
          </div>
          <div class="article-tags-wrap">${tagsHTML}</div>
        </div>
      </header>

      <!-- Cover Image -->
      ${coverHTML}

      <!-- Article Content Body -->
      <article class="article-page-content reader-body">
        ${formattedContent}
      </article>

      <!-- Article Footer & Sharing -->
      <footer class="article-page-footer">
        <div class="reader-author-sign" style="margin-bottom: 24px;">
          <span class="font-hand rotate-left" style="font-size: 1.6rem;">— Alexius Dubem</span>
        </div>

        <div class="reader-share-block">
          <span class="reader-share-label">Share this essay:</span>
          <div class="reader-share-buttons">
            <a href="${waShareUrl}" target="_blank" class="share-btn share-wa" title="Share on WhatsApp">
              <i class="fa-brands fa-whatsapp"></i> WhatsApp
            </a>
            <a href="${tweetShareUrl}" target="_blank" class="share-btn share-x" title="Post on X">
              <i class="fa-brands fa-x-twitter"></i> Post on X
            </a>
            <a href="${liShareUrl}" target="_blank" class="share-btn share-li" title="Share on LinkedIn">
              <i class="fa-brands fa-linkedin-in"></i> LinkedIn
            </a>
            <a href="${mailShareUrl}" target="_blank" class="share-btn share-mail" title="Share via Email">
              <i class="fa-solid fa-envelope"></i> Email
            </a>
            <button class="share-btn share-copy" onclick="navigator.clipboard.writeText('${canonicalUrl}'); alert('✨ Link copied to clipboard!');" title="Copy Article Link">
              <i class="fa-solid fa-link"></i> Copy Link
            </button>
          </div>
        </div>

        <!-- Next Actions -->
        <div class="article-page-cta-row" style="margin-top: 48px; display: flex; gap: 16px; flex-wrap: wrap;">
          <a href="/thoughts" class="btn-solid">
            <i class="fa-solid fa-arrow-left"></i> All Thoughts & Notes
          </a>
          <a href="/contact" class="btn-outline">
            Let's Talk <i class="fa-solid fa-arrow-up-right"></i>
          </a>
        </div>
      </footer>
    </main>

    <footer style="margin-top: 64px;">
      <div>© 2026 ALEXIUS DUBEM // ALL RIGHTS RESERVED</div>
      <div>ENGINEERED WITH PRECISION <span class="accent-dot"></span></div>
    </footer>
  </div>

  <script src="/js/main.js"></script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.status(200).send(pageHtml);
};
