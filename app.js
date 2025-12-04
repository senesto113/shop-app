// === CONFIGURATION ===
const API_URL = "https://script.google.com/macros/s/AKfycbyW7UZrsAE7r635CWKnEKSNdy7FVb1nkyl9bJjJZIKqATQYXHIsqJoj4VY3Q9gUEsMOMw/exec"; 

// State
let products = [];
let cart = [];
let editingId = null;

// DOM Elements
const addForm = document.getElementById('add-form');
const submitBtn = document.getElementById('submit-btn');
const searchInput = document.getElementById('search');
const posSearchInput = document.getElementById('pos-search');

// === INITIALIZATION ===
async function init() {
    loadTheme();
    await loadProducts();
    
    // Event Listeners
    addForm.addEventListener('submit', handleFormSubmit);
    searchInput.addEventListener('input', (e) => renderInventory(e.target.value));
    posSearchInput.addEventListener('input', (e) => renderPOS(e.target.value));
}

// === NAVIGATION ===
function switchTab(tab) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tab + '-view').classList.add('active');
    // Highlight button logic here if you added IDs to buttons, simpler:
    event.target.classList.add('active');
    
    if(tab === 'pos') renderPOS();
}

// === API INTERACTIONS ===
async function loadProducts() {
    setLoading(true);
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        
        products = Array.isArray(data) ? data.map(p => ({
            ...p,
            qty: Number(p.qty) || 0,
            price: Number(p.price) || 0,
            lowStockThreshold: Number(p.lowStockThreshold) || 5
        })) : [];
        
        renderInventory();
        renderPOS();
        updateStats();
    } catch (error) {
        console.error("Error loading data:", error);
        alert("Failed to load data. Check console.");
    } finally {
        setLoading(false);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const product = {
        name: document.getElementById('name').value,
        category: document.getElementById('category').value,
        qty: parseInt(document.getElementById('qty').value),
        price: parseFloat(document.getElementById('price').value),
        lowStockThreshold: parseInt(document.getElementById('low-stock-threshold').value)
    };

    setLoading(true);
    try {
        let body = editingId ? { ...product, action: "edit", id: editingId } : { ...product, action: "add" };
        
        await fetch(API_URL, { method: "POST", body: JSON.stringify(body) });
        
        addForm.reset();
        editingId = null;
        submitBtn.textContent = 'Add Product';
        await loadProducts();
        alert(editingId ? "Updated!" : "Added!");
    } catch (error) {
        alert("Failed to save.");
    } finally {
        setLoading(false);
    }
}

async function deleteProduct(id) {
    if (!confirm('Delete this product?')) return;
    setLoading(true);
    try {
        await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "delete", id: id }) });
        await loadProducts();
    } catch (error) {
        alert("Failed to delete.");
    } finally {
        setLoading(false);
    }
}

async function checkout() {
    if (cart.length === 0) return alert("Cart is empty!");
    if (!confirm("Complete sale?")) return;

    // 1. Calculate Totals for Invoice
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = subtotal * 0.16; // 16% Tax
    const total = subtotal + tax;
    const saleId = "INV-" + Date.now().toString().slice(-6); // Short ID

    setLoading(true);
    try {
        // 2. Send to Backend
        await fetch(API_URL, { 
            method: "POST", 
            body: JSON.stringify({ action: "checkout", cart: cart, total: total }) 
        });
        
        // 3. Print Invoice
        printInvoice(cart, subtotal, tax, total, saleId);
        
        // 4. Reset
        cart = [];
        renderCart();
        await loadProducts(); 
        
    } catch (error) {
        console.error(error);
        alert("Checkout failed.");
    } finally {
        setLoading(false);
    }
}

