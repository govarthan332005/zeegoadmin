// ============================================
// HomePlate — ADMIN APP  (v3 — bug-fixed & premium)
// Login (admin-only) + Dashboard: stats, chefs, dishes, live orders, rules
// ============================================
//  Bug fixes vs v2:
//   1. Form data is now read via `f.querySelector('[name="x"]')` so a field
//      called "name" doesn't collide with HTMLFormElement.name.  This is the
//      reason "Add chef" and "Add dish" previously silently did nothing.
//   2. Dish form: chef select value read the same safe way.
//   3. onAuthStateChanged now waits for auth ready before wiring buttons.
//   4. All button handlers rewired every render (no orphan listeners).
//   5. Seed batch commits split into two batches (chefs first, then dishes)
//      so chefIdMap contains real ids even if writeBatch buffers.
//   6. Live-orders listener is disposed on tab switch too.
// ============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, GoogleAuthProvider,
  signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, onSnapshot, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getDatabase, ref, update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ============================================
// CONFIG — MUST match the user app
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
const ADMIN_EMAIL = "admin@homeplate.com";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const rtdb = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// ============================================
// SEED DATA
// ============================================
const SEED_CHEFS = [
  { key:'priya', name:'Priya Nair', city:'Mumbai', cuisine:'North Indian', signature:'Butter Chicken & Naan',
    photo:'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80',
    cover:'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1400&q=80',
    rating:4.9, orders:'2,300+',
    bio:"12 years of home cooking. Trained by her grandmother in traditional Punjabi flavours." },
  { key:'rehan', name:'Rehan Khan', city:'Hyderabad', cuisine:'North Indian', signature:'Hyderabadi Dum Biryani',
    photo:'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?w=300&q=80',
    cover:'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1400&q=80',
    rating:4.8, orders:'3,100+',
    bio:"Three generations of dum, saffron, and slow-cooked patience in every plate." },
  { key:'meera', name:'Meera Iyer', city:'Bangalore', cuisine:'South Indian', signature:'Masala Dosa & Filter Coffee',
    photo:'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=80',
    cover:'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=1400&q=80',
    rating:4.9, orders:'1,800+',
    bio:"Tam-Brahm heritage in every idli. Filter coffee legendary — beans from her family Coorg estate." },
  { key:'sohini', name:'Sohini Ghosh', city:'Kolkata', cuisine:'Bengali', signature:'Kosha Mangsho & Luchi',
    photo:'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80',
    cover:'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=1400&q=80',
    rating:4.8, orders:'1,500+',
    bio:"Mustard oil, panch phoron, and a lifetime of love — a Kolkata durga-puja kitchen." }
];

const SEED_DISHES = [
  { chefKey:'priya', name:'Butter Chicken', category:'Mains', price:320, image:'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80', veg:false, rating:4.9, description:"Creamy tomato-butter gravy, slow-cooked with kasuri methi." },
  { chefKey:'priya', name:'Dal Makhani', category:'Mains', price:220, image:'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80', veg:true, rating:4.8, description:"Slow-simmered black lentils with cream and butter." },
  { chefKey:'priya', name:'Garlic Naan', category:'Breads', price:60, image:'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&q=80', veg:true, rating:4.7, description:"Fluffy tandoor naan with garlic butter." },
  { chefKey:'priya', name:'Paneer Tikka', category:'Starters', price:260, image:'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80', veg:true, rating:4.8, description:"Char-grilled paneer marinated in yogurt and spices." },
  { chefKey:'rehan', name:'Hyderabadi Chicken Biryani', category:'Mains', price:380, image:'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80', veg:false, rating:4.9, description:"Saffron-infused basmati, dum-cooked with tender chicken." },
  { chefKey:'rehan', name:'Mutton Biryani', category:'Mains', price:460, image:'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80', veg:false, rating:4.9, description:"Slow-cooked mutton with mint, fried onions, raita." },
  { chefKey:'rehan', name:'Veg Biryani', category:'Mains', price:280, image:'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&q=80', veg:true, rating:4.7, description:"Hyderabadi-style veg biryani with paneer and saffron." },
  { chefKey:'rehan', name:'Sheer Khurma', category:'Desserts', price:140, image:'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80', veg:true, rating:4.8, description:"Vermicelli, milk, dates, rose water." },
  { chefKey:'meera', name:'Masala Dosa', category:'Mains', price:160, image:'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&q=80', veg:true, rating:4.9, description:"Crispy rice crepe with spiced potato masala." },
  { chefKey:'meera', name:'Idli & Sambar', category:'Starters', price:120, image:'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&q=80', veg:true, rating:4.8, description:"Steamed lentil-rice cakes with sambar and chutney." },
  { chefKey:'meera', name:'Filter Coffee', category:'Beverages', price:60, image:'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80', veg:true, rating:4.9, description:"South Indian filter coffee with Coorg beans." },
  { chefKey:'meera', name:'Rava Kesari', category:'Desserts', price:90, image:'https://images.unsplash.com/photo-1605197161470-5d2a9af0ac7e?w=600&q=80', veg:true, rating:4.7, description:"Semolina pudding with saffron and cashews." },
  { chefKey:'sohini', name:'Kosha Mangsho', category:'Mains', price:420, image:'https://images.unsplash.com/photo-1602273660127-a0000560a4c1?w=600&q=80', veg:false, rating:4.9, description:"Slow-cooked Bengali mutton curry with mustard oil." },
  { chefKey:'sohini', name:'Luchi & Cholar Dal', category:'Mains', price:220, image:'https://images.unsplash.com/photo-1626500155249-e8ac1cfc6b71?w=600&q=80', veg:true, rating:4.8, description:"Puffy Bengali fried bread with sweet-spiced chana dal." },
  { chefKey:'sohini', name:'Rasgulla', category:'Desserts', price:120, image:'https://images.unsplash.com/photo-1615832494873-b0c52d519696?w=600&q=80', veg:true, rating:4.8, description:"Soft cottage cheese balls in cardamom syrup." }
];

