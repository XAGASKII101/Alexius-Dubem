/* =========================================
   ALEXIUS DUBEM — FIREBASE FIRESTORE REAL-TIME NOTES & X ENGINE
   Full CRUD Engine: Real-Time Sync, Article Cover Images, WhatsApp Share,
   Unique Shareable URLs, Edit/Update & Delete Operations
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

  // Real-time Firestore Sync with instant local fallback
  listenToRealtimePosts() {
    try {
      const q = query(postsCollection, orderBy("timestamp", "desc"));
      
      onSnapshot(q, (snapshot) => {
        this.posts = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          this.posts.push({
            id: docSnap.id,
            ...data
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
            this.posts.push({ id: docSnap.id, ...docSnap.data() });
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

    feedContainers.forEach(feedContainer => {
      feedContainer.innerHTML = '';

      if (this.posts.length === 0) {
        feedContainer.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 40px 0;">No notes or X posts published yet.</p>`;
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
    return `${baseUrl}/thoughts?article=${slug}`;
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
    if (post.coverImage) {
      coverHTML = `<div class="note-cover-wrapper" style="width:100%; height:200px; border-radius:16px; overflow:hidden; margin-bottom:16px; border:1px solid var(--border);"><img src="${post.coverImage}" alt="${post.title}" style="width:100%; height:100%; object-fit:cover;"></div>`;
    }

    const shareUrl = this.getArticleShareUrl(post);

    article.innerHTML = `
      <div class="note-article-card">
        ${coverHTML}
        <div class="note-article-meta" onclick="window.notesEngine.openReaderModal('${post.id}')" style="cursor:pointer;">
          <span class="note-date">${post.date || 'RECENT'}</span>
          <span class="note-readtime">${post.readTime || '3 min read'}</span>
        </div>
        <h2 class="note-article-title" onclick="window.notesEngine.openReaderModal('${post.id}')" style="cursor:pointer;">${post.title}</h2>
        <p class="note-article-excerpt" onclick="window.notesEngine.openReaderModal('${post.id}')" style="cursor:pointer;">${post.excerpt}</p>
        <div class="note-article-footer">
          <div class="note-tags-list">${tagsHTML}</div>
          <div style="display:flex; align-items:center; gap:10px;">
            <button class="btn-icon-share" onclick="event.stopPropagation(); window.notesEngine.shareWhatsApp('${post.id}')" title="Share on WhatsApp" style="background:rgba(37,211,102,0.15); color:#25D366; border:1px solid rgba(37,211,102,0.3); padding:6px 12px; border-radius:var(--radius-pill); cursor:pointer; font-size:12px; font-weight:600;"><i class="fa-brands fa-whatsapp"></i> Share</button>
            <span class="btn-expand-read" onclick="window.notesEngine.openReaderModal('${post.id}')" style="cursor:pointer;">Read Note <i class="fa-solid fa-arrow-right"></i></span>
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
    if (post.imageUrl) {
      mediaHTML = `<div class="x-post-media" style="margin-top: 14px; border-radius: 16px; overflow: hidden; border: 1px solid var(--border);"><img src="${post.imageUrl}" alt="Attached media" style="width: 100%; display: block; max-height: 420px; object-fit: cover;"></div>`;
    }

    const xTargetUrl = (post.tweetUrl && post.tweetUrl.trim() !== '') 
      ? post.tweetUrl 
      : 'https://x.com/Xagaskii';

    container.innerHTML = `
      <div class="x-post-card">
        <div class="x-post-header">
          <div class="x-post-author">
            <img src="${post.authorAvatar || 'me.jpg'}" alt="${post.authorName || 'Alexius Dubem'}" class="x-author-avatar">
            <div class="x-author-info">
              <div class="x-author-name-row">
                <span class="x-author-name">${post.authorName || 'Alexius Dubem'}</span>
                ${verifiedBadge}
              </div>
              <span class="x-author-handle">${post.authorHandle || '@Xagaskii'}</span>
            </div>
          </div>
          <a href="${xTargetUrl}" target="_blank" class="btn-explore-x" style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.06); border:1px solid var(--border); color:var(--text); padding:6px 14px; border-radius:var(--radius-pill); font-family:var(--font-display); font-size:12px; font-weight:700; text-decoration:none; transition:all var(--transition);">
            Explore more on X <i class="fa-brands fa-x-twitter" style="color:var(--accent);"></i>
          </a>
        </div>
        <div class="x-post-body">
          <p>${this.formatXText(post.content)}</p>
          ${mediaHTML}
        </div>
        <div class="x-post-timestamp">
          <span>${post.time || '12:00 PM'}</span> · <span>${post.date || 'Today'}</span> · <span style="color: var(--text); font-weight: 600;">${post.views || '1.8K'}</span> Views
        </div>
        <div class="x-post-actions">
          <div class="x-action-btn"><i class="fa-regular fa-comment"></i> <span>${post.replies || 14}</span></div>
          <div class="x-action-btn"><i class="fa-solid fa-retweet"></i> <span>${post.reposts || 24}</span></div>
          <div class="x-action-btn"><i class="fa-regular fa-heart"></i> <span>${post.likes || 148}</span></div>
          <div class="x-action-btn"><i class="fa-regular fa-bookmark"></i></div>
          <a href="${xTargetUrl}" target="_blank" class="x-action-btn" style="text-decoration:none; color:inherit;" title="Explore on X"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>
        </div>
      </div>
    `;

    return container;
  }

  formatXText(text) {
    if (!text) return '';
    return text
      .replace(/#(\w+)/g, '<span class="x-hashtag">#$1</span>')
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" style="color:var(--accent); text-decoration:none;">$1</a>');
  }

  shareWhatsApp(postId) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const shareUrl = this.getArticleShareUrl(post);
    const text = `Read "${post.title}" by Alexius Dubem:\n\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  }

  copyArticleLink(postId) {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    const shareUrl = this.getArticleShareUrl(post);
    navigator.clipboard.writeText(shareUrl);
    alert('✨ Article unique link copied to clipboard!\n' + shareUrl);
  }

  checkUrlForDirectArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    let articleQuery = urlParams.get('article');

    if (!articleQuery && window.location.hash) {
      articleQuery = window.location.hash.replace('#', '');
    }

    if (articleQuery && this.posts.length > 0) {
      const matchedPost = this.posts.find(p => 
        p.id === articleQuery || 
        p.slug === articleQuery || 
        this.generateSlug(p.title) === articleQuery
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

    const slug = post.slug || this.generateSlug(post.title);
    const newUrl = `${window.location.pathname}?article=${slug}`;
    window.history.pushState({ articleId: postId }, '', newUrl);

    let modal = document.querySelector('.article-reader-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'article-reader-modal';
      document.body.appendChild(modal);
    }

    const formattedContent = post.content
      ? post.content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')
      : post.excerpt;

    const tagsHTML = post.tags && Array.isArray(post.tags) 
      ? post.tags.map(t => `<span class="note-tag">${t}</span>`).join('') 
      : '';

    let coverHTML = '';
    if (post.coverImage) {
      coverHTML = `<div style="width:100%; max-height:340px; border-radius:20px; overflow:hidden; margin-bottom:24px; border:1px solid var(--border);"><img src="${post.coverImage}" alt="${post.title}" style="width:100%; height:100%; object-fit:cover;"></div>`;
    }

    const shareUrl = this.getArticleShareUrl(post);

    modal.innerHTML = `
      <div class="reader-modal-overlay" onclick="window.notesEngine.closeReaderModal()"></div>
      <div class="reader-modal-card">
        <button class="reader-modal-close" onclick="window.notesEngine.closeReaderModal()" aria-label="Close reader"><i class="fa-solid fa-xmark"></i></button>
        ${coverHTML}
        <div class="reader-header">
          <div class="reader-meta">
            <span>${post.date || 'RECENT'}</span> · <span>${post.readTime || '3 min read'}</span>
          </div>
          <h1 class="reader-title">${post.title}</h1>
          <div class="reader-tags">${tagsHTML}</div>
        </div>
        <div class="reader-body">
          <p>${formattedContent}</p>
        </div>
        <div class="reader-footer">
          <div class="font-hand rotate-left" style="font-size: 1.5rem;">written by Alexius Dubem</div>
          <div style="display:flex; gap:10px; align-items:center;">
            <button class="btn-solid" onclick="window.notesEngine.shareWhatsApp('${post.id}')" style="background:#25D366; color:#fff; font-size:13px; padding:8px 16px;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</button>
            <button class="btn-solid" onclick="window.notesEngine.copyArticleLink('${post.id}')" style="background:var(--bg-soft); color:var(--text); border:1px solid var(--border); font-size:13px; padding:8px 16px;"><i class="fa-solid fa-link"></i> Copy Link</button>
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
  async addArticle(title, excerpt, content, tagsStr, coverImage = '') {
    const tags = tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : ['Engineering'];
    const now = new Date();
    const slug = this.generateSlug(title);
    const generatedId = 'art_' + Date.now();
    
    const articleDoc = {
      id: generatedId,
      slug,
      type: 'article',
      title,
      excerpt,
      content,
      coverImage: coverImage || '',
      date: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase(),
      readTime: Math.max(2, Math.ceil(content.split(' ').length / 150)) + ' min read',
      tags,
      createdAt: Date.now(),
      timestamp: serverTimestamp()
    };

    this.saveToLocalCache(articleDoc);

    try {
      await addDoc(postsCollection, articleDoc);
    } catch(e) {
      console.warn("Firestore addDoc error (saved to local cache):", e);
    }

    this.mergeLocalPosts();
    this.renderFeeds();
    this.notifyAdminUI();
  }

  async addXPost(content, tweetUrl = '', likes = 148, reposts = 24, imageUrl = '') {
    const now = new Date();
    const generatedId = 'xpost_' + Date.now();

    const xPostDoc = {
      id: generatedId,
      type: 'x-post',
      authorName: 'Alexius Dubem',
      authorHandle: '@Xagaskii',
      authorAvatar: 'me.jpg',
      isVerified: true,
      content,
      tweetUrl: (tweetUrl && tweetUrl.trim()) ? tweetUrl.trim() : 'https://x.com/Xagaskii',
      imageUrl: imageUrl || '',
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      replies: 14,
      reposts: parseInt(reposts) || 24,
      likes: parseInt(likes) || 148,
      views: '1.8K',
      createdAt: Date.now(),
      timestamp: serverTimestamp()
    };

    this.saveToLocalCache(xPostDoc);

    try {
      await addDoc(postsCollection, xPostDoc);
    } catch(e) {
      console.warn("Firestore addDoc error (saved to local cache):", e);
    }

    this.mergeLocalPosts();
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

  saveToLocalCache(postDoc) {
    try {
      const existing = JSON.parse(localStorage.getItem('alexius_local_posts') || '[]');
      existing.unshift(postDoc);
      localStorage.setItem('alexius_local_posts', JSON.stringify(existing));
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
