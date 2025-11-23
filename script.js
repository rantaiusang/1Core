/* script.js - PiTrace (penyederhanaan & perbaikan) */

/* =========================
   CONFIG / STATE
   ========================= */
const PI_APP_ID = 'GANTI_DENGAN_APP_ID_KAMU'; // optional
let currentUser = null;
let userProducts = [];
let allProducts = [];

/* =========================
   HELPERS
   ========================= */
function addDebugLog(msg) {
  // simple console + status area (non-intrusive)
  console.log('[PI-TRACE]', msg);
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;
  // show short transient message
  statusDiv.style.display = 'block';
  statusDiv.textContent = msg;
  setTimeout(() => {
    statusDiv.style.display = 'none';
    statusDiv.textContent = '';
  }, 3000);
}

function showStatus(message, type = 'info') {
  // uses addDebugLog for now, but could show styled messages
  addDebugLog(message);
}

/* Simple hash generator for product codes */
function generateHashCode(productData) {
  const text = `${productData.name || ''}_${productData.city || ''}_${Date.now()}_${Math.random()}`;
  let h = 5381;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) + h) + text.charCodeAt(i);
    h = h & 0xFFFFFFFF;
  }
  const hex = (h >>> 0).toString(16).toUpperCase();
  return `PITRACE_${hex.padStart(8, '0').substr(0, 12)}`;
}

/* Load/save products to localStorage safely */
function safeLoad(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch (e) {
    console.error('Failed to load from localStorage', e);
    return [];
  }
}
function safeSave(key, arr) {
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

/* =========================
   UI / APP FLOW
   ========================= */

function showAppForUser() {
  // Hide login section, show search/stats/activity and welcome
  const loginSection = document.getElementById('loginSection');
  const searchArea = document.getElementById('searchArea');
  const statsSection = document.getElementById('statsSection');
  const activitySection = document.getElementById('activitySection');
  const userSection = document.getElementById('userSection');

  if (loginSection) loginSection.style.display = 'none';
  if (searchArea) searchArea.style.display = 'block';
  if (statsSection) statsSection.style.display = 'block';
  if (activitySection) activitySection.style.display = 'block';
  if (userSection) userSection.style.display = 'flex';

  // show username
  const welcomeUsername = document.getElementById('welcomeUsername');
  if (welcomeUsername && currentUser) welcomeUsername.textContent = currentUser.username;

  // reload products & UI
  userProducts = safeLoad('pi_trace_products') || [];
  allProducts = safeLoad('pi_trace_all_products') || [];
  updateStats();
  displayProducts();
}

function showLoginUI() {
  const loginSection = document.getElementById('loginSection');
  const searchArea = document.getElementById('searchArea');
  const statsSection = document.getElementById('statsSection');
  const activitySection = document.getElementById('activitySection');
  const userSection = document.getElementById('userSection');

  if (loginSection) loginSection.style.display = 'block';
  if (searchArea) searchArea.style.display = 'none';
  if (statsSection) statsSection.style.display = 'none';
  if (activitySection) activitySection.style.display = 'none';
  if (userSection) userSection.style.display = 'none';
}

/* =========================
   AUTHENTICATION (simple)
   ========================= */

function detectPiBrowser() {
  const ua = navigator.userAgent || '';
  const isPi = /PiBrowser/i.test(ua) || window.location.protocol === 'pi:';
  return isPi;
}

async function loginWithPi() {
  addDebugLog('Mulai login Pi...');
  const isPi = detectPiBrowser();
  if (!isPi) {
    showStatus('Pi Browser tidak terdeteksi. Gunakan Demo / Guest untuk mencoba.', 'error');
    // fallback to mock after short delay
    setTimeout(() => {
      mockLogin();
    }, 800);
    return;
  }

  // If Pi SDK available, call SDK (this is placeholder; real SDK usage may differ)
  if (window.Pi && typeof window.Pi.requestAuth === 'function') {
    try {
      addDebugLog('Memanggil Pi SDK untuk autentikasi...');
      const res = await window.Pi.requestAuth(['username', 'wallet_address']);
      // SDK returns user info — normalize
      if (res) {
        currentUser = {
          username: res.username || 'PiUser',
          uid: res.uid || res.username || 'pi_' + Date.now(),
          loginMethod: 'pi'
        };
        localStorage.setItem('pi_trace_user', JSON.stringify(currentUser));
        showStatus('Login Pi berhasil. Selamat datang, ' + currentUser.username, 'success');
        showAppForUser();
      } else {
        throw new Error('No auth response');
      }
    } catch (e) {
      console.error(e);
      showStatus('Gagal login Pi: ' + (e.message || e), 'error');
    }
  } else {
    showStatus('Pi SDK tidak tersedia di browser ini.', 'warning');
    setTimeout(() => mockLogin(), 700);
  }
}

function mockLogin() {
  currentUser = {
    username: 'Demo_User_' + Math.floor(Math.random() * 900 + 100),
    uid: 'mock_' + Date.now(),
    loginMethod: 'mock'
  };
  localStorage.setItem('pi_trace_user', JSON.stringify(currentUser));
  addDebugLog('Mock login: ' + currentUser.username);
  showStatus('Demo mode aktif: ' + currentUser.username, 'info');
  showAppForUser();
}

function guestLogin() {
  currentUser = {
    username: 'Guest_' + Math.random().toString(36).substr(2, 6),
    uid: 'guest_' + Date.now(),
    loginMethod: 'guest'
  };
  localStorage.setItem('pi_trace_user', JSON.stringify(currentUser));
  addDebugLog('Guest login: ' + currentUser.username);
  showStatus('Selamat datang, ' + currentUser.username, 'info');
  showAppForUser();
}

function logout() {
  currentUser = null;
  localStorage.removeItem('pi_trace_user');
  addDebugLog('User logged out');
  showStatus('Logout sukses', 'info');
  showLoginUI();
}

/* =========================
   PRODUCTS UI
   ========================= */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'flex';
}
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

