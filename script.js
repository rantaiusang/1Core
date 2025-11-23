// =============================================
// PI TRACE - Final JS (Pi Browser optimized)
// =============================================

// =====================
// CONFIG
// =====================
// Ganti dengan App ID dari Pi Developer Portal
const PI_APP_ID = 'GANTI_DENGAN_APP_ID_KAMU';

// Pi Network Configuration (informational)
const PI_CONFIG = {
    apiKey: 'w4miz2guqh3rx3rd79agoyvmq6o1bos7frpuurptmadfvadybube5yqm0wuv10um',
    version: "2.0",
    sandbox: true
};

// =====================
// GLOBAL STATE
// =====================
let pi = null;
let currentUser = null;

// Safely load arrays from localStorage and ensure uploadDate is Date object
function safeLoadProducts(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        // Convert uploadDate strings back to Date objects if needed
        return arr.map(p => {
            if (p && p.uploadDate && typeof p.uploadDate === 'string') {
                try {
                    p.uploadDate = new Date(p.uploadDate);
                } catch (e) { /* ignore */ }
            }
            return p;
        });
    } catch (e) {
        console.error('Failed to parse products from localStorage:', e);
        return [];
    }
}

let userProducts = safeLoadProducts('pi_trace_products');
let allProducts = safeLoadProducts('pi_trace_all_products');

// =====================
// UTILITIES
// =====================

// Enhanced debug logger (visible panel if present)
function addDebugLog(message) {
    try {
        const debugPanel = document.getElementById('debugPanel');
        const now = new Date();
        const timestamp = now.toLocaleTimeString() + '.' + now.getMilliseconds().toString().padStart(3, '0');

        const logItem = document.createElement('div');
        logItem.className = 'debug-item';

        // Choose emoji based on message contents
        let emoji = '💬';
        const lower = message.toString().toLowerCase();
        if (lower.includes('✅') || lower.includes('success')) emoji = '✅';
        if (lower.includes('❌') || lower.includes('error')) emoji = '❌';
        if (lower.includes('⚠') || lower.includes('warning')) emoji = '⚠️';
        if (lower.includes('🚀')) emoji = '🚀';
        if (lower.includes('🔑')) emoji = '🔑';
        if (lower.includes('💰')) emoji = '💰';
        if (lower.includes('🌐')) emoji = '🌐';
        if (lower.includes('📦')) emoji = '📦';
        if (lower.includes('🔍')) emoji = '🔍';
        if (lower.includes('📷')) emoji = '📷';
        if (lower.includes('📊')) emoji = '📊';
        if (lower.includes('🧪')) emoji = '🧪';
        if (lower.includes('👤')) emoji = '👤';
        if (lower.includes('🔒')) emoji = '🔒';
        if (lower.includes('🎉')) emoji = '🎉';
        if (lower.includes('💥')) emoji = '💥';

        logItem.innerHTML = `<span style="opacity:0.7">[${timestamp}]</span> ${emoji} ${message}`;

        if (debugPanel) {
            const maxItems = 100;
            const items = debugPanel.getElementsByClassName('debug-item');
            if (items.length >= maxItems) {
                debugPanel.removeChild(items[0]);
            }
            debugPanel.appendChild(logItem);
            debugPanel.scrollTop = debugPanel.scrollHeight;
        } else {
            // Fallback to console
            console.log(`[PI-TRACE] ${message}`);
        }
    } catch (e) {
        console.log(`[PI-TRACE] ${message}`);
    }
}

// Lightweight visual status messages (non-blocking)
function showStatus(message, type = 'info') {
    try {
        const statusDiv = document.getElementById('status');
        if (!statusDiv) {
            // fallback: console + brief alert for critical errors
            if (type === 'error') {
                console.error('Status (error):', message);
            } else {
                console.log('Status:', message);
            }
            return;
        }

        const statusElement = document.createElement('div');
        statusElement.className = `status-message status-${type}`;
        statusElement.innerHTML = message;

        statusDiv.appendChild(statusElement);

        // Auto-remove for non-error
        if (type !== 'error') {
            setTimeout(() => {
                if (statusElement.parentNode) statusElement.remove();
            }, 5000);
        }
    } catch (e) {
        console.log('Status:', message);
    }
}

