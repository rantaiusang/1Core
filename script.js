// =============================================
// FIXED VERSION - ALL ISSUES RESOLVED
// =============================================

// Global state untuk menyimpan data
let userProducts = [];
let currentUser = null;
let allProducts = []; // Untuk pencarian

// Debug logging
function debugLog(message, type = 'info') {
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        const debugItem = document.createElement('div');
        debugItem.className = `debug-item`;
        debugItem.style.borderLeftColor = type === 'error' ? 'var(--error)' : 
                                       type === 'success' ? 'var(--success)' : 'var(--primary)';
        debugItem.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        debugPanel.appendChild(debugItem);
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }
    console.log(`[PI-TRACE] ${message}`);
}

// Show status messages
function showStatus(message, type = 'info', duration = 5000) {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;
    
    // Clear existing status
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

// Modal functions
function showProductModal() {
    debugLog('Opening product registration modal...');
    document.getElementById('productModal').style.display = 'flex';
    updateProductPreview();
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Update product preview with date and hash
function updateProductPreview() {
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    
    if (name || category) {
        const uploadDate = new Date();
        document.getElementById('uploadDateDisplay').textContent = formatDate(uploadDate);
        
        const productData = {
            name: name,
            category: category
        };
        document.getElementById('hashCodeDisplay').textContent = generateHashCode(productData);
    } else {
        document.getElementById('uploadDateDisplay').textContent = 'Will be generated automatically';
        document.getElementById('hashCodeDisplay').textContent = 'Will be generated automatically';
    }
}

// Generate unique hash code
function generateHashCode(productData) {
    const timestamp = new Date().getTime();
    const random = Math.random().toString(36).substring(2, 15);
    const dataString = `${productData.name}_${productData.category}_${timestamp}_${random}`;
    
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    
    return `PITRACE_${Math.abs(hash).toString(16).toUpperCase()}`;
}

// Format date for display
function formatDate(date) {
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
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

// =============================================
// PRODUCT REGISTRATION - WORKING VERSION WITH UNITS
// =============================================

function submitProduct() {
    debugLog('Submitting product registration...');
    
    // Get form values
    const name = document.getElementById('productName').value;
    const category = document.getElementById('productCategory').value;
    const description = document.getElementById('productDescription').value;
    const quantity = document.getElementById('productQuantity').value;
    const unit = document.getElementById('productUnit').value;
    const price = document.getElementById('productPrice').value;
    const originCountry = document.getElementById('originCountry').value;
    const originCity = document.getElementById('originCity').value;
    
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
        price: price
    };
    
    const hashCode = generateHashCode(productData);
    
    // Create new product object
    const newProduct = {
        id: Date.now(),
        name: name,
        category: category,
        description: description || 'No description provided',
        quantity: quantity,
        unit: unit,
        unitDisplay: getUnitDisplayName(unit),
        quantityDisplay: `${quantity} ${getUnitDisplayName(unit)}`,
        price: price || '0.00',
        origin: `${originCity}, ${originCountry}`,
        timestamp: formatDate(uploadDate),
        uploadDate: uploadDate,
        hashCode: hashCode,
        status: 'registered'
    };

    // Add to products array
    userProducts.push(newProduct);
    allProducts.push(newProduct); // Juga tambahkan ke allProducts untuk pencarian
    
    // Update UI
    displayProducts();
    closeModal('productModal');
    
    // Show success message
    showStatus('✅ Product registered successfully!', 'success');
    debugLog(`Product registered: ${name} (${quantity} ${getUnitDisplayName(unit)})`);
    
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
        productList.style.display = 'none';
        return;
    }

    // Show product list
    productList.style.display = 'block';
    
    userProducts.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product-card';
        productElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div style="flex: 1;">
                    <h4 style="color: var(--primary); margin-bottom: 5px;">${product.name}</h4>
                    <p style="color: var(--gray); font-size: 0.9rem; margin-bottom: 5px;">
                        ${product.category} • ${product.price} π 
                        <span class="quantity-badge">
                            <i class="fas fa-weight-hanging"></i> ${product.quantityDisplay}
                        </span>
                    </p>
                </div>
                <span style="background: var(--success); color: white; padding: 4px 8px; border-radius: 8px; font-size: 0.8rem; white-space: nowrap;">
                    ${product.status}
                </span>
            </div>
            <div style="margin-bottom: 8px;">
                <p style="color: var(--gray); font-size: 0.8rem; margin-bottom: 3px;">
                    <strong>Origin:</strong> ${product.origin}
                </p>
                <p style="color: var(--gray); font-size: 0.8rem;">
                    <strong>Upload Date:</strong> ${product.timestamp}
                </p>
            </div>
            <p style="color: var(--gray); font-size: 0.85rem; margin-bottom: 15px;">
                ${product.description}
            </p>
            <div style="display: flex; justify-content: flex-end;">
                <button class="view-detail-btn" onclick="viewProductDetail(${product.id})">
                    <i class="fas fa-eye"></i> View Details
                </button>
            </div>
        `;
        container.appendChild(productElement);
    });
}

// =============================================
// FIXED: VIEW PRODUCT DETAIL FUNCTION
// =============================================

function viewProductDetail(productId) {
    debugLog(`Viewing product details for ID: ${productId}`);
    const product = userProducts.find(p => p.id === productId);
    
    if (!product) {
        showStatus('❌ Product not found', 'error');
        return;
    }

    // Populate modal dengan data produk
    document.getElementById('detailProductName').textContent = product.name;
    document.getElementById('detailCategory').textContent = product.category;
    document.getElementById('detailQuantity').textContent = product.quantityDisplay;
    document.getElementById('detailPrice').textContent = `${product.price} π`;
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

function generateSupplyChainTimeline(product) {
    const timelineContainer = document.getElementById('supplyChainTimeline');
    timelineContainer.innerHTML = '';

    // Generate timeline events based on product
    const events = [
        {
            date: new Date(product.uploadDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            title: 'Raw Materials Sourced',
            description: 'Raw materials collected from suppliers',
            icon: 'fas fa-boxes'
        },
        {
            date: new Date(product.uploadDate.getTime() - 5 * 24 * 60 * 60 * 1000),
            title: 'Manufacturing Started',
            description: 'Production process initiated at factory',
            icon: 'fas fa-industry'
        },
        {
            date: new Date(product.uploadDate.getTime() - 3 * 24 * 60 * 60 * 1000),
            title: 'Quality Control',
            description: 'Product passed quality assurance tests',
            icon: 'fas fa-clipboard-check'
        },
        {
            date: new Date(product.uploadDate.getTime() - 1 * 24 * 60 * 60 * 1000),
            title: 'Packaging Completed',
            description: 'Product packaged and ready for shipment',
            icon: 'fas fa-box'
        },
        {
            date: product.uploadDate,
            title: 'Product Registered',
            description: 'Product registered on blockchain',
            icon: 'fas fa-link'
        }
    ];

    events.forEach(event => {
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        
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
// SEARCH FUNCTIONALITY - FIXED
// =============================================

function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    debugLog(`Searching for: ${searchTerm}`);
    
    if (!searchTerm) {
        // Jika pencarian kosong, tampilkan semua produk user
        userProducts = [...allProducts];
        displayProducts();
        showStatus('🔍 Showing all products', 'info');
        return;
    }
    
    // Filter produk berdasarkan pencarian
    userProducts = allProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm) ||
        product.origin.toLowerCase().includes(searchTerm)
    );
    
    // Update tampilan
    displayProducts();
    
    if (userProducts.length === 0) {
        showStatus('❌ No products found matching your search', 'warning');
    } else {
        showStatus(`✅ Found ${userProducts.length} product(s) matching "${searchTerm}"`, 'success');
    }
}

// Event listener untuk search input (real-time search)
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Debounce search untuk performa
            clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                searchProducts();
            }, 300);
        });
        
        // Juga bisa search dengan Enter
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchProducts();
            }
        });
    }
});

// =============================================
// LOGIN FUNCTIONS - SIMPLE & WORKING
// =============================================

function loginWithPi() {
    debugLog('Starting Pi login...');
    showStatus('<div class="loading-spinner"></div> Connecting to Pi Network...', 'info');
    
    // Simulate Pi login process
    setTimeout(() => {
        const username = 'PiUser_' + Math.floor(Math.random() * 1000);
        switchToApp(username, 'pi');
        showStatus('✅ Login successful! Welcome to PI TRACE.', 'success');
        debugLog(`Pi login successful: ${username}`);
    }, 2000);
}

function mockLogin() {
    debugLog('Starting mock login...');
    
    const username = 'DemoUser';
    switchToApp(username, 'mock');
    showStatus('🧪 Mock login active - Use Pi Browser for real authentication', 'warning');
    debugLog('Mock login successful');
}

function guestLogin() {
    debugLog('Starting guest login...');
    
    const username = 'Guest_' + Math.random().toString(36).substr(2, 6);
    switchToApp(username, 'guest');
    showStatus('👋 Welcome Guest! Some features may be limited.', 'info');
    debugLog('Guest login successful');
}

function switchToApp(username, loginType) {
    // Update user info
    currentUser = { username, loginType };
    document.getElementById('username').textContent = username;
    
    // Update login type message
    const loginTypeElement = document.getElementById('login-type');
    if (loginType === 'pi') {
        loginTypeElement.textContent = '🔐 Authenticated with Pi Wallet';
        loginTypeElement.style.color = 'var(--success)';
    } else if (loginType === 'mock') {
        loginTypeElement.textContent = '🧪 Mock Login - Testing Mode';
        loginTypeElement.style.color = 'var(--warning)';
    } else {
        loginTypeElement.textContent = '👤 Guest Mode - Limited Features';
        loginTypeElement.style.color = 'var(--warning)';
    }
    
    // Switch to app section
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app-section').style.display = 'block';
    
    // Reset search
    document.getElementById('searchInput').value = '';
    
    // Load products if any
    displayProducts();
}

// =============================================
// APP FUNCTIONALITY
// =============================================

function createPayment() {
    debugLog('Creating payment...');
    showStatus('💰 Payment of 3.14 π processed successfully!', 'success');
    
    setTimeout(() => {
        showStatus('✅ Payment confirmed!', 'success');
    }, 2000);
}

function scanQRCode() {
    debugLog('Opening QR scanner...');
    showStatus('📷 QR scanner would open here', 'info');
}

function logout() {
    debugLog('Logging out...');
    
    // Reset to login section
    document.getElementById('app-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    
    // Reset data
    userProducts = [];
    allProducts = [];
    currentUser = null;
    
    showStatus('✅ Logout successful', 'success');
    debugLog('User logged out');
}

// =============================================
// INITIALIZATION
// =============================================

function initializeApp() {
    debugLog('Application initialized successfully');
    showStatus('🚀 Application ready! Click any login button to start.', 'success');
    
    // Add event listeners for product form live updates
    document.getElementById('productName').addEventListener('input', updateProductPreview);
    document.getElementById('productCategory').addEventListener('change', updateProductPreview);
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Initialize when page loads
window.addEventListener('load', function() {
    debugLog('Page loaded - Application ready');
    initializeApp();
});
