// ============================================================
// SUPABASE (CDN)
// ============================================================
const { createClient } = supabase;
const supabaseClient = createClient(
    'https://oxylclrzmqeyduayotwi.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eWxjbHJ6bXFleWR1YXlvdHdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0NjA0NzQsImV4cCI6MjA4ODAzNjQ3NH0._9GVYGiXmNfTEhjKJuikZdObZBuGn11TMuWJeaRXOcs'
);

// ============================================================
// VARIABLES GLOBALES
// ============================================================
let categoriesFromDB = [];
let currentCategory = null;
let productosEnVenta = []; // Array temporal para la venta actual

// Variables para Admin
let adminCurrentCategory = null;
let adminEditMode = false;
let adminEditingProductId = null;

// Variables de sesión
let isAdminLoggedIn = false;
let currentAdminUser = null;
let inactivityTimer;

// ============================================================
// FECHA Y HORA
// ============================================================
function updateDateTime() {
    const now = new Date();
    document.getElementById('date').value = now.toLocaleDateString('es-MX');
    document.getElementById('time').value = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateDateTime, 1000);

// ============================================================
// VERIFICAR Y CREAR CATEGORÍAS AUTOMÁTICAMENTE
// ============================================================
async function verificarYCrearCategorias() {
    console.log('🔍 Verificando categorías en Supabase...');
    
    try {
        const { data: categorias, error } = await supabaseClient
            .from('categorias')
            .select('*');
        
        if (error) {
            console.error('❌ Error al consultar categorías:', error);
            return;
        }
        
        console.log(`📊 Categorías encontradas: ${categorias?.length || 0}`);
        
        if (!categorias || categorias.length === 0) {
            console.log('🔄 No hay categorías, creando automáticamente...');
            
            const categoriasDefault = [
                { nombre: 'Herramientas Manuales', icono: 'fa-wrench', color: '#1565c0' },
                { nombre: 'Herramientas Eléctricas', icono: 'fa-bolt', color: '#e65100' },
                { nombre: 'Jardinería y Agricultura', icono: 'fa-seedling', color: '#2e7d32' },
                { nombre: 'Equipo de Seguridad', icono: 'fa-hard-hat', color: '#b71c1c' },
                { nombre: 'Plomería', icono: 'fa-faucet', color: '#00695c' },
                { nombre: 'Construcción', icono: 'fa-building', color: '#4e342e' },
                { nombre: 'Ferretería', icono: 'fa-screwdriver-wrench', color: '#37474f' },
                { nombre: 'Otras Categorías', icono: 'fa-ellipsis-h', color: '#6a1b9a' }
            ];
            
            const { error: insertError } = await supabaseClient
                .from('categorias')
                .insert(categoriasDefault);
            
            if (insertError) {
                console.error('❌ Error al crear categorías:', insertError);
            } else {
                console.log('✅ Categorías creadas exitosamente');
            }
        }
    } catch (error) {
        console.error('❌ Error inesperado:', error);
    }
}

// ============================================================
// CARGAR CATEGORÍAS DESDE SUPABASE
// ============================================================
async function loadCategories() {
    const { data, error } = await supabaseClient
        .from('categorias')
        .select('*')
        .order('nombre');
    
    if (error) {
        console.error('Error cargando categorías:', error);
        return [];
    }
    categoriesFromDB = data;
    return data;
}

// ============================================================
// FUNCIONES DE LOGIN
// ============================================================

function showLoginModal() {
    if (isAdminLoggedIn) {
        const nameSpan = document.getElementById('currentAdminName');
        if (nameSpan && currentAdminUser) {
            nameSpan.textContent = currentAdminUser.nombre || currentAdminUser.username;
        }
        openAdminModal();
        return;
    }
    
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').style.display = 'none';
    
    document.getElementById('loginModal').style.display = 'block';
    document.getElementById('loginUsername').focus();
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function handleKeyPress(event) {
    if (event.key === 'Enter') {
        attemptLogin();
    }
}

async function attemptLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    
    if (!username || !password) {
        showLoginError('Por favor ingresa usuario y contraseña');
        return;
    }
    
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    loginBtn.disabled = true;
    
    try {
        const { data: usuarios, error } = await supabaseClient
            .from('admin_usuarios')
            .select('*')
            .eq('username', username)
            .eq('activo', true);
        
        if (error) {
            console.error('Error al consultar usuario:', error);
            showLoginError('Error al conectar con el servidor');
            return;
        }
        
        if (!usuarios || usuarios.length === 0) {
            showLoginError('Usuario no encontrado');
            return;
        }
        
        const usuario = usuarios[0];
        
        if (usuario.password !== password) {
            showLoginError('Contraseña incorrecta');
            return;
        }
        
        isAdminLoggedIn = true;
        currentAdminUser = usuario;
        
        resetInactivityTimer();
        
        closeLoginModal();
        
        showNotification(`Bienvenido ${usuario.nombre || username}`, 'success');
        
        const nameSpan = document.getElementById('currentAdminName');
        if (nameSpan) {
            nameSpan.textContent = usuario.nombre || usuario.username;
        }
        
        setTimeout(() => {
            openAdminModal();
        }, 300);
        
    } catch (error) {
        console.error('Error inesperado:', error);
        showLoginError('Error al iniciar sesión');
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.querySelector('span').textContent = message;
    errorDiv.style.display = 'flex';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

// ============================================================
// GESTIÓN DE SESIÓN Y TIMEOUT
// ============================================================

function resetInactivityTimer() {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    if (isAdminLoggedIn) {
        inactivityTimer = setTimeout(() => {
            const isAdminOpen = document.getElementById('adminModal').style.display === 'block';
            
            if (isAdminOpen) {
                showNotification('Sesión expirada por inactividad (5 minutos)', 'info');
                logout(false);
            }
        }, 5 * 60 * 1000);
    }
}

['click', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, () => {
        resetInactivityTimer();
    });
});

