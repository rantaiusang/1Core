// Pi Network Configuration
const PI_APP_ID = 'pi_trace_app'; // Ganti dengan App ID dari Pi Developer Portal
const PI_API_KEY = 'your_pi_api_key_here'; // Ganti dengan API Key dari Pi Developer Portal

// Global variables
let pi = null;
let currentUser = null;
let products = JSON.parse(localStorage.getItem('pi_trace_products')) || [];

// Initialize Pi SDK dengan error handling
async function initializePiSDK() {
    try {
        addDebugLog('Initializing Pi SDK...');
        
        // Check if Pi SDK is available
        if (typeof window.Pi === 'undefined') {
            addDebugLog('Pi SDK not found, loading from CDN...');
            await loadPiSDK();
        }
        
        pi = window.Pi;
        
        if (!pi) {
            throw new Error('Pi SDK failed to load');
        }
        
        // Initialize Pi SDK
        await pi.init(PI_APP_ID, async function(initResult) {
            addDebugLog('Pi SDK initialized: ' + JSON.stringify(initResult));
            
            if (initResult) {
                // Check if user is already authenticated
                const authenticated = pi.isAuthenticated();
                addDebugLog('User authenticated: ' + authenticated);
                
                if (authenticated) {
                    await handlePiAuthSuccess(initResult.user);
                }
            }
        });
        
        addDebugLog('Pi SDK initialization completed');
    } catch (error) {
        addDebugLog('Pi SDK initialization failed: ' + error.message);
        console.error('Pi SDK Error:', error);
    }
}

// Load Pi SDK from CDN
function loadPiSDK() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://sdk.minepi.com/pi-sdk.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Pi Login Function dengan error handling
async function loginWithPi() {
    try {
        addDebugLog('Starting Pi login process...');
        
        if (!pi) {
            await initializePiSDK();
        }
        
        const scopes = ['username', 'payments', 'wallet_address'];
        addDebugLog('Requesting scopes: ' + scopes.join(', '));
        
        // Authenticate with Pi Network
        const user = await pi.authenticate(scopes, onIncompletePaymentFound);
        addDebugLog('Pi authentication successful: ' + JSON.stringify(user));
        
        await handlePiAuthSuccess(user);
        
    } catch (error) {
        addDebugLog('Pi login failed: ' + error.message);
        showStatus('Pi login failed: ' + error.message, 'error');
        console.error('Pi Login Error:', error);
        
        // Fallback to mock login
        showStatus('Falling back to mock login...', 'warning');
        setTimeout(mockLogin, 2000);
    }
}

// Handle successful Pi authentication
async function handlePiAuthSuccess(user) {
    currentUser = {
        username: user.username,
        uid: user.uid,
        walletAddress: user.walletAddress,
        loginMethod: 'pi'
    };
    
    addDebugLog('User authenticated: ' + user.username);
    showStatus('Welcome back, ' + user.username + '!', 'success');
    
    // Save user data
    localStorage.setItem('pi_trace_user', JSON.stringify(currentUser));
    
    // Show main app
    showAppSection();
}

// Mock login for testing
function mockLogin() {
    currentUser = {
        username: 'pi_tester_' + Math.floor(Math.random() * 1000),
        uid: 'mock_uid_' + Date.now(),
        walletAddress: 'mock_wallet_' + Math.random().toString(36).substr(2, 9),
        loginMethod: 'mock'
    };
    
    addDebugLog('Mock login: ' + currentUser.username);
    showStatus('Mock login successful!', 'success');
    
    localStorage.setItem('pi_trace_user', JSON.stringify(currentUser));
    showAppSection();
}

// Guest login
function guestLogin() {
    currentUser = {
        username: 'Guest_User',
        uid: 'guest_uid',
        walletAddress: null,
        loginMethod: 'guest'
    };
    
    addDebugLog('Guest login');
    showStatus('Welcome as Guest! Some features may be limited.', 'warning');
    
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
        document.getElementById('login-type').textContent = 
            `Authenticated with ${currentUser.loginMethod === 'pi' ? 'Pi Wallet' : 
                                currentUser.loginMethod === 'mock' ? 'Mock Account' : 'Guest Account'}`;
    }
    
    // Show existing products
    displayProducts();
}