/* populate product list in modalProductList */
function displayProducts() {
  const container = document.getElementById('productContainer');
  if (!container) return;
  container.innerHTML = '';

  const products = userProducts && userProducts.length ? userProducts : [];
  if (products.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:18px;color:var(--gray)">Belum ada produk. Tambah produk pertama Anda.</div>`;
    return;
  }

  products.forEach(p => {
    const item = document.createElement('div');
    item.className = 'product-item';
    item.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:600">${escapeHtml(p.name)}</div>
          <div style="font-size:13px;color:var(--gray)">${escapeHtml(p.origin || '')} • ${p.quantity || ''} ${p.unit || ''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600;color:var(--primary)">${escapeHtml(p.price || '')}</div>
          <div style="font-size:12px;color:var(--gray)">${escapeHtml(p.timestamp || '')}</div>
        </div>
      </div>
    `;
    item.onclick = () => {
      // open detail modal with minimal info
      const productDetail = document.getElementById('productDetail');
      if (productDetail) {
        productDetail.innerHTML = `
          <h4>${escapeHtml(p.name)}</h4>
          <p><strong>Origin:</strong> ${escapeHtml(p.origin || '-')}</p>
          <p><strong>Qty:</strong> ${p.quantity || '-'} ${p.unit || ''}</p>
          <p><strong>Hash:</strong> ${escapeHtml(p.hashCode || '-')}</p>
          <p style="margin-top:8px">${escapeHtml(p.description || '')}</p>
        `;
      }
      openModal('modalProductDetail');
    };
    container.appendChild(item);
  });
}

/* submit product from modal */
function saveProductFromModal() {
  const nameEl = document.getElementById('inputName');
  const cityEl = document.getElementById('inputCity');
  const priceEl = document.getElementById('inputPrice');
  const qtyEl = document.getElementById('inputQty');
  const hashPreview = document.getElementById('hashPreview');

  const name = nameEl ? nameEl.value.trim() : '';
  const city = cityEl ? cityEl.value.trim() : '';
  const price = priceEl ? priceEl.value.trim() : '';
  const qty = qtyEl ? qtyEl.value.trim() : '';

  if (!name) {
    showStatus('Masukkan nama produk', 'error');
    return;
  }
  if (!city) {
    showStatus('Masukkan asal kota produk', 'error');
    return;
  }

  const now = new Date();
  const product = {
    id: 'p_' + Date.now(),
    name,
    origin: `${city}`,
    city,
    price: price ? (price + ' Rp') : 'N/A',
    quantity: qty || '1',
    unit: 'pcs',
    timestamp: now.toLocaleString(),
    description: '',
    hashCode: generateHashCode({name, city, timestamp: now.getTime()})
  };

  userProducts.unshift(product);
  allProducts.unshift(product);
  safeSave('pi_trace_products', userProducts);
  safeSave('pi_trace_all_products', allProducts);

  showStatus('Produk tersimpan: ' + product.name, 'success');
  addDebugLog('Produk tersimpan: ' + product.name);
  displayProducts();
  updateStats();
  closeModal('modalAddProduct');

  // clear fields
  if (nameEl) nameEl.value = '';
  if (cityEl) cityEl.value = '';
  if (priceEl) priceEl.value = '';
  if (qtyEl) qtyEl.value = '';
  if (hashPreview) hashPreview.textContent = 'Akan dihasilkan otomatis...';
}

/* update stats numbers */
function updateStats() {
  const totalEl = document.getElementById('statTotalProducts');
  const locEl = document.getElementById('statLocations');
  const actEl = document.getElementById('statActivities');

  const total = userProducts.length;
  const locations = new Set(userProducts.map(p => p.origin)).size || 0;
  const activities = Math.min(99, Math.max(0, userProducts.length * 2)); // fake metric

  if (totalEl) totalEl.textContent = total;
  if (locEl) locEl.textContent = locations;
  if (actEl) actEl.textContent = activities;
}

/* quick escape html */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"]/g, (s) => {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[s];
  });
}

/* =========================
   SEARCH
   ========================= */
function searchProducts() {
  const el = document.getElementById('searchInput');
  const q = el ? el.value.trim().toLowerCase() : '';
  if (!q) {
    userProducts = safeLoad('pi_trace_products');
    displayProducts();
    showStatus('Menampilkan semua produk', 'info');
    return;
  }
  const filtered = allProducts.filter(p =>
    (p.name && p.name.toLowerCase().includes(q)) ||
    (p.origin && p.origin.toLowerCase().includes(q)) ||
    (p.hashCode && p.hashCode.toLowerCase().includes(q))
  );
  userProducts = filtered;
  displayProducts();
  showStatus('Ditemukan ' + filtered.length + ' hasil', 'info');
}

/* =========================
   QR (simulated)
   ========================= */
function openQRScanner() {
  addDebugLog('Membuka QR scanner (simulated)');
  openModal('modalScanQR');
}
function simulateQRScan() {
  if (!userProducts.length) {
    showStatus('Tidak ada produk untuk disimulasikan', 'warning');
    return;
  }
  const p = userProducts[Math.floor(Math.random() * userProducts.length)];
  const qrResult = document.getElementById('qrResult');
  if (qrResult) {
    qrResult.style.display = 'block';
    qrResult.textContent = 'Hasil scan: ' + p.hashCode + ' → ' + p.name;
  }
  setTimeout(() => {
    closeModal('modalScanQR');
    openModal('modalProductDetail');
    const productDetail = document.getElementById('productDetail');
    if (productDetail) {
      productDetail.innerHTML = `<h4>${escapeHtml(p.name)}</h4><p><strong>Hash:</strong> ${p.hashCode}</p>`;
    }
  }, 1000);
}

/* =========================
   INIT & BINDING
   ========================= */

document.addEventListener('DOMContentLoaded', () => {
  // Load saved user session
  try {
    const saved = localStorage.getItem('pi_trace_user');
    if (saved) {
      currentUser = JSON.parse(saved);
      addDebugLog('Restore user: ' + (currentUser && currentUser.username));
      showAppForUser();
    } else {
      showLoginUI();
    }
  } catch (e) {
    console.error(e);
    showLoginUI();
  }

  // Load products
  userProducts = safeLoad('pi_trace_products') || [];
  allProducts = safeLoad('pi_trace_all_products') || userProducts.slice();

  // Button bindings
  const btnLogin = document.getElementById('btnLogin');
  const btnMock = document.getElementById('btnMock');
  const btnGuest = document.getElementById('btnGuest');
  const btnAddProduct = document.getElementById('btnAddProduct');
  const btnProductList = document.getElementById('btnProductList');
  const btnScanQR = document.getElementById('btnScanQR');
  const btnSaveProduct = document.getElementById('btnSaveProduct');
  const searchInput = document.getElementById('searchInput');

  if (btnLogin) btnLogin.addEventListener('click', loginWithPi);
  if (btnMock) btnMock.addEventListener('click', mockLogin);
  if (btnGuest) btnGuest.addEventListener('click', guestLogin);
  if (btnAddProduct) btnAddProduct.addEventListener('click', () => openModal('modalAddProduct'));
  if (btnProductList) btnProductList.addEventListener('click', () => openModal('modalProductList'));
  if (btnScanQR) btnScanQR.addEventListener('click', openQRScanner);
  if (btnSaveProduct) btnSaveProduct.addEventListener('click', saveProductFromModal);
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') searchProducts(); });
  }

  // modal close buttons by attribute data-close
  document.querySelectorAll('.close-modal').forEach(el => {
    el.addEventListener('click', (ev) => {
      const closeTarget = el.getAttribute('data-close');
      if (closeTarget) {
        // expects selector like #modalAddProduct
        const id = closeTarget.replace('#', '');
        closeModal(id);
      } else {
        // find parent modal
        const modal = el.closest('.modal');
        if (modal) modal.style.display = 'none';
      }
    });
  });

  // click outside modal to close
  window.addEventListener('click', (e) => {
    document.querySelectorAll('.modal').forEach(m => {
      if (e.target === m) m.style.display = 'none';
    });
  });

  // initial UI refresh
  displayProducts();
  updateStats();
  addDebugLog('App ready');
});