function logout(showConfirm = true) {
    if (showConfirm) {
        if (!confirm('¿Cerrar sesión?')) {
            return;
        }
    }
    
    if (inactivityTimer) {
        clearTimeout(inactivityTimer);
    }
    
    isAdminLoggedIn = false;
    currentAdminUser = null;
    
    showNotification('Sesión cerrada', 'info');
    
    if (document.getElementById('adminModal').style.display === 'block') {
        document.getElementById('adminModal').style.display = 'none';
    }
    
    document.getElementById('adminCategoryView').style.display = 'block';
    document.getElementById('adminProductView').style.display = 'none';
    document.getElementById('adminAddProductView').style.display = 'none';
}

// ============================================================
// NOTIFICACIONES
// ============================================================
function showNotification(message, type = 'info') {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.display = 'flex';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// ============================================================
// BÚSQUEDA INTELIGENTE DESDE SUPABASE
// ============================================================
const searchInput = document.getElementById('searchInput');
const suggestionsDropdown = document.getElementById('searchSuggestions');
let searchTimeout;

searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
        suggestionsDropdown.style.display = 'none';
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            const { data: productos, error } = await supabaseClient
                .from('productos')
                .select(`
                    *,
                    categorias (
                        nombre,
                        icono,
                        color
                    )
                `)
                .or(`nombre.ilike.%${query}%,codigo.ilike.%${query}%,marca.ilike.%${query}%`)
                .eq('activo', true)
                .limit(10);
            
            if (error || !productos || productos.length === 0) {
                suggestionsDropdown.style.display = 'none';
                return;
            }
            
            suggestionsDropdown.innerHTML = productos.map(p => `
                <div class="suggestion-item" onclick="addProductToSaleFromSearch(${p.id}, '${p.codigo}')">
                    <div class="suggestion-info">
                        <span class="suggestion-name">${p.nombre}</span>
                        <span class="suggestion-meta">${p.marca || 'Sin marca'} · Cód: ${p.codigo} · Stock: ${p.stock}</span>
                    </div>
                    <span class="suggestion-price">$${p.precio.toFixed(2)}</span>
                </div>
            `).join('');
            
            suggestionsDropdown.style.display = 'block';
            
        } catch (error) {
            console.error('Error inesperado:', error);
        }
    }, 300);
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        suggestionsDropdown.style.display = 'none';
        searchInput.value = '';
    }
    if (e.key === 'Enter') {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            const firstSuggestion = suggestionsDropdown.querySelector('.suggestion-item');
            if (firstSuggestion) {
                firstSuggestion.click();
            }
        }
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
        suggestionsDropdown.style.display = 'none';
    }
});

// ============================================================
// AGREGAR PRODUCTO A LA VENTA (desde búsqueda)
// ============================================================
async function addProductToSaleFromSearch(productId, codigo) {
    try {
        const { data: product, error } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('id', productId)
            .eq('activo', true)
            .single();
        
        if (error || !product) {
            alert('Error al cargar el producto');
            return;
        }
        
        if (product.stock <= 0) {
            alert('Producto sin stock disponible');
            return;
        }
        
        suggestionsDropdown.style.display = 'none';
        searchInput.value = '';

        const existingProductIndex = productosEnVenta.findIndex(p => p.id === product.id);
        
        if (existingProductIndex >= 0) {
            const newQty = productosEnVenta[existingProductIndex].cantidad + 1;
            if (newQty > product.stock) {
                alert(`Solo hay ${product.stock} unidades disponibles`);
                return;
            }
            productosEnVenta[existingProductIndex].cantidad = newQty;
        } else {
            productosEnVenta.push({
                id: product.id,
                codigo: product.codigo,
                nombre: product.nombre,
                marca: product.marca || 'Sin marca',
                precio: parseFloat(product.precio),
                cantidad: 1,
                stock: product.stock
            });
        }
        
        renderSalesTable();
        
    } catch (error) {
        console.error('Error inesperado:', error);
        alert('Error al agregar producto');
    }
}

async function addProductToSale(productId) {
    await addProductToSaleFromSearch(productId, null);
}