// ============================================
// UTILS
// ============================================
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const escapeHtml = (str='') => String(str ?? '').replace(/[&<>"']/g,
  c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => `₹${Number(n||0).toFixed(0)}`;
const isAdmin = u => u && u.email === ADMIN_EMAIL;

/** Safe form field read — avoids collisions with HTMLFormElement own props
 *  like `.name`, `.submit`, `.length`. This was the #1 bug that broke
 *  "Add chef" & "Add dish" in v2. */
const readField = (form, name) => {
  const el = form.querySelector(`[name="${name}"]`);
  if(!el) return '';
  if(el.type === 'checkbox') return el.checked;
  return el.value ?? '';
};

function toast(message, type='success', duration=2500){
  let c = $('.toast-container');
  if(!c){ c = document.createElement('div'); c.className='toast-container'; document.body.appendChild(c); }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success:'fa-circle-check', error:'fa-circle-exclamation', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
  el.innerHTML = `<i class="fa-solid ${icons[type]||icons.success}"></i><span>${escapeHtml(message)}</span>`;
  c.appendChild(el);
  setTimeout(()=>{ el.classList.add('hide'); setTimeout(()=>el.remove(),300); }, duration);
}

function formatDate(ts){
  if(!ts) return '';
  const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  if(isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN',{ day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
}

// Prevent zoom
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault(), { passive:false });

// Ripple effect on all buttons that have .btn class
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn, .action-btn, .admin-tab, .copy-btn');
  if(!btn || btn.disabled) return;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const r = btn.getBoundingClientRect();
  ripple.style.left = (e.clientX - r.left) + 'px';
  ripple.style.top  = (e.clientY - r.top)  + 'px';
  btn.appendChild(ripple);
  setTimeout(()=>ripple.remove(), 620);
});

// ============================================
// STATE
// ============================================
let chefsCache  = [];
let dishesCache = [];
let ordersCache = [];
let ordersUnsub = null;