// Logout function
function logout() {
    if (pi && currentUser && currentUser.loginMethod === 'pi') {
        pi.logout();
    }
    
    currentUser = null;
    localStorage.removeItem('pi_trace_user');
    
    document.getElementById('app-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    
    addDebugLog('User logged out');
    showStatus('Successfully logged out', 'success');
}

// Product registration modal
function showProductModal() {
    // Generate hash and date
    const hash = generateHashCode();
    const now = new Date().toLocaleString();
    
    document.getElementById('hashCodeDisplay').textContent = hash;
    document.getElementById('uploadDateDisplay').textContent = now;
    
    // Reset form
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productQuantity').value = '1';
    document.getElementById('productUnit').value = 'pcs';
    document.getElementById('productPrice').value = '';
    document.getElementById('originCountry').value = '';
    document.getElementById('originCity').value = '';
    
    document.getElementById('productModal').style.display = 'block';
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Generate unique hash code
function generateHashCode() {
    return 'PT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Submit product
function submitProduct() {
    const product = {
        id: generateHashCode(),
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDescription').value,
        quantity: document.getElementById('productQuantity').value + ' ' + document.getElementById('productUnit').value,
        price: document.getElementById('productPrice').value + ' π',
        origin: document.getElementById('originCountry').value + ', ' + document.getElementById('originCity').value,
        uploadDate: new Date().toLocaleString(),
        hash: generateHashCode(),
        owner: currentUser ? currentUser.username : 'Unknown',
        supplyChain: generateSupplyChainTimeline()
    };
    
    // Validation
    if (!product.name || !product.category || !product.price) {
        showStatus('Please fill in all required fields', 'error');
        return;
    }
    
    products.push(product);
    localStorage.setItem('pi_trace_products', JSON.stringify(products));
    
    closeModal('productModal');
    displayProducts();
    showStatus('Product registered successfully!', 'success');
    
    addDebugLog('New product registered: ' + product.name);
}

// Display products
function displayProducts() {
    const container = document.getElementById('productsContainer');
    const productList = document.getElementById('productList');
    
    if (products.length === 0) {
        productList.style.display = 'none';
        return;
    }
    
    productList.style.display = 'block';
    container.innerHTML = '';
    
    // Filter products by current user if logged in
    const userProducts = currentUser ? 
        products.filter(p => p.owner === currentUser.username) : 
        products;
    
    userProducts.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product-item';
        productElement.onclick = () => showProductDetail(product);
        
        productElement.innerHTML = `
            <div class="product-header">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${product.price}</div>
            </div>
            <div class="product-meta">
                <span>${product.category}</span>
                <span>${product.quantity}</span>
                <span>${product.uploadDate}</span>
            </div>
        `;
        
        container.appendChild(productElement);
    });
}

// Show product detail
function showProductDetail(product) {
    document.getElementById('detailProductName').textContent = product.name;
    document.getElementById('detailCategory').textContent = product.category;
    document.getElementById('detailQuantity').textContent = product.quantity;
    document.getElementById('detailPrice').textContent = product.price;
    document.getElementById('detailOrigin').textContent = product.origin;
    document.getElementById('detailDescription').textContent = product.description;
    document.getElementById('detailUploadDate').textContent = product.uploadDate;
    document.getElementById('detailHashCode').textContent = product.hash;
    
    // Display supply chain timeline
    const timelineContainer = document.getElementById('supplyChainTimeline');
    timelineContainer.innerHTML = '';
    
    if (product.supplyChain) {
        product.supplyChain.forEach(item => {
            const timelineItem = document.createElement('div');
            timelineItem.className = 'timeline-item';
            timelineItem.innerHTML = `
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <div class="timeline-title">${item.event}</div>
                    <div class="timeline-date">${item.date}</div>
                </div>
                <div class="timeline-status">${item.status}</div>
            `;
            timelineContainer.appendChild(timelineItem);
        });
    }
    
    document.getElementById('productDetailModal').style.display = 'block';
}

// Generate supply chain timeline
function generateSupplyChainTimeline() {
    const now = new Date();
    return [
        {
            event: 'Product Registered',
            date: now.toLocaleString(),
            status: 'Completed'
        },
        {
            event: 'Quality Check',
            date: new Date(now.getTime() + 2 * 60 * 60 * 1000).toLocaleString(),
            status: 'Pending'
        },
        {
            event: 'Warehouse Storage',
            date: new Date(now.getTime() + 4 * 60 * 60 * 1000).toLocaleString(),
            status: 'Pending'
        },
        {
            event: 'Shipping',
            date: new Date(now.getTime() + 8 * 60 * 60 * 1000).toLocaleString(),
            status: 'Pending'
        },
        {
            event: 'Delivery',
            date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleString(),
            status: 'Pending'
        }
    ];
}

// Create Pi payment
async function createPayment() {
    try {
        if (!currentUser || currentUser.loginMethod !== 'pi') {
            showStatus('Please login with Pi Wallet to make payments', 'error');
            return;
        }
        
        if (!pi) {
            await initializePiSDK();
        }
        
        const paymentData = {
            amount: 3.14,
            memo: 'Payment for PI TRACE Service - Supply Chain Tracking',
            metadata: {
                product: 'PI TRACE Service',
                user: currentUser.username,
                timestamp: Date.now()
            }
        };
        
        addDebugLog('Creating payment: ' + JSON.stringify(paymentData));
        
        const payment = await pi.createPayment(paymentData, {
            onReadyForServerApproval: (paymentId) => {
                addDebugLog('Payment ready for approval: ' + paymentId);
                showStatus('Payment processing...', 'info');
            },
            onReadyForServerCompletion: (paymentId, txid) => {
                addDebugLog('Payment ready for completion: ' + paymentId);
                showStatus('Payment completed! TXID: ' + txid, 'success');
            },
            onCancel: (paymentId) => {
                addDebugLog('Payment cancelled: ' + paymentId);
                showStatus('Payment cancelled', 'warning');
            },
            onError: (error, paymentId) => {
                addDebugLog('Payment error: ' + error + ' - ' + paymentId);
                showStatus('Payment failed: ' + error, 'error');
            }
        });
        
    } catch (error) {
        addDebugLog('Payment creation failed: ' + error.message);
        showStatus('Payment failed: ' + error.message, 'error');
        console.error('Payment Error:', error);
    }
}

// Handle incomplete payments
function onIncompletePaymentFound(payment) {
    addDebugLog('Incomplete payment found: ' + JSON.stringify(payment));
    // Implement your logic to handle incomplete payments
}

// Search products
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
    );
    
    // Update display with filtered products
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';
    
    filteredProducts.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product-item';
        productElement.onclick = () => showProductDetail(product);
        
        productElement.innerHTML = `
            <div class="product-header">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${product.price}</div>
            </div>
            <div class="product-meta">
                <span>${product.category}</span>
                <span>${product.quantity}</span>
                <span>${product.uploadDate}</span>
            </div>
        `;
        
        container.appendChild(productElement);
    });
}

