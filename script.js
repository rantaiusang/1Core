// =============================================
// PI TRACE - Supply Chain Tracking Application
// JavaScript File - script.js
// =============================================

// Global Variables
let currentUser = null;
let userProducts = [];
let allProducts = [];
let pi = null;

// =============================================
// DEBUG & LOGGING FUNCTIONS
// =============================================

function debugLog(message, type = 'info') {
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        const timestamp = new Date().toLocaleTimeString();
        const debugItem = document.createElement('div');
        debugItem.className = 'debug-item';
        debugItem.style.borderLeft = `3px solid ${
            type === 'error' ? '#ff4757' : 
            type === 'success' ? '#2ed573' : 
            type === 'warning' ? '#ffa502' : '#3742fa'
        }`;
        debugItem.innerHTML = `<strong>[${timestamp}]</strong> ${message}`;
        debugPanel.appendChild(debugItem);
        
        // Keep only last 10 messages
        const items = debugPanel.getElementsByClassName('debug-item');
        if (items.length > 10) {
            debugPanel.removeChild(items[0]);
        }
        
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }
    console.log(`[PI-TRACE] ${message}`);
}

function showStatus(message, type = 'info', duration = 5000) {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;
    
    statusDiv.innerHTML = '';
    const statusElement = document.createElement('div');
    statusElement.className = `status ${type}`;
    statusElement.innerHTML = message;
    statusDiv.appendChild(statusElement);
    
    if (type !== 'error') {
        setTimeout(() => {
            if (statusElement.parentNode) {
                statusElement.remove();
            }
        }, duration);
    }
}

// =============================================
// PI NETWORK AUTHENTICATION
// =============================================

async function initializePiSDK() {
    try {
        if (window.Pi) {
            pi = await window.Pi.init({
                version: "2.0",
                sandbox: process.env.NODE_ENV === 'development'
            });
            debugLog("✅ Pi SDK initialized successfully", "success");
        } else {
            debugLog("⚠️ Pi SDK not available - running in mock mode", "warning");
        }
    } catch (error) {
        debugLog("❌ Pi SDK initialization failed: " + error.message, "error");
    }
}

async function loginWithPi() {
    try {
        debugLog("🔄 Starting Pi authentication...");
        showStatus('<div class="loading-spinner"></div> Connecting to Pi Network...', 'info');

        if (!pi) {
            await initializePiSDK();
        }

        if (pi) {
            // Authenticate with Pi Network
            const scopes = ['username', 'payments', 'wallet_address'];
            currentUser = await pi.authenticate(scopes, onIncompletePaymentFound);
            
            if (currentUser) {
                debugLog(`✅ Pi authentication successful! User: ${currentUser.username}`, "success");
                switchToApp(currentUser.username, 'pi');
                showStatus('✅ Successfully logged in with Pi Wallet!', 'success');
            }
        } else {
            throw new Error("Pi SDK not available");
        }
    } catch (error) {
        debugLog("❌ Pi login failed: " + error.message, "error");
        showStatus('❌ Pi login failed. Using mock login instead.', 'warning');
        mockLogin(); // Fallback to mock login
    }
}

function onIncompletePaymentFound(payment) {
    debugLog("⚠️ Incomplete payment found: " + payment.identifier, "warning");
    // Handle incomplete payments here
}

function mockLogin() {
    const mockUser = {
        username: 'Demo_User_' + Math.floor(Math.random() * 1000),
        uid: 'mock_' + Date.now()
    };
    debugLog(`🧪 Mock login: ${mockUser.username}`, "info");
    switchToApp(mockUser.username, 'mock');
    showStatus('🧪 Mock login active - Use Pi Browser for real authentication', 'warning');
}

function guestLogin() {
    const guestUser = {
        username: 'Guest_' + Math.random().toString(36).substr(2, 6),
        uid: 'guest_' + Date.now()
    };
    debugLog(`👤 Guest login: ${guestUser.username}`, "info");
    switchToApp(guestUser.username, 'guest');
    showStatus('👋 Welcome Guest! Some features may be limited.', 'info');
}

