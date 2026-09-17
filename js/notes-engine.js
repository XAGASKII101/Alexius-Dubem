/* =========================================
   ALEXIUS DUBEM — NOTES & X POST ENGINE
   Posts Data Store, X (@Xagaskii) Card Renderer, Expandable Article Reader Modal & Admin CRUD
   ========================================= */

const NOTES_STORAGE_KEY = 'alexius_portfolio_posts_v1';
const DEFAULT_POSTS_PATH = 'posts.json';

class NotesEngine {
  constructor() {
    this.posts = [];
    this.init();
  }

  async init() {
    await this.loadPosts();
    this.renderFeeds();
    this.setupModalHandlers();
  }

  async loadPosts() {
    const localData = localStorage.getItem(NOTES_STORAGE_KEY);
    if (localData) {
      try {
        this.posts = JSON.parse(localData);
        return;
      } catch (e) {
        console.error('Error parsing local posts data:', e);
      }
    }

    try {
      const res = await fetch(DEFAULT_POSTS_PATH);
      if (res.ok) {
        this.posts = await res.json();
        localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(this.posts));
      }
    } catch (err) {
      console.warn('Could not fetch posts.json, using fallback empty list:', err);
      this.posts = [];
    }
  }

  savePosts() {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(this.posts));
  }

  exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.posts, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "posts.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  renderFeeds() {
    const feedContainer = document.querySelector('.notes-feed-list');
    if (!feedContainer) return;

    feedContainer.innerHTML = '';

    if (this.posts.length === 0) {
      feedContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 40px 0;">No notes or posts published yet.</p>`;
      return;
    }

    this.posts.forEach(post => {
      if (post.type === 'article') {
        const articleEl = this.createArticleElement(post);
        feedContainer.appendChild(articleEl);
      } else if (post.type === 'x-post') {
        const xPostEl = this.createXPostElement(post);
        feedContainer.appendChild(xPostEl);
      }
    });

    this.setupFilterTabs();
  }

  createArticleElement(post) {
    const article = document.createElement('article');
    article.className = 'note-item-article';
    article.setAttribute('data-post-type', 'article');
    article.setAttribute('data-post-id', post.id);

    const tagsHTML = post.tags ? post.tags.map(t => `<span class="note-tag">${t}</span>`).join('') : '';

    article.innerHTML = `
      <div class="note-article-card" onclick="window.notesEngine.openReaderModal('${post.id}')">
        <div class="note-article-meta">
          <span class="note-date">${post.date}</span>
          <span class="note-readtime">${post.readTime || '3 min read'}</span>
        </div>
        <h2 class="note-article-title">${post.title}</h2>
        <p class="note-article-excerpt">${post.excerpt}</p>
        <div class="note-article-footer">
          <div class="note-tags-list">${tagsHTML}</div>
          <span class="btn-expand-read">Read Note <i class="fa-solid fa-arrow-right"></i></span>
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

    const verifiedBadge = post.isVerified ? `<i class="fa-solid fa-circle-check x-verified-badge"></i>` : '';

    container.innerHTML = `
      <div class="x-post-card">
        <div class="x-post-header">
          <div class="x-post-author">
            <img src="${post.authorAvatar || 'me.jpg'}" alt="${post.authorName}" class="x-author-avatar">
            <div class="x-author-info">
              <div class="x-author-name-row">
                <span class="x-author-name">${post.authorName || 'Alexius Dubem'}</span>
                ${verifiedBadge}
              </div>
              <span class="x-author-handle">${post.authorHandle || '@Xagaskii'}</span>
            </div>
          </div>
          <a href="${post.tweetUrl || 'https://x.com/Xagaskii'}" target="_blank" class="x-logo-link" aria-label="View on X">
            <i class="fa-brands fa-x-twitter"></i>
          </a>
        </div>
        <div class="x-post-body">
          <p>${this.formatXText(post.content)}</p>
        </div>
        <div class="x-post-timestamp">
          <span>${post.time || '12:00 PM'}</span> · <span>${post.date || 'Today'}</span> · <span style="color: var(--text); font-weight: 600;">${post.views || '1.2K'}</span> Views
        </div>
        <div class="x-post-actions">
          <div class="x-action-btn"><i class="fa-regular fa-comment"></i> <span>${post.replies || 0}</span></div>
          <div class="x-action-btn"><i class="fa-solid fa-retweet"></i> <span>${post.reposts || 0}</span></div>
          <div class="x-action-btn"><i class="fa-regular fa-heart"></i> <span>${post.likes || 0}</span></div>
          <div class="x-action-btn"><i class="fa-regular fa-bookmark"></i></div>
          <div class="x-action-btn" onclick="navigator.clipboard.writeText('${post.tweetUrl || 'https://x.com/Xagaskii'}'); alert('Post link copied to clipboard!');"><i class="fa-solid fa-share-nodes"></i></div>
        </div>
      </div>
    `;

    return container;
  }

  formatXText(text) {
    if (!text) return '';
    return text.replace(/#(\w+)/g, '<span class="x-hashtag">#$1</span>');
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
            item.style.display = 'block';
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

    let modal = document.querySelector('.article-reader-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'article-reader-modal';
      document.body.appendChild(modal);
    }

    const formattedContent = post.content
      ? post.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')
      : post.excerpt;

    const tagsHTML = post.tags ? post.tags.map(t => `<span class="note-tag">${t}</span>`).join('') : '';

    modal.innerHTML = `
      <div class="reader-modal-overlay" onclick="window.notesEngine.closeReaderModal()"></div>
      <div class="reader-modal-card">
        <button class="reader-modal-close" onclick="window.notesEngine.closeReaderModal()" aria-label="Close reader"><i class="fa-solid fa-xmark"></i></button>
        <div class="reader-header">
          <div class="reader-meta">
            <span>${post.date}</span> · <span>${post.readTime || '3 min read'}</span>
          </div>
          <h1 class="reader-title">${post.title}</h1>
          <div class="reader-tags">${tagsHTML}</div>
        </div>
        <div class="reader-body">
          <p>${formattedContent}</p>
        </div>
        <div class="reader-footer">
          <div class="font-hand rotate-left" style="font-size: 1.6rem;">written by Alexius Dubem</div>
          <button class="btn-solid" onclick="window.notesEngine.closeReaderModal()">Done Reading</button>
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
    }
  }

  setupModalHandlers() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeReaderModal();
      }
    });
  }

  /* ---------- ADMIN CRUD OPERATIONS ---------- */
  addArticle(title, excerpt, content, tagsStr) {
    const tags = tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : ['Writing'];
    const newArticle = {
      id: 'post-' + Date.now(),
      type: 'article',
      title,
      excerpt,
      content,
      date: new Date().toLocaleDateString('en-US', { month: 'SHORT', year: 'numeric' }).toUpperCase(),
      readTime: Math.max(2, Math.ceil(content.split(' ').length / 150)) + ' min read',
      tags
    };

    this.posts.unshift(newArticle);
    this.savePosts();
    this.renderFeeds();
    return newArticle;
  }

  addXPost(content, tweetUrl, likes = 120, reposts = 15, replies = 8) {
    const now = new Date();
    const newXPost = {
      id: 'post-' + Date.now(),
      type: 'x-post',
      authorName: 'Alexius Dubem',
      authorHandle: '@Xagaskii',
      authorAvatar: 'me.jpg',
      isVerified: true,
      content,
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      replies,
      reposts,
      likes,
      views: (Math.random() * 2 + 1).toFixed(1) + 'K',
      tweetUrl: tweetUrl || 'https://x.com/Xagaskii'
    };

    this.posts.unshift(newXPost);
    this.savePosts();
    this.renderFeeds();
    return newXPost;
  }

  deletePost(postId) {
    this.posts = this.posts.filter(p => p.id !== postId);
    this.savePosts();
    this.renderFeeds();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.notesEngine = new NotesEngine();
});