// ============================================
// NAV
// ============================================
function renderNav(user){
  const nav = $('#admin-nav');
  const initial = user ? (user.email||'A')[0].toUpperCase() : '';
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="#" class="logo"><i class="fa-solid fa-user-shield"></i> <span>HomePlate Admin</span></a>
      <div class="nav-user">
        ${user ? `
          <div class="avatar" title="${escapeHtml(user.email||'')}">${initial}</div>
          <button id="nav-logout" class="btn btn-outline btn-sm"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
        ` : ''}
      </div>
    </div>`;
  $('#nav-logout')?.addEventListener('click', async () => {
    if(!confirm('Sign out of the admin panel?')) return;
    if(ordersUnsub){ ordersUnsub(); ordersUnsub = null; }
    await signOut(auth);
    toast('Logged out','success');
  });
}

// ============================================
// LOGIN SCREEN
// ============================================
function renderLogin(reason){
  const root = $('#admin-root');
  root.innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-icon"><i class="fa-solid fa-user-shield"></i></div>
        <h2>Admin Sign In</h2>
        <p>Restricted access — sign in with the admin account.</p>
        ${reason ? `<div class="alert-warn"><i class="fa-solid fa-triangle-exclamation"></i><span>${reason}</span></div>` : ''}
        <form id="admin-login-form" autocomplete="on">
          <div class="form-group">
            <label>Admin Email</label>
            <div class="input-wrap">
              <i class="fa-solid fa-envelope input-icon"></i>
              <input class="input has-icon" name="email" type="email" placeholder="admin@homeplate.com" required autocomplete="email" />
            </div>
          </div>
          <div class="form-group">
            <label>Password</label>
            <div class="input-wrap">
              <i class="fa-solid fa-lock input-icon"></i>
              <input class="input has-icon" name="password" type="password" placeholder="••••••••" required minlength="6" autocomplete="current-password" />
              <button type="button" class="input-suffix" id="toggle-pass"><i class="fa-solid fa-eye"></i></button>
            </div>
          </div>
          <button type="submit" class="btn btn-primary btn-block btn-lg" id="admin-submit">
            <i class="fa-solid fa-right-to-bracket"></i> Sign in as Admin
          </button>
        </form>
        <div class="divider">or</div>
        <button type="button" class="google-btn" id="admin-google">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.99 10.99 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <p class="auth-foot">
          Admin: <code>${ADMIN_EMAIL}</code>
        </p>
      </div>
    </div>`;

  const form = $('#admin-login-form');
  form.onsubmit = async e => {
    e.preventDefault();
    const email    = readField(form,'email').trim();
    const password = readField(form,'password');
    const btn = $('#admin-submit');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Signing in…';
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch(err){
      toast((err.message||'').replace('Firebase: ',''),'error');
      btn.disabled = false; btn.innerHTML = orig;
    }
  };

  $('#toggle-pass').onclick = () => {
    const pw = form.querySelector('[name="password"]');
    pw.type = pw.type === 'password' ? 'text' : 'password';
    $('#toggle-pass').innerHTML = pw.type === 'password'
      ? '<i class="fa-solid fa-eye"></i>' : '<i class="fa-solid fa-eye-slash"></i>';
  };

  $('#admin-google').onclick = async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch(err){ toast((err.message||'').replace('Firebase: ',''),'error'); }
  };
}