// ============================================================
// RENDERIZAR TABLA DE VENTAS
// ============================================================
function renderSalesTable() {
    const salesBody = document.getElementById('salesBody');
    
    if (productosEnVenta.length === 0) {
        salesBody.innerHTML = '';
        updateEmptyState();
        updateTotal();
        return;
    }
    
    salesBody.innerHTML = productosEnVenta.map((p, index) => `
        <tr data-product-id="${p.id}" data-price="${p.precio}">
            <td>${index + 1}</td>
            <td>${p.marca}</td>
            <td>${p.nombre}</td>
            <td>${p.codigo}</td>
            <td>
                <div class="qty-control">
                    <button class="qty-btn minus" onclick="changeQty(${p.id}, -1)">−</button>
                    <span class="qty-value">${p.cantidad}</span>
                    <button class="qty-btn plus" onclick="changeQty(${p.id}, 1)">+</button>
                </div>
            </td>
            <td>$${p.precio.toFixed(2)}</td>
            <td class="subtotal">$${(p.cantidad * p.precio).toFixed(2)}</td>
            <td>
                <button class="delete-row-btn" onclick="removeFromSale(${p.id})" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    updateTotal();
    updateEmptyState();
}

// ============================================================
// CAMBIAR CANTIDAD
// ============================================================
async function changeQty(productId, delta) {
    const productIndex = productosEnVenta.findIndex(p => p.id === productId);
    if (productIndex === -1) return;
    
    const newQty = productosEnVenta[productIndex].cantidad + delta;
    
    if (newQty < 1) {
        removeFromSale(productId);
        return;
    }
    
    const { data: product } = await supabaseClient
        .from('productos')
        .select('stock')
        .eq('id', productId)
        .single();
    
    if (product && newQty > product.stock) {
        alert(`Solo hay ${product.stock} unidades disponibles`);
        return;
    }
    
    productosEnVenta[productIndex].cantidad = newQty;
    renderSalesTable();
}

// ============================================================
// ELIMINAR DE LA VENTA
// ============================================================
function removeFromSale(productId) {
    productosEnVenta = productosEnVenta.filter(p => p.id !== productId);
    renderSalesTable();
}

// ============================================================
// LIMPIAR VENTA
// ============================================================
function clearAll() {
    if (productosEnVenta.length === 0) return;
    if (!confirm('¿Deseas limpiar toda la venta actual?')) return;
    productosEnVenta = [];
    renderSalesTable();
}

// ============================================================
// ACTUALIZAR TOTAL
// ============================================================
function updateTotal() {
    const total = productosEnVenta.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;
}

// ============================================================
// ESTADO VACÍO
// ============================================================
function updateEmptyState() {
    const hasRows = productosEnVenta.length > 0;
    document.getElementById('salesTable').style.display = hasRows ? 'table' : 'none';
    document.getElementById('emptyState').style.display = hasRows ? 'none' : 'flex';
}

// ============================================================
// PAGAR
// ============================================================
function pay() {
    if (productosEnVenta.length === 0) {
        alert('No hay productos en la venta.');
        return;
    }
    
    document.getElementById('paymentTotalDisplay').textContent = document.getElementById('total').textContent;
    document.getElementById('cashSection').style.display = 'none';
    document.getElementById('cardSection').style.display = 'none';
    document.getElementById('changeDisplay').style.display = 'none';
    document.getElementById('changeError').style.display = 'none';
    document.getElementById('cashReceived').value = '';
    document.getElementById('confirmPayBtn').disabled = true;
    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('paymentModal').style.display = 'block';
}

function closePaymentModal() {
    document.getElementById('paymentModal').style.display = 'none';
}

function selectPaymentMethod(method) {
    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(method === 'efectivo' ? 'btnEfectivo' : 'btnTarjeta').classList.add('active');
    
    if (method === 'efectivo') {
        document.getElementById('cashSection').style.display = 'flex';
        document.getElementById('cardSection').style.display = 'none';
        document.getElementById('confirmPayBtn').disabled = true;
        document.getElementById('cashReceived').focus();
        calculateChange();
    } else {
        document.getElementById('cashSection').style.display = 'none';
        document.getElementById('cardSection').style.display = 'block';
        document.getElementById('changeDisplay').style.display = 'none';
        document.getElementById('changeError').style.display = 'none';
        document.getElementById('confirmPayBtn').disabled = false;
    }
}

function calculateChange() {
    const totalValue = parseFloat(document.getElementById('total').textContent.replace('$', '')) || 0;
    const received = parseFloat(document.getElementById('cashReceived').value) || 0;
    const changeDisplay = document.getElementById('changeDisplay');
    const changeError = document.getElementById('changeError');
    const confirmBtn = document.getElementById('confirmPayBtn');
    
    if (received <= 0) {
        changeDisplay.style.display = 'none';
        changeError.style.display = 'none';
        confirmBtn.disabled = true;
        return;
    }
    
    if (received < totalValue) {
        changeDisplay.style.display = 'none';
        changeError.style.display = 'flex';
        confirmBtn.disabled = true;
    } else {
        document.getElementById('changeValue').textContent = `$${(received - totalValue).toFixed(2)}`;
        changeError.style.display = 'none';
        changeDisplay.style.display = 'flex';
        confirmBtn.disabled = false;
    }
}

// ============================================================
// CONFIRMAR PAGO Y GUARDAR EN SUPABASE
// ============================================================
async function confirmPayment() {
    const metodo = document.querySelector('.payment-method-btn.active span')?.textContent || '';
    const total = parseFloat(document.getElementById('total').textContent.replace('$', '')) || 0;
    const montoRecibido = metodo === 'Efectivo' ? parseFloat(document.getElementById('cashReceived').value) || 0 : null;
    const cambio = metodo === 'Efectivo' ? montoRecibido - total : 0;
    
    const { data: venta, error: ventaError } = await supabaseClient
        .from('ventas')
        .insert([{
            total: total,
            metodo_pago: metodo.toLowerCase(),
            monto_recibido: montoRecibido,
            cambio: cambio
        }])
        .select()
        .single();
    
    if (ventaError) {
        alert('Error al registrar la venta: ' + ventaError.message);
        return;
    }
    
    const detalles = productosEnVenta.map(p => ({
        venta_id: venta.id,
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unit: p.precio
    }));
    
    const { error: detalleError } = await supabaseClient
        .from('detalle_ventas')
        .insert(detalles);
    
    if (detalleError) {
        alert('Error al registrar detalles: ' + detalleError.message);
        return;
    }
    
    let msg = `✅ ¡Venta registrada!\nMétodo: ${metodo}\nTotal: $${total.toFixed(2)}`;
    if (metodo === 'Efectivo') {
        msg += `\nRecibido: $${montoRecibido.toFixed(2)}\nCambio: $${cambio.toFixed(2)}`;
    }
    alert(msg);
    
    closePaymentModal();
    productosEnVenta = [];
    renderSalesTable();
}

// ============================================================
// MODAL INVENTARIO - CATÁLOGO DESDE SUPABASE
// ============================================================
async function openInventoryModal() {
    document.getElementById('inventoryModal').style.display = 'block';
    await showCategoryView();
}

function closeInventoryModal() {
    document.getElementById('inventoryModal').style.display = 'none';
}

async function showCategoryView() {
    currentCategory = null;
    document.getElementById('categoryView').style.display = 'block';
    document.getElementById('productView').style.display = 'none';
    document.getElementById('inventoryModalTitle').innerHTML = '<i class="fas fa-boxes"></i> Catálogo de Productos';
    await renderCategoryGrid();
}

async function renderCategoryGrid() {
    const grid = document.getElementById('categoryGrid');
    
    grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando categorías...</div>';
    
    try {
        const { data: categorias, error } = await supabaseClient
            .from('categorias')
            .select(`
                *,
                productos:productos(count)
            `)
            .order('nombre');
        
        if (error) {
            console.error('Error cargando categorías:', error);
            grid.innerHTML = '<div class="inv-empty"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar categorías</p></div>';
            return;
        }
        
        if (!categorias || categorias.length === 0) {
            grid.innerHTML = '<div class="inv-empty"><i class="fas fa-folder-open"></i><p>No hay categorías disponibles</p></div>';
            return;
        }
        
        grid.innerHTML = categorias.map(cat => {
            const count = cat.productos?.[0]?.count || 0;
            return `
            <div class="category-card" onclick="showProductView(${cat.id})" style="--cat-color:${cat.color || '#37474f'}">
                <div class="category-card-icon">
                    <i class="fas ${cat.icono || 'fa-tag'}"></i>
                </div>
                <span class="category-card-name">${cat.nombre}</span>
                <span class="category-card-count">${count} producto${count !== 1 ? 's' : ''}</span>
            </div>`;
        }).join('');
        
    } catch (error) {
        console.error('Error inesperado:', error);
        grid.innerHTML = '<div class="inv-empty"><i class="fas fa-exclamation-circle"></i><p>Error al cargar datos</p></div>';
    }
}

async function showProductView(categoryId) {
    currentCategory = categoryId;
    
    try {
        const { data: categoria, error } = await supabaseClient
            .from('categorias')
            .select('*')
            .eq('id', categoryId)
            .single();
        
        if (error) {
            console.error('Error cargando categoría:', error);
            return;
        }
        
        document.getElementById('categoryView').style.display = 'none';
        document.getElementById('productView').style.display = 'block';
        document.getElementById('inventoryModalTitle').innerHTML = `<i class="fas ${categoria?.icono || 'fa-tag'}"></i> ${categoria?.nombre || 'Productos'}`;
        document.getElementById('currentCategoryLabel').textContent = '';
        document.getElementById('inventorySearch').value = '';
        
        await renderInventoryGrid(categoryId);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function renderInventoryGrid(categoryId, searchQuery = '') {
    const grid = document.getElementById('inventoryGrid');
    
    grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando productos...</div>';
    
    try {
        let query = supabaseClient
            .from('productos')
            .select('*')
            .eq('activo', true)
            .eq('categoria_id', categoryId);
        
        if (searchQuery) {
            query = query.or(`nombre.ilike.%${searchQuery}%,codigo.ilike.%${searchQuery}%,marca.ilike.%${searchQuery}%`);
        }
        
        const { data: productos, error } = await query.order('nombre');
        
        if (error) {
            console.error('Error cargando productos:', error);
            grid.innerHTML = '<div class="inv-empty"><i class="fas fa-exclamation-triangle"></i><p>Error al cargar productos</p></div>';
            return;
        }
        
        if (!productos || productos.length === 0) {
            grid.innerHTML = '<div class="inv-empty"><i class="fas fa-box-open"></i><p>Sin productos en esta categoría</p></div>';
            return;
        }
        
        grid.innerHTML = productos.map(p => `
            <div class="inventory-card ${p.stock <= 0 ? 'out-of-stock' : ''}">
                <span class="inventory-card-brand">${p.marca || 'Sin marca'}</span>
                <span class="inventory-card-name">${p.nombre}</span>
                <span class="inventory-card-code">Cód: ${p.codigo}</span>
                <span class="inventory-card-stock">Stock: ${p.stock}</span>
                <span class="inventory-card-price">$${p.precio.toFixed(2)}</span>
                <button class="inventory-card-add" onclick="addProductToSale(${p.id})" ${p.stock <= 0 ? 'disabled' : ''}>
                    <i class="fas fa-plus"></i> ${p.stock > 0 ? 'Agregar' : 'Sin stock'}
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error inesperado:', error);
        grid.innerHTML = '<div class="inv-empty"><i class="fas fa-exclamation-circle"></i><p>Error al cargar datos</p></div>';
    }
}