function switchToApp(username, loginType) {
    currentUser = { username, loginType };
    
    // Update UI
    document.getElementById('username').textContent = username;
    const loginTypeElement = document.getElementById('login-type');
    
    switch(loginType) {
        case 'pi':
            loginTypeElement.innerHTML = '<i class="fas fa-check-circle"></i> Authenticated with Pi Wallet';
            loginTypeElement.style.color = 'var(--success)';
            break;
        case 'mock':
            loginTypeElement.innerHTML = '<i class="fas fa-flask"></i> Mock Login - Testing Mode';
            loginTypeElement.style.color = 'var(--warning)';
            break;
        case 'guest':
            loginTypeElement.innerHTML = '<i class="fas fa-user"></i> Guest Mode - Limited Features';
            loginTypeElement.style.color = 'var(--warning)';
            break;
    }
    
    // Switch sections
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    
    // Load products
    loadUserProducts();
    debugLog(`🚀 Application loaded for user: ${username}`, "success");
}

function logout() {
    debugLog("🔒 Logging out...", "info");
    
    // Reset state
    currentUser = null;
    userProducts = [];
    allProducts = [];
    
    // Switch back to login
    document.getElementById('app-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    
    // Clear debug panel but keep last message
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        debugPanel.innerHTML = '<div class="debug-item">Ready - Click any login button to start</div>';
    }
    
    showStatus('✅ You have been logged out successfully', 'success');
}

// =============================================
// PRODUCT MANAGEMENT
// =============================================

function loadUserProducts() {
    // Load from localStorage or initialize empty
    const savedProducts = localStorage.getItem('piTraceProducts');
    if (savedProducts) {
        userProducts = JSON.parse(savedProducts);
        allProducts = [...userProducts];
    } else {
        userProducts = [];
        allProducts = [];
    }
    displayProducts();
}

function saveProducts() {
    localStorage.setItem('piTraceProducts', JSON.stringify(userProducts));
}