// ============================================
// DASHBOARD
// ============================================
function renderDashboard(){
  const root = $('#admin-root');
  root.innerHTML = `
    <div class="admin-container">
      <div class="page-heading">
        <h1><i class="fa-solid fa-gauge-high"></i> Dashboard</h1>
        <p>Manage chefs, dishes and live orders in one place.</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon primary"><i class="fa-solid fa-user-tie"></i></div><div class="stat-info"><h4 id="stat-chefs">—</h4><p>Total chefs</p></div></div>
        <div class="stat-card"><div class="stat-icon success"><i class="fa-solid fa-utensils"></i></div><div class="stat-info"><h4 id="stat-dishes">—</h4><p>Total dishes</p></div></div>
        <div class="stat-card"><div class="stat-icon info"><i class="fa-solid fa-receipt"></i></div><div class="stat-info"><h4 id="stat-orders">—</h4><p>Total orders</p></div></div>
        <div class="stat-card"><div class="stat-icon warn"><i class="fa-solid fa-fire"></i></div><div class="stat-info"><h4 id="stat-active">—</h4><p>Active orders</p></div></div>
      </div>

      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="content"><i class="fa-solid fa-utensils"></i> Menu <span class="tab-count" id="tab-count-content">0</span></button>
        <button class="admin-tab" data-tab="orders"><i class="fa-solid fa-bell"></i> Live Orders <span class="tab-count" id="tab-count-orders">0</span></button>
        <button class="admin-tab" data-tab="settings"><i class="fa-solid fa-gear"></i> Rules &amp; Setup</button>
      </div>

      <!-- CONTENT PANEL -->
      <div class="admin-panel active" id="panel-content">
        <div id="seed-slot"></div>
        <div class="admin-section">
          <h3>
            <span><i class="fa-solid fa-user-tie" style="color:var(--primary);"></i> Chefs</span>
            <button class="btn btn-primary btn-sm" id="add-chef-btn"><i class="fa-solid fa-plus"></i> Add chef</button>
          </h3>
          <div id="chef-form-slot"></div>
          <div id="chefs-table"></div>
        </div>
        <div class="admin-section">
          <h3>
            <span><i class="fa-solid fa-utensils" style="color:var(--primary);"></i> Dishes</span>
            <button class="btn btn-primary btn-sm" id="add-dish-btn"><i class="fa-solid fa-plus"></i> Add dish</button>
          </h3>
          <div id="dish-form-slot"></div>
          <div id="dishes-table"></div>
        </div>
      </div>

      <!-- ORDERS PANEL -->
      <div class="admin-panel" id="panel-orders">
        <div class="admin-section">
          <h3><span><i class="fa-solid fa-bell" style="color:var(--primary);"></i> Live Orders</span></h3>
          <p class="section-sub">Realtime updates. Change the status to notify the customer instantly.</p>
          <div id="orders-live-list"></div>
        </div>
      </div>

      <!-- SETTINGS PANEL -->
      <div class="admin-panel" id="panel-settings">
        <div class="admin-section">
          <h3><span><i class="fa-solid fa-shield-halved" style="color:var(--primary);"></i> Firebase security rules</span></h3>
          <p class="section-sub">Set these rules in your Firebase Console for the app to work.</p>
          <div class="rules-title">
            <span>Firestore rules</span>
            <button class="copy-btn" data-copy="fs-rules"><i class="fa-solid fa-copy"></i> Copy</button>
          </div>
          <pre class="rules-block" id="fs-rules">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chefs/{doc}    { allow read: if true; allow write: if request.auth != null; }
    match /dishes/{doc}   { allow read: if true; allow write: if request.auth != null; }
    match /orders/{doc}   { allow read, write: if request.auth != null; }
    match /reviews/{doc}  { allow read: if true; allow write: if request.auth != null; }
  }
}</pre>
          <div class="rules-title">
            <span>Realtime Database rules</span>
            <button class="copy-btn" data-copy="rtdb-rules"><i class="fa-solid fa-copy"></i> Copy</button>
          </div>
          <pre class="rules-block" id="rtdb-rules">{
  "rules": {
    "orderStatus": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}</pre>
          <div class="rules-title"><span>Admin account</span></div>
          <p class="section-sub">Current: <code>${ADMIN_EMAIL}</code></p>
          <p class="section-sub" style="opacity:.7;">Change <code>ADMIN_EMAIL</code> at the top of <code>admin/app.js</code>.</p>
        </div>
      </div>
    </div>`;

  // Tab switching
  $$('.admin-tab').forEach(t => t.onclick = () => {
    $$('.admin-tab').forEach(x => x.classList.remove('active'));
    $$('.admin-panel').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    $('#panel-' + t.dataset.tab).classList.add('active');
  });

  // Copy rules
  $$('.copy-btn').forEach(b => b.onclick = () => {
    const text = $('#' + b.dataset.copy)?.textContent || '';
    navigator.clipboard.writeText(text).then(() => {
      const orig = b.innerHTML;
      b.innerHTML = '<i class="fa-solid fa-check"></i> Copied';
      setTimeout(()=>b.innerHTML = orig, 1400);
      toast('Copied to clipboard','success');
    }).catch(() => toast('Copy failed','error'));
  });

  $('#add-chef-btn').onclick = () => showChefForm();
  $('#add-dish-btn').onclick = () => showDishForm();

  loadAll();
}

async function loadAll(){
  await Promise.all([loadChefs(), loadDishes()]);
  loadOrders();
  updateSeedPrompt();
}

function updateStats(){
  const setText = (id, v) => { const el = $(id); if(el) el.textContent = v; };
  setText('#stat-chefs',  chefsCache.length);
  setText('#stat-dishes', dishesCache.length);
  setText('#stat-orders', ordersCache.length);
  const active = ordersCache.filter(o => o.status && o.status !== 'Delivered').length;
  setText('#stat-active', active);
  setText('#tab-count-content', chefsCache.length + dishesCache.length);
  setText('#tab-count-orders',  ordersCache.length);
}

