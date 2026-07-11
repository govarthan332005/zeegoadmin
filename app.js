// ============================================
// HomePlate — ADMIN APP (single-file bundle)
// Login (admin-only) + Dashboard tabs:
//   Chefs & Dishes CRUD + Seed data
//   Live Orders (Firestore snapshot + status update)
//   Rules & Setup (Firestore + RTDB security rule reference)
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, GoogleAuthProvider,
  signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, onSnapshot, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getDatabase, ref, update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ============================================
// CONFIG (MUST match the user-app Firebase project)
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDO8rLj1rvHZq6f2luS14E36wamQVq6vnU",
  authDomain: "love-4db65.firebaseapp.com",
  databaseURL: "https://love-4db65-default-rtdb.firebaseio.com",
  projectId: "love-4db65",
  storageBucket: "love-4db65.firebasestorage.app",
  messagingSenderId: "314625864463",
  appId: "1:314625864463:web:d8c03e4f646d006b3c047a",
  measurementId: "G-PHH8KV3B81"
};
// Change this to your admin email
const ADMIN_EMAIL = "admin@homeplate.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const rtdb = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// ============================================
// SEED DATA (chefs + dishes)
// ============================================
const SEED_CHEFS = [
  {
    key: 'priya', name: 'Priya Nair', city: 'Mumbai', cuisine: 'North Indian',
    signature: 'Butter Chicken & Naan',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&auto=format&fit=crop&q=80',
    cover: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1400&auto=format&fit=crop&q=80',
    rating: 4.9, orders: '2,300+',
    bio: "Meet Priya — 12 years of home cooking from her Mumbai kitchen. Trained by her grandmother in traditional Punjabi flavours, she believes every dish should be a hug on a plate."
  },
  {
    key: 'rehan', name: 'Rehan Khan', city: 'Hyderabad', cuisine: 'North Indian',
    signature: 'Hyderabadi Dum Biryani',
    photo: 'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?w=300&auto=format&fit=crop&q=80',
    cover: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1400&auto=format&fit=crop&q=80',
    rating: 4.8, orders: '3,100+',
    bio: "Rehan learned biryani from his father, who learned it from his. Three generations of dum, saffron, and slow-cooked patience in every plate."
  },
  {
    key: 'meera', name: 'Meera Iyer', city: 'Bangalore', cuisine: 'South Indian',
    signature: 'Masala Dosa & Filter Coffee',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80',
    cover: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=1400&auto=format&fit=crop&q=80',
    rating: 4.9, orders: '1,800+',
    bio: "Meera brings her Tam-Brahm heritage to every idli and dosa. Her filter coffee is legendary — brewed with beans from her family estate in Coorg."
  },
  {
    key: 'sohini', name: 'Sohini Ghosh', city: 'Kolkata', cuisine: 'Bengali',
    signature: 'Kosha Mangsho & Luchi',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
    cover: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=1400&auto=format&fit=crop&q=80',
    rating: 4.8, orders: '1,500+',
    bio: "Sohini's kitchen smells like a Kolkata durga puja — mustard oil, panch phoron, and a lifetime of love. Every Bengali dish carries her mother's whispered instructions."
  }
];