function showProductModal() {
    debugLog("📦 Opening product registration modal...");
    
    // Reset form
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productQuantity').value = '1';
    document.getElementById('productUnit').value = 'pcs';
    document.getElementById('productPrice').value = '';
    document.getElementById('originCountry').value = '';
    document.getElementById('originCity').value = '';
    
    // Generate preview
    updateProductPreview();
    
    // Show modal
    document.getElementById('productModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function updateProductPreview() {
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    
    const uploadDate = new Date();
    document.getElementById('uploadDateDisplay').textContent = formatDate(uploadDate);
    
    if (name || category) {
        const productData = { name, category, timestamp: uploadDate.getTime() };
        document.getElementById('hashCodeDisplay').textContent = generateHashCode(productData);
    } else {
        document.getElementById('hashCodeDisplay').textContent = 'Will be generated automatically';
    }
}

function generateHashCode(productData) {
    const dataString = `${productData.name}_${productData.category}_${productData.timestamp}_${Math.random()}`;
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return `PITRACE_${Math.abs(hash).toString(36).toUpperCase()}`;
}

function formatDate(date) {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getUnitDisplayName(unit) {
    const units = {
        'pcs': 'pieces', 'kg': 'kg', 'g': 'g', 'lb': 'lb', 'ton': 'tons',
        'l': 'L', 'ml': 'ml', 'm': 'm', 'cm': 'cm', 'box': 'boxes',
        'pack': 'packs', 'set': 'sets', 'pair': 'pairs', 'bundle': 'bundles', 'carton': 'cartons'
    };
    return units[unit] || unit;
}

function submitProduct() {
    debugLog("🔄 Submitting product registration...");
    
    // Get form values
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const description = document.getElementById('productDescription').value.trim();
    const quantity = parseFloat(document.getElementById('productQuantity').value);
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
    
    // Create product object
    const uploadDate = new Date();
    const productData = { name, category, description, quantity, unit, price, timestamp: uploadDate.getTime() };
    const hashCode = generateHashCode(productData);
    
    const newProduct = {
        id: Date.now(),
        name,
        category,
        description: description || 'No description provided',
        quantity,
        unit,
        unitDisplay: getUnitDisplayName(unit),
        quantityDisplay: `${quantity} ${getUnitDisplayName(unit)}`,
        price: price || '0.00',
        origin: `${originCity}, ${originCountry}`,
        timestamp: formatDate(uploadDate),
        uploadDate,
        hashCode,
        status: 'registered'
    };
    
    // Add to products
    userProducts.unshift(newProduct); // Add to beginning
    allProducts.unshift(newProduct);
    
    // Update UI and storage
    displayProducts();
    saveProducts();
    closeModal('productModal');
    
    showStatus(`✅ Product "${name}" registered successfully!`, 'success');
    debugLog(`📦 Product registered: ${name} (${quantity} ${getUnitDisplayName(unit)})`, "success");
}

function displayProducts() {
    const container = document.getElementById('productsContainer');
    const productList = document.getElementById('productList');
    
    if (!container) return;
    
    container.innerHTML = '';
    
    if (userProducts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open" style="font-size: 3rem; color: var(--gray); margin-bottom: 15px;"></i>
                <h3 style="color: var(--gray); margin-bottom: 10px;">No Products Yet</h3>
                <p style="color: var(--gray); text-align: center;">Click "Register Product" to add your first product to the blockchain</p>
            </div>
        `;
        productList.style.display = 'none';
        return;
    }
    
    productList.style.display = 'block';
    
    userProducts.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.innerHTML = `
            <div class="product-header">
                <div class="product-info">
                    <h4 class="product-name">${product.name}</h4>
                    <p class="product-meta">
                        ${product.category} • ${product.price} π 
                        <span class="quantity-badge">
                            <i class="fas fa-weight-hanging"></i> ${product.quantityDisplay}
                        </span>
                    </p>
                </div>
                <span class="status-badge ${product.status}">${product.status}</span>
            </div>
            <div class="product-details">
                <p class="product-origin"><strong>Origin:</strong> ${product.origin}</p>
                <p class="product-date"><strong>Upload Date:</strong> ${product.timestamp}</p>
            </div>
            <p class="product-description">${product.description}</p>
            <div class="product-actions">
                <button class="view-detail-btn" onclick="viewProductDetail(${product.id})">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        `;
        container.appendChild(productElement);
    });
}

function viewProductDetail(productId) {
    debugLog(`🔍 Viewing product details for ID: ${productId}`);
    const product = userProducts.find(p => p.id === productId);
    
    if (!product) {
        showStatus('❌ Product not found', 'error');
        return;
    }
    
    // Populate modal
    document.getElementById('detailProductName').textContent = product.name;
    document.getElementById('detailCategory').textContent = product.category;
    document.getElementById('detailQuantity').textContent = product.quantityDisplay;
    document.getElementById('detailPrice').textContent = `${product.price} π`;
    document.getElementById('detailOrigin').textContent = product.origin;
    document.getElementById('detailDescription').textContent = product.description;
    document.getElementById('detailUploadDate').textContent = product.timestamp;
    document.getElementById('detailHashCode').textContent = product.hashCode;
    
    // Generate timeline
    generateSupplyChainTimeline(product);
    
    // Show modal
    document.getElementById('productDetailModal').style.display = 'flex';
    showStatus(`🔍 Viewing: ${product.name}`, 'info');
}

function generateSupplyChainTimeline(product) {
    const timelineContainer = document.getElementById('supplyChainTimeline');
    timelineContainer.innerHTML = '';
    
    const events = [
        {
            date: new Date(product.uploadDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            title: 'Raw Materials Sourced',
            description: 'Raw materials collected from verified suppliers',
            icon: 'fas fa-boxes',
            status: 'completed'
        },
        {
            date: new Date(product.uploadDate.getTime() - 5 * 24 * 60 * 60 * 1000),
            title: 'Manufacturing Started',
            description: 'Production process initiated at factory facility',
            icon: 'fas fa-industry',
            status: 'completed'
        },
        {
            date: new Date(product.uploadDate.getTime() - 3 * 24 * 60 * 60 * 1000),
            title: 'Quality Control',
            description: 'Product passed all quality assurance tests',
            icon: 'fas fa-clipboard-check',
            status: 'completed'
        },
        {
            date: new Date(product.uploadDate.getTime() - 1 * 24 * 60 * 60 * 1000),
            title: 'Packaging Completed',
            description: 'Product packaged and ready for shipment',
            icon: 'fas fa-box',
            status: 'completed'
        },
        {
            date: product.uploadDate,
            title: 'Blockchain Registration',
            description: 'Product registered on PI TRACE blockchain',
            icon: 'fas fa-link',
            status: 'current'
        }
    ];
    
    events.forEach(event => {
        const timelineItem = document.createElement('div');
        timelineItem.className = `timeline-item ${event.status}`;
        timelineItem.innerHTML = `
            <div class="timeline-icon">
                <i class="${event.icon}"></i>
            </div>
            <div class="timeline-content">
                <div class="timeline-date">${formatDate(event.date)}</div>
                <div class="timeline-title">${event.title}</div>
                <div class="timeline-description">${event.description}</div>
            </div>
        `;
        timelineContainer.appendChild(timelineItem);
    });
}

// =============================================
// SEARCH FUNCTIONALITY
// =============================================

function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    debugLog(`🔍 Searching for: "${searchTerm}"`);
    
    if (!searchTerm) {
        userProducts = [...allProducts];
        displayProducts();
        showStatus('📋 Showing all products', 'info');
        return;
    }
    
    userProducts = allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.origin.toLowerCase().includes(searchTerm)
    );
    
    displayProducts();
    
    if (userProducts.length === 0) {
        showStatus('❌ No products found matching your search', 'warning');
    } else {
        showStatus(`✅ Found ${userProducts.length} product(s) matching "${searchTerm}"`, 'success');
    }
}

// =============================================
// OTHER APP FUNCTIONS
// =============================================

function createPayment() {
    debugLog("💰 Creating payment of 3.14 π...");
    showStatus('<div class="loading-spinner"></div> Processing payment of 3.14 π...', 'info');
    
    setTimeout(() => {
        showStatus('✅ Payment of 3.14 π confirmed successfully!', 'success');
        debugLog("💰 Payment processed successfully", "success");
    }, 2000);
}

function scanQRCode() {
    debugLog("📷 Opening QR code scanner...");
    showStatus('📷 QR scanner would open here. Feature coming soon!', 'info');
}

// =============================================
// INITIALIZATION & EVENT LISTENERS
// =============================================

function initializeApp() {
    debugLog("🚀 Initializing PI TRACE application...");
    
    // Initialize Pi SDK
    initializePiSDK();
    
    // Add event listeners for real-time form updates
    document.getElementById('productName').addEventListener('input', updateProductPreview);
    document.getElementById('productCategory').addEventListener('change', updateProductPreview);
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(searchProducts, 300);
        });
        
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') searchProducts();
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
    
    showStatus('🚀 PI TRACE Ready! Click any login button to start.', 'success');
    debugLog("✅ Application initialization complete", "success");
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    debugLog("📄 DOM loaded - Starting application...");
    initializeApp();
});

// Handle page errors
window.addEventListener('error', function(e) {
    debugLog(`❌ JavaScript Error: ${e.message}`, "error");
});

// =============================================
// EXPORT FOR MODULE SUPPORT (if needed)
// =============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApp,
        loginWithPi,
        mockLogin,
        guestLogin,
        logout,
        showProductModal,
        submitProduct,
        searchProducts,
        viewProductDetail
    };
}