function filterInventory() {
    const query = document.getElementById('inventorySearch').value.toLowerCase();
    if (currentCategory) {
        renderInventoryGrid(currentCategory, query);
    }
}

// ============================================================
// MODAL ADMIN - GESTIÓN DE PRODUCTOS
// ============================================================

async function openAdminModal() {
    if (!isAdminLoggedIn) {
        showLoginModal();
        return;
    }
    
    resetInactivityTimer();
    
    document.getElementById('adminModal').style.display = 'block';
    await showAdminCategoryView();
}

function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
    
    document.getElementById('adminCategoryView').style.display = 'block';
    document.getElementById('adminProductView').style.display = 'none';
    document.getElementById('adminAddProductView').style.display = 'none';
    adminEditMode = false;
    adminEditingProductId = null;
    
    logout(false);
}

async function showAdminCategoryView() {
    adminCurrentCategory = null;
    document.getElementById('adminCategoryView').style.display = 'block';
    document.getElementById('adminProductView').style.display = 'none';
    document.getElementById('adminAddProductView').style.display = 'none';
    document.getElementById('adminModalTitle').innerHTML = '<i class="fas fa-boxes"></i> Administrar Inventario';
    await renderAdminCategoryGrid();
}

async function renderAdminCategoryGrid() {
    const grid = document.getElementById('adminCategoryGrid');
    
    grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando categorías...</div>';
    
    try {
        const { data: categorias, error } = await supabaseClient
            .from('categorias')
            .select(`
                *,
                productos:productos(count)
            `)
            .order('nombre');
        
        if (error) throw error;
        
        if (!categorias || categorias.length === 0) {
            grid.innerHTML = '<div class="inv-empty"><i class="fas fa-folder-open"></i><p>No hay categorías disponibles</p></div>';
            return;
        }
        
        grid.innerHTML = categorias.map(cat => {
            const count = cat.productos?.[0]?.count || 0;
            return `
            <div class="category-card" onclick="showAdminProductView(${cat.id})" style="--cat-color:${cat.color || '#37474f'}">
                <div class="category-card-icon">
                    <i class="fas ${cat.icono || 'fa-tag'}"></i>
                </div>
                <span class="category-card-name">${cat.nombre}</span>
                <span class="category-card-count">${count} producto${count !== 1 ? 's' : ''}</span>
            </div>`;
        }).join('');
        
    } catch (error) {
        console.error('Error:', error);
        grid.innerHTML = '<div class="inv-empty"><i class="fas fa-exclamation-circle"></i><p>Error al cargar datos</p></div>';
    }
}

