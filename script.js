// =============================================
// PI BROWSER OPTIMIZED VERSION
// =============================================

// Pi Network Configuration
const PI_APP_ID = 'pi_trace_app'; // Ganti dengan App ID dari Pi Developer Portal

// Global variables
let pi = null;
let currentUser = null;
let userProducts = JSON.parse(localStorage.getItem('pi_trace_products')) || [];
let allProducts = JSON.parse(localStorage.getItem('pi_trace_all_products')) || [];

// Pi Browser Detection
function detectPiBrowser() {
    const isPiBrowser = navigator.userAgent.includes('PiBrowser') || 
                       window.location.protocol === 'pi:' ||
                       /PiBrowser/i.test(navigator.userAgent);
    
    if (isPiBrowser) {
        document.documentElement.classList.add('pi-browser');
        document.body.classList.add('pi-browser');
        addDebugLog('🌐 Pi Browser detected - Enabling Pi-specific features');
    }
    
    return isPiBrowser;
}

// Load Pi SDK dynamically
function loadPiSDK() {
    return new Promise((resolve, reject) => {
        if (window.Pi) {
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
        
        script.onerror = () => {
            addDebugLog('❌ Pi SDK failed to load');
            reject(new Error('Failed to load Pi SDK'));
        };
        
        document.head.appendChild(script);
    });
}

// Initialize Pi SDK dengan Pi Browser support
async function initializePiSDK() {
    try {
        addDebugLog('🚀 Initializing Pi SDK...');
        
        const isPiBrowser = detectPiBrowser();
        
        // Check if Pi SDK is available
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
            throw new Error('Pi SDK not available');
        }
        
        // Initialize Pi SDK dengan error handling
        await new Promise((resolve, reject) => {
            pi.init(PI_APP_ID, (initResult) => {
                if (initResult) {
                    addDebugLog('✅ Pi SDK initialized: ' + JSON.stringify(initResult));
                    
                    if (pi.isAuthenticated()) {
                        addDebugLog('🔑 User already authenticated with Pi Network');
                        handlePiAuthSuccess(initResult);
                    }
                    
                    resolve(initResult);
                } else {
                    reject(new Error('Pi SDK initialization failed'));
                }
            });
        });
        
        return true;
    } catch (error) {
        addDebugLog('❌ Pi SDK initialization failed: ' + error.message);
        console.error('Pi SDK Error:', error);
        return false;
    }
}