// Simple deterministic hash (djb2 -> hex)
function generateHashCode(productData) {
    const dataString = `${productData.name || ''}_${productData.category || ''}_${productData.timestamp || Date.now()}_${Math.random()}`;
    let hash = 5381;
    for (let i = 0; i < dataString.length; i++) {
        hash = ((hash << 5) + hash) + dataString.charCodeAt(i); /* hash * 33 + c */
        // Keep 32-bit
        hash = hash & 0xFFFFFFFF;
    }
    // Convert to positive hex and limit length
    const hex = (hash >>> 0).toString(16).toUpperCase();
    return `PITRACE_${hex.padStart(8, '0').substr(0, 12)}`;
}

function getUnitDisplayName(unit) {
    const unitNames = {
        'pcs': 'pcs',
        'kg': 'kg',
        'g': 'g',
        'lb': 'lb',
        'ton': 'ton',
        'l': 'L',
        'ml': 'ml',
        'm': 'm',
        'cm': 'cm',
        'box': 'boxes',
        'pack': 'packs',
        'set': 'sets',
        'pair': 'pairs',
        'bundle': 'bundles',
        'carton': 'cartons'
    };
    return unitNames[unit] || unit;
}

// =====================
// PI BROWSER DETECTION & SDK LOADING
// =====================
function detectPiBrowser() {
    const ua = navigator.userAgent || '';
    const isPiBrowser = ua.includes('PiBrowser') || window.location.protocol === 'pi:' || /PiBrowser/i.test(ua);
    if (isPiBrowser) {
        document.documentElement.classList.add('pi-browser');
        document.body.classList.add('pi-browser');
        addDebugLog('🌐 Pi Browser detected - Enabling Pi-specific features');
    } else {
        addDebugLog('🌐 Pi Browser not detected');
    }
    return isPiBrowser;
}

