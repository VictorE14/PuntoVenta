// ============================================================
// CATEGORÍAS E INVENTARIO
// ============================================================
const categories = [
    { id: 'manuales',     name: 'Herramientas Manuales',    icon: 'fa-wrench',            color: '#1565c0' },
    { id: 'electricas',   name: 'Herramientas Eléctricas',  icon: 'fa-bolt',              color: '#e65100' },
    { id: 'jardineria',   name: 'Jardinería y Agricultura', icon: 'fa-seedling',          color: '#2e7d32' },
    { id: 'seguridad',    name: 'Equipo de Seguridad',      icon: 'fa-hard-hat',          color: '#b71c1c' },
    { id: 'plomeria',     name: 'Plomería',                 icon: 'fa-faucet',            color: '#00695c' },
    { id: 'construccion', name: 'Construcción',             icon: 'fa-building',          color: '#4e342e' },
    { id: 'ferreteria',   name: 'Ferretería',               icon: 'fa-screwdriver-wrench','color': '#37474f' },
    { id: 'otras',        name: 'Otras Categorías',         icon: 'fa-ellipsis-h',        color: '#6a1b9a' },
];

const inventory = [
    // Herramientas Manuales
    { code: '001', brand: 'Stanley',  name: 'Pinza de punta',        price: 500,  category: 'manuales'     },
    { code: '002', brand: 'DeWalt',   name: 'Martillo',              price: 350,  category: 'manuales'     },
    { code: '003', brand: 'Bosch',    name: 'Desarmador',            price: 100,  category: 'manuales'     },
    { code: '006', brand: 'Stanley',  name: 'Cinta métrica 5m',      price: 150,  category: 'manuales'     },
    { code: '009', brand: 'Irwin',    name: 'Segueta',               price: 120,  category: 'manuales'     },
    { code: '011', brand: 'Stanley',  name: 'Nivel 12"',             price: 220,  category: 'manuales'     },
    { code: '014', brand: 'Generic',  name: 'Llave inglesa',         price: 180,  category: 'manuales'     },
    // Herramientas Eléctricas
    { code: '007', brand: 'DeWalt',   name: 'Broca 1/2"',            price: 45,   category: 'electricas'   },
    { code: '012', brand: 'Bosch',    name: 'Sierra caladora',       price: 2500, category: 'electricas'   },
    { code: '015', brand: 'DeWalt',   name: 'Taladro inalámbrico',   price: 3500, category: 'electricas'   },
    // Jardinería y Agricultura
    { code: '008', brand: 'Truper',   name: 'Pala',                  price: 280,  category: 'jardineria'   },
    { code: '013', brand: 'Truper',   name: 'Azadón',                price: 320,  category: 'jardineria'   },
    // Ferretería
    { code: '004', brand: '3M',       name: 'Cable #10 (metro)',     price: 800,  category: 'ferreteria'   },
    { code: '010', brand: '3M',       name: 'Cinta aislante',        price: 35,   category: 'ferreteria'   },
    { code: '005', brand: 'Generic',  name: 'Navaja',                price: 80,   category: 'ferreteria'   },
];

// ============================================================
// FECHA Y HORA EN VIVO
// ============================================================
function updateDateTime() {
    const now = new Date();
    document.getElementById('date').value = now.toLocaleDateString('es-MX');
    document.getElementById('time').value = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateDateTime, 1000);
updateDateTime();

// ============================================================
// BÚSQUEDA INTELIGENTE CON SUGERENCIAS EN TIEMPO REAL
// ============================================================
const searchInput       = document.getElementById('searchInput');
const suggestionsDropdown = document.getElementById('searchSuggestions');

searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length === 0) {
        suggestionsDropdown.style.display = 'none';
        return;
    }
    const matches = inventory.filter(p =>
        p.code.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        p.brand.toLowerCase().includes(query)
    );
    if (matches.length === 0) {
        suggestionsDropdown.style.display = 'none';
        return;
    }
    suggestionsDropdown.innerHTML = matches.map(p => `
        <div class="suggestion-item" onclick="addProductToSale('${p.code}')">
            <div class="suggestion-info">
                <span class="suggestion-name">${p.name}</span>
                <span class="suggestion-meta">${p.brand} &middot; Cód: ${p.code}</span>
            </div>
            <span class="suggestion-price">$${p.price.toFixed(2)}</span>
        </div>
    `).join('');
    suggestionsDropdown.style.display = 'block';
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        suggestionsDropdown.style.display = 'none';
        searchInput.value = '';
    }
    if (e.key === 'Enter') {
        const query = searchInput.value.trim().toLowerCase();
        const match = inventory.find(p =>
            p.code.toLowerCase() === query ||
            p.name.toLowerCase() === query
        );
        if (match) addProductToSale(match.code);
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
        suggestionsDropdown.style.display = 'none';
    }
});

