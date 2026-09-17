/* =========================================
   ALEXIUS DUBEM — FIREBASE FIRESTORE REAL-TIME NOTES & X ENGINE
   Real-Time Cloud Firestore Sync for Articles & X (@Xagaskii) Embeds
   With Instant Local Storage Caching & Multi-Query Fallback
   ========================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
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
        }
      }, (error) => {
        console.warn("Firestore ordered query failed, trying un-ordered query:", error);
        
        // Fallback query without orderBy
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
      const res = await fetch('posts.json');
      if (res.ok) {
        const jsonPosts = await res.json();
        this.posts = jsonPosts;
        this.mergeLocalPosts();
        this.renderFeeds();
      }
    } catch (e) {
      console.error('Fallback fetch error:', e);
      this.mergeLocalPosts();
      this.renderFeeds();
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

  createArticleElement(post) {
    const article = document.createElement('article');
    article.className = 'note-item-article';
    article.setAttribute('data-post-type', 'article');
    article.setAttribute('data-post-id', post.id);

    const tagsHTML = post.tags && Array.isArray(post.tags) 
      ? post.tags.map(t => `<span class="note-tag">${t}</span>`).join('') 
      : '';

    article.innerHTML = `
      <div class="note-article-card" onclick="window.notesEngine.openReaderModal('${post.id}')">
        <div class="note-article-meta">
          <span class="note-date">${post.date || 'RECENT'}</span>
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

    const verifiedBadge = post.isVerified !== false ? `<i class="fa-solid fa-circle-check x-verified-badge"></i>` : '';

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
          <a href="${post.tweetUrl || 'https://x.com/Xagaskii'}" target="_blank" class="x-logo-link" aria-label="View on X">
            <i class="fa-brands fa-x-twitter"></i>
          </a>
        </div>
        <div class="x-post-body">
          <p>${this.formatXText(post.content)}</p>
        </div>
        <div class="x-post-timestamp">
          <span>${post.time || '12:00 PM'}</span> · <span>${post.date || 'Today'}</span> · <span style="color: var(--text); font-weight: 600;">${post.views || '1.4K'}</span> Views
        </div>
        <div class="x-post-actions">
          <div class="x-action-btn"><i class="fa-regular fa-comment"></i> <span>${post.replies || 12}</span></div>
          <div class="x-action-btn"><i class="fa-solid fa-retweet"></i> <span>${post.reposts || 24}</span></div>
          <div class="x-action-btn"><i class="fa-regular fa-heart"></i> <span>${post.likes || 148}</span></div>
          <div class="x-action-btn"><i class="fa-regular fa-bookmark"></i></div>
          <div class="x-action-btn" onclick="window.notesEngine.copyXLink('${post.tweetUrl || 'https://x.com/Xagaskii'}')"><i class="fa-solid fa-share-nodes"></i></div>
        </div>
      </div>
    `;

    return container;
  }

  formatXText(text) {
    if (!text) return '';
    return text.replace(/#(\w+)/g, '<span class="x-hashtag">#$1</span>');
  }

  copyXLink(url) {
    navigator.clipboard.writeText(url);
    alert('X post link copied to clipboard!');
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

    const tagsHTML = post.tags && Array.isArray(post.tags) 
      ? post.tags.map(t => `<span class="note-tag">${t}</span>`).join('') 
      : '';

    modal.innerHTML = `
      <div class="reader-modal-overlay" onclick="window.notesEngine.closeReaderModal()"></div>
      <div class="reader-modal-card">
        <button class="reader-modal-close" onclick="window.notesEngine.closeReaderModal()" aria-label="Close reader"><i class="fa-solid fa-xmark"></i></button>
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

  // --- FIRESTORE CREATOR OPERATIONS ---
  async addArticle(title, excerpt, content, tagsStr) {
    const tags = tagsStr ? tagsStr.split(',').map(s => s.trim()).filter(Boolean) : ['Engineering'];
    const now = new Date();
    const generatedId = 'art_' + Date.now();
    
    const articleDoc = {
      id: generatedId,
      type: 'article',
      title,
      excerpt,
      content,
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

  async addXPost(content, tweetUrl, likes = 148, reposts = 24) {
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
      date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      replies: 14,
      reposts: parseInt(reposts) || 24,
      likes: parseInt(likes) || 148,
      views: '1.8K',
      tweetUrl: tweetUrl || 'https://x.com/Xagaskii',
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

  saveToLocalCache(postDoc) {
    try {
      const existing = JSON.parse(localStorage.getItem('alexius_local_posts') || '[]');
      existing.unshift(postDoc);
      localStorage.setItem('alexius_local_posts', JSON.stringify(existing));
    } catch(e) {}
  }

  async deletePost(postId) {
    // Remove from local cache
    try {
      let existing = JSON.parse(localStorage.getItem('alexius_local_posts') || '[]');
      existing = existing.filter(p => p.id !== postId);
      localStorage.setItem('alexius_local_posts', JSON.stringify(existing));
    } catch(e){}

    this.posts = this.posts.filter(p => p.id !== postId);
    this.renderFeeds();

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