async function showAdminProductView(categoryId) {
    adminCurrentCategory = categoryId;
    
    try {
        const { data: categoria, error } = await supabaseClient
            .from('categorias')
            .select('*')
            .eq('id', categoryId)
            .single();
        
        if (error) throw error;
        
        document.getElementById('adminCategoryView').style.display = 'none';
        document.getElementById('adminProductView').style.display = 'block';
        document.getElementById('adminAddProductView').style.display = 'none';
        document.getElementById('adminModalTitle').innerHTML = `<i class="fas ${categoria?.icono || 'fa-tag'}"></i> Administrar: ${categoria?.nombre || 'Productos'}`;
        document.getElementById('currentAdminCategoryLabel').textContent = '';
        document.getElementById('adminSearch').value = '';
        
        await renderAdminProductGrid(categoryId);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function renderAdminProductGrid(categoryId, searchQuery = '') {
    const grid = document.getElementById('adminProductsGrid');
    
    grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando productos...</div>';
    
    try {
        let query = supabaseClient
            .from('productos')
            .select('*')
            .eq('activo', true)
            .eq('categoria_id', categoryId);
        
        if (searchQuery) {
            query = query.or(`nombre.ilike.%${searchQuery}%,codigo.ilike.%${searchQuery}%,marca.ilike.%${searchQuery}%`);
        }
        
        const { data: productos, error } = await query.order('nombre');
        
        if (error) throw error;
        
        if (!productos || productos.length === 0) {
            grid.innerHTML = `
                <div class="inv-empty">
                    <i class="fas fa-box-open"></i>
                    <p>Sin productos en esta categoría</p>
                    <button class="btn btn-primary" onclick="showAdminAddProductView()" style="margin-top:15px;">
                        <i class="fas fa-plus"></i> Agregar primer producto
                    </button>
                </div>`;
            return;
        }
        
        grid.innerHTML = productos.map(p => `
            <div class="admin-product-card ${p.stock <= p.stock_minimo ? 'low-stock' : ''}">
                <div class="admin-product-header">
                    <span class="admin-product-brand">${p.marca || 'Sin marca'}</span>
                    <span class="admin-product-code">Cód: ${p.codigo}</span>
                </div>
                <div class="admin-product-name">${p.nombre}</div>
                <div class="admin-product-details">
                    <div class="admin-product-price">
                        <label>Precio</label>
                        <input type="number" id="price_${p.id}" value="${p.precio}" min="0" step="0.01" class="admin-edit-input">
                    </div>
                    <div class="admin-product-stock">
                        <label>Stock</label>
                        <input type="number" id="stock_${p.id}" value="${p.stock}" min="0" class="admin-edit-input">
                    </div>
                    <div class="admin-product-minstock">
                        <label>Stock Mín.</label>
                        <input type="number" id="minstock_${p.id}" value="${p.stock_minimo || 1}" min="1" class="admin-edit-input">
                    </div>
                </div>
                <div class="admin-product-actions">
                    <button class="admin-btn-save" onclick="saveProductChanges(${p.id})">
                        <i class="fas fa-save"></i> Guardar
                    </button>
                    <button class="admin-btn-delete" onclick="deleteProduct(${p.id}, '${p.nombre}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="admin-product-status ${p.stock <= p.stock_minimo ? 'status-warning' : 'status-ok'}">
                    ${p.stock <= p.stock_minimo ? '⚠️ Stock bajo' : '✓ Stock OK'}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error:', error);
        grid.innerHTML = '<div class="inv-empty"><i class="fas fa-exclamation-circle"></i><p>Error al cargar productos</p></div>';
    }
}

function filterAdminProducts() {
    const query = document.getElementById('adminSearch').value.toLowerCase();
    if (adminCurrentCategory) {
        renderAdminProductGrid(adminCurrentCategory, query);
    }
}

async function showAdminAddProductView() {
    document.getElementById('adminCategoryView').style.display = 'none';
    document.getElementById('adminProductView').style.display = 'none';
    document.getElementById('adminAddProductView').style.display = 'block';
    document.getElementById('adminModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Agregar Nuevo Producto';
    
    const select = document.getElementById('adminProdCategory');
    select.innerHTML = '<option value="">Cargando categorías...</option>';
    
    try {
        const { data: categorias, error } = await supabaseClient
            .from('categorias')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        
        select.innerHTML = '<option value="">Selecciona categoría</option>';
        
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre;
            if (adminCurrentCategory === cat.id) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        document.getElementById('adminAddProductForm').reset();
        document.getElementById('adminMessage').style.display = 'none';
        
    } catch (error) {
        console.error('Error:', error);
        select.innerHTML = '<option value="">Error al cargar categorías</option>';
    }
}

async function saveProductChanges(productId) {
    const precio = parseFloat(document.getElementById(`price_${productId}`).value);
    const stock = parseInt(document.getElementById(`stock_${productId}`).value);
    const stockMinimo = parseInt(document.getElementById(`minstock_${productId}`).value);
    
    if (isNaN(precio) || precio < 0) {
        alert('El precio debe ser un número válido');
        return;
    }
    
    if (isNaN(stock) || stock < 0) {
        alert('El stock debe ser un número válido');
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('productos')
            .update({
                precio: precio,
                stock: stock,
                stock_minimo: stockMinimo
            })
            .eq('id', productId);
        
        if (error) throw error;
        
        alert('✅ Producto actualizado correctamente');
        
        if (adminCurrentCategory) {
            await renderAdminProductGrid(adminCurrentCategory);
        }
        
    } catch (error) {
        console.error('Error al actualizar:', error);
        alert('Error al actualizar el producto: ' + error.message);
    }
}

async function deleteProduct(productId, productName) {
    if (!confirm(`¿Estás seguro de eliminar "${productName}"?`)) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('productos')
            .update({ activo: false })
            .eq('id', productId);
        
        if (error) throw error;
        
        alert('✅ Producto eliminado (desactivado) correctamente');
        
        if (adminCurrentCategory) {
            await renderAdminProductGrid(adminCurrentCategory);
        }
        
    } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar el producto: ' + error.message);
    }
}

document.getElementById('adminAddProductForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const codigo = document.getElementById('adminProdCode').value.trim();
    const nombre = document.getElementById('adminProdName').value.trim();
    const marca = document.getElementById('adminProdBrand').value.trim() || null;
    const categoria = parseInt(document.getElementById('adminProdCategory').value);
    const precio = parseFloat(document.getElementById('adminProdPrice').value);
    const stock = parseInt(document.getElementById('adminProdStock').value);
    const minimo = parseInt(document.getElementById('adminProdMinStock').value);
    
    if (!codigo || !nombre || isNaN(categoria) || isNaN(precio) || precio <= 0 || isNaN(stock) || stock < 0) {
        showAdminMessage('Faltan datos o hay valores inválidos', 'error');
        return;
    }
    
    const nuevoProducto = {
        codigo,
        nombre,
        marca,
        categoria_id: categoria,
        precio,
        stock,
        stock_minimo: minimo,
        activo: true
    };
    
    try {
        const { error } = await supabaseClient.from('productos').insert([nuevoProducto]);
        
        if (error) {
            console.error(error);
            let msg = 'Error al guardar';
            if (error.code === '23505') msg += ' → Código ya existe';
            showAdminMessage(msg, 'error');
        } else {
            showAdminMessage('✅ Producto agregado correctamente', 'success');
            
            setTimeout(() => {
                if (adminCurrentCategory) {
                    showAdminProductView(adminCurrentCategory);
                } else {
                    showAdminCategoryView();
                }
            }, 1500);
        }
    } catch (error) {
        console.error('Error:', error);
        showAdminMessage('Error al conectar con Supabase', 'error');
    }
});

function showAdminMessage(text, type) {
    const msg = document.getElementById('adminMessage');
    msg.textContent = text;
    msg.className = 'admin-message ' + type;
    msg.style.display = 'block';
}

// ============================================================
// DEVOLUCIONES - VERSIÓN CON TU TABLA EXISTENTE
// ============================================================

// Mostrar modal de devolución
function showReturnModal() {
    updateReturnOptions();
    document.getElementById('returnModal').style.display = 'block';
}

function closeReturnModal() {
    document.getElementById('returnModal').style.display = 'none';
    document.getElementById('returnSearchInput').value = '';
}

// Actualizar opciones de devolución
async function updateReturnOptions() {
    const tbody = document.getElementById('returnBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando ventas...</td></tr>';

    try {
        // ===================================================
        // 1. PRODUCTOS DE LA VENTA ACTUAL
        // ===================================================
        const ventaActualHTML = productosEnVenta.map(p => `
            <tr data-codigo="${p.codigo}" data-source="actual" data-producto-id="${p.id}" data-venta-id="actual">
                <td>${p.marca}</td>
                <td>${p.nombre}</td>
                <td>${p.codigo}</td>
                <td>${p.cantidad}</td>
                <td><input type="number" min="0" max="${p.cantidad}" value="0" onchange="updateReturnSubtotal(this, ${p.precio})"></td>
                <td>$${p.precio.toFixed(2)}</td>
                <td class="return-subtotal" id="sub_${p.codigo}">$0.00</td>
            </tr>
        `).join('');

        // ===================================================
        // 2. VENTAS ANTERIORES (últimos 7 días)
        // ===================================================
        const { data: ventas, error } = await supabaseClient
            .from('ventas')
            .select(`
                id,
                fecha,
                detalle_ventas (
                    id,
                    cantidad,
                    precio_unit,
                    producto_id,
                    productos (
                        codigo,
                        nombre,
                        marca
                    )
                )
            `)
            .gte('fecha', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('fecha', { ascending: false });

        if (error) throw error;

        // Verificar productos ya devueltos
        const { data: devolucionesExistentes } = await supabaseClient
            .from('devoluciones')
            .select('detalle_venta_id, cantidad');

        const devueltosMap = new Map();
        devolucionesExistentes?.forEach(d => {
            devueltosMap.set(d.detalle_venta_id, (devueltosMap.get(d.detalle_venta_id) || 0) + d.cantidad);
        });

        // Generar HTML de ventas anteriores
        const ventasAnterioresHTML = ventas?.map(venta => {
            return venta.detalle_ventas.map(detalle => {
                const yaDevuelto = devueltosMap.get(detalle.id) || 0;
                const disponible = detalle.cantidad - yaDevuelto;
                
                if (disponible <= 0) return ''; // Ya se devolvió todo
                
                return `
                    <tr data-venta-id="${venta.id}" 
                        data-detalle-venta-id="${detalle.id}"
                        data-producto-id="${detalle.producto_id}"
                        data-codigo="${detalle.productos.codigo}"
                        data-source="anterior"
                        data-max="${disponible}">
                        <td>${detalle.productos.marca || 'N/A'}</td>
                        <td>${detalle.productos.nombre}</td>
                        <td>${detalle.productos.codigo}</td>
                        <td>${disponible}</td>
                        <td><input type="number" min="0" max="${disponible}" value="0" onchange="updateReturnSubtotal(this, ${detalle.precio_unit})"></td>
                        <td>$${detalle.precio_unit.toFixed(2)}</td>
                        <td class="return-subtotal" id="sub_${detalle.productos.codigo}_${detalle.id}">$0.00</td>
                    </tr>
                `;
            }).join('');
        }).join('') || '';

        tbody.innerHTML = ventaActualHTML + ventasAnterioresHTML;
        
        if (tbody.children.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="empty-row">No hay productos disponibles para devolver</td></tr>';
        }

    } catch (error) {
        console.error('Error cargando ventas:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="error-row">Error al cargar ventas</td></tr>';
    }
}

// Actualizar subtotal
function updateReturnSubtotal(input, precio) {
    const row = input.closest('tr');
    const subtotalCell = row.querySelector('.return-subtotal');
    const cantidad = parseInt(input.value) || 0;
    subtotalCell.textContent = `$${(cantidad * precio).toFixed(2)}`;
}

// Buscar en devoluciones
function searchReturns() {
    const query = document.getElementById('returnSearchInput').value.toLowerCase();
    document.querySelectorAll('#returnBody tr').forEach(row => {
        if (row.classList.contains('loading-row') || row.classList.contains('error-row') || row.classList.contains('empty-row')) return;
        
        const codigo = (row.getAttribute('data-codigo') || '').toLowerCase();
        const nombre = row.cells[1]?.textContent.toLowerCase() || '';
        const marca = row.cells[0]?.textContent.toLowerCase() || '';
        
        row.style.display = (codigo.includes(query) || nombre.includes(query) || marca.includes(query)) ? '' : 'none';
    });
}

// Procesar devolución
async function processReturn() {
    const rows = document.querySelectorAll('#returnBody tr');
    let totalDevuelto = 0;
    let devoluciones = [];

    // Filtrar filas válidas
    const filasValidas = Array.from(rows).filter(row => 
        !row.classList.contains('loading-row') && 
        !row.classList.contains('error-row') &&
        !row.classList.contains('empty-row') &&
        row.cells.length > 1
    );

    for (const row of filasValidas) {
        const input = row.querySelector('input[type="number"]');
        if (!input) continue;
        
        const cantidad = parseInt(input.value) || 0;
        if (cantidad <= 0) continue;

        const ventaId = row.getAttribute('data-venta-id');
        const detalleVentaId = row.getAttribute('data-detalle-venta-id');
        const productoId = row.getAttribute('data-producto-id');
        const source = row.getAttribute('data-source');
        const max = parseInt(row.getAttribute('data-max') || row.cells[3]?.textContent || 0);

        // Validar cantidad
        if (cantidad > max) {
            alert(`Error: No puedes devolver más de ${max} unidades de este producto`);
            return;
        }

        if (source === 'actual') {
            // Devolución de la venta actual
            const productIndex = productosEnVenta.findIndex(p => p.id == productoId);
            if (productIndex >= 0) {
                productosEnVenta[productIndex].cantidad -= cantidad;
                if (productosEnVenta[productIndex].cantidad === 0) {
                    productosEnVenta.splice(productIndex, 1);
                }
            }
            
            // Nota: Para venta actual no hay detalle_venta_id aún (no está guardada)
            showNotification('Devolución de venta actual procesada', 'info');
            
        } else if (source === 'anterior' && detalleVentaId) {
            // Devolución de venta anterior - guardar en Supabase
            devoluciones.push({
                venta_id: ventaId,
                detalle_venta_id: detalleVentaId,
                cantidad: cantidad,
                motivo: 'Devolución de cliente',
                fecha: new Date().toISOString()
            });
        }

        totalDevuelto += cantidad;
    }

    if (devoluciones.length === 0 && totalDevuelto === 0) {
        alert('No hay cantidades a devolver');
        return;
    }

    // Guardar devoluciones en Supabase
    if (devoluciones.length > 0) {
        try {
            const { error } = await supabaseClient
                .from('devoluciones')
                .insert(devoluciones);

            if (error) throw error;
            
        } catch (error) {
            console.error('Error guardando devolución:', error);
            alert('Error al procesar la devolución: ' + error.message);
            return;
        }
    }

    // Actualizar tabla de ventas
    renderSalesTable();
    
    // Mostrar resumen
    let mensaje = `✅ Devolución procesada correctamente.\n`;
    mensaje += `Total devuelto: ${totalDevuelto} artículo(s).\n`;
    if (devoluciones.length > 0) {
        mensaje += `Devoluciones guardadas en base de datos: ${devoluciones.length}`;
    }
    alert(mensaje);
    
    closeReturnModal();
}

// ============================================================
// FUNCIÓN PARA VER HISTORIAL DE DEVOLUCIONES (opcional)
// ============================================================
async function verHistorialDevoluciones() {
    try {
        const { data, error } = await supabaseClient
            .from('devoluciones')
            .select(`
                *,
                ventas (fecha, total),
                detalle_ventas (
                    cantidad,
                    precio_unit,
                    productos (nombre, codigo, marca)
                )
            `)
            .order('fecha', { ascending: false })
            .limit(20);

        if (error) throw error;

        console.log('📜 Historial de devoluciones:', data);
        return data;
        
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}



// ============================================================
// CIERRE DE MODALES
// ============================================================
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('inventoryModal')) closeInventoryModal();
    if (e.target === document.getElementById('returnModal')) closeReturnModal();
    if (e.target === document.getElementById('paymentModal')) closePaymentModal();
    if (e.target === document.getElementById('adminModal')) {
        closeAdminModal();
    }
    if (e.target === document.getElementById('loginModal')) closeLoginModal();
});

// ============================================================
// INICIALIZACIÓN
// ============================================================
window.onload = async function() {
    updateDateTime();
    await verificarYCrearCategorias();
    await loadCategories();
    updateEmptyState();
    cleanOldReturns();
    
    try {
        await supabaseClient.rpc('limpiar_ventas_antiguas');
    } catch (error) {
        console.log('Función limpiar_ventas_antiguas no disponible aún');
    }
};