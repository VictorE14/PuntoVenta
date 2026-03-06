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
// ============================================================
// VARIABLES DE SESIÓN
// ============================================================
let isAdminLoggedIn = false;
let currentAdminUser = null;

// ============================================================
// FUNCIONES DE LOGIN
// ============================================================

function showLoginModal() {
    // Si ya está logueado, abrir directamente el admin
    if (isAdminLoggedIn) {
        openAdminModal();
        return;
    }
    
    // Limpiar campos
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').style.display = 'none';
    
    // Mostrar modal
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
    
    // Mostrar loading en el botón
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
    loginBtn.disabled = true;
    
    try {
        // Buscar usuario en Supabase
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
        
        // Verificar si existe el usuario
        if (!usuarios || usuarios.length === 0) {
            showLoginError('Usuario no encontrado');
            return;
        }
        
        const usuario = usuarios[0];
        
        // Verificar contraseña (en un sistema real, debería estar hasheada)
        if (usuario.password !== password) {
            showLoginError('Contraseña incorrecta');
            return;
        }
        
        // Login exitoso
        isAdminLoggedIn = true;
        currentAdminUser = usuario;
        
        // Cerrar modal de login
        closeLoginModal();
        
        // Mostrar mensaje de bienvenida
        showNotification(`Bienvenido ${usuario.nombre || username}`, 'success');
        
        // Abrir modal de admin
        setTimeout(() => {
            openAdminModal();
        }, 300);
        
    } catch (error) {
        console.error('Error inesperado:', error);
        showLoginError('Error al iniciar sesión');
    } finally {
        // Restaurar botón
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

function showLoginError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.querySelector('span').textContent = message;
    errorDiv.style.display = 'flex';
    
    // Limpiar después de 3 segundos
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
}

function logout() {
    if (confirm('¿Cerrar sesión?')) {
        isAdminLoggedIn = false;
        currentAdminUser = null;
        showNotification('Sesión cerrada', 'info');
    }
}

function showNotification(message, type = 'info') {
    // Crear elemento de notificación si no existe
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }
    
    // Configurar notificación
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Mostrar
    notification.style.display = 'flex';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// ============================================================
// MODIFICAR LA FUNCIÓN OPENADMINMODAL PARA VERIFICAR SESIÓN
// ============================================================
// Reemplaza tu función openAdminModal actual con esta:

async function openAdminModal() {
    // Verificar si está logueado
    if (!isAdminLoggedIn) {
        showLoginModal();
        return;
    }
    
    // Si está logueado, abrir el modal normalmente
    document.getElementById('adminModal').style.display = 'block';
    await showAdminCategoryView();
}

// ============================================================
// AGREGAR BOTÓN DE CERRAR SESIÓN EN EL MODAL ADMIN
// ============================================================
// Modifica el header del modal admin para incluir el botón de logout
// Esto lo haremos cuando actualices el HTML



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
// VERIFICAR Y CREAR CATEGORÍAS AUTOMÁTICAMENTE (NUEVA FUNCIÓN)
// ============================================================
async function verificarYCrearCategorias() {
    console.log('🔍 Verificando categorías en Supabase...');
    
    try {
        // Intentar obtener categorías
        const { data: categorias, error } = await supabaseClient
            .from('categorias')
            .select('*');
        
        if (error) {
            console.error('❌ Error al consultar categorías:', error);
            return;
        }
        
        console.log(`📊 Categorías encontradas: ${categorias?.length || 0}`);
        
        // Si no hay categorías, crearlas automáticamente
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
                alert('Error al crear categorías: ' + insertError.message);
            } else {
                console.log('✅ Categorías creadas exitosamente');
                alert('✅ Categorías creadas correctamente');
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
// BÚSQUEDA INTELIGENTE DESDE SUPABASE (CORREGIDA)
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
            console.log('🔍 Buscando:', query); // Para debug
            
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
            
            if (error) {
                console.error('Error en búsqueda:', error);
                return;
            }
            
            if (!productos || productos.length === 0) {
                suggestionsDropdown.style.display = 'none';
                return;
            }
            
            console.log('✅ Productos encontrados:', productos); // Para debug
            
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
            // Tomar el primer resultado si existe
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
// FUNCIÓN ESPECÍFICA PARA AGREGAR DESDE BÚSQUEDA (CORREGIDA)
// ============================================================
async function addProductToSaleFromSearch(productId, codigo) {
    console.log('Agregando producto:', { productId, codigo }); // Para debug
    
    try {
        // Buscar producto completo
        const { data: product, error } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('id', productId)
            .eq('activo', true)
            .single();
        
        if (error || !product) {
            console.error('Error al cargar producto:', error);
            alert('Error al cargar el producto');
            return;
        }
        
        console.log('Producto encontrado:', product); // Para debug
        
        // Verificar stock
        if (product.stock <= 0) {
            alert('Producto sin stock disponible');
            return;
        }
        
        suggestionsDropdown.style.display = 'none';
        searchInput.value = '';

        // Verificar si ya existe en la venta actual
        const existingProductIndex = productosEnVenta.findIndex(p => p.id === product.id);
        
        if (existingProductIndex >= 0) {
            // Incrementar cantidad si no excede stock
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

// ============================================================
// ACTUALIZAR TAMBIÉN LA FUNCIÓN DE AGREGAR DESDE INVENTARIO
// ============================================================
async function addProductToSale(productId) {
    await addProductToSaleFromSearch(productId, null);
}

// ============================================================
// AGREGAR PRODUCTO A LA VENTA (desde búsqueda o inventario)
// ============================================================
async function addProductToSale(productId, codigo = null) {
    // Si recibimos código, buscar el producto por código
    if (codigo) {
        const { data: productos } = await supabaseClient
            .from('productos')
            .select('*')
            .eq('codigo', codigo)
            .eq('activo', true);
        
        if (productos && productos.length > 0) {
            productId = productos[0].id;
        } else {
            alert('Producto no encontrado');
            return;
        }
    }
    
    // Buscar producto completo
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
    
    // Verificar stock
    if (product.stock <= 0) {
        alert('Producto sin stock disponible');
        return;
    }
    
    suggestionsDropdown.style.display = 'none';
    searchInput.value = '';

    // Verificar si ya existe en la venta actual
    const existingProductIndex = productosEnVenta.findIndex(p => p.id === product.id);
    
    if (existingProductIndex >= 0) {
        // Incrementar cantidad si no excede stock
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
    
    // Verificar stock disponible
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
    
    // Crear la venta
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
    
    // Insertar detalles
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
    
    // Mostrar mensaje de éxito
    let msg = `✅ ¡Venta registrada!\nMétodo: ${metodo}\nTotal: $${total.toFixed(2)}`;
    if (metodo === 'Efectivo') {
        msg += `\nRecibido: $${montoRecibido.toFixed(2)}\nCambio: $${cambio.toFixed(2)}`;
    }
    alert(msg);
    
    // Limpiar venta
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
        
        console.log('Categorías cargadas:', categorias);
        
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
// MODAL ADMIN - GESTIÓN DE PRODUCTOS (REDISEÑADO)
// ============================================================
let adminCurrentCategory = null;
let adminEditMode = false;
let adminEditingProductId = null;

async function openAdminModal() {
    document.getElementById('adminModal').style.display = 'block';
    await showAdminCategoryView();
}

function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
    // Resetear vistas
    document.getElementById('adminCategoryView').style.display = 'block';
    document.getElementById('adminProductView').style.display = 'none';
    document.getElementById('adminAddProductView').style.display = 'none';
    adminEditMode = false;
    adminEditingProductId = null;
}

// ============================================================
// VISTA DE CATEGORÍAS (ADMIN)
// ============================================================
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

// ============================================================
// VISTA DE PRODUCTOS POR CATEGORÍA (ADMIN)
// ============================================================
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

// ============================================================
// VISTA PARA AGREGAR NUEVO PRODUCTO
// ============================================================
async function showAdminAddProductView() {
    document.getElementById('adminCategoryView').style.display = 'none';
    document.getElementById('adminProductView').style.display = 'none';
    document.getElementById('adminAddProductView').style.display = 'block';
    document.getElementById('adminModalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> Agregar Nuevo Producto';
    
    // Cargar categorías en el select
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

// ============================================================
// GUARDAR CAMBIOS DE PRODUCTO
// ============================================================
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
        
        // Recargar la vista
        if (adminCurrentCategory) {
            await renderAdminProductGrid(adminCurrentCategory);
        }
        
    } catch (error) {
        console.error('Error al actualizar:', error);
        alert('Error al actualizar el producto: ' + error.message);
    }
}

// ============================================================
// ELIMINAR PRODUCTO (DESACTIVAR)
// ============================================================
async function deleteProduct(productId, productName) {
    if (!confirm(`¿Estás seguro de eliminar "${productName}"?`)) {
        return;
    }
    
    try {
        // En lugar de borrar, lo desactivamos para mantener integridad de ventas
        const { error } = await supabaseClient
            .from('productos')
            .update({ activo: false })
            .eq('id', productId);
        
        if (error) throw error;
        
        alert('✅ Producto eliminado (desactivado) correctamente');
        
        // Recargar la vista
        if (adminCurrentCategory) {
            await renderAdminProductGrid(adminCurrentCategory);
        }
        
    } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error al eliminar el producto: ' + error.message);
    }
}

// ============================================================
// AGREGAR NUEVO PRODUCTO (FORMULARIO)
// ============================================================
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
            
            // Volver a la vista de productos de la categoría
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
// CREAR CATEGORÍAS POR DEFECTO
// ============================================================
async function crearCategoriasDefault() {
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
    
    try {
        const { data, error } = await supabaseClient
            .from('categorias')
            .insert(categoriasDefault)
            .select();
        
        if (error) {
            console.error('Error creando categorías:', error);
            alert('Error al crear categorías: ' + error.message);
            return;
        }
        
        alert('✅ Categorías creadas correctamente');
        location.reload();
        
    } catch (error) {
        console.error('Error:', error);
        alert('Error al conectar con Supabase');
    }
}

// ============================================================
// CIERRE DE MODALES
// ============================================================
window.addEventListener('click', (e) => {
    if (e.target === document.getElementById('inventoryModal')) closeInventoryModal();
    if (e.target === document.getElementById('returnModal')) closeReturnModal();
    if (e.target === document.getElementById('paymentModal')) closePaymentModal();
    if (e.target === document.getElementById('adminModal')) closeAdminModal();
});
// ============================================================
// DEVOLUCIONES - FUNCIONES COMPLETAS
// ============================================================

// Mostrar modal de devolución
function showReturnModal() {
    // Limpiar devoluciones antiguas (más de 4 días)
    cleanOldReturns();
    updateReturnOptions();
    document.getElementById('returnModal').style.display = 'block';
}

function closeReturnModal() {
    document.getElementById('returnModal').style.display = 'none';
    document.getElementById('returnSearchInput').value = '';
}

// Limpiar devoluciones antiguas de localStorage
function cleanOldReturns() {
    const returns = JSON.parse(localStorage.getItem('returns') || '[]');
    const now = new Date();
    const filtered = returns.filter(r => (now - new Date(r.date)) / (1000 * 60 * 60 * 24) <= 4);
    localStorage.setItem('returns', JSON.stringify(filtered));
}

// Actualizar opciones de devolución
function updateReturnOptions() {
    const tbody = document.getElementById('returnBody');
    tbody.innerHTML = '';

    // Productos de la venta actual
    productosEnVenta.forEach(p => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-code', p.codigo);
        tr.setAttribute('data-source', 'sales');
        tr.innerHTML = `
            <td>${p.marca}</td>
            <td>${p.nombre}</td>
            <td>${p.codigo}</td>
            <td>${p.cantidad}</td>
            <td><input type="number" min="0" max="${p.cantidad}" value="0" onchange="updateReturnPrice(this, ${p.precio})"></td>
            <td>$${p.precio.toFixed(2)}</td>
            <td id="rp_${p.codigo}">$0.00</td>
        `;
        tbody.appendChild(tr);
    });

    // Productos de ventas anteriores (localStorage)
    const returns = JSON.parse(localStorage.getItem('returns') || '[]');
    const now = new Date();
    const salesCodes = productosEnVenta.map(p => p.codigo);

    returns.forEach(r => {
        const diff = (now - new Date(r.date)) / (1000 * 60 * 60 * 24);
        if (diff > 4 || r.qty <= 0 || salesCodes.includes(r.code)) return;
        
        const tr = document.createElement('tr');
        tr.setAttribute('data-code', r.code);
        tr.setAttribute('data-source', 'returns');
        tr.innerHTML = `
            <td>${r.brand || 'N/A'}</td>
            <td>${r.name || 'N/A'}</td>
            <td>${r.code}</td>
            <td>${r.qty}</td>
            <td><input type="number" min="0" max="${r.qty}" value="0" onchange="updateReturnPrice(this, ${r.pricePerUnit || 0})"></td>
            <td>$${(r.pricePerUnit || 0).toFixed(2)}</td>
            <td id="rp_${r.code}">$0.00</td>
        `;
        tbody.appendChild(tr);
    });
}

// Buscar en devoluciones
function searchReturns() {
    const query = document.getElementById('returnSearchInput').value.toLowerCase();
    document.querySelectorAll('#returnBody tr').forEach(row => {
        const code = (row.getAttribute('data-code') || '').toLowerCase();
        const name = row.cells[1]?.textContent.toLowerCase() || '';
        row.style.display = code.includes(query) || name.includes(query) ? '' : 'none';
    });
}

// Actualizar precio en devolución
function updateReturnPrice(input, price) {
    const code = input.closest('tr').getAttribute('data-code');
    const cell = document.getElementById(`rp_${code}`);
    if (cell) {
        cell.textContent = `$${((parseInt(input.value) || 0) * price).toFixed(2)}`;
    }
}

// Procesar devolución
async function processReturn() {
    const rows = document.querySelectorAll('#returnBody tr');
    const now = new Date().toISOString();
    const returns = JSON.parse(localStorage.getItem('returns') || '[]');
    let totalRemoved = 0;
    let productosADevolver = [];

    for (const row of rows) {
        const code = row.getAttribute('data-code');
        const source = row.getAttribute('data-source');
        const returnQty = parseInt(row.querySelector('input[type="number"]').value) || 0;
        
        if (returnQty <= 0) continue;

        if (source === 'sales') {
            // Buscar el producto en la venta actual
            const productIndex = productosEnVenta.findIndex(p => p.codigo === code);
            if (productIndex === -1) continue;

            const product = productosEnVenta[productIndex];
            
            if (returnQty > product.cantidad) {
                alert(`La cantidad a devolver de "${product.nombre}" supera la disponible.`);
                return;
            }

            // Registrar para devolución en Supabase
            productosADevolver.push({
                producto_id: product.id,
                cantidad: returnQty,
                precio_unit: product.precio
            });

            // Actualizar cantidad en venta actual
            product.cantidad -= returnQty;
            if (product.cantidad === 0) {
                productosEnVenta.splice(productIndex, 1);
            }

            // Guardar en localStorage para devoluciones futuras
            returns.push({
                code: product.codigo,
                qty: returnQty,
                date: now,
                brand: product.marca,
                name: product.nombre,
                pricePerUnit: product.precio
            });

            totalRemoved += returnQty;

        } else if (source === 'returns') {
            const existing = returns.find(r => r.code === code);
            if (!existing) continue;
            
            if (returnQty > existing.qty) {
                alert(`La cantidad a devolver de "${existing.name}" supera la disponible.`);
                return;
            }
            
            existing.qty -= returnQty;
            if (existing.qty === 0) {
                returns.splice(returns.indexOf(existing), 1);
            }
            totalRemoved += returnQty;
        }
    }

    // Guardar en localStorage
    localStorage.setItem('returns', JSON.stringify(returns));

    // Si hay devoluciones de la venta actual, registrarlas en Supabase
    if (productosADevolver.length > 0) {
        try {
            // Aquí puedes agregar la lógica para registrar devoluciones en Supabase
            // Por ahora solo mostramos mensaje
            console.log('Productos a devolver en Supabase:', productosADevolver);
        } catch (error) {
            console.error('Error registrando devolución en Supabase:', error);
        }
    }

    // Actualizar tabla de ventas
    renderSalesTable();

    if (totalRemoved > 0) {
        alert(`✅ Devolución procesada correctamente.\nTotal devuelto: ${totalRemoved} artículo(s).`);
    } else {
        alert('No ingresaste cantidades a devolver.');
    }
    
    closeReturnModal();
}

// ============================================================
// ACTUALIZAR WINDOW.ONLOAD PARA INCLUIR LIMPIEZA DE RETURNS
// ============================================================
// Reemplaza tu window.onload actual con este:

window.onload = async function() {
    updateDateTime();
    await verificarYCrearCategorias();
    await loadCategories();
    updateEmptyState();
    cleanOldReturns(); // <-- Agregar esta línea
    
    // Limpiar ventas antiguas
    try {
        await supabaseClient.rpc('limpiar_ventas_antiguas');
    } catch (error) {
        console.log('Función limpiar_ventas_antiguas no disponible aún');
    }
};



// ============================================================
// INICIALIZACIÓN
// ============================================================
window.onload = async function() {
    updateDateTime();
    await verificarYCrearCategorias();
    await loadCategories();
    updateEmptyState();
    
    // Limpiar ventas antiguas
    try {
        await supabaseClient.rpc('limpiar_ventas_antiguas');
    } catch (error) {
        console.log('Función limpiar_ventas_antiguas no disponible aún');
    }
};