function loadPiSDK() {
    return new Promise((resolve, reject) => {
        if (window.Pi) {
            addDebugLog('Pi SDK already present on window');
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://sdk.minepi.com/pi-sdk.js';
        script.async = true;
        script.defer = true;

        script.onload = () => {
            addDebugLog('✅ Pi SDK loaded successfully');
            resolve();
        };

        script.onerror = (e) => {
            addDebugLog('❌ Pi SDK failed to load: ' + (e && e.message ? e.message : 'network'));
            reject(new Error('Failed to load Pi SDK'));
        };

        document.head.appendChild(script);
    });
}

// Initialize Pi SDK with Pi Browser support
async function initializePiSDK() {
    try {
        addDebugLog('🚀 Initializing Pi SDK...');

        const isPiBrowser = detectPiBrowser();

        // If Pi SDK not present and we are in Pi Browser, try to load
        if (typeof window.Pi === 'undefined') {
            if (isPiBrowser) {
                addDebugLog('Pi SDK not found, loading dynamically...');
                await loadPiSDK();
            } else {
                addDebugLog('Pi SDK not available in regular browser');
                return false;
            }
        }

        pi = window.Pi;

        if (!pi) {
            throw new Error('Pi SDK not available after load');
        }

        // Some Pi SDKs expect init with app id; adapt depending on SDK version
        if (typeof pi.init === 'function') {
            addDebugLog('Calling pi.init with PI_APP_ID');
            // Wrap init in Promise-style callback for backward compatibility
            await new Promise((resolve, reject) => {
                try {
                    pi.init(PI_APP_ID, (initResult) => {
                        if (initResult) {
                            addDebugLog('✅ Pi SDK initialized: ' + JSON.stringify(initResult));
                            resolve(initResult);
                        } else {
                            addDebugLog('Pi SDK init callback returned falsy');
                            // resolve anyway to avoid blocking, but mark as available
                            resolve(null);
                        }
                    });
                } catch (err) {
                    addDebugLog('Pi SDK init throw: ' + err.message);
                    // Some SDKs return a promise
                    try {
                        pi.init(PI_APP_ID).then(res => {
                            addDebugLog('✅ Pi SDK initialized (promise): ' + JSON.stringify(res));
                            resolve(res);
                        }).catch(e => {
                            addDebugLog('Pi SDK init promise fail: ' + e.message);
                            reject(e);
                        });
                    } catch (e2) {
                        reject(err);
                    }
                }
            });
        } else {
            addDebugLog('pi.init not a function (skipping explicit init)');
        }

        // If user already authenticated (SDK provides method)
        try {
            if (typeof pi.isAuthenticated === 'function' && pi.isAuthenticated()) {
                addDebugLog('🔑 User already authenticated with Pi Network (SDK)');
                // Some SDKs have getAuthStatus or similar - try to fetch user info
                if (typeof pi.getUser === 'function') {
                    const authResult = await pi.getUser();
                    await handlePiAuthSuccess(authResult);
                }
            }
        } catch (e) {
            addDebugLog('Error while checking authentication: ' + e.message);
        }

        return true;
    } catch (error) {
        addDebugLog('❌ Pi SDK initialization failed: ' + (error && error.message ? error.message : error));
        console.error('Pi SDK Error:', error);
        return false;
    }
}

// =====================
// AUTHENTICATION / LOGIN
// =====================

function onIncompletePaymentFound(payment) {
    addDebugLog('⚠️ Incomplete payment found: ' + JSON.stringify(payment));
    showStatus('⚠️ Found incomplete payment - Please check your transactions', 'warning');
}

async function loginWithPi() {
    try {
        addDebugLog('🔄 Starting Pi login process...');

        const isPiBrowser = detectPiBrowser();

        if (!isPiBrowser) {
            showStatus('❌ Please open in Pi Browser to login with Pi Wallet', 'error');
            // Fallback: demo mode after a short delay
            setTimeout(() => {
                showStatus('🔄 Switching to demo mode...', 'warning');
                mockLogin();
            }, 1500);
            return;
        }

        showStatus('<div class="pi-loading"></div> Connecting to Pi Network...', 'info');

        if (!pi) {
            const sdkLoaded = await initializePiSDK();
            if (!sdkLoaded) {
                throw new Error('Pi SDK not available');
            }
        }

        // Scopes requested
        const scopes = ['username', 'payments', 'wallet_address'];
        addDebugLog('Requesting scopes: ' + scopes.join(', '));

        // Authenticate using SDK (different SDK versions may use different APIs)
        let authResult = null;
        if (typeof pi.authenticate === 'function') {
            // Some SDKs return a promise
            authResult = await pi.authenticate(scopes, onIncompletePaymentFound);
        } else if (typeof pi.requestAuth === 'function') {
            authResult = await pi.requestAuth(scopes);
        } else {
            throw new Error('Pi SDK does not expose authenticate/requestAuth');
        }

        if (!authResult) {
            throw new Error('No authentication response received');
        }

        addDebugLog('✅ Pi authentication successful');
        await handlePiAuthSuccess(authResult);
    } catch (error) {
        addDebugLog('❌ Pi login failed: ' + (error && error.message ? error.message : error));

        const msg = (error && error.message) ? error.message.toLowerCase() : '';
        if (msg.includes('user cancelled') || msg.includes('user denied') || msg.includes('cancel')) {
            showStatus('❌ Login cancelled by user', 'warning');
        } else if (msg.includes('network') || msg.includes('timeout')) {
            showStatus('🌐 Network error - Please check your connection', 'error');
        } else {
            showStatus('❌ Pi login failed: ' + (error && error.message ? error.message : error), 'error');
        }

        // Fallback to mock login after brief delay if no currentUser
        setTimeout(() => {
            if (!currentUser) {
                showStatus('🔄 Falling back to demo mode...', 'warning');
                mockLogin();
            }
        }, 2000);
    }
}

// Handle successful Pi authentication result
async function handlePiAuthSuccess(authResult) {
    if (!authResult) {
        throw new Error('No authentication result received');
    }

    // Try to normalize authResult structure across SDK versions
    let user = null;
    if (authResult.user) {
        user = authResult.user;
    } else if (authResult.username || authResult.walletAddress) {
        // some SDKs return user directly
        user = {
            username: authResult.username || 'Pi User',
            uid: authResult.uid || authResult.username || 'pi_uid',
            walletAddress: authResult.walletAddress || authResult.address || null
        };
    } else if (typeof authResult === 'string') {
        user = { username: authResult, uid: authResult };
    } else {
        // last resort
        user = { username: 'Pi User', uid: 'pi_uid' };
    }

    currentUser = {
        username: user.username || 'Pi User',
        uid: user.uid || ('pi_' + Date.now()),
        walletAddress: user.walletAddress || null,
        loginMethod: 'pi'
    };

    addDebugLog('✅ User authenticated: ' + currentUser.username);
    showStatus('🎉 Welcome to PI TRACE, ' + currentUser.username + '!', 'success');

    localStorage.setItem('pi_trace_user', JSON.stringify(currentUser));

    // Show main app
    showAppSection();
}

// Mock login for testing (demo)
function mockLogin() {
    currentUser = {
        username: 'Demo_User_' + Math.floor(Math.random() * 1000),
        uid: 'mock_uid_' + Date.now(),
        walletAddress: 'mock_wallet_' + Math.random().toString(36).substr(2, 9),
        loginMethod: 'mock'
    };

    addDebugLog('🧪 Mock login: ' + currentUser.username);
    showStatus('🧪 Demo mode activated - Use Pi Browser for full features', 'warning');

    localStorage.setItem('pi_trace_user', JSON.stringify(currentUser));
    showAppSection();
}

// Guest login
function guestLogin() {
    currentUser = {
        username: 'Guest_User_' + Math.random().toString(36).substr(2, 6),
        uid: 'guest_uid',
        walletAddress: null,
        loginMethod: 'guest'
    };

    addDebugLog('👤 Guest login: ' + currentUser.username);
    showStatus('👋 Welcome Guest! Some features may be limited.', 'info');

    localStorage.setItem('pi_trace_user', JSON.stringify(currentUser));
    showAppSection();
}

// Logout
function logout() {
    if (pi && currentUser && currentUser.loginMethod === 'pi') {
        try {
            if (typeof pi.logout === 'function') {
                pi.logout();
                addDebugLog('🔒 Pi Network logout completed');
            }
        } catch (error) {
            addDebugLog('⚠️ Pi logout error: ' + (error && error.message ? error.message : error));
        }
    }

    currentUser = null;
    localStorage.removeItem('pi_trace_user');

    const appSection = document.getElementById('app-section');
    const loginSection = document.getElementById('login-section');
    if (appSection) appSection.style.display = 'none';
    if (loginSection) loginSection.style.display = 'block';

    // Clear search input if exists
    const searchEl = document.getElementById('searchInput');
    if (searchEl) searchEl.value = '';

    showStatus('✅ Logout successful', 'success');
    addDebugLog('👤 User logged out');
}

// =====================
// PRODUCT MANAGEMENT
// =====================

function showAppSection() {
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app-section');
    if (loginSection) loginSection.style.display = 'none';
    if (appSection) appSection.style.display = 'block';

    // Update user info
    if (currentUser) {
        const usernameEl = document.getElementById('username');
        const loginTypeElement = document.getElementById('login-type');
        if (usernameEl) usernameEl.textContent = currentUser.username;
        if (loginTypeElement) {
            if (currentUser.loginMethod === 'pi') {
                loginTypeElement.textContent = '🔐 Authenticated with Pi Wallet';
                loginTypeElement.style.color = 'var(--success)';
            } else if (currentUser.loginMethod === 'mock') {
                loginTypeElement.textContent = '🧪 Demo Mode - Testing';
                loginTypeElement.style.color = 'var(--warning)';
            } else {
                loginTypeElement.textContent = '👤 Guest Mode - Limited Features';
                loginTypeElement.style.color = 'var(--warning)';
            }
        }
    }

    displayProducts();
}

function showProductModal() {
    addDebugLog('📝 Opening product registration modal');
    updateProductPreview();
    const modal = document.getElementById('productModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function updateProductPreview() {
    const name = (document.getElementById('productName') && document.getElementById('productName').value) || '';
    const category = (document.getElementById('productCategory') && document.getElementById('productCategory').value) || '';

    const now = new Date();
    const uploadDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const uploadDateDisplay = document.getElementById('uploadDateDisplay');
    if (uploadDateDisplay) uploadDateDisplay.textContent = uploadDate;

    const hashCodeDisplay = document.getElementById('hashCodeDisplay');
    if (name || category) {
        const productData = {
            name: name,
            category: category,
            timestamp: now.getTime()
        };
        if (hashCodeDisplay) hashCodeDisplay.textContent = generateHashCode(productData);
    } else {
        if (hashCodeDisplay) hashCodeDisplay.textContent = 'Will be generated after input';
    }
}

function submitProduct() {
    addDebugLog('📦 Submitting product registration...');

    // Get form values safely
    const nameEl = document.getElementById('productName');
    const categoryEl = document.getElementById('productCategory');
    const descEl = document.getElementById('productDescription');
    const qtyEl = document.getElementById('productQuantity');
    const unitEl = document.getElementById('productUnit');
    const priceEl = document.getElementById('productPrice');
    const originCountryEl = document.getElementById('originCountry');
    const originCityEl = document.getElementById('originCity');

    const name = nameEl ? nameEl.value.trim() : '';
    const category = categoryEl ? categoryEl.value : '';
    const description = descEl ? descEl.value.trim() : '';
    const quantity = qtyEl ? qtyEl.value : 0;
    const unit = unitEl ? unitEl.value : 'pcs';
    const price = priceEl ? priceEl.value : '';
    const originCountry = originCountryEl ? originCountryEl.value : '';
    const originCity = originCityEl ? originCityEl.value.trim() : '';

    // Validation
    if (!name) {
        showStatus('❌ Please enter product name', 'error');
        return;
    }
    if (!category) {
        showStatus('❌ Please select product category', 'error');
        return;
    }
    if (!quantity || Number(quantity) <= 0) {
        showStatus('❌ Please enter valid quantity', 'error');
        return;
    }
    if (!originCountry || !originCity) {
        showStatus('❌ Please enter origin location', 'error');
        return;
    }

    // Generate product data
    const uploadDate = new Date();
    const productData = {
        name: name,
        category: category,
        description: description,
        quantity: quantity,
        unit: unit,
        price: price,
        timestamp: uploadDate.getTime()
    };

    const hashCode = generateHashCode(productData);
    const formattedDate = uploadDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const newProduct = {
        id: 'product_' + Date.now(),
        name: name,
        category: category,
        description: description || 'No description provided',
        quantity: parseInt(quantity, 10),
        unit: unit,
        unitDisplay: getUnitDisplayName(unit),
        quantityDisplay: `${quantity} ${getUnitDisplayName(unit)}`,
        price: price ? parseFloat(price).toFixed(2) + ' π' : 'Not specified',
        origin: `${originCity}, ${originCountry}`,
        timestamp: formattedDate,
        uploadDate: uploadDate, // keep as Date object while app is running
        hashCode: hashCode,
        status: 'registered',
        owner: currentUser ? currentUser.username : 'Unknown'
    };

    // Add to products arrays
    userProducts.unshift(newProduct); // add to front for recency
    allProducts.unshift(newProduct);

    // Save to localStorage (serialize Date to ISO string)
    try {
        localStorage.setItem('pi_trace_products', JSON.stringify(userProducts.map(p => {
            const copy = Object.assign({}, p);
            if (copy.uploadDate instanceof Date) copy.uploadDate = copy.uploadDate.toISOString();
            return copy;
        })));
        localStorage.setItem('pi_trace_all_products', JSON.stringify(allProducts.map(p => {
            const copy = Object.assign({}, p);
            if (copy.uploadDate instanceof Date) copy.uploadDate = copy.uploadDate.toISOString();
            return copy;
        })));
    } catch (e) {
        addDebugLog('Error saving to localStorage: ' + e.message);
    }

    // Update UI
    displayProducts();
    closeModal('productModal');

    showStatus('✅ Product registered successfully!', 'success');
    addDebugLog(`📦 Product registered: ${name} (${quantity} ${getUnitDisplayName(unit)})`);

    // Clear form fields
    if (nameEl) nameEl.value = '';
    if (categoryEl) categoryEl.value = '';
    if (descEl) descEl.value = '';
    if (qtyEl) qtyEl.value = '1';
    if (unitEl) unitEl.value = 'pcs';
    if (priceEl) priceEl.value = '';
    if (originCountryEl) originCountryEl.value = '';
    if (originCityEl) originCityEl.value = '';
}

// Display products
function displayProducts() {
    const container = document.getElementById('productsContainer');
    if (!container) return;

    container.innerHTML = '';

    if (!userProducts || userProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>No products registered yet</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Click "Register Product" to add your first product</p>
            </div>
        `;
        return;
    }

    userProducts.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product-item';
        productElement.onclick = () => viewProductDetail(product.id);

        productElement.innerHTML = `
            <div class="product-header">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${product.price}</div>
            </div>
            <div class="product-meta">
                <span><i class="fas fa-tag"></i> ${product.category}</span>
                <span><i class="fas fa-weight-hanging"></i> ${product.quantityDisplay}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${product.origin}</span>
            </div>
            <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8rem; color: var(--gray);">
                    <i class="fas fa-calendar"></i> ${product.timestamp}
                </span>
                <button class="view-detail-btn" onclick="event.stopPropagation(); viewProductDetail('${product.id}')">
                    <i class="fas fa-eye"></i> Details
                </button>
            </div>
        `;
        container.appendChild(productElement);
    });
}

function viewProductDetail(productId) {
    addDebugLog(`🔍 Viewing product details for ID: ${productId}`);
    const product = userProducts.find(p => p.id === productId);
    if (!product) {
        showStatus('❌ Product not found', 'error');
        return;
    }

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    setText('detailProductName', product.name);
    setText('detailCategory', product.category);
    setText('detailQuantity', product.quantityDisplay);
    setText('detailPrice', product.price);
    setText('detailOrigin', product.origin);
    setText('detailDescription', product.description);
    setText('detailUploadDate', product.timestamp);
    setText('detailHashCode', product.hashCode);

    generateSupplyChainTimeline(product);

    const modal = document.getElementById('productDetailModal');
    if (modal) modal.style.display = 'flex';

    showStatus(`🔍 Viewing details for: ${product.name}`, 'info');
}

// Generate a supply chain timeline for a product
function generateSupplyChainTimeline(product) {
    const timelineContainer = document.getElementById('supplyChainTimeline');
    if (!timelineContainer) return;

    timelineContainer.innerHTML = '';

    // Ensure uploadDate is a Date
    let uploadDate = product.uploadDate;
    if (!(uploadDate instanceof Date)) {
        uploadDate = new Date(product.uploadDate || product.timestamp || Date.now());
    }

    const events = [
        {
            date: new Date(uploadDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            title: 'Raw Materials Sourced',
            description: 'Raw materials collected from verified suppliers',
            status: 'completed'
        },
        {
            date: new Date(uploadDate.getTime() - 5 * 24 * 60 * 60 * 1000),
            title: 'Manufacturing Started',
            description: 'Production process initiated at factory facility',
            status: 'completed'
        },
        {
            date: new Date(uploadDate.getTime() - 3 * 24 * 60 * 60 * 1000),
            title: 'Quality Control',
            description: 'Product passed all quality assurance tests',
            status: 'completed'
        },
        {
            date: new Date(uploadDate.getTime() - 1 * 24 * 60 * 60 * 1000),
            title: 'Packaging Completed',
            description: 'Product packaged and prepared for shipment',
            status: 'completed'
        },
        {
            date: uploadDate,
            title: 'Product Registered',
            description: 'Product registered on blockchain network',
            status: 'completed'
        },
        {
            date: new Date(uploadDate.getTime() + 2 * 24 * 60 * 60 * 1000),
            title: 'In Transit',
            description: 'Product shipped to distribution center',
            status: 'pending'
        },
        {
            date: new Date(uploadDate.getTime() + 5 * 24 * 60 * 60 * 1000),
            title: 'Delivery',
            description: 'Scheduled for final delivery to customer',
            status: 'pending'
        }
    ];

    events.forEach(event => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';

        const eventDate = event.date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        timelineItem.innerHTML = `
            <div class="timeline-dot" style="background: ${event.status === 'completed' ? 'var(--success)' : 'var(--gray)'};"></div>
            <div class="timeline-content">
                <div class="timeline-title">${event.title}</div>
                <div class="timeline-date">${eventDate}</div>
                <div style="font-size: 0.85rem; color: var(--gray); margin-top: 4px;">${event.description}</div>
            </div>
            <div class="timeline-status" style="background: ${event.status === 'completed' ? 'var(--success)' : 'var(--warning)'};">
                ${event.status}
            </div>
        `;

        timelineContainer.appendChild(timelineItem);
    });
}

// =====================
// SEARCH
// =====================

function searchProducts() {
    const el = document.getElementById('searchInput');
    const searchTerm = el ? el.value.toLowerCase().trim() : '';
    addDebugLog(`🔍 Searching for: "${searchTerm}"`);

    if (!searchTerm) {
        userProducts = safeLoadProducts('pi_trace_products');
        displayProducts();
        showStatus('🔍 Showing all your products', 'info');
        return;
    }

    const filteredProducts = allProducts.filter(product =>
        (product.name && product.name.toLowerCase().includes(searchTerm)) ||
        (product.category && product.category.toLowerCase().includes(searchTerm)) ||
        (product.description && product.description.toLowerCase().includes(searchTerm)) ||
        (product.origin && product.origin.toLowerCase().includes(searchTerm)) ||
        (product.hashCode && product.hashCode.toLowerCase().includes(searchTerm))
    );

    userProducts = filteredProducts;
    displayProducts();

    if (filteredProducts.length === 0) {
        showStatus('❌ No products found matching your search', 'warning');
    } else {
        showStatus(`✅ Found ${filteredProducts.length} product(s) matching "${searchTerm}"`, 'success');
    }
}

// =====================
// QR SCANNER (SIMULATED)
// =====================

function openQRScanner() {
    addDebugLog('📷 Opening QR code scanner');
    const modal = document.getElementById('qrScannerModal');
    if (modal) modal.style.display = 'flex';
    const qrResult = document.getElementById('qrResult');
    if (qrResult) qrResult.style.display = 'none';
    showStatus('📷 QR Scanner ready - Click "Simulate QR Scan" to test', 'info');
}

function simulateQRScan() {
    addDebugLog('📷 Simulating QR code scan');

    if (userProducts.length > 0) {
        const randomProduct = userProducts[Math.floor(Math.random() * userProducts.length)];
        const scannedHashEl = document.getElementById('scannedHash');
        if (scannedHashEl) scannedHashEl.textContent = randomProduct.hashCode;
        const qrResult = document.getElementById('qrResult');
        if (qrResult) qrResult.style.display = 'block';

        showStatus(`🔍 QR Scan successful! Product: ${randomProduct.name}`, 'success');
        addDebugLog(`📷 QR scan simulated for product: ${randomProduct.name}`);

        setTimeout(() => {
            closeModal('qrScannerModal');
            viewProductDetail(randomProduct.id);
        }, 1500);
    } else {
        showStatus('❌ No products available for QR simulation', 'warning');
    }
}

// =====================
// SUPPLY CHAIN OVERVIEW
// =====================

function showSupplyChainOverview() {
    addDebugLog('📊 Opening supply chain overview');

    const totalProductsEl = document.getElementById('totalProducts');
    const activeShipmentsEl = document.getElementById('activeShipments');
    const completedDeliveriesEl = document.getElementById('completedDeliveries');

    if (totalProductsEl) totalProductsEl.textContent = userProducts.length;
    if (activeShipmentsEl) activeShipmentsEl.textContent = userProducts.filter(p => p.status === 'in_transit').length;
    if (completedDeliveriesEl) completedDeliveriesEl.textContent = userProducts.filter(p => p.status === 'delivered').length;

    const activitiesContainer = document.getElementById('recentActivities');
    if (!activitiesContainer) return;
    activitiesContainer.innerHTML = '';

    const recentProducts = userProducts.slice(0, 5);
    if (recentProducts.length === 0) {
        activitiesContainer.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <i class="fas fa-chart-line"></i>
                <p>No supply chain data yet</p>
            </div>
        `;
    } else {
        recentProducts.forEach(product => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas fa-box"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${product.name} registered</div>
                    <div class="activity-time">${product.timestamp}</div>
                </div>
            `;
            activitiesContainer.appendChild(activityItem);
        });
    }

    const modal = document.getElementById('supplyChainModal');
    if (modal) modal.style.display = 'flex';
    showStatus('📊 Supply chain overview loaded', 'info');
}

// =====================
// PAYMENTS (Pi)
// =====================

async function createPayment() {
    try {
        const isPi = detectPiBrowser();

        if (!isPi) {
            showStatus('💳 Demo: Payment simulation (3.14 π)', 'info');
            setTimeout(() => {
                showStatus('✅ Demo payment processed successfully!', 'success');
            }, 1200);
            return;
        }

        if (!currentUser || currentUser.loginMethod !== 'pi') {
            showStatus('❌ Please login with Pi Wallet to make payments', 'error');
            return;
        }

        if (!pi) {
            throw new Error('Pi SDK not available');
        }

        const paymentData = {
            amount: 3.14,
            memo: 'PI TRACE - Supply Chain Service Fee',
            metadata: {
                product: 'PI TRACE Service',
                user: currentUser.username,
                feature: 'supply_chain_tracking',
                timestamp: Date.now()
            }
        };

        addDebugLog('💰 Creating Pi payment: ' + JSON.stringify(paymentData));
        showStatus('<div class="pi-loading"></div> Processing payment of 3.14 π...', 'info');

        if (typeof pi.createPayment === 'function') {
            await pi.createPayment(paymentData, {
                onReadyForServerApproval: (paymentId) => {
                    addDebugLog('✅ Payment ready for server approval: ' + paymentId);
                    showStatus('⏳ Approving payment...', 'info');
                },
                onReadyForServerCompletion: (paymentId, txid) => {
                    addDebugLog('🎉 Payment ready for completion: ' + paymentId + ', TX: ' + txid);
                    showStatus('✅ Payment completed! Transaction: ' + txid, 'success');
                },
                onCancel: (paymentId) => {
                    addDebugLog('❌ Payment cancelled: ' + paymentId);
                    showStatus('❌ Payment cancelled by user', 'warning');
                },
                onError: (error, paymentId) => {
                    addDebugLog('💥 Payment error: ' + error + ' - ' + paymentId);
                    showStatus('❌ Payment failed: ' + error, 'error');
                }
            });
        } else {
            // SDK fallback: maybe returns a Promise
            if (typeof pi.requestPayment === 'function') {
                await pi.requestPayment(paymentData);
                showStatus('✅ Payment request submitted', 'success');
            } else {
                throw new Error('Pi SDK does not support createPayment/requestPayment in this environment');
            }
        }

    } catch (error) {
        addDebugLog('💥 Payment creation failed: ' + (error && error.message ? error.message : error));
        showStatus('❌ Payment failed: ' + (error && error.message ? error.message : error), 'error');

        if (!detectPiBrowser()) {
            setTimeout(() => {
                showStatus('💳 Demo: Payment of 3.14 π processed successfully!', 'success');
            }, 1200);
        }
    }
}

// =====================
// SETUP & INIT
// =====================

function checkExistingLogin() {
    try {
        const savedUser = localStorage.getItem('pi_trace_user');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            addDebugLog('🔑 Existing user found: ' + currentUser.username);

            // reload products from localStorage and ensure uploadDate restored
            userProducts = safeLoadProducts('pi_trace_products');
            allProducts = safeLoadProducts('pi_trace_all_products');

            showAppSection();
            showStatus('🔄 Restored previous session for ' + currentUser.username, 'info');
        }
    } catch (e) {
        addDebugLog('Error restoring session: ' + e.message);
    }
}

function setupPiBrowserFeatures() {
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
            addDebugLog('📱 App resumed (visibilitychange)');
        }
    });

    if (detectPiBrowser()) {
        document.body.classList.add('pi-browser-optimized');
    }
}

// DOMContentLoaded init
document.addEventListener('DOMContentLoaded', function () {
    addDebugLog('🚀 PI TRACE Application starting...');
    addDebugLog('🌐 User Agent: ' + navigator.userAgent);

    setupPiBrowserFeatures();

    checkExistingLogin();

    // Non-blocking attempt to initialize Pi SDK (won't throw if not present)
    setTimeout(() => {
        initializePiSDK().then(v => {
            addDebugLog('Pi SDK init attempt finished: ' + v);
        });
    }, 500);

    // Wire up search input events if present
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') searchProducts();
        });
        searchInput.addEventListener('input', function () {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                if (this.value.trim()) searchProducts();
            }, 500);
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', function (event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) modal.style.display = 'none';
        });
    });

    addDebugLog('✅ Application initialized successfully');
    showStatus('🚀 PI TRACE Ready! Login to start tracking your supply chain.', 'success');
});

// =====================
// EXPORTS (for onclick HTML handlers)
// =====================
window.loginWithPi = loginWithPi;
window.mockLogin = mockLogin;
window.guestLogin = guestLogin;
window.logout = logout;
window.showProductModal = showProductModal;
window.closeModal = closeModal;
window.submitProduct = submitProduct;
window.viewProductDetail = viewProductDetail;
window.searchProducts = searchProducts;
window.openQRScanner = openQRScanner;
window.simulateQRScan = simulateQRScan;
window.showSupplyChainOverview = showSupplyChainOverview;
window.createPayment = createPayment;