// QR Code scanning (mock implementation)
function scanQRCode() {
    showStatus('QR Code scanner would open here. This is a mock implementation.', 'info');
    addDebugLog('QR Code scanning triggered');
    
    // In real implementation, this would open camera for QR scanning
    setTimeout(() => {
        showStatus('QR Code scanned successfully! Product data loaded.', 'success');
    }, 2000);
}

// Debug logging
function addDebugLog(message) {
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        const logItem = document.createElement('div');
        logItem.className = 'debug-item';
        logItem.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
        debugPanel.appendChild(logItem);
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }
    console.log('PI TRACE:', message);
}

// Status messages
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    statusDiv.className = `status-${type}`;
    statusDiv.style.display = 'block';
    
    // Create styles for status messages if they don't exist
    if (!document.querySelector('#status-styles')) {
        const style = document.createElement('style');
        style.id = 'status-styles';
        style.textContent = `
            #status {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 600;
                z-index: 10000;
                max-width: 90%;
                text-align: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            .status-success { background: var(--success); }
            .status-error { background: var(--danger); }
            .status-warning { background: var(--warning); }
            .status-info { background: var(--secondary); }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Check if user is already logged in on page load
function checkExistingLogin() {
    const savedUser = localStorage.getItem('pi_trace_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        addDebugLog('Existing user found: ' + currentUser.username);
        showAppSection();
    }
}

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    addDebugLog('PI TRACE Application starting...');
    addDebugLog('User Agent: ' + navigator.userAgent);
    
    // Check for existing login
    checkExistingLogin();
    
    // Initialize Pi SDK
    initializePiSDK();
    
    // Add event listener for Enter key in search
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchProducts();
        }
    });
    
    addDebugLog('Application initialized successfully');
});

// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
};