const SEED_DISHES = [
  { chefKey: 'priya', name: 'Butter Chicken', category: 'Mains', price: 320, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&auto=format&fit=crop&q=80', veg: false, rating: 4.9, description: "Tender chicken in a creamy tomato-butter gravy, slow-cooked with kasuri methi. Best served with garlic naan." },
  { chefKey: 'priya', name: 'Dal Makhani', category: 'Mains', price: 220, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.8, description: "Slow-simmered black lentils cooked overnight with fresh cream and butter — the way it should be." },
  { chefKey: 'priya', name: 'Garlic Naan', category: 'Breads', price: 60, image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.7, description: "Fluffy tandoor naan brushed with garlic butter and coriander." },
  { chefKey: 'priya', name: 'Paneer Tikka', category: 'Starters', price: 260, image: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.8, description: "Cottage cheese cubes marinated in yogurt and spices, char-grilled to smoky perfection." },
  { chefKey: 'rehan', name: 'Hyderabadi Chicken Biryani', category: 'Mains', price: 380, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80', veg: false, rating: 4.9, description: "Aged basmati, saffron-infused, layered with tender chicken, dum-cooked for 3 hours. Family recipe." },
  { chefKey: 'rehan', name: 'Mutton Biryani', category: 'Mains', price: 460, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80', veg: false, rating: 4.9, description: "Slow-cooked mutton in aromatic biryani rice with mint and fried onions. Served with raita." },
  { chefKey: 'rehan', name: 'Veg Biryani', category: 'Mains', price: 280, image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.7, description: "Hyderabadi-style vegetable biryani with paneer, saffron, and whole spices." },
  { chefKey: 'rehan', name: 'Sheer Khurma', category: 'Desserts', price: 140, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.8, description: "Traditional Hyderabadi dessert of vermicelli, milk, dates, and rose water." },
  { chefKey: 'meera', name: 'Masala Dosa', category: 'Mains', price: 160, image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.9, description: "Crispy fermented rice crepe wrapped around spiced potato masala. Served with chutney & sambar." },
  { chefKey: 'meera', name: 'Idli & Sambar', category: 'Starters', price: 120, image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.8, description: "Steamed lentil-rice cakes served with sambar and coconut chutney. Ultra soft, fluffy." },
  { chefKey: 'meera', name: 'Filter Coffee', category: 'Beverages', price: 60, image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.9, description: "South Indian filter coffee with beans from Meera's family estate in Coorg. Frothy, strong, unforgettable." },
  { chefKey: 'meera', name: 'Rava Kesari', category: 'Desserts', price: 90, image: 'https://images.unsplash.com/photo-1605197161470-5d2a9af0ac7e?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.7, description: "Sweet semolina pudding with saffron, cardamom, and roasted cashews." },
  { chefKey: 'sohini', name: 'Kosha Mangsho', category: 'Mains', price: 420, image: 'https://images.unsplash.com/photo-1602273660127-a0000560a4c1?w=600&auto=format&fit=crop&q=80', veg: false, rating: 4.9, description: "Slow-cooked Bengali mutton curry with mustard oil and warm spices. A Sunday classic." },
  { chefKey: 'sohini', name: 'Luchi & Cholar Dal', category: 'Mains', price: 220, image: 'https://images.unsplash.com/photo-1626500155249-e8ac1cfc6b71?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.8, description: "Puffy Bengali fried bread with sweet-spiced chana dal. Comfort in every bite." },
  { chefKey: 'sohini', name: 'Rasgulla', category: 'Desserts', price: 120, image: 'https://images.unsplash.com/photo-1615832494873-b0c52d519696?w=600&auto=format&fit=crop&q=80', veg: true, rating: 4.8, description: "Soft cottage cheese balls soaked in cardamom-infused sugar syrup. Made fresh each morning." }
];

// ============================================
// UTILITIES
// ============================================
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function toast(message, type = 'success', duration = 3000) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = {
    success: '<i class="fa-solid fa-circle-check"></i>',
    error: '<i class="fa-solid fa-circle-exclamation"></i>',
    warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
  };
  el.innerHTML = `${icons[type] || icons.success}<span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('hide');
    setTimeout(() => el.remove(), 300);
  }, duration);
}
function formatPrice(n) { return `₹${Number(n).toFixed(0)}`; }
function formatDate(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  return date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function isAdmin(user) { return user && user.email === ADMIN_EMAIL; }

// ============================================
// NAV
// ============================================
function renderNav(user) {
  const nav = $('#admin-nav');
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="#" class="logo"><i class="fa-solid fa-user-shield"></i>HomePlate Admin</a>
      <ul class="nav-links">
        ${user ? `
          <li><span style="color:var(--charcoal-muted);font-size:0.9rem;"><i class="fa-solid fa-circle-user"></i> ${user.email}</span></li>
          <li><button id="nav-logout" class="btn btn-outline btn-sm"><i class="fa-solid fa-right-from-bracket"></i> Logout</button></li>
        ` : ''}
      </ul>
    </div>`;
  $('#nav-logout')?.addEventListener('click', async () => {
    await signOut(auth);
    toast('Logged out', 'success');
  });
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 20));
}

// ============================================
// LOGIN SCREEN (admin gate)
// ============================================
function renderLogin(reason) {
  const root = $('#admin-root');
  root.innerHTML = `
    <div class="auth-container" style="grid-template-columns:1fr;max-width:520px;margin:60px auto;box-shadow:var(--shadow-lg);border-radius:var(--radius-lg);overflow:hidden;">
      <div class="auth-form-wrap">
        <form class="auth-form" id="admin-login-form">
          <h2 style="margin-bottom:8px;"><i class="fa-solid fa-user-shield" style="color:var(--primary);"></i> Admin Sign In</h2>
          <p style="color:var(--charcoal-soft);margin-bottom:16px;">Restricted access — sign in with the admin account.</p>
          ${reason ? `<div class="empty-state" style="padding:12px;margin-bottom:16px;background:var(--primary-soft);border-radius:12px;">
            <p style="margin:0;color:var(--primary-dark);font-size:0.9rem;"><i class="fa-solid fa-triangle-exclamation"></i> ${reason}</p>
          </div>` : ''}
          <p style="font-size:0.85rem;color:var(--charcoal-muted);margin-bottom:16px;">
            Admin email is configured as: <strong>${ADMIN_EMAIL}</strong>
          </p>
          <div class="form-group">
            <label><i class="fa-solid fa-envelope"></i> Email</label>
            <input class="form-control" id="admin-email" type="email" placeholder="admin@homeplate.com" required />
          </div>
          <div class="form-group">
            <label><i class="fa-solid fa-lock"></i> Password</label>
            <input class="form-control" id="admin-password" type="password" placeholder="••••••••" required minlength="6" />
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="admin-submit">
            <i class="fa-solid fa-right-to-bracket"></i> Sign in as Admin
          </button>
          <div class="divider">or</div>
          <button type="button" class="google-btn" id="admin-google">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </form>
      </div>
    </div>`;

  $('#admin-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#admin-email').value.trim();
    const password = $('#admin-password').value;
    const btn = $('#admin-submit');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"><span class="loader-middle"></span></span> Signing in…';
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will pick up from here
    } catch (err) {
      toast(err.message.replace('Firebase: ', ''), 'error');
      btn.disabled = false;
      btn.innerHTML = original;
    }
  });

  $('#admin-google').addEventListener('click', async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      toast(err.message.replace('Firebase: ', ''), 'error');
    }
  });
}