// Enhanced Pi Login Function untuk Pi Browser
async function loginWithPi() {
    try {
        addDebugLog('🔄 Starting Pi login process...');
        
        const isPiBrowser = detectPiBrowser();
        
        if (!isPiBrowser) {
            showStatus('❌ Please open in Pi Browser to login with Pi Wallet', 'error');
            // Fallback lebih cepat untuk non-Pi Browser
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
        
        const scopes = ['username', 'payments', 'wallet_address'];
        addDebugLog('Requesting scopes: ' + scopes.join(', '));
        
        // Authenticate with Pi Network
        const authResult = await pi.authenticate(scopes, onIncompletePaymentFound);
        
        if (!authResult) {
            throw new Error('No authentication response received');
        }
        
        addDebugLog('✅ Pi authentication successful');
        await handlePiAuthSuccess(authResult);
        
    } catch (error) {
        addDebugLog('❌ Pi login failed: ' + error.message);
        
        if (error.message.includes('user cancelled') || error.message.includes('User denied')) {
            showStatus('❌ Login cancelled by user', 'warning');
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
            showStatus('🌐 Network error - Please check your connection', 'error');
        } else {
            showStatus('❌ Pi login failed: ' + error.message, 'error');
        }
        
        // Fallback to mock login
        setTimeout(() => {
            if (!currentUser) {
                showStatus('🔄 Falling back to demo mode...', 'warning');
                mockLogin();
            }
        }, 3000);
    }
}

// Handle successful Pi authentication
async function handlePiAuthSuccess(authResult) {
    if (!authResult) {
        throw new Error('No authentication result received');
    }
    
    // Get user information from Pi Network
    const user = authResult.user;
    currentUser = {
        username: user.username || 'Pi User',
        uid: user.uid,
        walletAddress: user.walletAddress,
        loginMethod: 'pi'
    };
    
    addDebugLog('✅ User authenticated: ' + currentUser.username);
    showStatus('🎉 Welcome to PI TRACE, ' + currentUser.username + '!', 'success');
    
    // Save user data
    localStorage.setItem('pi_trace_user', JSON.stringify(currentUser));
    
    // Show main app
    showAppSection();
}

// Mock login for testing
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

// Show main application section
function showAppSection() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    
    // Update user info
    if (currentUser) {
        document.getElementById('username').textContent = currentUser.username;
        const loginTypeElement = document.getElementById('login-type');
        
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
    
    // Display products
    displayProducts();
}

// Logout function
function logout() {
    if (pi && currentUser && currentUser.loginMethod === 'pi') {
        try {
            pi.logout();
            addDebugLog('🔒 Pi Network logout completed');
        } catch (error) {
            addDebugLog('⚠️ Pi logout error: ' + error.message);
        }
    }
    
    currentUser = null;
    localStorage.removeItem('pi_trace_user');
    
    document.getElementById('app-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    
    // Clear search
    document.getElementById('searchInput').value = '';
    
    showStatus('✅ Logout successful', 'success');
    addDebugLog('👤 User logged out');
}

// Product registration modal
function showProductModal() {
    addDebugLog('📝 Opening product registration modal');
    
    // Generate initial preview
    updateProductPreview();
    
    document.getElementById('productModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Update product preview with date and hash
function updateProductPreview() {
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    
    const now = new Date();
    const uploadDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('uploadDateDisplay').textContent = uploadDate;
    
    if (name || category) {
        const productData = {
            name: name,
            category: category,
            timestamp: now.getTime()
        };
        document.getElementById('hashCodeDisplay').textContent = generateHashCode(productData);
    } else {
        document.getElementById('hashCodeDisplay').textContent = 'Will be generated after input';
    }
}

// Generate unique hash code
function generateHashCode(productData) {
    const dataString = `${productData.name}_${productData.category}_${productData.timestamp}_${Math.random()}`;
    let hash = 0;
    
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return `PITRACE_${Math.abs(hash).toString(16).toUpperCase().substr(0, 12)}`;
}

// Get unit display name
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

// Submit product registration
function submitProduct() {
    addDebugLog('📦 Submitting product registration...');
    
    // Get form values
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const description = document.getElementById('productDescription').value.trim();
    const quantity = document.getElementById('productQuantity').value;
    const unit = document.getElementById('productUnit').value;
    const price = document.getElementById('productPrice').value;
    const originCountry = document.getElementById('originCountry').value;
    const originCity = document.getElementById('originCity').value.trim();
    
    // Validation
    if (!name) {
        showStatus('❌ Please enter product name', 'error');
        return;
    }
    
    if (!category) {
        showStatus('❌ Please select product category', 'error');
        return;
    }
    
    if (!quantity || quantity <= 0) {
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
    
    // Create new product object
    const newProduct = {
        id: 'product_' + Date.now(),
        name: name,
        category: category,
        description: description || 'No description provided',
        quantity: parseInt(quantity),
        unit: unit,
        unitDisplay: getUnitDisplayName(unit),
        quantityDisplay: `${quantity} ${getUnitDisplayName(unit)}`,
        price: price ? parseFloat(price).toFixed(2) + ' π' : 'Not specified',
        origin: `${originCity}, ${originCountry}`,
        timestamp: formattedDate,
        uploadDate: uploadDate,
        hashCode: hashCode,
        status: 'registered',
        owner: currentUser ? currentUser.username : 'Unknown'
    };

    // Add to products arrays
    userProducts.push(newProduct);
    allProducts.push(newProduct);
    
    // Save to localStorage
    localStorage.setItem('pi_trace_products', JSON.stringify(userProducts));
    localStorage.setItem('pi_trace_all_products', JSON.stringify(allProducts));
    
    // Update UI
    displayProducts();
    closeModal('productModal');
    
    // Show success message
    showStatus('✅ Product registered successfully!', 'success');
    addDebugLog(`📦 Product registered: ${name} (${quantity} ${getUnitDisplayName(unit)})`);
    
    // Clear form
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productQuantity').value = '1';
    document.getElementById('productUnit').value = 'pcs';
    document.getElementById('productPrice').value = '';
    document.getElementById('originCountry').value = '';
    document.getElementById('originCity').value = '';
}

// Display products in the list
function displayProducts() {
    const container = document.getElementById('productsContainer');
    const productList = document.getElementById('productList');
    
    if (!container) return;
    
    container.innerHTML = '';

    if (userProducts.length === 0) {
        // Show empty state
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>No products registered yet</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Click "Register Product" to add your first product</p>
            </div>
        `;
        return;
    }

    // Show product list
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

// View product detail
function viewProductDetail(productId) {
    addDebugLog(`🔍 Viewing product details for ID: ${productId}`);
    const product = userProducts.find(p => p.id === productId);
    
    if (!product) {
        showStatus('❌ Product not found', 'error');
        return;
    }

    // Populate modal with product data
    document.getElementById('detailProductName').textContent = product.name;
    document.getElementById('detailCategory').textContent = product.category;
    document.getElementById('detailQuantity').textContent = product.quantityDisplay;
    document.getElementById('detailPrice').textContent = product.price;
    document.getElementById('detailOrigin').textContent = product.origin;
    document.getElementById('detailDescription').textContent = product.description;
    document.getElementById('detailUploadDate').textContent = product.timestamp;
    document.getElementById('detailHashCode').textContent = product.hashCode;

    // Generate supply chain timeline
    generateSupplyChainTimeline(product);

    // Show modal
    document.getElementById('productDetailModal').style.display = 'flex';
    
    showStatus(`🔍 Viewing details for: ${product.name}`, 'info');
}

// Generate supply chain timeline for a product
function generateSupplyChainTimeline(product) {
    const timelineContainer = document.getElementById('supplyChainTimeline');
    timelineContainer.innerHTML = '';

    const events = [
        {
            date: new Date(product.uploadDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            title: 'Raw Materials Sourced',
            description: 'Raw materials collected from verified suppliers',
            status: 'completed',
            icon: 'fas fa-boxes'
        },
        {
            date: new Date(product.uploadDate.getTime() - 5 * 24 * 60 * 60 * 1000),
            title: 'Manufacturing Started',
            description: 'Production process initiated at factory facility',
            status: 'completed',
            icon: 'fas fa-industry'
        },
        {
            date: new Date(product.uploadDate.getTime() - 3 * 24 * 60 * 60 * 1000),
            title: 'Quality Control',
            description: 'Product passed all quality assurance tests',
            status: 'completed',
            icon: 'fas fa-clipboard-check'
        },
        {
            date: new Date(product.uploadDate.getTime() - 1 * 24 * 60 * 60 * 1000),
            title: 'Packaging Completed',
            description: 'Product packaged and prepared for shipment',
            status: 'completed',
            icon: 'fas fa-box'
        },
        {
            date: product.uploadDate,
            title: 'Product Registered',
            description: 'Product registered on blockchain network',
            status: 'completed',
            icon: 'fas fa-link'
        },
        {
            date: new Date(product.uploadDate.getTime() + 2 * 24 * 60 * 60 * 1000),
            title: 'In Transit',
            description: 'Product shipped to distribution center',
            status: 'pending',
            icon: 'fas fa-shipping-fast'
        },
        {
            date: new Date(product.uploadDate.getTime() + 5 * 24 * 60 * 60 * 1000),
            title: 'Delivery',
            description: 'Scheduled for final delivery to customer',
            status: 'pending',
            icon: 'fas fa-truck'
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

// Search functionality
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    addDebugLog(`🔍 Searching for: "${searchTerm}"`);
    
    if (!searchTerm) {
        // Reset to show all user products
        userProducts = JSON.parse(localStorage.getItem('pi_trace_products')) || [];
        displayProducts();
        showStatus('🔍 Showing all your products', 'info');
        return;
    }
    
    // Filter products based on search term
    const filteredProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.origin.toLowerCase().includes(searchTerm) ||
        product.hashCode.toLowerCase().includes(searchTerm)
    );
    
    userProducts = filteredProducts;
    displayProducts();
    
    if (filteredProducts.length === 0) {
        showStatus('❌ No products found matching your search', 'warning');
    } else {
        showStatus(`✅ Found ${filteredProducts.length} product(s) matching "${searchTerm}"`, 'success');
    }
}

// QR Code Scanner Function
function openQRScanner() {
    addDebugLog('📷 Opening QR code scanner');
    document.getElementById('qrScannerModal').style.display = 'flex';
    document.getElementById('qrResult').style.display = 'none';
    showStatus('📷 QR Scanner ready - Click "Simulate QR Scan" to test', 'info');
}

function simulateQRScan() {
    addDebugLog('📷 Simulating QR code scan');
    
    // Simulate scanning a product QR code
    if (userProducts.length > 0) {
        const randomProduct = userProducts[Math.floor(Math.random() * userProducts.length)];
        document.getElementById('scannedHash').textContent = randomProduct.hashCode;
        document.getElementById('qrResult').style.display = 'block';
        
        showStatus(`🔍 QR Scan successful! Product: ${randomProduct.name}`, 'success');
        addDebugLog(`📷 QR scan simulated for product: ${randomProduct.name}`);
        
        // Auto-close after 3 seconds and show product details
        setTimeout(() => {
            closeModal('qrScannerModal');
            viewProductDetail(randomProduct.id);
        }, 3000);
    } else {
        showStatus('❌ No products available for QR simulation', 'warning');
    }
}

// Supply Chain Overview
function showSupplyChainOverview() {
    addDebugLog('📊 Opening supply chain overview');
    
    // Update statistics
    document.getElementById('totalProducts').textContent = userProducts.length;
    document.getElementById('activeShipments').textContent = userProducts.filter(p => p.status === 'in_transit').length;
    document.getElementById('completedDeliveries').textContent = userProducts.filter(p => p.status === 'delivered').length;
    
    // Populate recent activities
    const activitiesContainer = document.getElementById('recentActivities');
    activitiesContainer.innerHTML = '';
    
    const recentProducts = userProducts.slice(0, 5); // Show last 5 products
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
    
    if (recentProducts.length === 0) {
        activitiesContainer.innerHTML = `
            <div class="empty-state" style="padding: 20px;">
                <i class="fas fa-chart-line"></i>
                <p>No supply chain data yet</p>
            </div>
        `;
    }
    
    document.getElementById('supplyChainModal').style.display = 'flex';
    showStatus('📊 Supply chain overview loaded', 'info');
}

// Create Pi Payment dengan Pi Browser support
async function createPayment() {
    try {
        const isPiBrowser = detectPiBrowser();
        
        if (!isPiBrowser) {
            showStatus('💳 Demo: Payment simulation (3.14 π)', 'info');
            setTimeout(() => {
                showStatus('✅ Demo payment processed successfully!', 'success');
            }, 2000);
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
        
        const payment = await pi.createPayment(paymentData, {
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
        
    } catch (error) {
        addDebugLog('💥 Payment creation failed: ' + error.message);
        showStatus('❌ Payment failed: ' + error.message, 'error');
        
        // Fallback untuk demo purposes
        if (!detectPiBrowser()) {
            setTimeout(() => {
                showStatus('💳 Demo: Payment of 3.14 π processed successfully!', 'success');
            }, 2000);
        }
    }
}

// Handle incomplete payments
function onIncompletePaymentFound(payment) {
    addDebugLog('⚠️ Incomplete payment found: ' + JSON.stringify(payment));
    showStatus('⚠️ Found incomplete payment - Please check your transactions', 'warning');
}

// Enhanced debug logging untuk Pi Browser
function addDebugLog(message) {
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString() + '.' + now.getMilliseconds().toString().padStart(3, '0');
        
        const logItem = document.createElement('div');
        logItem.className = 'debug-item';
        
        // Add emoji based on message type
        let emoji = '💬';
        if (message.includes('✅') || message.includes('success')) emoji = '✅';
        if (message.includes('❌') || message.includes('error')) emoji = '❌';
        if (message.includes('⚠️') || message.includes('warning')) emoji = '⚠️';
        if (message.includes('🚀')) emoji = '🚀';
        if (message.includes('🔑')) emoji = '🔑';
        if (message.includes('💰')) emoji = '💰';
        if (message.includes('🌐')) emoji = '🌐';
        if (message.includes('📝')) emoji = '📝';
        if (message.includes('📦')) emoji = '📦';
        if (message.includes('🔍')) emoji = '🔍';
        if (message.includes('📷')) emoji = '📷';
        if (message.includes('📊')) emoji = '📊';
        if (message.includes('🧪')) emoji = '🧪';
        if (message.includes('👤')) emoji = '👤';
        if (message.includes('🔒')) emoji = '🔒';
        if (message.includes('🎉')) emoji = '🎉';
        if (message.includes('💥')) emoji = '💥';
        
        logItem.innerHTML = `<span style="opacity:0.7">[${timestamp}]</span> ${emoji} ${message}`;
        
        // Limit debug items untuk performance Pi Browser
        const maxItems = 20;
        const items = debugPanel.getElementsByClassName('debug-item');
        if (items.length >= maxItems) {
            debugPanel.removeChild(items[0]);
        }
        
        debugPanel.appendChild(logItem);
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }
    
    console.log(`[PI-TRACE] ${message}`);
}

// Status messages
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;
    
    const statusElement = document.createElement('div');
    statusElement.className = `status-message status-${type}`;
    statusElement.innerHTML = message;
    
    statusDiv.appendChild(statusElement);
    
    // Auto-remove after 5 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            if (statusElement.parentNode) {
                statusElement.remove();
            }
        }, 5000);
    }
}

// Check if user is already logged in on page load
function checkExistingLogin() {
    const savedUser = localStorage.getItem('pi_trace_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        addDebugLog('🔑 Existing user found: ' + currentUser.username);
        
        // Load user's products
        userProducts = JSON.parse(localStorage.getItem('pi_trace_products')) || [];
        allProducts = JSON.parse(localStorage.getItem('pi_trace_all_products')) || [];
        
        showAppSection();
        showStatus('🔄 Restored previous session for ' + currentUser.username, 'info');
    }
}

// Pi Browser specific setup
function setupPiBrowserFeatures() {
    // Add Pi Browser specific event listeners
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            addDebugLog('📱 App resumed in Pi Browser');
        }
    });
    
    // Handle Pi Browser specific behaviors
    if (detectPiBrowser()) {
        // Optimize for Pi Browser
        document.body.classList.add('pi-browser-optimized');
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    addDebugLog('🚀 PI TRACE Application starting...');
    addDebugLog('🌐 User Agent: ' + navigator.userAgent);
    
    // Setup Pi Browser features
    setupPiBrowserFeatures();
    
    // Check for existing login
    checkExistingLogin();
    
    // Initialize Pi SDK (non-blocking)
    setTimeout(() => {
        initializePiSDK();
    }, 1000);
    
    // Add event listeners
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchProducts();
            }
        });
        
        // Real-time search untuk Pi Browser
        searchInput.addEventListener('input', function() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                if (this.value.trim()) {
                    searchProducts();
                }
            }, 500);
        });
    }
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    addDebugLog('✅ Application initialized successfully');
    showStatus('🚀 PI TRACE Ready! Login to start tracking your supply chain.', 'success');
});

// Export functions for global access (untuk HTML onclick)
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
