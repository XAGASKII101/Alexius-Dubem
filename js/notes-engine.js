/* =========================================
   ALEXIUS DUBEM — FIREBASE FIRESTORE REAL-TIME NOTES & X ENGINE
   Full CRUD Engine: Real-Time Sync, Intelligent Article Formatting,
   Image Link Support, Multi-Platform Share (WhatsApp, X, LinkedIn, Gmail, Native),
   Featured Homepage Filtering & Thoughts Archive
   ========================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Firebase App Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCR8BkJKfxS5TMigOmlZ0BDWHz-jFCok7Q",
  authDomain: "alexius-portfolio.firebaseapp.com",
  projectId: "alexius-portfolio",
  storageBucket: "alexius-portfolio.firebasestorage.app",
  messagingSenderId: "566487354244",
  appId: "1:566487354244:web:049821448e162f3c14abd1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const postsCollection = collection(db, "posts");

class FirestoreNotesEngine {
  constructor() {
    this.posts = [];
    this.init();
  }

  init() {
    this.listenToRealtimePosts();
    this.setupModalHandlers();
    this.checkUrlForDirectArticle();
  }

  isHomePage() {
    const p = window.location.pathname.toLowerCase();
    return p === '/' || p.endsWith('/index.html') || p === '' || p.endsWith('/index') || p.endsWith('/');
  }

  // Real-time Firestore Sync with instant local fallback
  listenToRealtimePosts() {
    try {
      const q = query(postsCollection, orderBy("timestamp", "desc"));
      
      onSnapshot(q, (snapshot) => {
        this.posts = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          this.posts.push({
            ...data,
            id: docSnap.id
          });
        });

        this.mergeLocalPosts();
        if (this.posts.length === 0) {
          this.loadFallbackPosts();
        } else {
          this.renderFeeds();
          this.notifyAdminUI();
          this.checkUrlForDirectArticle();
        }
      }, (error) => {
        console.warn("Firestore ordered query failed, trying un-ordered query:", error);
        
        onSnapshot(postsCollection, (snap) => {
          this.posts = [];
          snap.forEach(docSnap => {
            this.posts.push({ ...docSnap.data(), id: docSnap.id });
          });
          
          this.posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          this.mergeLocalPosts();
          
          if (this.posts.length === 0) {
            this.loadFallbackPosts();
          } else {
            this.renderFeeds();
            this.notifyAdminUI();
            this.checkUrlForDirectArticle();
          }
        }, (err2) => {
          console.error("Firestore un-ordered query error, loading fallback JSON:", err2);
          this.loadFallbackPosts();
        });
      });
    } catch (err) {
      console.error("Error initializing listener:", err);
      this.loadFallbackPosts();
    }
  }

  mergeLocalPosts() {
    try {
      const localStr = localStorage.getItem('alexius_local_posts');
      if (localStr) {
        const localPosts = JSON.parse(localStr);
        localPosts.forEach(lp => {
          if (!this.posts.some(p => p.id === lp.id || p.title === lp.title)) {
            this.posts.unshift(lp);
          }
        });
      }
    } catch(e) {}
  }

  async loadFallbackPosts() {
    try {
      const res = await fetch('/posts.json');
      if (res.ok) {
        const jsonPosts = await res.json();
        this.posts = jsonPosts;
        this.mergeLocalPosts();
        this.renderFeeds();
        this.checkUrlForDirectArticle();
      }
    } catch (e) {
      console.error('Fallback fetch error:', e);
      this.mergeLocalPosts();
      this.renderFeeds();
      this.checkUrlForDirectArticle();
    }
  }

  renderFeeds() {
    const feedContainers = document.querySelectorAll('.notes-feed-list');
    if (!feedContainers.length) return;

    const isHome = this.isHomePage();

    feedContainers.forEach(feedContainer => {
      feedContainer.innerHTML = '';

      if (this.posts.length === 0) {
        feedContainer.innerHTML = `<div class="feed-empty-state"><i class="fa-solid fa-pen-nib"></i><p>No notes or X posts published yet.</p></div>`;
        return;
      }

      // Filter posts for homepage: only featured ones (or top 3 if none flagged)
      let displayPosts = this.posts;
      if (isHome) {
        const featured = this.posts.filter(p => p.isFeatured === true);
        displayPosts = featured.length > 0 ? featured : this.posts.slice(0, 3);
      }

      displayPosts.forEach(post => {
        if (post.type === 'article') {
          const articleEl = this.createArticleElement(post);
          feedContainer.appendChild(articleEl);
        } else if (post.type === 'x-post') {
          const xPostEl = this.createXPostElement(post);
          feedContainer.appendChild(xPostEl);
        }
      });

      // On homepage, add "View All" link if there are more posts
      if (isHome && this.posts.length > displayPosts.length) {
        const viewAllRow = document.createElement('div');
        viewAllRow.className = 'view-all-notes-cta';
        viewAllRow.innerHTML = `
          <a href="/thoughts" class="btn-outline">
            View all thoughts & notes (${this.posts.length}) <i class="fa-solid fa-arrow-right"></i>
          </a>
        `;
        feedContainer.appendChild(viewAllRow);
      }
    });

    this.setupFilterTabs();
  }

  generateSlug(title) {
    if (!title) return 'note';
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  getArticleShareUrl(post) {
    const slug = post.slug || this.generateSlug(post.title);
    const baseUrl = window.location.origin;
    return `${baseUrl}/thoughts/${slug}`;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ----------------------------------------------------
     INTELLIGENT ARTICLE FORMATTING (Headings, Images, Code, Quotes, Lists, Paragraphs)
     ---------------------------------------------------- */
  formatArticleContent(raw) {
    if (!raw) return '';

    let text = raw.trim();

    // 1. Code blocks: ```lang \n code \n ```
    text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="article-code-block"><div class="code-lang-tag">${lang || 'code'}</div><code>${this.escapeHtml(code.trim())}</code></pre>`;
    });

    // 2. Markdown Images: ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s\)]+)\)/g, (match, alt, url) => {
      const caption = alt ? `<figcaption>${this.escapeHtml(alt)}</figcaption>` : '';
      return `<figure class="article-inline-media"><img src="${url}" alt="${this.escapeHtml(alt)}" loading="lazy" onerror="this.parentElement.style.display='none'">${caption}</figure>`;
    });

    // 3. Standalone Image URLs on their own line (e.g. https://.../photo.png or jpg/webp/gif)
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
    text = text.replace(/((?:<li class="article-li">[\s\S]*?<\/li>\s*)+)/gi, (match) => {
      return `<ul class="article-ul">${match.trim()}</ul>`;
    });

    // 8b. Numbered lists
    text = text.replace(/^\d+\.\s+(.*$)/gim, '<li class="article-oli">$1</li>');
    text = text.replace(/((?:<li class="article-oli">[\s\S]*?<\/li>\s*)+)/gi, (match) => {
      return `<ol class="article-ol">${match.trim()}</ol>`;
    });

    // 9. Auto-link standalone URLs (not already part of an <a> or <img> tag)
    text = text.replace(/(^|[^"'])(https?:\/\/[^\s<]+)/g, (match, prefix, url) => {
      if (url.match(/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i)) return match;
      return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer" class="article-link">${url}</a>`;
    });

    // 10. Intelligent Paragraphs and Line Breaks
    const blocks = text.split(/\n{2,}/);
    const formatted = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // If block starts with HTML tag, keep as block
      if (/^<(h[1-6]|pre|figure|blockquote|ul|ol|div)/i.test(trimmed)) {
        return trimmed;
      }
      // Otherwise wrap in paragraph and convert single newlines to <br>
      return `<p class="article-p">${trimmed.replace(/\n/g, '<br>')}</p>`;
    });

    return formatted.filter(Boolean).join('\n\n');
  }

  createArticleElement(post) {
    const article = document.createElement('article');
    article.className = 'note-item-article';
    article.setAttribute('data-post-type', 'article');
    article.setAttribute('data-post-id', post.id);

    const tagsHTML = post.tags && Array.isArray(post.tags) 
      ? post.tags.map(t => `<span class="note-tag">${t}</span>`).join('') 
      : '';

    let coverHTML = '';
    if (post.coverImage && post.coverImage.trim()) {
      coverHTML = `<div class="note-cover-img"><img src="${post.coverImage.trim()}" alt="${this.escapeHtml(post.title)}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`;
    }

    const shareUrl = this.getArticleShareUrl(post);
    const featuredBadge = post.isFeatured ? `<span class="note-featured-pill"><i class="fa-solid fa-star"></i> Featured</span>` : '';

    article.innerHTML = `
      <div class="note-article-card" onclick="window.location.href='${shareUrl}'" style="cursor:pointer;">
        ${coverHTML}
        <div class="note-article-inner">
          <div class="note-article-meta">
            ${featuredBadge}
            <span class="note-date">${post.date || 'RECENT'}</span>
            <span class="note-sep">·</span>
            <span class="note-readtime">${post.readTime || '3 min read'}</span>
          </div>
          <h2 class="note-article-title">${this.escapeHtml(post.title)}</h2>
          <p class="note-article-excerpt">${this.escapeHtml(post.excerpt)}</p>
          <div class="note-article-footer">
            <div class="note-tags-list">${tagsHTML}</div>
            <div class="note-footer-actions">
              <button class="btn-share-icon wa" onclick="event.stopPropagation(); window.notesEngine.shareWhatsApp('${post.id}')" title="Share on WhatsApp">
                <i class="fa-brands fa-whatsapp"></i>
              </button>
              <button class="btn-share-icon x" onclick="event.stopPropagation(); window.notesEngine.shareX('${post.id}')" title="Share on X">
                <i class="fa-brands fa-x-twitter"></i>
              </button>
              <button class="btn-share-icon more" onclick="event.stopPropagation(); window.notesEngine.shareNative('${post.id}')" title="More share options">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
              <a href="${shareUrl}" class="btn-read-more" onclick="event.stopPropagation();">
                Read <i class="fa-solid fa-arrow-right"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;

    return article;
  }

  createXPostElement(post) {
    const container = document.createElement('div');
    container.className = 'note-item-xpost';
    container.setAttribute('data-post-type', 'x-post');
    container.setAttribute('data-post-id', post.id);

    const verifiedBadge = post.isVerified !== false ? `<i class="fa-solid fa-circle-check x-verified-badge"></i>` : '';

    let mediaHTML = '';
    if (post.imageUrl && post.imageUrl.trim()) {
      mediaHTML = `<div class="x-post-media"><img src="${post.imageUrl.trim()}" alt="Attached media" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`;
    }

    const xTargetUrl = (post.tweetUrl && post.tweetUrl.trim() !== '') 
      ? post.tweetUrl 
      : 'https://x.com/Xagaskii';

    const formattedContent = this.formatXText(post.content || '');

    container.innerHTML = `
      <div class="x-post-card">
        <div class="x-post-header">
          <div class="x-post-author">
            <img src="${post.authorAvatar || '/me.jpg'}" alt="${post.authorName || 'Alexius Dubem'}" class="x-author-avatar">
            <div class="x-author-info">
              <div class="x-author-name-row">
                <span class="x-author-name">${post.authorName || 'Alexius Dubem'}</span>
                ${verifiedBadge}
              </div>
              <span class="x-author-handle">${post.authorHandle || '@Xagaskii'}</span>
            </div>
          </div>
          <a href="${xTargetUrl}" target="_blank" class="btn-explore-x">
            <span>Explore on X</span>
            <i class="fa-brands fa-x-twitter"></i>
          </a>
        </div>
        <div class="x-post-body">
          <p class="x-post-text">${formattedContent}</p>
          ${mediaHTML}
        </div>
        <div class="x-post-timestamp">
          <span>${post.time || '12:00 PM'}</span> · <span>${post.date || 'Today'}</span> · <span class="x-views">${post.views || '1.8K'} Views</span>
        </div>
        <div class="x-post-actions">
          <div class="x-action-btn"><i class="fa-regular fa-comment"></i> <span>${post.replies || 14}</span></div>
          <div class="x-action-btn"><i class="fa-solid fa-retweet"></i> <span>${post.reposts || 24}</span></div>
          <div class="x-action-btn"><i class="fa-regular fa-heart"></i> <span>${post.likes || 148}</span></div>
          <a href="${xTargetUrl}" target="_blank" class="x-action-btn" style="text-decoration:none; color:inherit;" title="Open on X"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
        </div>
      </div>
    `;

    return container;
  }

  formatXText(text) {
    if (!text) return '';
    return text
      .replace(/\n/g, '<br>')
      .replace(/#(\w+)/g, '<span class="x-hashtag">#$1</span>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color:var(--accent); text-decoration:none;">$1</a>');
  }

  /* ----------------------------------------------------
     MULTI-PLATFORM SHARING (WhatsApp, X, LinkedIn, Gmail, Native, Copy)
     ---------------------------------------------------- */
  getShareData(postId) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return null;
    const shareUrl = this.getArticleShareUrl(post);
    const title = post.title || 'Note by Alexius Dubem';
    const text = `Read "${title}" by Alexius Dubem:\n${shareUrl}`;
    return { post, shareUrl, title, text };
  }

  shareNative(postId) {
    const data = this.getShareData(postId);
    if (!data) return;
    if (navigator.share) {
      navigator.share({
        title: data.title,
        text: `Read "${data.title}" by Alexius Dubem`,
        url: data.shareUrl
      }).catch(() => {});
    } else {
      this.copyArticleLink(postId);
    }
  }

  shareWhatsApp(postId) {
    const data = this.getShareData(postId);
    if (!data) return;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(data.text)}`, '_blank');
  }

  shareX(postId) {
    const data = this.getShareData(postId);
    if (!data) return;
    const tweetText = `"${data.title}" by @Xagaskii`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(data.shareUrl)}`, '_blank');
  }

  shareLinkedIn(postId) {
    const data = this.getShareData(postId);
    if (!data) return;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.shareUrl)}`, '_blank');
  }

  shareGmail(postId) {
    const data = this.getShareData(postId);
    if (!data) return;
    const subject = `Article: ${data.title}`;
    const body = `Hi,\n\nI thought you might find this article interesting:\n\n"${data.title}" by Alexius Dubem\n\nRead here:\n${data.shareUrl}`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  }

  copyArticleLink(postId) {
    const data = this.getShareData(postId);
    if (!data) return;
    navigator.clipboard.writeText(data.shareUrl);
    this.showToast('✨ Unique link copied to clipboard!');
  }

  showToast(message) {
    let toast = document.getElementById('ne-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ne-toast';
      toast.style.cssText = `
        position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
        background:var(--accent); color:var(--bg); font-family:var(--font-display);
        font-size:13px; font-weight:700; padding:10px 22px; border-radius:999px;
        z-index:99999; opacity:0; transition:opacity 0.3s ease;
        box-shadow: 0 8px 24px rgba(200,255,0,0.3); pointer-events:none;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2800);
  }

  checkUrlForDirectArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    let articleQuery = urlParams.get('article');

    if (!articleQuery && window.location.hash) {
      articleQuery = window.location.hash.replace('#', '');
    }

    if (!articleQuery) {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && parts[0] === 'thoughts') {
        articleQuery = parts[1];
      }
    }

    if (articleQuery && this.posts.length > 0) {
      const cleanQ = articleQuery.toLowerCase().trim();
      const matchedPost = this.posts.find(p => 
        (p.id && p.id.toLowerCase() === cleanQ) || 
        (p.slug && p.slug.toLowerCase() === cleanQ) || 
        (this.generateSlug(p.title) === cleanQ)
      );

      if (matchedPost && matchedPost.type === 'article') {
        this.openReaderModal(matchedPost.id);
      }
    }
  }

  setupFilterTabs() {
    const tabs = document.querySelectorAll('.notes-filter-btn');
    if (!tabs.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const filter = tab.getAttribute('data-filter');
        const items = document.querySelectorAll('[data-post-type]');

        items.forEach(item => {
          const type = item.getAttribute('data-post-type');
          if (filter === 'all' || type === filter) {
            item.style.display = '';
          } else {
            item.style.display = 'none';
          }
        });
      });
    });
  }

  openReaderModal(postId) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const slug = post.slug || this.generateSlug(post.title);
    const newUrl = `/thoughts/${slug}`;
    window.history.pushState({ articleId: postId }, '', newUrl);

    let modal = document.querySelector('.article-reader-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'article-reader-modal';
      document.body.appendChild(modal);
    }

    // Intelligent content formatting
    const formattedContent = this.formatArticleContent(post.content || post.excerpt || '');

    const tagsHTML = post.tags && Array.isArray(post.tags) 
      ? post.tags.map(t => `<span class="note-tag">${t}</span>`).join('') 
      : '';

    let coverHTML = '';
    if (post.coverImage && post.coverImage.trim()) {
      coverHTML = `<div class="reader-cover"><img src="${post.coverImage.trim()}" alt="${this.escapeHtml(post.title)}" onerror="this.parentElement.style.display='none'"></div>`;
    }

    modal.innerHTML = `
      <div class="reader-modal-overlay" onclick="window.notesEngine.closeReaderModal()"></div>
      <div class="reader-modal-card">
        <button class="reader-modal-close" onclick="window.notesEngine.closeReaderModal()" aria-label="Close reader">
          <i class="fa-solid fa-xmark"></i>
        </button>
        ${coverHTML}
        <div class="reader-header">
          <div class="reader-meta">
            <span>${post.date || 'RECENT'}</span> · <span>${post.readTime || '3 min read'}</span>
          </div>
          <h1 class="reader-title">${this.escapeHtml(post.title)}</h1>
          <div class="reader-tags">${tagsHTML}</div>
        </div>
        <div class="reader-body">
          ${formattedContent}
        </div>
        <div class="reader-footer">
          <div class="reader-author-sign">
            <span class="font-hand rotate-left" style="font-size: 1.4rem;">— Alexius Dubem</span>
          </div>
          <div class="reader-share-block">
            <span class="reader-share-label">Share this essay:</span>
            <div class="reader-share-buttons">
              <button class="share-btn share-wa" onclick="window.notesEngine.shareWhatsApp('${post.id}')" title="Share on WhatsApp">
                <i class="fa-brands fa-whatsapp"></i> WhatsApp
              </button>
              <button class="share-btn share-x" onclick="window.notesEngine.shareX('${post.id}')" title="Post on X">
                <i class="fa-brands fa-x-twitter"></i> X Post
              </button>
              <button class="share-btn share-li" onclick="window.notesEngine.shareLinkedIn('${post.id}')" title="Share on LinkedIn">
                <i class="fa-brands fa-linkedin-in"></i> LinkedIn
              </button>
              <button class="share-btn share-mail" onclick="window.notesEngine.shareGmail('${post.id}')" title="Share via Email">
                <i class="fa-solid fa-envelope"></i> Email
              </button>
              <button class="share-btn share-copy" onclick="window.notesEngine.copyArticleLink('${post.id}')" title="Copy Article Link">
                <i class="fa-solid fa-link"></i> Copy Link
              </button>
              <button class="share-btn share-native" onclick="window.notesEngine.shareNative('${post.id}')" title="More sharing options">
                <i class="fa-solid fa-share-nodes"></i> More
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  closeReaderModal() {
    const modal = document.querySelector('.article-reader-modal');
    if (modal) {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      window.history.pushState({}, '', window.location.pathname);
    }
  }

  setupModalHandlers() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeReaderModal();
      }
    });

    window.addEventListener('popstate', (e) => {
      if (!e.state || !e.state.articleId) {
        this.closeReaderModal();
      }
    });
  }

  // --- FIRESTORE CREATOR OPERATIONS ---
  async addArticle(title, excerpt, content, tagsStr, coverImage = '', isFeatured = true) {
    const tags = tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : ['Engineering'];
    const now = new Date();
    const slug = this.generateSlug(title);

    const articleDoc = {
      slug,
      type: 'article',
      title,
      excerpt,
      content,
      coverImage: (coverImage || '').trim(),
      isFeatured: Boolean(isFeatured),
      date: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase(),
      readTime: Math.max(2, Math.ceil((content || '').split(' ').length / 150)) + ' min read',
      tags,
      createdAt: Date.now(),
      timestamp: serverTimestamp()
    };

    try {
      const docRef = await addDoc(postsCollection, articleDoc);
      const finalPost = { ...articleDoc, id: docRef.id };
      this.posts.unshift(finalPost);
      this.saveToLocalCache(finalPost);
    } catch(e) {
      console.warn("Firestore addDoc error, saving to local only:", e);
      const fallbackPost = { ...articleDoc, id: 'local_art_' + Date.now() };
      this.saveToLocalCache(fallbackPost);
      this.posts.unshift(fallbackPost);
    }

    this.renderFeeds();
    this.notifyAdminUI();
  }

  async addXPost(content, tweetUrl = '', likes = 148, reposts = 24, imageUrl = '', isFeatured = true) {
    const now = new Date();

    const xPostDoc = {
      type: 'x-post',
      authorName: 'Alexius Dubem',
      authorHandle: '@Xagaskii',
      authorAvatar: '/me.jpg',
      isVerified: true,
      content,
      tweetUrl: (tweetUrl && tweetUrl.trim()) ? tweetUrl.trim() : 'https://x.com/Xagaskii',
      imageUrl: (imageUrl || '').trim(),
      isFeatured: Boolean(isFeatured),
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      replies: 14,
      reposts: parseInt(reposts) || 24,
      likes: parseInt(likes) || 148,
      views: '1.8K',
      createdAt: Date.now(),
      timestamp: serverTimestamp()
    };

    try {
      const docRef = await addDoc(postsCollection, xPostDoc);
      const finalPost = { ...xPostDoc, id: docRef.id };
      this.posts.unshift(finalPost);
      this.saveToLocalCache(finalPost);
    } catch(e) {
      console.warn("Firestore addDoc error, saving to local only:", e);
      const fallbackPost = { ...xPostDoc, id: 'local_xpost_' + Date.now() };
      this.saveToLocalCache(fallbackPost);
      this.posts.unshift(fallbackPost);
    }

    this.renderFeeds();
    this.notifyAdminUI();
  }

  async updatePost(postId, updatedFields) {
    const index = this.posts.findIndex(p => p.id === postId);
    if (index !== -1) {
      this.posts[index] = { ...this.posts[index], ...updatedFields };
    }

    try {
      let existing = JSON.parse(localStorage.getItem('alexius_local_posts') || '[]');
      const localIdx = existing.findIndex(p => p.id === postId);
      if (localIdx !== -1) {
        existing[localIdx] = { ...existing[localIdx], ...updatedFields };
        localStorage.setItem('alexius_local_posts', JSON.stringify(existing));
      }
    } catch(e){}

    this.renderFeeds();
    this.notifyAdminUI();

    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, updatedFields);
    } catch(e) {
      console.warn("Firestore updateDoc error:", e);
    }
  }

  async toggleFeatured(postId) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    const newStatus = post.isFeatured === false ? true : false;
    await this.updatePost(postId, { isFeatured: newStatus });
  }

  saveToLocalCache(postDoc) {
    try {
      const existing = JSON.parse(localStorage.getItem('alexius_local_posts') || '[]');
      const filtered = existing.filter(p => p.id !== postDoc.id);
      filtered.unshift(postDoc);
      localStorage.setItem('alexius_local_posts', JSON.stringify(filtered));
    } catch(e) {}
  }

  async deletePost(postId) {
    try {
      let existing = JSON.parse(localStorage.getItem('alexius_local_posts') || '[]');
      existing = existing.filter(p => p.id !== postId);
      localStorage.setItem('alexius_local_posts', JSON.stringify(existing));
    } catch(e){}

    this.posts = this.posts.filter(p => p.id !== postId);
    this.renderFeeds();
    this.notifyAdminUI();

    try {
      const postRef = doc(db, "posts", postId);
      await deleteDoc(postRef);
    } catch(e) {
      console.warn("Firestore deleteDoc error:", e);
    }
  }

  notifyAdminUI() {
    if (typeof window.renderManageList === 'function') {
      window.renderManageList();
    }
  }
}

// Global initialization
window.notesEngine = new FirestoreNotesEngine();