// ============================================
// DASHBOARD SHELL
// ============================================
function renderDashboard() {
  const root = $('#admin-root');
  root.innerHTML = `
    <h1 style="margin-bottom:8px;">Admin panel</h1>
    <p style="color:var(--charcoal-soft);margin-bottom:20px;">Manage chefs, dishes, and live orders.</p>

    <div class="admin-tabs">
      <button class="admin-tab active" data-tab="content"><i class="fa-solid fa-utensils"></i> Dishes & Chefs</button>
      <button class="admin-tab" data-tab="orders"><i class="fa-solid fa-bell"></i> Live Orders</button>
      <button class="admin-tab" data-tab="settings"><i class="fa-solid fa-gear"></i> Rules & Setup</button>
    </div>

    <div class="admin-panel active" id="panel-content">
      <div id="seed-slot"></div>
      <div class="admin-section">
        <h3><span>Chefs</span><button class="btn btn-primary btn-sm" id="add-chef-btn">+ Add chef</button></h3>
        <div id="chef-form-slot"></div>
        <div id="chefs-table"></div>
      </div>
      <div class="admin-section">
        <h3><span>Dishes</span><button class="btn btn-primary btn-sm" id="add-dish-btn">+ Add dish</button></h3>
        <div id="dish-form-slot"></div>
        <div id="dishes-table"></div>
      </div>
    </div>

    <div class="admin-panel" id="panel-orders">
      <div class="admin-section">
        <h3>Live incoming orders</h3>
        <p style="color:var(--charcoal-muted);font-size:0.9rem;margin-bottom:16px;">Updates in realtime. Change status to notify the customer instantly.</p>
        <div id="orders-live-list"></div>
      </div>
    </div>

    <div class="admin-panel" id="panel-settings">
      <div class="admin-section">
        <h3>Firebase security rules</h3>
        <p style="color:var(--charcoal-soft);margin-bottom:16px;">For this app to work, set the following rules in your Firebase Console.</p>
        <h4 style="margin-bottom:8px;color:var(--forest);">Firestore rules</h4>
        <pre style="background:var(--bg-tint);padding:16px;border-radius:12px;overflow-x:auto;font-size:0.85rem;line-height:1.6;">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chefs/{doc}    { allow read: if true; allow write: if request.auth != null; }
    match /dishes/{doc}   { allow read: if true; allow write: if request.auth != null; }
    match /orders/{doc}   { allow read, write: if request.auth != null; }
    match /reviews/{doc}  { allow read: if true; allow write: if request.auth != null; }
  }
}</pre>
        <h4 style="margin:20px 0 8px;color:var(--forest);">Realtime Database rules</h4>
        <pre style="background:var(--bg-tint);padding:16px;border-radius:12px;overflow-x:auto;font-size:0.85rem;line-height:1.6;">{
  "rules": {
    "orderStatus": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}</pre>
        <h4 style="margin:20px 0 8px;color:var(--forest);">Change admin email</h4>
        <p style="color:var(--charcoal-soft);font-size:0.9rem;">Currently: <code>${ADMIN_EMAIL}</code></p>
        <p style="color:var(--charcoal-muted);font-size:0.85rem;">To change, edit the <code>ADMIN_EMAIL</code> constant at the top of <code>admin/app.js</code>.</p>
      </div>
    </div>`;

  $$('.admin-tab').forEach(t => t.addEventListener('click', () => {
    $$('.admin-tab').forEach(x => x.classList.remove('active'));
    $$('.admin-panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('#panel-' + t.dataset.tab).classList.add('active');
  }));

  $('#add-chef-btn').addEventListener('click', () => showChefForm());
  $('#add-dish-btn').addEventListener('click', () => showDishForm());

  loadSeedPrompt();
  loadChefs();
  loadDishes();
  loadOrders();
}

// ============================================
// SEED
// ============================================
async function loadSeedPrompt() {
  const slot = $('#seed-slot');
  try {
    const chefsSnap = await getDocs(collection(db, 'chefs'));
    if (chefsSnap.empty) {
      slot.innerHTML = `
        <div class="admin-section" style="background:linear-gradient(135deg,rgba(212,162,76,0.15),rgba(198,93,58,0.1));border:1.5px dashed var(--terracotta);">
          <h3>🌱 Get started with sample data</h3>
          <p style="color:var(--charcoal-soft);margin-bottom:16px;">Your kitchen is empty. Load 4 home chefs and 15 delicious dishes with a single click.</p>
          <button class="btn btn-primary" id="seed-btn">Load sample data</button>
        </div>`;
      $('#seed-btn').addEventListener('click', seedData);
    } else {
      slot.innerHTML = '';
    }
  } catch (e) {
    slot.innerHTML = `<p style="color:var(--danger);padding:12px;">${e.message}</p>`;
  }
}
async function seedData() {
  const btn = $('#seed-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loader"></span> Seeding…';
  try {
    const batch = writeBatch(db);
    const chefIdMap = {};
    for (const chef of SEED_CHEFS) {
      const chefRef = doc(collection(db, 'chefs'));
      chefIdMap[chef.key] = chefRef.id;
      const { key, ...data } = chef;
      batch.set(chefRef, data);
    }
    for (const dish of SEED_DISHES) {
      const dishRef = doc(collection(db, 'dishes'));
      const chefId = chefIdMap[dish.chefKey];
      const chefName = SEED_CHEFS.find(c => c.key === dish.chefKey)?.name || '';
      const { chefKey, ...rest } = dish;
      batch.set(dishRef, { ...rest, chefId, chefName });
    }
    await batch.commit();
    toast('Sample data loaded successfully!', 'success');
    setTimeout(() => window.location.reload(), 1000);
  } catch (e) {
    console.error(e);
    toast('Failed to seed: ' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = 'Load sample data';
  }
}

// ============================================
// CHEFS CRUD
// ============================================
let chefsCache = [];
async function loadChefs() {
  const container = $('#chefs-table');
  try {
    const snap = await getDocs(collection(db, 'chefs'));
    chefsCache = [];
    snap.forEach(d => chefsCache.push({ id: d.id, ...d.data() }));
    if (!chefsCache.length) {
      container.innerHTML = '<p style="color:var(--charcoal-muted);padding:12px 0;">No chefs yet.</p>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Photo</th><th>Name</th><th>Cuisine</th><th>City</th><th>Rating</th><th>Actions</th></tr></thead>
        <tbody>
          ${chefsCache.map(c => `
            <tr>
              <td><img src="${c.photo}" alt="" onerror="this.style.opacity=0.3" /></td>
              <td><strong>${c.name}</strong></td>
              <td>${c.cuisine || '-'}</td>
              <td>${c.city || '-'}</td>
              <td>★ ${c.rating || '-'}</td>
              <td>
                <button class="action-btn edit-btn" data-edit-chef="${c.id}">Edit</button>
                <button class="action-btn delete-btn" data-del-chef="${c.id}">Delete</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
    container.querySelectorAll('[data-edit-chef]').forEach(b => b.addEventListener('click', () => {
      const chef = chefsCache.find(c => c.id === b.dataset.editChef);
      showChefForm(chef);
    }));
    container.querySelectorAll('[data-del-chef]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete this chef?')) return;
      await deleteDoc(doc(db, 'chefs', b.dataset.delChef));
      toast('Chef deleted', 'success');
      loadChefs();
    }));
  } catch (e) {
    container.innerHTML = `<p style="color:var(--danger);padding:12px;">${e.message}</p>`;
  }
}
function showChefForm(chef = null) {
  const slot = $('#chef-form-slot');
  slot.innerHTML = `
    <form class="admin-section" style="background:var(--bg-tint);border:1px solid var(--border);" id="chef-form">
      <h4 style="margin-bottom:16px;">${chef ? 'Edit chef' : 'Add new chef'}</h4>
      <div class="admin-form-grid">
        <div class="form-group"><label>Name</label><input class="form-control" name="name" value="${chef?.name || ''}" required /></div>
        <div class="form-group"><label>City</label><input class="form-control" name="city" value="${chef?.city || ''}" /></div>
        <div class="form-group"><label>Cuisine</label><input class="form-control" name="cuisine" value="${chef?.cuisine || ''}" placeholder="North Indian, Bengali..." /></div>
        <div class="form-group"><label>Signature dish</label><input class="form-control" name="signature" value="${chef?.signature || ''}" /></div>
        <div class="form-group"><label>Photo URL (avatar)</label><input class="form-control" name="photo" value="${chef?.photo || ''}" placeholder="https://images.unsplash.com/..." /></div>
        <div class="form-group"><label>Cover URL (banner)</label><input class="form-control" name="cover" value="${chef?.cover || ''}" placeholder="https://images.unsplash.com/..." /></div>
        <div class="form-group"><label>Rating (0-5)</label><input class="form-control" name="rating" type="number" step="0.1" min="0" max="5" value="${chef?.rating || 4.8}" /></div>
        <div class="form-group"><label>Total orders</label><input class="form-control" name="orders" value="${chef?.orders || ''}" /></div>
        <div class="form-group full-width"><label>Bio</label><textarea class="form-control" name="bio" rows="3">${chef?.bio || ''}</textarea></div>
      </div>
      <div class="flex-gap">
        <button type="submit" class="btn btn-primary">${chef ? 'Save' : 'Create'}</button>
        <button type="button" class="btn btn-ghost" id="chef-cancel">Cancel</button>
      </div>
    </form>`;
  $('#chef-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
  $('#chef-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const data = {
      name: f.name.value.trim(),
      city: f.city.value.trim(),
      cuisine: f.cuisine.value.trim(),
      signature: f.signature.value.trim(),
      photo: f.photo.value.trim(),
      cover: f.cover.value.trim(),
      rating: parseFloat(f.rating.value) || 4.8,
      orders: f.orders.value.trim(),
      bio: f.bio.value.trim()
    };
    try {
      if (chef) {
        await updateDoc(doc(db, 'chefs', chef.id), data);
        toast('Chef updated', 'success');
      } else {
        await addDoc(collection(db, 'chefs'), data);
        toast('Chef added', 'success');
      }
      slot.innerHTML = '';
      loadChefs();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ============================================
// DISHES CRUD
// ============================================
let dishesCache = [];
async function loadDishes() {
  const container = $('#dishes-table');
  try {
    const snap = await getDocs(collection(db, 'dishes'));
    dishesCache = [];
    snap.forEach(d => dishesCache.push({ id: d.id, ...d.data() }));
    if (!dishesCache.length) {
      container.innerHTML = '<p style="color:var(--charcoal-muted);padding:12px 0;">No dishes yet.</p>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Image</th><th>Name</th><th>Chef</th><th>Category</th><th>Price</th><th>Veg</th><th>Actions</th></tr></thead>
        <tbody>
          ${dishesCache.map(d => `
            <tr>
              <td><img src="${d.image}" alt="" /></td>
              <td><strong>${d.name}</strong></td>
              <td>${d.chefName || '-'}</td>
              <td>${d.category || '-'}</td>
              <td>${formatPrice(d.price)}</td>
              <td>${d.veg ? '🟢' : '🔴'}</td>
              <td>
                <button class="action-btn edit-btn" data-edit-dish="${d.id}">Edit</button>
                <button class="action-btn delete-btn" data-del-dish="${d.id}">Delete</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>`;
    container.querySelectorAll('[data-edit-dish]').forEach(b => b.addEventListener('click', () => {
      const dish = dishesCache.find(x => x.id === b.dataset.editDish);
      showDishForm(dish);
    }));
    container.querySelectorAll('[data-del-dish]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Delete this dish?')) return;
      await deleteDoc(doc(db, 'dishes', b.dataset.delDish));
      toast('Dish deleted', 'success');
      loadDishes();
    }));
  } catch (e) {
    container.innerHTML = `<p style="color:var(--danger);padding:12px;">${e.message}</p>`;
  }
}
function showDishForm(dish = null) {
  const slot = $('#dish-form-slot');
  slot.innerHTML = `
    <form class="admin-section" style="background:var(--bg-tint);border:1px solid var(--border);" id="dish-form">
      <h4 style="margin-bottom:16px;">${dish ? 'Edit dish' : 'Add new dish'}</h4>
      <div class="admin-form-grid">
        <div class="form-group"><label>Name</label><input class="form-control" name="name" value="${dish?.name || ''}" required /></div>
        <div class="form-group">
          <label>Chef</label>
          <select class="form-control" name="chefId" required>
            <option value="">Select chef…</option>
            ${chefsCache.map(c => `<option value="${c.id}" ${dish?.chefId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select class="form-control" name="category">
            <option ${dish?.category === 'Starters' ? 'selected' : ''}>Starters</option>
            <option ${dish?.category === 'Mains' || !dish ? 'selected' : ''}>Mains</option>
            <option ${dish?.category === 'Breads' ? 'selected' : ''}>Breads</option>
            <option ${dish?.category === 'Desserts' ? 'selected' : ''}>Desserts</option>
            <option ${dish?.category === 'Beverages' ? 'selected' : ''}>Beverages</option>
          </select>
        </div>
        <div class="form-group"><label>Price (₹)</label><input class="form-control" name="price" type="number" min="0" value="${dish?.price || ''}" required /></div>
        <div class="form-group full-width"><label>Image URL</label><input class="form-control" name="image" value="${dish?.image || ''}" placeholder="https://images.unsplash.com/..." /></div>
        <div class="form-group"><label>Rating (0-5)</label><input class="form-control" name="rating" type="number" step="0.1" min="0" max="5" value="${dish?.rating || 4.7}" /></div>
        <div class="form-group">
          <label>Type</label>
          <select class="form-control" name="veg">
            <option value="true" ${dish?.veg === true ? 'selected' : ''}>Vegetarian</option>
            <option value="false" ${dish?.veg === false ? 'selected' : ''}>Non-vegetarian</option>
          </select>
        </div>
        <div class="form-group full-width"><label>Description</label><textarea class="form-control" name="description" rows="3">${dish?.description || ''}</textarea></div>
      </div>
      <div class="flex-gap">
        <button type="submit" class="btn btn-primary">${dish ? 'Save' : 'Create'}</button>
        <button type="button" class="btn btn-ghost" id="dish-cancel">Cancel</button>
      </div>
    </form>`;
  $('#dish-cancel').addEventListener('click', () => { slot.innerHTML = ''; });
  $('#dish-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const chefId = f.chefId.value;
    const chefName = chefsCache.find(c => c.id === chefId)?.name || '';
    const data = {
      name: f.name.value.trim(),
      chefId, chefName,
      category: f.category.value,
      price: parseInt(f.price.value) || 0,
      image: f.image.value.trim(),
      rating: parseFloat(f.rating.value) || 4.7,
      veg: f.veg.value === 'true',
      description: f.description.value.trim()
    };
    try {
      if (dish) {
        await updateDoc(doc(db, 'dishes', dish.id), data);
        toast('Dish updated', 'success');
      } else {
        await addDoc(collection(db, 'dishes'), data);
        toast('Dish added', 'success');
      }
      slot.innerHTML = '';
      loadDishes();
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ============================================
// LIVE ORDERS
// ============================================
let ordersUnsub = null;
function loadOrders() {
  const container = $('#orders-live-list');
  container.innerHTML = '<div class="full-loader"><div class="loader"></div></div>';
  if (ordersUnsub) ordersUnsub();
  ordersUnsub = onSnapshot(collection(db, 'orders'), (snap) => {
    const orders = [];
    snap.forEach(d => orders.push({ id: d.id, ...d.data() }));
    orders.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    });
    if (!orders.length) {
      container.innerHTML = '<p style="color:var(--charcoal-muted);padding:20px;">No orders yet — waiting for the first hungry customer 🍽️</p>';
      return;
    }
    container.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Address</th><th>Status</th></tr></thead>
        <tbody>
          ${orders.map(o => {
            const items = (o.items || []).map(i => `${i.qty}× ${i.name}`).join(', ');
            const dateText = o.createdAt ? formatDate(o.createdAt) : '';
            return `
              <tr>
                <td><strong>#${o.id.slice(-6).toUpperCase()}</strong><br /><span style="font-size:0.8rem;color:var(--charcoal-muted);">${dateText}</span></td>
                <td><strong>${o.userName || ''}</strong><br /><span style="font-size:0.8rem;color:var(--charcoal-muted);">${o.phone || ''}</span></td>
                <td style="max-width:200px;">${items}</td>
                <td><strong>${formatPrice(o.total)}</strong></td>
                <td style="max-width:200px;font-size:0.85rem;">${o.address || ''}</td>
                <td>
                  <select class="status-select" data-order="${o.id}">
                    <option value="Placed" ${o.status === 'Placed' ? 'selected' : ''}>Placed</option>
                    <option value="Preparing" ${o.status === 'Preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="Out for Delivery" ${o.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
                    <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                  </select>
                </td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    container.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const orderId = sel.dataset.order;
        const newStatus = sel.value;
        try {
          await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
          await update(ref(rtdb, 'orderStatus/' + orderId), {
            status: newStatus,
            updatedAt: Date.now()
          });
          toast(`Order ${orderId.slice(-6).toUpperCase()} → ${newStatus}`, 'success');
        } catch (err) { toast(err.message, 'error'); }
      });
    });
  }, (err) => {
    container.innerHTML = `<p style="color:var(--danger);padding:20px;">${err.message}</p>`;
  });
}

// ============================================
// BOOT — auth-driven view switching
// ============================================
onAuthStateChanged(auth, (user) => {
  renderNav(user);
  if (!user) {
    if (ordersUnsub) { ordersUnsub(); ordersUnsub = null; }
    renderLogin();
    return;
  }
  if (!isAdmin(user)) {
    if (ordersUnsub) { ordersUnsub(); ordersUnsub = null; }
    // sign out and prompt again — the account isn't an admin
    signOut(auth).then(() => {
      renderLogin(`Account <strong>${user.email}</strong> is not an admin. The admin email is <strong>${ADMIN_EMAIL}</strong>.`);
    });
    return;
  }
  renderDashboard();
});
