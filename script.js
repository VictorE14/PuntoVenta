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
    
    const iconos = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle'
    };
    
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${iconos[type] || 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.display = 'flex';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// ============================================================
// FUNCIÓN CLEANOLDRETURNS
// ============================================================
function cleanOldReturns() {
    console.log('🧹 Limpiando devoluciones antiguas...');
    return [];
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
// AGREGAR PRODUCTO A LA VENTA
// ============================================================
async function addProductToSale(productId) {
    console.log('🔄 Intentando agregar producto con ID:', productId);
    
    try {
        if (!document.getElementById('total')) {
            console.error('❌ Elemento #total no encontrado en el DOM');
            return;
        }
        
        const { data: product, error } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('id', productId)
            .eq('activo', true)
            .single();
        
        if (error) {
            console.error('❌ Error al cargar producto:', error);
            alert('Error al cargar el producto: ' + error.message);
            return;
        }
        
        if (!product) {
            console.error('❌ Producto no encontrado');
            alert('Producto no encontrado');
            return;
        }
        
        console.log('✅ Producto encontrado:', product);
        
        if (product.stock <= 0) {
            alert(`❌ Producto "${product.nombre}" sin stock disponible`);
            return;
        }
        
        const existingProductIndex = productosEnVenta.findIndex(p => p.id === product.id);
        
        if (existingProductIndex >= 0) {
            const newQty = productosEnVenta[existingProductIndex].cantidad + 1;
            
            if (newQty > product.stock) {
                alert(`⚠️ Solo hay ${product.stock} unidades disponibles de "${product.nombre}"`);
                return;
            }
            
            productosEnVenta[existingProductIndex].cantidad = newQty;
            console.log(`✅ Cantidad incrementada: ahora ${newQty} unidades`);
            
        } else {
            productosEnVenta.push({
                id: product.id,
                codigo: product.codigo,
                nombre: product.nombre,
                marca: product.marca || 'Sin marca',
                precio: parseFloat(product.precio),
                cantidad: 1,
                stock: product.stock,
                stock_minimo: product.stock_minimo,
                precio_proveedor: product.precio_proveedor || 0
            });
            console.log('✅ Nuevo producto agregado a la venta');
        }
        
        renderSalesTable();
        closeInventoryModal();
        showNotification(`✅ "${product.nombre}" agregado`, 'success');
        
    } catch (error) {
        console.error('❌ Error inesperado:', error);
        alert('Error al agregar producto: ' + error.message);
    }
}

async function addProductToSaleFromSearch(productId, codigo) {
    console.log('🔍 Agregando desde búsqueda:', { productId, codigo });
    await addProductToSale(productId);
}

// ============================================================
// RENDERIZAR TABLA DE VENTAS (CORREGIDO)
// ============================================================
function renderSalesTable() {
    const salesBody = document.getElementById('salesBody');
    const salesTable = document.getElementById('salesTable');
    const emptyState = document.getElementById('emptyState');
    
    if (!salesBody || !salesTable || !emptyState) {
        console.error('❌ No se encontraron elementos del DOM');
        return;
    }
    
    // Siempre mostrar la tabla para mantener la cabecera visible
    salesTable.style.display = 'table';
    
    if (productosEnVenta.length === 0) {
        // No hay productos: cuerpo vacío y mostrar emptyState
        salesBody.innerHTML = '';
        emptyState.style.display = 'flex';
    } else {
        // Hay productos: renderizar filas y ocultar emptyState
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
        
        emptyState.style.display = 'none';
    }
    
    // Siempre actualizar el total (aunque sea 0)
    updateTotal();
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
// LIMPIAR VENTA (CORREGIDO)
// ============================================================
function clearAll() {
    if (productosEnVenta.length === 0) return;
    if (!confirm('¿Deseas limpiar toda la venta actual?')) return;
    
    productosEnVenta = [];
    renderSalesTable(); // Esto ya maneja correctamente el estado vacío
}

// ============================================================
// ACTUALIZAR TOTAL
// ============================================================
function updateTotal() {
    const totalElement = document.getElementById('total');
    if (!totalElement) {
        console.error('❌ No se encontró el elemento #total');
        return;
    }
    
    const total = productosEnVenta.reduce((sum, p) => sum + (p.cantidad * p.precio), 0);
    totalElement.textContent = `$${total.toFixed(2)}`;
    console.log('✅ Total actualizado:', `$${total.toFixed(2)}`);
}

// ============================================================
// ESTADO VACÍO (CORREGIDO)
// ============================================================
function updateEmptyState() {
    const salesBody = document.getElementById('salesBody');
    const emptyState = document.getElementById('emptyState');
    const salesTable = document.getElementById('salesTable');
    
    if (!salesBody || !emptyState || !salesTable) return;
    
    const hasRows = productosEnVenta.length > 0;
    
    // Siempre mostrar la tabla (para que se vea la cabecera)
    salesTable.style.display = 'table';
    
    if (hasRows) {
        // Hay productos: ocultar emptyState, mostrar filas
        emptyState.style.display = 'none';
        // Las filas ya se renderizan en renderSalesTable
    } else {
        // No hay productos: mostrar emptyState, asegurar que no hay filas
        emptyState.style.display = 'flex';
        salesBody.innerHTML = ''; // Asegurar que no hay filas
    }
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
    renderSalesTable(); // Esto mantendrá la cabecera visible
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
// MODAL ADMIN - GESTIÓN DE PRODUCTOS (ACTUALIZADO)
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
        
        grid.innerHTML = productos.map(p => {
            const utilidad = p.precio - (p.precio_proveedor || 0);
            const porcentajeUtilidad = p.precio_proveedor > 0 ? ((utilidad / p.precio_proveedor) * 100).toFixed(1) : 0;
            
            return `
            <div class="admin-product-card ${p.stock <= p.stock_minimo ? 'low-stock' : ''}">
                <div class="admin-product-header">
                    <span class="admin-product-brand">${p.marca || 'Sin marca'}</span>
                    <span class="admin-product-code">Cód: ${p.codigo}</span>
                </div>
                <div class="admin-product-name">${p.nombre}</div>
                
                <div class="admin-product-details">
                    <div class="admin-product-price">
                        <label>Precio Público</label>
                        <input type="number" id="price_${p.id}" value="${p.precio}" min="0" step="0.01" class="admin-edit-input">
                    </div>
                    <div class="admin-product-price-prov">
                        <label>Precio Prov.</label>
                        <input type="number" id="price_prov_${p.id}" value="${p.precio_proveedor || 0}" min="0" step="0.01" class="admin-edit-input">
                    </div>
                </div>
                
                <div class="admin-product-details">
                    <div class="admin-product-stock">
                        <label>Stock</label>
                        <input type="number" id="stock_${p.id}" value="${p.stock}" min="0" class="admin-edit-input">
                    </div>
                    <div class="admin-product-minstock">
                        <label>Stock Mín.</label>
                        <input type="number" id="minstock_${p.id}" value="${p.stock_minimo || 1}" min="1" class="admin-edit-input">
                    </div>
                </div>
                
                <div class="admin-product-utilidad">
                    <span class="utilidad-label">Utilidad:</span>
                    <span class="utilidad-value ${utilidad > 0 ? 'positiva' : 'negativa'}">
                        $${utilidad.toFixed(2)} (${porcentajeUtilidad}%)
                    </span>
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
        `}).join('');
        
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
    const precioProveedor = parseFloat(document.getElementById(`price_prov_${productId}`).value);
    const stock = parseInt(document.getElementById(`stock_${productId}`).value);
    const stockMinimo = parseInt(document.getElementById(`minstock_${productId}`).value);
    
    if (isNaN(precio) || precio < 0) {
        alert('El precio público debe ser un número válido');
        return;
    }
    
    if (isNaN(precioProveedor) || precioProveedor < 0) {
        alert('El precio proveedor debe ser un número válido');
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
                precio_proveedor: precioProveedor,
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
    const precioProveedor = parseFloat(document.getElementById('adminProdPriceProveedor').value);
    const stock = parseInt(document.getElementById('adminProdStock').value);
    const minimo = parseInt(document.getElementById('adminProdMinStock').value);
    
    if (!codigo || !nombre || isNaN(categoria) || isNaN(precio) || precio <= 0 || isNaN(precioProveedor) || precioProveedor < 0 || isNaN(stock) || stock < 0) {
        showAdminMessage('Faltan datos o hay valores inválidos', 'error');
        return;
    }
    
    const nuevoProducto = {
        codigo,
        nombre,
        marca,
        categoria_id: categoria,
        precio: precio,
        precio_proveedor: precioProveedor,
        stock: stock,
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
// REPORTE DE STOCK MÍNIMO (VERSIÓN CORREGIDA)
// ============================================================

let productosStockBajo = [];

// Mostrar modal de reporte
async function showReporteStockModal() {
    // Establecer fecha actual por defecto
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('reporteFecha').value = today;
    
    // Cargar categorías en el select
    await cargarCategoriasReporte();
    
    // Cargar datos del reporte
    await cargarReporteStock();
    
    document.getElementById('reporteStockModal').style.display = 'block';
}

function closeReporteStockModal() {
    document.getElementById('reporteStockModal').style.display = 'none';
}

// Cargar categorías en el select
async function cargarCategoriasReporte() {
    const select = document.getElementById('reporteCategoria');
    select.innerHTML = '<option value="todas">Cargando...</option>';
    
    try {
        const { data: categorias, error } = await supabaseClient
            .from('categorias')
            .select('*')
            .order('nombre');
        
        if (error) throw error;
        
        select.innerHTML = '<option value="todas">Todas las categorías</option>';
        
        categorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando categorías:', error);
        select.innerHTML = '<option value="todas">Error al cargar</option>';
    }
}

// ============================================================
// CARGAR REPORTE DE STOCK MÍNIMO (CORREGIDO)
// ============================================================
async function cargarReporteStock() {
    const fecha = document.getElementById('reporteFecha').value;
    const categoriaId = document.getElementById('reporteCategoria').value;
    
    const tbody = document.getElementById('reporteStockBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading-row"><i class="fas fa-spinner fa-spin"></i> Cargando productos...</td></tr>';
    }
    
    try {
        console.log('🔍 Cargando reporte de stock mínimo...');
        
        // Consulta directa a la tabla productos
        let query = supabaseClient
            .from('productos')
            .select(`
                *,
                categorias (nombre)
            `)
            .eq('activo', true);
        
        // Aplicar filtro de categoría
        if (categoriaId !== 'todas') {
            query = query.eq('categoria_id', categoriaId);
        }
        
        // Aplicar filtro de fecha
        if (fecha) {
            query = query.lte('fecha_actualizacion', `${fecha}T23:59:59`);
        }
        
        const { data: todosProductos, error } = await query;
        
        if (error) throw error;
        
        console.log(`📦 Total productos activos: ${todosProductos?.length || 0}`);
        
        // FILTRAR productos con stock <= stock_minimo (en JavaScript)
        productosStockBajo = todosProductos.filter(p => {
            return p.stock <= p.stock_minimo;
        });
        
        console.log(`📊 Productos con stock bajo: ${productosStockBajo.length}`);
        
        // Mostrar cada producto para debug
        productosStockBajo.forEach(p => {
            const faltante = Math.max(0, p.stock_minimo - p.stock);
            const costo = faltante * (p.precio_proveedor || 0);
            console.log(`   - ${p.nombre}: Stock ${p.stock}/${p.stock_minimo}, Faltante: ${faltante}, Precio Prov: $${p.precio_proveedor || 0}, Costo: $${costo}`);
        });
        
        // Ordenar por estado (agotados primero, luego bajo stock)
        productosStockBajo.sort((a, b) => {
            const aCritico = a.stock === 0 ? 0 : (a.stock < a.stock_minimo ? 1 : 2);
            const bCritico = b.stock === 0 ? 0 : (b.stock < b.stock_minimo ? 1 : 2);
            if (aCritico !== bCritico) return aCritico - bCritico;
            return a.nombre.localeCompare(b.nombre);
        });
        
        // Calcular totales
        const totalProductos = productosStockBajo.length;
        const productosConFaltante = productosStockBajo.filter(p => p.stock < p.stock_minimo).length;
        const productosAgotados = productosStockBajo.filter(p => p.stock === 0).length;
        
        const totalCosto = productosStockBajo.reduce((sum, p) => {
            if (p.stock < p.stock_minimo) {
                const cantidadFaltante = p.stock_minimo - p.stock;
                return sum + (cantidadFaltante * (p.precio_proveedor || 0));
            }
            return sum;
        }, 0);
        
        // Actualizar resumen
        const totalElement = document.getElementById('totalProductosBajo');
        if (totalElement) {
            totalElement.textContent = `${totalProductos} (${productosConFaltante} con faltante, ${productosAgotados} agotados)`;
        }
        
        const costoElement = document.getElementById('totalCostoReposicion');
        if (costoElement) {
            costoElement.textContent = `$${totalCosto.toFixed(2)}`;
        }
        
        // Renderizar tabla
        renderReporteStockTable();
        
    } catch (error) {
        console.error('❌ Error cargando reporte:', error);
        const tbody = document.getElementById('reporteStockBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" class="error-row">Error al cargar datos: ${error.message}</td></tr>`;
        }
    }
}

// ============================================================
// RENDERIZAR TABLA DE REPORTE (CORREGIDA)
// ============================================================
function renderReporteStockTable() {
    const tbody = document.getElementById('reporteStockBody');
    const foot = document.getElementById('reporteTotalFoot');
    
    if (!tbody || !foot) {
        console.error('❌ No se encontraron elementos de la tabla de reporte');
        return;
    }
    
    if (productosStockBajo.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-row">No hay productos con stock mínimo</td></tr>';
        foot.textContent = '$0.00';
        return;
    }
    
    let totalGeneral = 0;
    let productosConFaltante = 0;
    let productosAgotados = 0;
    
    tbody.innerHTML = productosStockBajo.map(p => {
        const stockActual = p.stock;
        const stockMinimo = p.stock_minimo;
        const precioProv = p.precio_proveedor || 0;
        
        // Calcular faltante y costo
        let costoReposicion = 0;
        let faltante = 0;
        let estadoClass = '';
        let estadoTexto = '';
        
        if (stockActual === 0) {
            // Producto agotado
            productosAgotados++;
            faltante = stockMinimo;
            costoReposicion = faltante * precioProv;
            estadoClass = 'stock-cero';
            estadoTexto = '🔥 AGOTADO';
        } else if (stockActual < stockMinimo) {
            // Producto con stock bajo
            productosConFaltante++;
            faltante = stockMinimo - stockActual;
            costoReposicion = faltante * precioProv;
            estadoClass = 'stock-bajo';
            estadoTexto = `⚠️ Faltan ${faltante}`;
        } else {
            // Producto en mínimo exacto (stock === stock_minimo)
            estadoClass = 'stock-ok';
            estadoTexto = '✓ Completo';
            costoReposicion = 0;
        }
        
        totalGeneral += costoReposicion;
        
        return `
            <tr class="${estadoClass}">
                <td>${p.codigo}</td>
                <td>${p.nombre}</td>
                <td>${p.marca || 'N/A'}</td>
                <td>${p.categorias?.nombre || 'N/A'}</td>
                <td class="stock-actual">${stockActual}</td>
                <td>${stockMinimo}</td>
                <td class="precio-proveedor">$${precioProv.toFixed(2)}</td>
                <td class="costo-reposicion">$${costoReposicion.toFixed(2)}</td>
                <td class="estado-cell">${estadoTexto}</td>
            </tr>
        `;
    }).join('');
    
    // Actualizar el pie de tabla con el total
    foot.textContent = `$${totalGeneral.toFixed(2)}`;
    
    // Actualizar el resumen superior
    const totalElement = document.getElementById('totalProductosBajo');
    const costoElement = document.getElementById('totalCostoReposicion');
    
    if (totalElement) {
        totalElement.textContent = `${productosStockBajo.length} (${productosConFaltante} con faltante, ${productosAgotados} agotados)`;
    }
    
    if (costoElement) {
        costoElement.textContent = `$${totalGeneral.toFixed(2)}`;
    }
    
    console.log('✅ Reporte actualizado:', {
        totalProductos: productosStockBajo.length,
        conFaltante: productosConFaltante,
        agotados: productosAgotados,
        costoTotal: totalGeneral
    });
}

// Filtrar reporte por categoría
document.getElementById('reporteCategoria')?.addEventListener('change', cargarReporteStock);
document.getElementById('reporteFecha')?.addEventListener('change', cargarReporteStock);

// ============================================================
// EXPORTAR REPORTE A PDF
// ============================================================
async function exportarReporteStockPDF() {
    const fecha = document.getElementById('reporteFecha').value;
    const categoria = document.getElementById('reporteCategoria').selectedOptions[0]?.text || 'Todas';
    
    if (productosStockBajo.length === 0) {
        showNotification('No hay datos para exportar', 'warning');
        return;
    }
    
    showNotification('Generando PDF...', 'info');
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título
        doc.setFontSize(20);
        doc.setTextColor(230, 81, 0);
        doc.text('Reporte de Stock Mínimo', 105, 20, { align: 'center' });
        
        // Subtítulo
        doc.setFontSize(12);
        doc.setTextColor(100);
        doc.text('Ferretería Alex', 105, 28, { align: 'center' });
        
        // Fecha del reporte
        const fechaFormateada = fecha ? new Date(fecha).toLocaleDateString('es-MX') : 'Actual';
        doc.text(`Fecha: ${fechaFormateada} | Categoría: ${categoria}`, 105, 36, { align: 'center' });
        
        // Resumen
        const totalCosto = document.getElementById('totalCostoReposicion').textContent;
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text(`Productos con stock bajo: ${productosStockBajo.length}`, 20, 48);
        doc.text(`Costo total reposición: ${totalCosto}`, 20, 55);
        
        // Tabla de productos
        const tableData = productosStockBajo.map(p => {
            const faltante = Math.max(0, p.stock_minimo - p.stock);
            const costo = faltante * (p.precio_proveedor || 0);
            return [
                p.codigo,
                p.nombre.substring(0, 30),
                p.stock.toString(),
                p.stock_minimo.toString(),
                `$${(p.precio_proveedor || 0).toFixed(2)}`,
                `$${costo.toFixed(2)}`
            ];
        });
        
        doc.autoTable({
            startY: 65,
            head: [['Código', 'Producto', 'Stock', 'Mínimo', 'P. Prov.', 'Costo']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [230, 81, 0] },
            foot: [['', '', '', '', 'TOTAL:', document.getElementById('reporteTotalFoot').textContent]],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        });
        
        // Nota al pie
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text('Este reporte muestra los productos que requieren reposición.', 20, finalY);
        doc.text('Los costos se calculan según el precio de proveedor.', 20, finalY + 5);
        doc.text(`Generado el ${new Date().toLocaleString()}`, 20, finalY + 10);
        
        // Guardar PDF
        const nombreArchivo = `Reporte_Stock_Minimo_${fecha || 'actual'}.pdf`;
        doc.save(nombreArchivo);
        showNotification('✅ PDF generado correctamente', 'success');
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        showNotification('Error al generar PDF: ' + error.message, 'error');
    }
}

// ============================================================
// DEVOLUCIONES POR DÍA - FUNCIONES
// ============================================================

let ventasDelDia = [];
let devolucionesDelDia = [];
let selectedReturns = new Map();

function showReturnModal() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('returnDate').value = today;
    selectedReturns.clear();
    loadSalesByDate();
    document.getElementById('returnModal').style.display = 'block';
}

function closeReturnModal() {
    document.getElementById('returnModal').style.display = 'none';
}

function switchReturnTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    if (tab === 'ventas') {
        document.querySelector('.tab-btn:first-child').classList.add('active');
        document.getElementById('ventasDiaPanel').classList.add('active');
    } else {
        document.querySelector('.tab-btn:last-child').classList.add('active');
        document.getElementById('historialPanel').classList.add('active');
        loadHistorialDevoluciones();
    }
}

async function loadSalesByDate() {
    const fecha = document.getElementById('returnDate').value;
    if (!fecha) return;
    
    const startDate = `${fecha}T00:00:00`;
    const endDate = `${fecha}T23:59:59`;
    
    try {
        const { data: ventas, error } = await supabaseClient
            .from('ventas')
            .select(`
                id,
                fecha,
                total,
                metodo_pago,
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
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: false });
        
        if (error) throw error;
        
        ventasDelDia = ventas || [];
        await loadReturnsByDate(fecha);
        updateDateSummary();
        renderVentasDia();
        
    } catch (error) {
        console.error('Error cargando ventas:', error);
        showNotification('Error al cargar ventas', 'error');
    }
}

async function loadReturnsByDate(fecha) {
    const startDate = `${fecha}T00:00:00`;
    const endDate = `${fecha}T23:59:59`;
    
    try {
        const { data: devoluciones, error } = await supabaseClient
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
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: false });
        
        if (error) throw error;
        
        devolucionesDelDia = devoluciones || [];
        
    } catch (error) {
        console.error('Error cargando devoluciones:', error);
    }
}

function updateDateSummary() {
    const totalVentas = ventasDelDia.length;
    const totalDevuelto = devolucionesDelDia.reduce((sum, d) => {
        return sum + (d.cantidad * d.detalle_ventas?.precio_unit || 0);
    }, 0);
    
    document.getElementById('totalVentasDia').textContent = totalVentas;
    document.getElementById('totalDevueltoDia').textContent = `$${totalDevuelto.toFixed(2)}`;
}

function renderVentasDia() {
    const container = document.getElementById('ventasDiaContainer');
    
    if (ventasDelDia.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No hay ventas en esta fecha</p></div>';
        return;
    }
    
    container.innerHTML = ventasDelDia.map(venta => {
        const productosDevueltos = devolucionesDelDia
            .filter(d => d.venta_id === venta.id)
            .reduce((map, d) => {
                map.set(d.detalle_venta_id, (map.get(d.detalle_venta_id) || 0) + d.cantidad);
                return map;
            }, new Map());
        
        return `
            <div class="venta-card" data-venta-id="${venta.id}">
                <div class="venta-header" onclick="toggleVentaDetalle(this)">
                    <div class="venta-header-left">
                        <input type="checkbox" onchange="toggleVentaSeleccion(this, ${venta.id})" onclick="event.stopPropagation()">
                        <div class="venta-info">
                            <span><i class="fas fa-clock"></i> ${new Date(venta.fecha).toLocaleTimeString()}</span>
                            <span><i class="fas fa-credit-card"></i> ${venta.metodo_pago}</span>
                            <span class="venta-total">$${venta.total.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="venta-header-right">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="venta-detalle">
                    <table>
                        <thead>
                            <tr>
                                <th>Seleccionar</th>
                                <th>Producto</th>
                                <th>Código</th>
                                <th>Disponible</th>
                                <th>Cantidad</th>
                                <th>Precio</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${venta.detalle_ventas.map(detalle => {
                                const yaDevuelto = productosDevueltos.get(detalle.id) || 0;
                                const disponible = detalle.cantidad - yaDevuelto;
                                
                                if (disponible <= 0) return '';
                                
                                return `
                                    <tr data-detalle-id="${detalle.id}">
                                        <td>
                                            <div class="producto-checkbox">
                                                <input type="checkbox" 
                                                    onchange="toggleProductoSeleccion(this, '${venta.id}', '${detalle.id}')">
                                            </div>
                                        </td>
                                        <td>${detalle.productos.nombre}</td>
                                        <td>${detalle.productos.codigo}</td>
                                        <td>${disponible}</td>
                                        <td>
                                            <input type="number" 
                                                class="cantidad-input" 
                                                min="1" 
                                                max="${disponible}" 
                                                value="1"
                                                data-detalle-id="${detalle.id}"
                                                onchange="updateSelectedQuantity('${venta.id}', '${detalle.id}', this.value)">
                                        </td>
                                        <td>$${detalle.precio_unit.toFixed(2)}</td>
                                        <td class="subtotal-${detalle.id}">$${detalle.precio_unit.toFixed(2)}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }).join('');
    
    updateSelectedCount();
}

function toggleVentaDetalle(header) {
    const detalle = header.nextElementSibling;
    detalle.classList.toggle('expanded');
    const icon = header.querySelector('.fa-chevron-down, .fa-chevron-up');
    if (icon) {
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
    }
}

function toggleVentaSeleccion(checkbox, ventaId) {
    const ventaCard = checkbox.closest('.venta-card');
    const productoCheckboxes = ventaCard.querySelectorAll('.producto-checkbox input[type="checkbox"]');
    
    productoCheckboxes.forEach(cb => {
        cb.checked = checkbox.checked;
        if (checkbox.checked) {
            const row = cb.closest('tr');
            const detalleId = row.dataset.detalleId;
            const cantidad = row.querySelector('.cantidad-input').value;
            selectedReturns.set(`${ventaId}-${detalleId}`, {
                ventaId,
                detalleId,
                cantidad: parseInt(cantidad)
            });
        } else {
            const detalleId = row.dataset.detalleId;
            selectedReturns.delete(`${ventaId}-${detalleId}`);
        }
    });
    
    updateSelectedCount();
}

function toggleProductoSeleccion(checkbox, ventaId, detalleId) {
    const key = `${ventaId}-${detalleId}`;
    
    if (checkbox.checked) {
        const row = checkbox.closest('tr');
        const cantidad = row.querySelector('.cantidad-input').value;
        selectedReturns.set(key, {
            ventaId,
            detalleId,
            cantidad: parseInt(cantidad)
        });
    } else {
        selectedReturns.delete(key);
        
        const ventaCard = checkbox.closest('.venta-card');
        const ventaCheckbox = ventaCard.querySelector('.venta-header-left > input[type="checkbox"]');
        const otrosCheckboxes = ventaCard.querySelectorAll('.producto-checkbox input[type="checkbox"]:checked');
        if (otrosCheckboxes.length === 0) {
            ventaCheckbox.checked = false;
        }
    }
    
    updateSelectedCount();
}

function updateSelectedQuantity(ventaId, detalleId, cantidad) {
    const key = `${ventaId}-${detalleId}`;
    if (selectedReturns.has(key)) {
        const item = selectedReturns.get(key);
        item.cantidad = parseInt(cantidad);
        selectedReturns.set(key, item);
        
        const row = document.querySelector(`tr[data-detalle-id="${detalleId}"]`);
        const precio = parseFloat(row.cells[5].textContent.replace('$', ''));
        row.querySelector(`.subtotal-${detalleId}`).textContent = `$${(precio * cantidad).toFixed(2)}`;
    }
}

function updateSelectedCount() {
    const count = selectedReturns.size;
    document.getElementById('selectedCount').textContent = 
        `${count} producto${count !== 1 ? 's' : ''} seleccionado${count !== 1 ? 's' : ''}`;
}

async function procesarDevolucionesSeleccionadas() {
    if (selectedReturns.size === 0) {
        alert('No hay productos seleccionados para devolver');
        return;
    }
    
    if (!confirm(`¿Procesar devolución de ${selectedReturns.size} producto(s)?`)) {
        return;
    }
    
    const devoluciones = [];
    const fecha = new Date().toISOString();
    
    for (const [key, item] of selectedReturns) {
        devoluciones.push({
            venta_id: parseInt(item.ventaId),
            detalle_venta_id: parseInt(item.detalleId),
            cantidad: item.cantidad,
            motivo: 'Devolución en mostrador',
            fecha: fecha
        });
    }
    
    try {
        const { error } = await supabaseClient
            .from('devoluciones')
            .insert(devoluciones);
        
        if (error) throw error;
        
        showNotification(`✅ ${devoluciones.length} devolución(es) procesada(s)`, 'success');
        
        selectedReturns.clear();
        await loadSalesByDate();
        updateSelectedCount();
        
    } catch (error) {
        console.error('Error procesando devoluciones:', error);
        showNotification('Error al procesar devoluciones', 'error');
    }
}

async function loadHistorialDevoluciones() {
    const container = document.getElementById('historialContainer');
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando historial...</div>';
    
    try {
        const { data: devoluciones, error } = await supabaseClient
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
            .limit(50);
        
        if (error) throw error;
        
        if (!devoluciones || devoluciones.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No hay devoluciones registradas</p></div>';
            return;
        }
        
        const grouped = devoluciones.reduce((acc, dev) => {
            const fecha = new Date(dev.fecha).toLocaleDateString();
            if (!acc[fecha]) acc[fecha] = [];
            acc[fecha].push(dev);
            return acc;
        }, {});
        
        container.innerHTML = Object.entries(grouped).map(([fecha, items]) => `
            <div class="historial-group">
                <h3 class="historial-group-title">${fecha}</h3>
                ${items.map(dev => `
                    <div class="historial-card">
                        <div class="historial-header">
                            <span class="historial-fecha">
                                <i class="fas fa-clock"></i> ${new Date(dev.fecha).toLocaleTimeString()}
                            </span>
                            <span class="historial-total">
                                Venta: $${dev.ventas?.total?.toFixed(2) || '0.00'}
                            </span>
                        </div>
                        <div class="historial-producto">
                            <span>${dev.detalle_ventas?.productos?.nombre || 'Producto'}</span>
                            <span>Cantidad: ${dev.cantidad} x $${dev.detalle_ventas?.precio_unit?.toFixed(2) || '0.00'}</span>
                        </div>
                        ${dev.motivo ? `<div class="historial-motivo">Motivo: ${dev.motivo}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando historial:', error);
        container.innerHTML = '<div class="error-state"><i class="fas fa-exclamation-circle"></i><p>Error al cargar historial</p></div>';
    }
}

function filterVentasDia() {
    const query = document.getElementById('ventasDiaSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.venta-card');
    
    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(query) ? '' : 'none';
    });
}

function filterHistorial() {
    const query = document.getElementById('historialSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.historial-card');
    
    cards.forEach(card => {
        const texto = card.textContent.toLowerCase();
        card.style.display = texto.includes(query) ? '' : 'none';
    });
}

// ============================================================
// CORTE DE CAJA - FUNCIONES
// ============================================================

let currentCorteData = {
    ventas: [],
    devoluciones: []
};

function showCorteModal() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('corteDate').value = today;
    document.getElementById('corteModal').style.display = 'block';
    loadCorteData();
    loadHistorialCortes();
}

function closeCorteModal() {
    document.getElementById('corteModal').style.display = 'none';
}

async function loadCorteData() {
    const fecha = document.getElementById('corteDate').value;
    if (!fecha) return;
    
       // MODIFICADO: Inicio a las 5:00 AM
    const startDate = `${fecha}T05:00:00`;  // Inicio: 5:00 AM
    
    // MODIFICADO: Fin a las 11:00 PM
    const endDate = `${fecha}T23:00:00`;    // Fin: 11:00 PM
    
    try {
        const { data: ventas, error: ventasError } = await supabaseClient
            .from('ventas')
            .select(`
                *,
                detalle_ventas (
                    id,
                    cantidad,
                    precio_unit,
                    producto_id,
                    productos (
                        nombre,
                        codigo,
                        marca
                    )
                )
            `)
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: false });
        
        if (ventasError) throw ventasError;
        
        const { data: devoluciones, error: devError } = await supabaseClient
            .from('devoluciones')
            .select(`
                *,
                ventas (fecha, total, metodo_pago),
                detalle_ventas (
                    cantidad,
                    precio_unit,
                    productos (nombre, codigo, marca)
                )
            `)
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: false });
        
        if (devError) throw devError;
        
        currentCorteData = {
            ventas: ventas || [],
            devoluciones: devoluciones || []
        };
        
        updateCorteResumen();
        renderCorteVentas();
        renderCorteDevoluciones();
        
    } catch (error) {
        console.error('Error cargando corte:', error);
        showNotification('Error al cargar datos del corte', 'error');
    }
}

function updateCorteResumen() {
    const ventas = currentCorteData.ventas;
    const devoluciones = currentCorteData.devoluciones;
    
    const totalVentas = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const totalEfectivo = ventas
        .filter(v => v.metodo_pago === 'efectivo')
        .reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const totalTarjeta = ventas
        .filter(v => v.metodo_pago === 'tarjeta')
        .reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    
    const totalDevoluciones = devoluciones.reduce((sum, d) => {
        return sum + (d.cantidad * (d.detalle_ventas?.precio_unit || 0));
    }, 0);
    
    const numVentas = ventas.length;
    const ticketPromedio = numVentas > 0 ? totalVentas / numVentas : 0;
    const productosVendidos = ventas.reduce((sum, v) => {
        return sum + (v.detalle_ventas?.reduce((s, d) => s + d.cantidad, 0) || 0);
    }, 0);
    
    document.getElementById('corteTotalVentas').textContent = `$${totalVentas.toFixed(2)}`;
    document.getElementById('corteTotalEfectivo').textContent = `$${totalEfectivo.toFixed(2)}`;
    document.getElementById('corteTotalTarjeta').textContent = `$${totalTarjeta.toFixed(2)}`;
    document.getElementById('corteTotalDevoluciones').textContent = `$${totalDevoluciones.toFixed(2)}`;
    document.getElementById('corteNumVentas').textContent = numVentas;
    document.getElementById('corteTicketPromedio').textContent = `$${ticketPromedio.toFixed(2)}`;
    document.getElementById('corteProductosVendidos').textContent = productosVendidos;
}

function renderCorteVentas() {
    const container = document.getElementById('corteVentasLista');
    
    if (currentCorteData.ventas.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No hay ventas en esta fecha</p></div>';
        return;
    }
    
    container.innerHTML = currentCorteData.ventas.map(venta => `
        <div class="corte-venta-item" data-venta-id="${venta.id}">
            <div class="venta-info">
                <span><i class="fas fa-clock"></i> ${new Date(venta.fecha).toLocaleTimeString()}</span>
                <span><i class="fas fa-credit-card"></i> ${venta.metodo_pago}</span>
                <span><i class="fas fa-cube"></i> ${venta.detalle_ventas?.length || 0} productos</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 700; color: #00695c;">$${venta.total.toFixed(2)}</span>
                <button class="venta-detalle-btn" onclick="toggleVentaDetalleCorte('${venta.id}')">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div class="venta-detalle-expandido" id="detalle-${venta.id}">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Código</th>
                            <th>Cantidad</th>
                            <th>Precio</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${venta.detalle_ventas.map(d => `
                            <tr>
                                <td>${d.productos?.nombre || 'N/A'}</td>
                                <td>${d.productos?.codigo || 'N/A'}</td>
                                <td>${d.cantidad}</td>
                                <td>$${d.precio_unit.toFixed(2)}</td>
                                <td>$${(d.cantidad * d.precio_unit).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

function toggleVentaDetalleCorte(ventaId) {
    const detalle = document.getElementById(`detalle-${ventaId}`);
    detalle.classList.toggle('active');
    const btn = document.querySelector(`[data-venta-id="${ventaId}"] .venta-detalle-btn i`);
    if (btn) {
        btn.classList.toggle('fa-chevron-down');
        btn.classList.toggle('fa-chevron-up');
    }
}

function renderCorteDevoluciones() {
    const container = document.getElementById('corteDevolucionesLista');
    
    if (currentCorteData.devoluciones.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-undo"></i><p>No hay devoluciones en esta fecha</p></div>';
        return;
    }
    
    container.innerHTML = currentCorteData.devoluciones.map(dev => `
        <div class="corte-venta-item">
            <div class="venta-info">
                <span><i class="fas fa-clock"></i> ${new Date(dev.fecha).toLocaleTimeString()}</span>
                <span><i class="fas fa-tag"></i> ${dev.detalle_ventas?.productos?.nombre || 'Producto'}</span>
                <span><i class="fas fa-cube"></i> Cant: ${dev.cantidad}</span>
            </div>
            <div>
                <span style="font-weight: 700; color: #c62828;">
                    -$${(dev.cantidad * (dev.detalle_ventas?.precio_unit || 0)).toFixed(2)}
                </span>
            </div>
        </div>
    `).join('');
}

function switchCorteTab(tab) {
    document.querySelectorAll('.corte-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.corte-panel').forEach(panel => panel.classList.remove('active'));
    
    if (tab === 'ventas') {
        document.querySelector('.corte-tab-btn:first-child').classList.add('active');
        document.getElementById('corteVentasPanel').classList.add('active');
    } else {
        document.querySelector('.corte-tab-btn:last-child').classList.add('active');
        document.getElementById('corteDevolucionesPanel').classList.add('active');
    }
}

function filterCorteVentas() {
    const query = document.getElementById('corteVentasSearch').value.toLowerCase();
    const items = document.querySelectorAll('#corteVentasLista .corte-venta-item');
    
    items.forEach(item => {
        const texto = item.textContent.toLowerCase();
        item.style.display = texto.includes(query) ? '' : 'none';
    });
}

function filterCorteDevoluciones() {
    const query = document.getElementById('corteDevolucionesSearch').value.toLowerCase();
    const items = document.querySelectorAll('#corteDevolucionesLista .corte-venta-item');
    
    items.forEach(item => {
        const texto = item.textContent.toLowerCase();
        item.style.display = texto.includes(query) ? '' : 'none';
    });
}

async function guardarCorte() {
    const fecha = document.getElementById('corteDate').value;
    
    const { data: existente } = await supabaseClient
        .from('cierres_dia')
        .select('id')
        .eq('fecha', fecha)
        .single();
    
    if (existente) {
        if (!confirm('Ya existe un corte para esta fecha. ¿Sobrescribir?')) {
            return;
        }
    }
    
    const ventas = currentCorteData.ventas;
    const devoluciones = currentCorteData.devoluciones;
    
    const totalVentas = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const totalEfectivo = ventas
        .filter(v => v.metodo_pago === 'efectivo')
        .reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const totalTarjeta = ventas
        .filter(v => v.metodo_pago === 'tarjeta')
        .reduce((sum, v) => sum + parseFloat(v.total || 0), 0);
    const totalDevoluciones = devoluciones.reduce((sum, d) => {
        return sum + (d.cantidad * (d.detalle_ventas?.precio_unit || 0));
    }, 0);
    
    const corteData = {
        fecha,
        total_ventas: totalVentas,
        total_efectivo: totalEfectivo,
        total_tarjeta: totalTarjeta,
        num_tickets: ventas.length,
        total_devoluciones: totalDevoluciones,
        cerrado_por: currentAdminUser?.nombre || 'Admin',
        fecha_cierre: new Date().toISOString()
    };
    
    try {
        if (existente) {
            await supabaseClient
                .from('cierres_dia')
                .update(corteData)
                .eq('fecha', fecha);
        } else {
            await supabaseClient
                .from('cierres_dia')
                .insert([corteData]);
        }
        
        showNotification('✅ Corte guardado correctamente', 'success');
        loadHistorialCortes();
        
    } catch (error) {
        console.error('Error guardando corte:', error);
        showNotification('Error al guardar corte', 'error');
    }
}

async function loadHistorialCortes() {
    const container = document.getElementById('historialCortesLista');
    
    try {
        const { data: cortes, error } = await supabaseClient
            .from('cierres_dia')
            .select('*')
            .order('fecha', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        if (!cortes || cortes.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-history"></i><p>No hay cortes guardados</p></div>';
            return;
        }
        
        container.innerHTML = cortes.map(corte => `
            <div class="historial-corte-item" onclick="loadCorteFecha('${corte.fecha}')">
                <span class="historial-corte-fecha">
                    <i class="fas fa-calendar-alt"></i> ${new Date(corte.fecha).toLocaleDateString()}
                </span>
                <div class="historial-corte-totales">
                    <span><i class="fas fa-shopping-cart"></i> $${corte.total_ventas.toFixed(2)}</span>
                    <span><i class="fas fa-undo"></i> $${corte.total_devoluciones.toFixed(2)}</span>
                    <span><i class="fas fa-ticket-alt"></i> ${corte.num_tickets} tickets</span>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error cargando historial:', error);
    }
}

function loadCorteFecha(fecha) {
    document.getElementById('corteDate').value = fecha;
    loadCorteData();
}

// ============================================================
// EXPORTAR CORTE A PDF
// ============================================================
async function exportCortePDF() {
    const fecha = document.getElementById('corteDate').value;
    if (!fecha) {
        showNotification('Selecciona una fecha', 'warning');
        return;
    }
    
    showNotification('Generando PDF...', 'info');
    
    try {
        if (typeof window.jspdf === 'undefined') {
            throw new Error('Librería jsPDF no cargada');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const primaryColor = [0, 105, 92];
        const secondaryColor = [0, 137, 123];
        const dangerColor = [198, 40, 40];
        
        // Encabezado
        doc.setFontSize(24);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('Ferretería Alex', 105, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(100);
        doc.text('Corte de Caja', 105, 30, { align: 'center' });
        
        const fechaFormateada = new Date(fecha).toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.setFontSize(12);
        doc.setTextColor(80);
        doc.text(fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1), 105, 38, { align: 'center' });
        
        doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setLineWidth(0.75);
        doc.line(20, 45, 190, 45);
        
        // Obtener valores
        const totalVentas = document.getElementById('corteTotalVentas').textContent;
        const totalEfectivo = document.getElementById('corteTotalEfectivo').textContent;
        const totalTarjeta = document.getElementById('corteTotalTarjeta').textContent;
        const totalDevoluciones = document.getElementById('corteTotalDevoluciones').textContent;
        const numVentas = document.getElementById('corteNumVentas').textContent;
        const ticketPromedio = document.getElementById('corteTicketPromedio').textContent;
        const productosVendidos = document.getElementById('corteProductosVendidos').textContent;
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Resumen del Día', 20, 55);
        
        const startY = 62;
        const boxWidth = 82;
        const boxHeight = 25;
        
        // Fila 1
        doc.setFillColor(240, 248, 255);
        doc.roundedRect(20, startY, boxWidth, boxHeight, 3, 3, 'F');
        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text('TOTAL VENTAS', 25, startY + 7);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(totalVentas, 25, startY + 20);
        
        doc.setFillColor(232, 245, 233);
        doc.roundedRect(108, startY, boxWidth, boxHeight, 3, 3, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text('EFECTIVO', 113, startY + 7);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(46, 125, 50);
        doc.text(totalEfectivo, 113, startY + 20);
        
        // Fila 2
        doc.setFillColor(255, 243, 224);
        doc.roundedRect(20, startY + 30, boxWidth, boxHeight, 3, 3, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text('TARJETA', 25, startY + 37);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(230, 81, 0);
        doc.text(totalTarjeta, 25, startY + 50);
        
        doc.setFillColor(255, 235, 238);
        doc.roundedRect(108, startY + 30, boxWidth, boxHeight, 3, 3, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);
        doc.text('DEVOLUCIONES', 113, startY + 37);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(dangerColor[0], dangerColor[1], dangerColor[2]);
        doc.text(totalDevoluciones, 113, startY + 50);
        
        // Estadísticas
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Estadísticas', 20, 130);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60);
        
        const statsY = 140;
        doc.text(`• Número de Ventas: ${numVentas}`, 25, statsY);
        doc.text(`• Ticket Promedio: ${ticketPromedio}`, 25, statsY + 8);
        doc.text(`• Productos Vendidos: ${productosVendidos}`, 25, statsY + 16);
        
        // Tabla de ventas
        let yPos = 165;
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Ventas del Día', 20, yPos);
        yPos += 5;
        
        const ventas = currentCorteData.ventas || [];
        
        if (ventas.length > 0) {
            const ventasData = ventas.map(venta => [
                new Date(venta.fecha).toLocaleTimeString(),
                venta.metodo_pago === 'efectivo' ? 'Efectivo' : 'Tarjeta',
                venta.detalle_ventas?.length || 0,
                `$${venta.total.toFixed(2)}`
            ]);
            
            doc.autoTable({
                startY: yPos,
                head: [['Hora', 'Método', 'Productos', 'Total']],
                body: ventasData,
                theme: 'striped',
                headStyles: { 
                    fillColor: primaryColor,
                    textColor: 255,
                    fontSize: 10,
                    halign: 'center'
                },
                bodyStyles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 30, halign: 'center' },
                    3: { cellWidth: 35, halign: 'right' }
                },
                margin: { left: 20, right: 20 }
            });
            
            yPos = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFontSize(11);
            doc.setTextColor(150);
            doc.text('No hay ventas en esta fecha', 20, yPos + 5);
            yPos += 15;
        }
        
        // Tabla de devoluciones
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Devoluciones del Día', 20, yPos);
        yPos += 5;
        
        const devoluciones = currentCorteData.devoluciones || [];
        
        if (devoluciones.length > 0) {
            const devolucionesData = devoluciones.map(dev => [
                new Date(dev.fecha).toLocaleTimeString(),
                dev.detalle_ventas?.productos?.nombre || 'Producto',
                dev.cantidad.toString(),
                `$${(dev.cantidad * (dev.detalle_ventas?.precio_unit || 0)).toFixed(2)}`
            ]);
            
            doc.autoTable({
                startY: yPos,
                head: [['Hora', 'Producto', 'Cant.', 'Total']],
                body: devolucionesData,
                theme: 'striped',
                headStyles: { 
                    fillColor: dangerColor,
                    textColor: 255,
                    fontSize: 10,
                    halign: 'center'
                },
                bodyStyles: { fontSize: 9 },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { cellWidth: 70 },
                    2: { cellWidth: 20, halign: 'center' },
                    3: { cellWidth: 35, halign: 'right' }
                },
                margin: { left: 20, right: 20 }
            });
            
            yPos = doc.lastAutoTable.finalY + 10;
        } else {
            doc.setFontSize(11);
            doc.setTextColor(150);
            doc.text('No hay devoluciones en esta fecha', 20, yPos + 5);
            yPos += 15;
        }
        
        // Pie de página
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(20, 280, 190, 280);
        
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Ferretería Alex - Punto de Venta', 105, 287, { align: 'center' });
        doc.text(`Reporte generado: ${new Date().toLocaleString()}`, 105, 292, { align: 'center' });
        
        const nombreArchivo = `Corte_Caja_${fecha.replace(/-/g, '_')}.pdf`;
        doc.save(nombreArchivo);
        
        showNotification('✅ PDF generado correctamente', 'success');
        
    } catch (error) {
        console.error('Error generando PDF:', error);
        
        if (error.message.includes('jsPDF no cargada')) {
            showNotification('Error: Librería PDF no cargada. Recarga la página.', 'error');
        } else {
            showNotification('Error al generar PDF: ' + error.message, 'error');
        }
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
    if (e.target === document.getElementById('corteModal')) closeCorteModal();
    if (e.target === document.getElementById('reporteStockModal')) closeReporteStockModal();
});

// ============================================================
// INICIALIZACIÓN
// ============================================================
window.onload = async function() {
    console.log('🚀 Inicializando aplicación...');
    
    const elementos = ['total', 'salesBody', 'salesTable', 'emptyState'];
    elementos.forEach(id => {
        if (!document.getElementById(id)) {
            console.error(`❌ Elemento #${id} no encontrado en el DOM`);
        } else {
            console.log(`✅ Elemento #${id} encontrado`);
        }
    });
    
    updateDateTime();
    await verificarYCrearCategorias();
    await loadCategories();
    
    productosEnVenta = [];
    
    renderSalesTable();
    updateEmptyState();
    
    cleanOldReturns();
    
    try {
        await supabaseClient.rpc('limpiar_ventas_antiguas');
        console.log('✅ Función limpiar_ventas_antiguas ejecutada');
    } catch (error) {
        console.log('Función limpiar_ventas_antiguas no disponible aún');
    }
    
    console.log('✅ Aplicación inicializada correctamente');
};