// ============================================================
// AGREGAR PRODUCTO A LA VENTA
// ============================================================
function addProductToSale(code) {
    const product = inventory.find(p => p.code === code);
    if (!product) return;

    suggestionsDropdown.style.display = 'none';
    searchInput.value = '';

    // Si ya existe, solo incrementar cantidad
    const existingRow = document.querySelector(`#salesBody tr[data-code="${code}"]`);
    if (existingRow) {
        const qtyEl = existingRow.querySelector('.qty-value');
        qtyEl.textContent = parseInt(qtyEl.textContent) + 1;
        updateRowSubtotal(existingRow);
        updateTotal();
        existingRow.classList.remove('highlight');
        void existingRow.offsetWidth; // reflow para reiniciar animación
        existingRow.classList.add('highlight');
        return;
    }

    const salesBody = document.getElementById('salesBody');
    const rowNum = salesBody.querySelectorAll('tr').length + 1;
    const row = document.createElement('tr');
    row.setAttribute('data-code', code);
    row.setAttribute('data-price', product.price);
    row.innerHTML = `
        <td>${rowNum}</td>
        <td>${product.brand}</td>
        <td>${product.name}</td>
        <td>${product.code}</td>
        <td>
            <div class="qty-control">
                <button class="qty-btn minus" onclick="changeQty(this, -1)">−</button>
                <span class="qty-value">1</span>
                <button class="qty-btn plus"  onclick="changeQty(this,  1)">+</button>
            </div>
        </td>
        <td>$${product.price.toFixed(2)}</td>
        <td class="subtotal">$${product.price.toFixed(2)}</td>
        <td>
            <button class="delete-row-btn" onclick="deleteRowByBtn(this)" title="Eliminar">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    salesBody.appendChild(row);
    updateRowNumbers();
    updateTotal();
    updateEmptyState();
}

// ============================================================
// CONTROLES DE CANTIDAD +/-
// ============================================================
function changeQty(btn, delta) {
    const row = btn.closest('tr');
    const qtyEl = row.querySelector('.qty-value');
    let qty = parseInt(qtyEl.textContent) + delta;
    if (qty < 1) qty = 1;
    qtyEl.textContent = qty;
    updateRowSubtotal(row);
    updateTotal();
}

function updateRowSubtotal(row) {
    const qty   = parseInt(row.querySelector('.qty-value').textContent);
    const price = parseFloat(row.getAttribute('data-price'));
    row.querySelector('.subtotal').textContent = `$${(qty * price).toFixed(2)}`;
}

// ============================================================
// ELIMINAR FILA
// ============================================================
function deleteRowByBtn(btn) {
    btn.closest('tr').remove();
    updateRowNumbers();
    updateTotal();
    updateEmptyState();
}

// ============================================================
// SELECCIÓN VISUAL DE FILA
// ============================================================
document.getElementById('salesBody').addEventListener('click', (e) => {
    const row = e.target.closest('tr');
    if (!row || e.target.closest('button')) return;
    document.querySelectorAll('#salesBody tr.selected').forEach(r => r.classList.remove('selected'));
    row.classList.add('selected');
});

// ============================================================
// NUMERACIÓN Y ESTADO VACÍO
// ============================================================
function updateRowNumbers() {
    document.querySelectorAll('#salesBody tr').forEach((row, i) => {
        row.cells[0].textContent = i + 1;
    });
}

function updateEmptyState() {
    const hasRows = document.querySelectorAll('#salesBody tr').length > 0;
    document.getElementById('salesTable').style.display   = hasRows ? 'table' : 'none';
    document.getElementById('emptyState').style.display   = hasRows ? 'none'  : 'flex';
}

// ============================================================
// TOTAL
// ============================================================
function updateTotal() {
    let total = 0;
    document.querySelectorAll('#salesBody tr').forEach(row => {
        total += parseFloat(row.querySelector('.subtotal').textContent.replace('$', '')) || 0;
    });
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

// ============================================================
// LIMPIAR VENTA (con confirmación)
// ============================================================
function clearAll() {
    if (document.querySelectorAll('#salesBody tr').length === 0) return;
    if (!confirm('¿Deseas limpiar toda la venta actual?')) return;
    document.getElementById('salesBody').innerHTML = '';
    updateTotal();
    updateEmptyState();
    cleanOldReturns();
}

// ============================================================
// PAGAR — abre modal de método de pago
// ============================================================
function pay() {
    const rows = document.querySelectorAll('#salesBody tr');
    if (rows.length === 0) {
        alert('No hay productos en la venta.');
        return;
    }
    document.getElementById('paymentTotalDisplay').textContent = document.getElementById('total').textContent;
    document.getElementById('cashSection').style.display   = 'none';
    document.getElementById('cardSection').style.display   = 'none';
    document.getElementById('changeDisplay').style.display = 'none';
    document.getElementById('changeError').style.display   = 'none';
    document.getElementById('cashReceived').value          = '';
    document.getElementById('confirmPayBtn').disabled      = true;
    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('paymentModal').style.display  = 'block';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function selectPaymentMethod(method) {
    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(method === 'efectivo' ? 'btnEfectivo' : 'btnTarjeta').classList.add('active');
    if (method === 'efectivo') {
        document.getElementById('cashSection').style.display   = 'flex';
        document.getElementById('cardSection').style.display   = 'none';
        document.getElementById('confirmPayBtn').disabled      = true;
        document.getElementById('cashReceived').focus();
        calculateChange();
    } else {
        document.getElementById('cashSection').style.display   = 'none';
        document.getElementById('cardSection').style.display   = 'block';
        document.getElementById('changeDisplay').style.display = 'none';
        document.getElementById('changeError').style.display   = 'none';
        document.getElementById('confirmPayBtn').disabled      = false;
    }
}

function calculateChange() {
    const totalValue    = parseFloat(document.getElementById('total').textContent.replace('$', '')) || 0;
    const received      = parseFloat(document.getElementById('cashReceived').value) || 0;
    const changeDisplay = document.getElementById('changeDisplay');
    const changeError   = document.getElementById('changeError');
    const confirmBtn    = document.getElementById('confirmPayBtn');
    if (received <= 0) {
        changeDisplay.style.display = 'none';
        changeError.style.display   = 'none';
        confirmBtn.disabled         = true;
        return;
    }
    if (received < totalValue) {
        changeDisplay.style.display = 'none';
        changeError.style.display   = 'flex';
        confirmBtn.disabled         = true;
    } else {
        document.getElementById('changeValue').textContent = `$${(received - totalValue).toFixed(2)}`;
        changeError.style.display   = 'none';
        changeDisplay.style.display = 'flex';
        confirmBtn.disabled         = false;
    }
}

function confirmPayment() {
    const rows    = document.querySelectorAll('#salesBody tr');
    const now     = new Date().toISOString();
    const returns = JSON.parse(localStorage.getItem('returns') || '[]');
    const method  = document.querySelector('.payment-method-btn.active span')?.textContent || '';
    const total   = document.getElementById('total').textContent;

    rows.forEach(row => {
        const qty = parseInt(row.querySelector('.qty-value').textContent) || 0;
        if (qty > 0) {
            returns.push({
                code:         row.getAttribute('data-code'),
                qty,
                date:         now,
                brand:        row.cells[1].textContent,
                name:         row.cells[2].textContent,
                pricePerUnit: parseFloat(row.getAttribute('data-price')) || 0
            });
        }
    });
    localStorage.setItem('returns', JSON.stringify(returns));

    let msg = `¡Pago registrado!\nMétodo: ${method}\nTotal: ${total}`;
    if (method === 'Efectivo') {
        const received = parseFloat(document.getElementById('cashReceived').value) || 0;
        const change   = received - (parseFloat(total.replace('$', '')) || 0);
        msg += `\nRecibido: $${received.toFixed(2)}\nCambio:   $${change.toFixed(2)}`;
    }
    alert(msg);

    closePaymentModal();
    document.getElementById('salesBody').innerHTML = '';
    updateTotal();
    updateEmptyState();
    cleanOldReturns();
}

// ============================================================
// MODAL INVENTARIO — CATÁLOGO POR CATEGORÍAS
// ============================================================
let currentCategory = null;

function openInventoryModal() {
    document.getElementById('inventoryModal').style.display = 'block';
    showCategoryView();
}

function closeInventoryModal() {
    document.getElementById('inventoryModal').style.display = 'none';
}

function showCategoryView() {
    currentCategory = null;
    document.getElementById('categoryView').style.display  = 'block';
    document.getElementById('productView').style.display   = 'none';
    document.getElementById('inventoryModalTitle').innerHTML = '<i class="fas fa-boxes"></i> Catálogo de Productos';
    renderCategoryGrid();
}

function showProductView(categoryId) {
    currentCategory = categoryId;
    const cat = categories.find(c => c.id === categoryId);
    document.getElementById('categoryView').style.display  = 'none';
    document.getElementById('productView').style.display   = 'block';
    document.getElementById('inventoryModalTitle').innerHTML = `<i class="fas ${cat.icon}"></i> ${cat.name}`;
    document.getElementById('currentCategoryLabel').textContent = '';
    document.getElementById('inventorySearch').value = '';
    renderInventoryGrid(inventory.filter(p => p.category === categoryId));
}

function renderCategoryGrid() {
    const grid = document.getElementById('categoryGrid');
    grid.innerHTML = categories.map(cat => {
        const count = inventory.filter(p => p.category === cat.id).length;
        return `
        <div class="category-card" onclick="showProductView('${cat.id}')" style="--cat-color:${cat.color}">
            <div class="category-card-icon">
                <i class="fas ${cat.icon}"></i>
            </div>
            <span class="category-card-name">${cat.name}</span>
            <span class="category-card-count">${count} producto${count !== 1 ? 's' : ''}</span>
        </div>`;
    }).join('');
}

function renderInventoryGrid(products) {
    const grid = document.getElementById('inventoryGrid');
    if (products.length === 0) {
        grid.innerHTML = '<div class="inv-empty"><i class="fas fa-box-open"></i><p>Sin productos en esta categoría</p></div>';
        return;
    }
    grid.innerHTML = products.map(p => `
        <div class="inventory-card">
            <span class="inventory-card-brand">${p.brand}</span>
            <span class="inventory-card-name">${p.name}</span>
            <span class="inventory-card-code">Cód: ${p.code}</span>
            <span class="inventory-card-price">$${p.price.toFixed(2)}</span>
            <button class="inventory-card-add" onclick="addProductToSale('${p.code}'); closeInventoryModal();">
                <i class="fas fa-plus"></i> Agregar
            </button>
        </div>
    `).join('');
}

function filterInventory() {
    const query = document.getElementById('inventorySearch').value.toLowerCase();
    const base  = currentCategory ? inventory.filter(p => p.category === currentCategory) : inventory;
    renderInventoryGrid(
        base.filter(p =>
            p.code.toLowerCase().includes(query) ||
            p.name.toLowerCase().includes(query) ||
            p.brand.toLowerCase().includes(query)
        )
    );
}

// ============================================================
// DEVOLUCIONES
// ============================================================
function cleanOldReturns() {
    const returns  = JSON.parse(localStorage.getItem('returns') || '[]');
    const now      = new Date();
    const filtered = returns.filter(r => (now - new Date(r.date)) / (1000 * 60 * 60 * 24) <= 4);
    localStorage.setItem('returns', JSON.stringify(filtered));
}

function showReturnModal() {
    cleanOldReturns();
    updateReturnOptions();
    document.getElementById('returnModal').style.display = 'block';
}

function closeReturnModal() {
    document.getElementById('returnModal').style.display = 'none';
    document.getElementById('returnSearchInput').value = '';
}

function searchReturns() {
    const query = document.getElementById('returnSearchInput').value.toLowerCase();
    document.querySelectorAll('#returnBody tr').forEach(row => {
        const code = (row.getAttribute('data-code') || '').toLowerCase();
        const name = row.cells[1].textContent.toLowerCase();
        row.style.display = code.includes(query) || name.includes(query) ? '' : 'none';
    });
}

function updateReturnOptions() {
    const tbody = document.getElementById('returnBody');
    tbody.innerHTML = '';

    // Productos de la venta actual
    document.querySelectorAll('#salesBody tr').forEach(salesRow => {
        const qty   = parseInt(salesRow.querySelector('.qty-value').textContent) || 0;
        const price = parseFloat(salesRow.getAttribute('data-price')) || 0;
        const code  = salesRow.getAttribute('data-code');
        if (qty <= 0) return;
        const tr = document.createElement('tr');
        tr.setAttribute('data-code', code);
        tr.setAttribute('data-source', 'sales');
        tr.innerHTML = `
            <td>${salesRow.cells[1].textContent}</td>
            <td>${salesRow.cells[2].textContent}</td>
            <td>${code}</td>
            <td>${qty}</td>
            <td><input type="number" min="0" max="${qty}" value="0" onchange="updateReturnPrice(this, ${price})"></td>
            <td>$${price.toFixed(2)}</td>
            <td id="rp_${code}">$0.00</td>
        `;
        tbody.appendChild(tr);
    });

    // Productos de ventas anteriores (localStorage, últimos 4 días)
    const returns    = JSON.parse(localStorage.getItem('returns') || '[]');
    const now        = new Date();
    const salesCodes = Array.from(document.querySelectorAll('#salesBody tr')).map(r => r.getAttribute('data-code'));

    returns.forEach(r => {
        const diff = (now - new Date(r.date)) / (1000 * 60 * 60 * 24);
        if (diff > 4 || r.qty <= 0 || salesCodes.includes(r.code)) return;
        const price = r.pricePerUnit || 0;
        const tr = document.createElement('tr');
        tr.setAttribute('data-code', r.code);
        tr.setAttribute('data-source', 'returns');
        tr.innerHTML = `
            <td>${r.brand || 'N/A'}</td>
            <td>${r.name  || 'N/A'}</td>
            <td>${r.code}</td>
            <td>${r.qty}</td>
            <td><input type="number" min="0" max="${r.qty}" value="0" onchange="updateReturnPrice(this, ${price})"></td>
            <td>$${price.toFixed(2)}</td>
            <td id="rp_${r.code}">$0.00</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateReturnPrice(input, price) {
    const code = input.closest('tr').getAttribute('data-code');
    const cell = document.getElementById(`rp_${code}`);
    if (cell) cell.textContent = `$${((parseInt(input.value) || 0) * price).toFixed(2)}`;
}

function processReturn() {
    const rows    = document.querySelectorAll('#returnBody tr');
    const now     = new Date().toISOString();
    const returns = JSON.parse(localStorage.getItem('returns') || '[]');
    let totalRemoved = 0;

    for (const row of rows) {
        const code      = row.getAttribute('data-code');
        const source    = row.getAttribute('data-source');
        const returnQty = parseInt(row.querySelector('input[type="number"]').value) || 0;
        if (returnQty <= 0) continue;

        if (source === 'sales') {
            const salesRow = document.querySelector(`#salesBody tr[data-code="${code}"]`);
            if (!salesRow) continue;
            const qtyEl      = salesRow.querySelector('.qty-value');
            let   currentQty = parseInt(qtyEl.textContent);
            if (returnQty > currentQty) {
                alert(`La cantidad a devolver de "${salesRow.cells[2].textContent}" supera la disponible.`);
                return;
            }
            const price = parseFloat(salesRow.getAttribute('data-price'));
            currentQty -= returnQty;
            qtyEl.textContent = currentQty;
            updateRowSubtotal(salesRow);
            updateTotal();
            returns.push({ code, qty: returnQty, date: now, brand: salesRow.cells[1].textContent, name: salesRow.cells[2].textContent, pricePerUnit: price });
            if (currentQty === 0) salesRow.remove();
            totalRemoved += returnQty;

        } else if (source === 'returns') {
            const existing = returns.find(r => r.code === code);
            if (!existing) continue;
            if (returnQty > existing.qty) {
                alert(`La cantidad a devolver de "${existing.name}" supera la disponible.`);
                return;
            }
            existing.qty -= returnQty;
            if (existing.qty === 0) returns.splice(returns.indexOf(existing), 1);
            totalRemoved += returnQty;
        }
    }

    localStorage.setItem('returns', JSON.stringify(returns));
    if (totalRemoved > 0) {
        alert(`Devolución procesada correctamente.\nTotal devuelto: ${totalRemoved} artículo(s).`);
    } else {
        alert('No ingresaste cantidades a devolver.');
    }
    closeReturnModal();
    updateRowNumbers();
    updateEmptyState();
}

// ============================================================
// CERRAR MODALES AL HACER CLICK EN EL FONDO
// ============================================================
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('inventoryModal')) closeInventoryModal();
    if (e.target === document.getElementById('returnModal'))    closeReturnModal();
    if (e.target === document.getElementById('paymentModal'))   closePaymentModal();
});

// ============================================================
// INIT
// ============================================================
window.onload = () => {
    cleanOldReturns();
    updateEmptyState();
};