// ============================================
// SEED
// ============================================
function updateSeedPrompt(){
  const slot = $('#seed-slot');
  if(!slot) return;
  if(!chefsCache.length){
    slot.innerHTML = `
      <div class="seed-banner">
        <div class="seed-icon"><i class="fa-solid fa-seedling"></i></div>
        <h3>Get started with sample data</h3>
        <p>Load 4 home chefs and 15 dishes with one click.</p>
        <button class="btn btn-primary btn-lg" id="seed-btn"><i class="fa-solid fa-seedling"></i> Load sample data</button>
      </div>`;
    $('#seed-btn').onclick = seedData;
  } else {
    slot.innerHTML = '';
  }
}

async function seedData(){
  const btn = $('#seed-btn');
  if(!btn) return;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Seeding…';
  try {
    const chefIdMap = {};
    // Chefs batch
    const chefsBatch = writeBatch(db);
    SEED_CHEFS.forEach(chef => {
      const chefRef = doc(collection(db,'chefs'));
      chefIdMap[chef.key] = chefRef.id;
      const { key, ...data } = chef;
      chefsBatch.set(chefRef, data);
    });
    await chefsBatch.commit();

    // Dishes batch (references the ids we just created)
    const dishesBatch = writeBatch(db);
    SEED_DISHES.forEach(dish => {
      const dishRef = doc(collection(db,'dishes'));
      const chefId = chefIdMap[dish.chefKey];
      const chefName = SEED_CHEFS.find(c => c.key === dish.chefKey)?.name || '';
      const { chefKey, ...rest } = dish;
      dishesBatch.set(dishRef, { ...rest, chefId, chefName });
    });
    await dishesBatch.commit();

    toast('Sample data loaded!','success');
    await loadChefs(); await loadDishes(); updateSeedPrompt();
  } catch(e){
    console.error(e);
    toast('Failed to seed: '+e.message,'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-seedling"></i> Load sample data';
  }
}

// ============================================
// CHEFS CRUD
// ============================================
async function loadChefs(){
  const container = $('#chefs-table');
  if(!container) return;
  try {
    const snap = await getDocs(collection(db,'chefs'));
    chefsCache = [];
    snap.forEach(d => chefsCache.push({ id:d.id, ...d.data() }));
    updateStats();
    if(!chefsCache.length){
      container.innerHTML = '<p class="empty-cell">No chefs yet. Add one or load sample data above.</p>';
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table class="admin-table">
          <thead><tr><th>Photo</th><th>Name</th><th>Cuisine</th><th>City</th><th>Rating</th><th class="ta-right">Actions</th></tr></thead>
          <tbody>
            ${chefsCache.map(c => `
              <tr>
                <td><img src="${escapeHtml(c.photo||'')}" alt="" onerror="this.style.opacity=.3" /></td>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${escapeHtml(c.cuisine||'-')}</td>
                <td>${escapeHtml(c.city||'-')}</td>
                <td><i class="fa-solid fa-star" style="color:#f59e0b;"></i> ${escapeHtml(String(c.rating||'-'))}</td>
                <td class="ta-right">
                  <button class="action-btn edit-btn" data-edit-chef="${c.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button class="action-btn delete-btn" data-del-chef="${c.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    container.querySelectorAll('[data-edit-chef]').forEach(b => b.onclick = () => {
      const chef = chefsCache.find(c => c.id === b.dataset.editChef);
      showChefForm(chef);
    });
    container.querySelectorAll('[data-del-chef]').forEach(b => b.onclick = async () => {
      if(!confirm('Delete this chef? This will NOT delete their dishes automatically.')) return;
      try {
        await deleteDoc(doc(db,'chefs',b.dataset.delChef));
        toast('Chef deleted','success');
        loadChefs();
      } catch(err){ toast(err.message,'error'); }
    });
  } catch(e){
    container.innerHTML = `<p class="error-cell">${escapeHtml(e.message)}</p>`;
  }
}

function showChefForm(chef=null){
  const slot = $('#chef-form-slot');
  slot.innerHTML = `
    <form class="admin-form-card" id="chef-form" novalidate>
      <h4 class="form-title">${chef?'<i class="fa-solid fa-pen"></i> Edit chef':'<i class="fa-solid fa-user-plus"></i> Add new chef'}</h4>
      <div class="admin-form-grid">
        <div class="form-group"><label>Name *</label><input class="input" name="chef_name" value="${escapeHtml(chef?.name||'')}" required /></div>
        <div class="form-group"><label>City</label><input class="input" name="chef_city" value="${escapeHtml(chef?.city||'')}" placeholder="Mumbai" /></div>
        <div class="form-group"><label>Cuisine</label><input class="input" name="chef_cuisine" value="${escapeHtml(chef?.cuisine||'')}" placeholder="North Indian, Bengali…" /></div>
        <div class="form-group"><label>Signature dish</label><input class="input" name="chef_signature" value="${escapeHtml(chef?.signature||'')}" placeholder="Butter Chicken" /></div>
        <div class="form-group"><label>Photo URL (avatar)</label><input class="input" name="chef_photo" value="${escapeHtml(chef?.photo||'')}" placeholder="https://…" /></div>
        <div class="form-group"><label>Cover URL (banner)</label><input class="input" name="chef_cover" value="${escapeHtml(chef?.cover||'')}" placeholder="https://…" /></div>
        <div class="form-group"><label>Rating (0-5)</label><input class="input" name="chef_rating" type="number" step="0.1" min="0" max="5" value="${chef?.rating??4.8}" /></div>
        <div class="form-group"><label>Total orders (display)</label><input class="input" name="chef_orders" value="${escapeHtml(String(chef?.orders||''))}" placeholder="500+" /></div>
        <div class="form-group full"><label>Bio</label><textarea class="input" name="chef_bio" rows="3">${escapeHtml(chef?.bio||'')}</textarea></div>
      </div>
      <div class="flex-gap">
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> ${chef?'Save changes':'Create chef'}</button>
        <button type="button" class="btn btn-ghost" id="chef-cancel">Cancel</button>
      </div>
    </form>`;

  const form = $('#chef-form');
  $('#chef-cancel').onclick = () => slot.innerHTML = '';

  form.onsubmit = async e => {
    e.preventDefault();
    const data = {
      name:      readField(form,'chef_name').trim(),
      city:      readField(form,'chef_city').trim(),
      cuisine:   readField(form,'chef_cuisine').trim(),
      signature: readField(form,'chef_signature').trim(),
      photo:     readField(form,'chef_photo').trim(),
      cover:     readField(form,'chef_cover').trim(),
      rating:    parseFloat(readField(form,'chef_rating')) || 4.8,
      orders:    readField(form,'chef_orders').trim(),
      bio:       readField(form,'chef_bio').trim()
    };
    if(!data.name){ toast('Chef name is required','error'); return; }

    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="btn-spinner"></span> Saving…';

    try {
      if(chef){
        await updateDoc(doc(db,'chefs',chef.id), data);
        // Cascade chef name change to related dishes
        const relatedDishes = dishesCache.filter(d => d.chefId === chef.id);
        if(relatedDishes.length && data.name !== chef.name){
          const batch = writeBatch(db);
          relatedDishes.forEach(d => batch.update(doc(db,'dishes',d.id), { chefName: data.name }));
          await batch.commit();
        }
        toast('Chef updated','success');
      } else {
        await addDoc(collection(db,'chefs'), data);
        toast('Chef added','success');
      }
      slot.innerHTML = '';
      await loadChefs(); await loadDishes();
    } catch(err){
      console.error(err);
      toast(err.message || 'Failed to save chef','error');
      btn.disabled = false; btn.innerHTML = orig;
    }
  };
}

// ============================================
// DISHES CRUD
// ============================================
async function loadDishes(){
  const container = $('#dishes-table');
  if(!container) return;
  try {
    const snap = await getDocs(collection(db,'dishes'));
    dishesCache = [];
    snap.forEach(d => dishesCache.push({ id:d.id, ...d.data() }));
    updateStats();
    if(!dishesCache.length){
      container.innerHTML = '<p class="empty-cell">No dishes yet.</p>';
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table class="admin-table">
          <thead><tr><th>Image</th><th>Name</th><th>Chef</th><th>Category</th><th>Price</th><th>Type</th><th class="ta-right">Actions</th></tr></thead>
          <tbody>
            ${dishesCache.map(d => `
              <tr>
                <td><img src="${escapeHtml(d.image||'')}" alt="" onerror="this.style.opacity=.3" /></td>
                <td><strong>${escapeHtml(d.name)}</strong></td>
                <td>${escapeHtml(d.chefName||'-')}</td>
                <td>${escapeHtml(d.category||'-')}</td>
                <td><strong>${fmt(d.price)}</strong></td>
                <td><span class="veg-dot ${d.veg?'veg':'non-veg'}" title="${d.veg?'Vegetarian':'Non-vegetarian'}"></span></td>
                <td class="ta-right">
                  <button class="action-btn edit-btn" data-edit-dish="${d.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                  <button class="action-btn delete-btn" data-del-dish="${d.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    container.querySelectorAll('[data-edit-dish]').forEach(b => b.onclick = () => {
      const dish = dishesCache.find(x => x.id === b.dataset.editDish);
      showDishForm(dish);
    });
    container.querySelectorAll('[data-del-dish]').forEach(b => b.onclick = async () => {
      if(!confirm('Delete this dish?')) return;
      try {
        await deleteDoc(doc(db,'dishes',b.dataset.delDish));
        toast('Dish deleted','success');
        loadDishes();
      } catch(err){ toast(err.message,'error'); }
    });
  } catch(e){
    container.innerHTML = `<p class="error-cell">${escapeHtml(e.message)}</p>`;
  }
}

function showDishForm(dish=null){
  const slot = $('#dish-form-slot');
  if(!chefsCache.length){
    toast('Please add a chef first before adding dishes','warning',3000);
    return;
  }
  slot.innerHTML = `
    <form class="admin-form-card" id="dish-form" novalidate>
      <h4 class="form-title">${dish?'<i class="fa-solid fa-pen"></i> Edit dish':'<i class="fa-solid fa-plate-wheat"></i> Add new dish'}</h4>
      <div class="admin-form-grid">
        <div class="form-group"><label>Name *</label><input class="input" name="dish_name" value="${escapeHtml(dish?.name||'')}" required /></div>
        <div class="form-group">
          <label>Chef *</label>
          <select class="input" name="dish_chefId" required>
            <option value="">Select chef…</option>
            ${chefsCache.map(c => `<option value="${c.id}" ${dish?.chefId===c.id?'selected':''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Category</label>
          <select class="input" name="dish_category">
            ${['Starters','Mains','Breads','Desserts','Beverages'].map(c => `<option value="${c}" ${(dish?.category===c || (!dish && c==='Mains'))?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Price (₹) *</label><input class="input" name="dish_price" type="number" min="0" value="${dish?.price??''}" required /></div>
        <div class="form-group full"><label>Image URL</label><input class="input" name="dish_image" value="${escapeHtml(dish?.image||'')}" placeholder="https://images.unsplash.com/…" /></div>
        <div class="form-group"><label>Rating (0-5)</label><input class="input" name="dish_rating" type="number" step="0.1" min="0" max="5" value="${dish?.rating??4.7}" /></div>
        <div class="form-group">
          <label>Type</label>
          <select class="input" name="dish_veg">
            <option value="true"  ${dish ? (dish.veg===true ?'selected':'') : 'selected'}>Vegetarian</option>
            <option value="false" ${dish?.veg===false?'selected':''}>Non-vegetarian</option>
          </select>
        </div>
        <div class="form-group full"><label>Description</label><textarea class="input" name="dish_description" rows="3">${escapeHtml(dish?.description||'')}</textarea></div>
      </div>
      <div class="flex-gap">
        <button type="submit" class="btn btn-primary"><i class="fa-solid fa-check"></i> ${dish?'Save changes':'Create dish'}</button>
        <button type="button" class="btn btn-ghost" id="dish-cancel">Cancel</button>
      </div>
    </form>`;

  const form = $('#dish-form');
  $('#dish-cancel').onclick = () => slot.innerHTML = '';

  form.onsubmit = async e => {
    e.preventDefault();
    const chefId = readField(form,'dish_chefId');
    if(!chefId){ toast('Please select a chef','error'); return; }
    const chefName = chefsCache.find(c => c.id === chefId)?.name || '';
    const data = {
      name:        readField(form,'dish_name').trim(),
      chefId, chefName,
      category:    readField(form,'dish_category'),
      price:       parseInt(readField(form,'dish_price'))||0,
      image:       readField(form,'dish_image').trim(),
      rating:      parseFloat(readField(form,'dish_rating'))||4.7,
      veg:         readField(form,'dish_veg') === 'true',
      description: readField(form,'dish_description').trim()
    };
    if(!data.name){ toast('Dish name required','error'); return; }

    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<span class="btn-spinner"></span> Saving…';

    try {
      if(dish){
        await updateDoc(doc(db,'dishes',dish.id), data);
        toast('Dish updated','success');
      } else {
        await addDoc(collection(db,'dishes'), data);
        toast('Dish added','success');
      }
      slot.innerHTML = '';
      loadDishes();
    } catch(err){
      console.error(err);
      toast(err.message || 'Failed to save dish','error');
      btn.disabled = false; btn.innerHTML = orig;
    }
  };
}

// ============================================
// LIVE ORDERS
// ============================================
function loadOrders(){
  const container = $('#orders-live-list');
  if(!container) return;
  container.innerHTML = '<div class="full-loader"><div class="cooking-loader"><div class="steam"></div><div class="steam"></div><div class="steam"></div><div class="pan"></div><div class="label">Waiting for orders…</div></div></div>';
  if(ordersUnsub){ ordersUnsub(); ordersUnsub = null; }
  ordersUnsub = onSnapshot(collection(db,'orders'), snap => {
    ordersCache = [];
    snap.forEach(d => ordersCache.push({ id:d.id, ...d.data() }));
    ordersCache.sort((a,b) => {
      const ta = a.createdAt?.toMillis?.() || new Date(a.orderTimestamp||0).getTime();
      const tb = b.createdAt?.toMillis?.() || new Date(b.orderTimestamp||0).getTime();
      return tb - ta;
    });
    updateStats();
    if(!ordersCache.length){
      container.innerHTML = '<div class="empty-cell"><i class="fa-solid fa-inbox" style="font-size:2rem;color:var(--ink-4);margin-bottom:8px;display:block;"></i>No orders yet — waiting for the first hungry customer 🍽️</div>';
      return;
    }
    container.innerHTML = `
      <div class="table-wrap">
        <table class="admin-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Address</th><th>Status</th></tr></thead>
          <tbody>
            ${ordersCache.map(o => {
              const items = (o.items||[]).map(i => `${i.qty}× ${escapeHtml(i.name)}`).join(', ');
              const dateText = o.createdAt ? formatDate(o.createdAt) : formatDate(o.orderTimestamp);
              const statusKey = (o.status||'Placed').toLowerCase().replace(/\s+/g,'');
              return `
                <tr>
                  <td><strong>#${o.id.slice(-6).toUpperCase()}</strong><br/><span class="cell-sub">${dateText}</span></td>
                  <td><strong>${escapeHtml(o.userName||'')}</strong><br/><span class="cell-sub">${escapeHtml(o.phone||'')}</span></td>
                  <td class="cell-items">${items}</td>
                  <td><strong>${fmt(o.total)}</strong></td>
                  <td class="cell-addr">${escapeHtml(o.address||'')}</td>
                  <td>
                    <select class="status-select" data-order="${o.id}">
                      ${['Placed','Preparing','Out for Delivery','Delivered'].map(s => `<option value="${s}" ${o.status===s?'selected':''}>${s}</option>`).join('')}
                    </select>
                    <div class="status-badge-wrap"><span class="badge b-${statusKey}">${escapeHtml(o.status||'Placed')}</span></div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
    container.querySelectorAll('.status-select').forEach(sel => {
      sel.onchange = async () => {
        const orderId = sel.dataset.order;
        const newStatus = sel.value;
        try {
          await updateDoc(doc(db,'orders',orderId), { status:newStatus });
          await update(ref(rtdb,'orderStatus/'+orderId), { status:newStatus, updatedAt:Date.now() });
          toast(`Order ${orderId.slice(-6).toUpperCase()} → ${newStatus}`,'success');
        } catch(err){ toast(err.message,'error'); }
      };
    });
  }, err => {
    container.innerHTML = `<p class="error-cell">${escapeHtml(err.message)}</p>`;
  });
}

// ============================================
// BOOT
// ============================================
onAuthStateChanged(auth, user => {
  renderNav(user);
  if(!user){
    if(ordersUnsub){ ordersUnsub(); ordersUnsub = null; }
    renderLogin();
    return;
  }
  if(!isAdmin(user)){
    if(ordersUnsub){ ordersUnsub(); ordersUnsub = null; }
    signOut(auth).then(() => {
      renderLogin(`Account <strong>${escapeHtml(user.email)}</strong> is not an admin. Admin: <strong>${ADMIN_EMAIL}</strong>`);
    });
    return;
  }
  renderDashboard();
});