function printInvoice(cartItems, subtotal, tax, total, saleId) {
    // Populate HTML
    document.getElementById('receipt-date').textContent = new Date().toLocaleString();
    document.getElementById('receipt-id').textContent = `Invoice #: ${saleId}`;
    
    const tbody = document.getElementById('receipt-body');
    tbody.innerHTML = cartItems.map(item => `
        <tr>
            <td>${item.qty}</td>
            <td>${item.name}</td>
            <td class="right">${item.price.toFixed(2)}</td>
            <td class="right">${(item.price * item.qty).toFixed(2)}</td>
        </tr>
    `).join('');
    
    document.getElementById('receipt-subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('receipt-tax').textContent = tax.toFixed(2);
    document.getElementById('receipt-total').textContent = "Rs. " + total.toFixed(2);

    // Trigger Print
    window.print();
}

// === CART LOGIC ===
function addToCart(id) {
    const product = products.find(p => p.id === id);
    if (!product || product.qty <= 0) return alert("Out of stock!");

    const existing = cart.find(i => i.id === id);
    if (existing) {
        if (existing.qty >= product.qty) return alert("Not enough stock!");
        existing.qty++;
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
    }
    renderCart();
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    renderCart();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total-amount');
    
    if (cart.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); margin-top: 2rem;">Cart is empty</div>';
        totalEl.textContent = '$0.00';
        return;
    }

    let total = 0;
    container.innerHTML = cart.map(item => {
        total += item.price * item.qty;
        return `
        <div class="cart-item">
            <div>
                <strong>${item.name}</strong><br>
                $${item.price} x ${item.qty}
            </div>
            <button onclick="removeFromCart(${item.id})" class="btn-danger" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;">X</button>
        </div>`;
    }).join('');
    
    totalEl.textContent = '$' + total.toFixed(2);
}

// === RENDER INVENTORY ===
function renderInventory(filter = '') {
    const tbody = document.getElementById('product-list');
    const filtered = products.filter(p => 
        (p.name || "").toLowerCase().includes(filter.toLowerCase()) || 
        (p.category || "").toLowerCase().includes(filter.toLowerCase())
    );

    tbody.innerHTML = filtered.map(p => `
        <tr>
            <td><strong>${p.name}</strong></td>
            <td class="${p.qty <= p.lowStockThreshold ? 'low-stock' : ''}">${p.qty}</td>
            <td>$${p.price.toFixed(2)}</td>
            <td>${p.category}</td>
            <td class="actions">
                <button class="btn-edit" onclick="editProduct(${p.id})">Edit</button>
                <button class="btn-danger" onclick="deleteProduct(${p.id})">Del</button>
            </td>
        </tr>
    `).join('');
}

function renderPOS(filter = '') {
    const grid = document.getElementById('pos-grid');
    const filtered = products.filter(p => 
        (p.name || "").toLowerCase().includes(filter.toLowerCase())
    );

    grid.innerHTML = filtered.map(p => `
        <div class="product-card" onclick="addToCart(${p.id})">
            <div>
                <h4>${p.name}</h4>
                <div class="stock-badge">Stock: ${p.qty}</div>
            </div>
            <div class="product-price">$${p.price.toFixed(2)}</div>
        </div>
    `).join('');
}

function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('name').value = product.name;
    document.getElementById('category').value = product.category;
    document.getElementById('qty').value = product.qty;
    document.getElementById('price').value = product.price;
    document.getElementById('low-stock-threshold').value = product.lowStockThreshold;
    
    editingId = id;
    submitBtn.textContent = 'Update Product';
    // Switch to inventory tab if not already
    switchTab('inventory');
}

function updateStats() {
    const totalVal = products.reduce((sum, p) => sum + (p.qty * p.price), 0);
    const lowStock = products.filter(p => p.qty <= p.lowStockThreshold).length;
    document.getElementById('total-value').textContent = '$' + totalVal.toFixed(2);
    document.getElementById('low-stock-count').textContent = lowStock;
}

function setLoading(loading) {
    document.body.style.cursor = loading ? 'wait' : 'default';
}

// === THEME ===
function toggleTheme() {
    const html = document.documentElement;
    const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}
function loadTheme() {
    document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light');
}

init();
