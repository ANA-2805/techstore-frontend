// ============================================================
//  app.js — Lógica principal de TechStore
// ============================================================

// ---- Estado global ----
let productos = [];
let clientes  = [];
let ventas    = [];
let carrito   = [];
let usuarioActual = null;

// ============================================================
//  UTILIDADES
// ============================================================
function fmt(n) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2 });
}

function fmtFecha(str) {
  return new Date(str).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
}

function showScreen(id) {
  ['loginScreen', 'registerScreen', 'appScreen'].forEach(s => {
    document.getElementById(s).classList.toggle('hidden', s !== id);
  });
}

function showModule(mod) {
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('mod-' + mod);
  if (el) el.classList.add('active');
  // Highlight nav
  document.querySelectorAll('.nav-item').forEach(n => {
    if (n.textContent.toLowerCase().includes(mod.substring(0, 4))) n.classList.add('active');
  });
  // Load data on module switch
  if (mod === 'dashboard')  cargarDashboard();
  if (mod === 'productos')  cargarProductos();
  if (mod === 'clientes')   cargarClientes();
  if (mod === 'ventas')     cargarVentas();
}

function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2800);
}

function showAlert(elId, msg) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

// ============================================================
//  AUTH
// ============================================================
async function login() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) return showAlert('loginError', 'Completa todos los campos.');
  try {
    const res = await apiUsuarios.login({ email, password });
    usuarioActual = res.usuario;
    document.getElementById('userNameDisplay').textContent = usuarioActual.nombre;
    showScreen('appScreen');
    showModule('dashboard');
    document.getElementById('currentDate').textContent =
      new Date().toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  } catch(e) {
    showAlert('loginError', e.message || 'Credenciales incorrectas.');
  }
}

async function register() {
  const nombre   = document.getElementById('regNombre').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!nombre || !email || !password) return showAlert('registerError', 'Completa todos los campos.');
  try {
    await apiUsuarios.registro({ nombre, email, password });
    showToast('Cuenta creada. Ya puedes iniciar sesión.');
    showScreen('loginScreen');
  } catch(e) {
    showAlert('registerError', e.message);
  }
}

function logout() {
  usuarioActual = null;
  carrito = [];
  showScreen('loginScreen');
}

// ============================================================
//  DASHBOARD
// ============================================================
async function cargarDashboard() {
  try {
    const [prods, vents] = await Promise.all([
      apiProductos.getAll(),
      apiVentas.getAll(),
    ]);
    productos = prods;
    ventas    = vents;

    // Stats
    const hoy = new Date().toDateString();
    const ventasHoy = ventas.filter(v => new Date(v.fecha).toDateString() === hoy);
    const stockBajo = productos.filter(p => p.stock < 5);

    let totalAcumulado = ventas.reduce((s, v) => s + v.total, 0);
    try {
      const r = await apiVentas.totalVendido();
      totalAcumulado = r.total || totalAcumulado;
    } catch(_) {}

    document.getElementById('statVentasHoy').textContent  = ventasHoy.length;
    document.getElementById('statTotal').textContent       = fmt(totalAcumulado);
    document.getElementById('statProductos').textContent   = productos.length;
    document.getElementById('statStockBajo').textContent   = stockBajo.length;

    // Tabla últimas ventas
    const tbody = document.querySelector('#dashVentas tbody');
    tbody.innerHTML = '';
    ventas.slice(-6).reverse().forEach(v => {
      tbody.innerHTML += `<tr>
        <td>${fmtFecha(v.fecha)}</td>
        <td>${v.clienteNombre || '—'}</td>
        <td>${fmt(v.total)}</td>
      </tr>`;
    });

    // Tabla stock bajo
    const tbodyS = document.querySelector('#dashStock tbody');
    tbodyS.innerHTML = '';
    stockBajo.slice(0, 8).forEach(p => {
      tbodyS.innerHTML += `<tr>
        <td>${p.nombre}</td>
        <td><span class="badge ${p.stock === 0 ? 'badge-bad' : 'badge-warn'}">${p.stock}</span></td>
      </tr>`;
    });
  } catch(e) {
    console.error(e);
  }
}

// ============================================================
//  PRODUCTOS
// ============================================================
async function cargarProductos() {
  try {
    productos = await apiProductos.getAll();
    renderProductos(productos);
  } catch(e) { showToast('Error al cargar productos.', 'error'); }
}

function renderProductos(lista) {
  const tbody = document.querySelector('#tablaProductos tbody');
  tbody.innerHTML = '';
  lista.forEach(p => {
    const badgeClass = p.stock === 0 ? 'badge-bad' : p.stock < 5 ? 'badge-warn' : 'badge-ok';
    tbody.innerHTML += `<tr>
      <td>${p.nombre}</td>
      <td>${p.categoria || '—'}</td>
      <td>${fmt(p.precio)}</td>
      <td><span class="badge ${badgeClass}">${p.stock}</span></td>
      <td style="display:flex;gap:.4rem">
        <button class="btn btn-secondary btn-sm" onclick="editarProducto('${p._id}')">Editar</button>
        <button class="btn btn-danger btn-sm"    onclick="eliminarProducto('${p._id}')">Eliminar</button>
      </td>
    </tr>`;
  });
}

function filtrarProductos() {
  const q = document.getElementById('searchProducto').value.toLowerCase();
  renderProductos(productos.filter(p => p.nombre.toLowerCase().includes(q) || (p.categoria||'').toLowerCase().includes(q)));
}

function openModalProducto(reset = true) {
  if (reset) {
    document.getElementById('productoId').value = '';
    document.getElementById('modalProductoTitle').textContent = 'Agregar producto';
    ['productoNombre','productoCategoria','productoPrecio','productoStock','productoDescripcion'].forEach(id => {
      document.getElementById(id).value = '';
    });
  }
  openModal('modalProducto');
}

function editarProducto(id) {
  const p = productos.find(x => x._id === id);
  if (!p) return;
  document.getElementById('productoId').value          = p._id;
  document.getElementById('modalProductoTitle').textContent = 'Editar producto';
  document.getElementById('productoNombre').value      = p.nombre;
  document.getElementById('productoCategoria').value   = p.categoria || '';
  document.getElementById('productoPrecio').value      = p.precio;
  document.getElementById('productoStock').value       = p.stock;
  document.getElementById('productoDescripcion').value = p.descripcion || '';
  openModal('modalProducto');
}

async function guardarProducto() {
  const id = document.getElementById('productoId').value;
  const data = {
    nombre:      document.getElementById('productoNombre').value.trim(),
    categoria:   document.getElementById('productoCategoria').value.trim(),
    precio:      parseFloat(document.getElementById('productoPrecio').value),
    stock:       parseInt(document.getElementById('productoStock').value),
    descripcion: document.getElementById('productoDescripcion').value.trim(),
  };
  if (!data.nombre || isNaN(data.precio)) return showToast('Completa nombre y precio.', 'error');
  try {
    if (id) { await apiProductos.update(id, data); showToast('Producto actualizado.'); }
    else     { await apiProductos.create(data);     showToast('Producto agregado.'); }
    closeModal('modalProducto');
    cargarProductos();
  } catch(e) { showToast(e.message, 'error'); }
}

async function eliminarProducto(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try {
    await apiProductos.delete(id);
    showToast('Producto eliminado.');
    cargarProductos();
  } catch(e) { showToast(e.message, 'error'); }
}

// ============================================================
//  CLIENTES
// ============================================================
async function cargarClientes() {
  try {
    clientes = await apiClientes.getAll();
    renderClientes(clientes);
    poblarSelectCliente();
  } catch(e) { showToast('Error al cargar clientes.', 'error'); }
}

function renderClientes(lista) {
  const tbody = document.querySelector('#tablaClientes tbody');
  tbody.innerHTML = '';
  lista.forEach(c => {
    tbody.innerHTML += `<tr>
      <td>${c.nombre}</td>
      <td>${c.email}</td>
      <td>${c.telefono || '—'}</td>
      <td style="display:flex;gap:.4rem">
        <button class="btn btn-secondary btn-sm" onclick="editarCliente('${c._id}')">Editar</button>
      </td>
    </tr>`;
  });
}

function filtrarClientes() {
  const q = document.getElementById('searchCliente').value.toLowerCase();
  renderClientes(clientes.filter(c => c.nombre.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)));
}

function editarCliente(id) {
  const c = clientes.find(x => x._id === id);
  if (!c) return;
  document.getElementById('clienteId').value        = c._id;
  document.getElementById('modalClienteTitle').textContent = 'Editar cliente';
  document.getElementById('clienteNombre').value    = c.nombre;
  document.getElementById('clienteEmail').value     = c.email;
  document.getElementById('clienteTelefono').value  = c.telefono || '';
  document.getElementById('clienteDireccion').value = c.direccion || '';
  openModal('modalCliente');
}

async function guardarCliente() {
  const id = document.getElementById('clienteId').value;
  const data = {
    nombre:    document.getElementById('clienteNombre').value.trim(),
    email:     document.getElementById('clienteEmail').value.trim(),
    telefono:  document.getElementById('clienteTelefono').value.trim(),
    direccion: document.getElementById('clienteDireccion').value.trim(),
  };
  if (!data.nombre || !data.email) return showToast('Nombre y email son obligatorios.', 'error');
  try {
    if (id) { await apiClientes.update(id, data); showToast('Cliente actualizado.'); }
    else     { await apiClientes.create(data);     showToast('Cliente registrado.'); }
    closeModal('modalCliente');
    cargarClientes();
  } catch(e) { showToast(e.message, 'error'); }
}

function openModalCliente() {
  document.getElementById('clienteId').value = '';
  document.getElementById('modalClienteTitle').textContent = 'Registrar cliente';
  ['clienteNombre','clienteEmail','clienteTelefono','clienteDireccion'].forEach(id => {
    document.getElementById(id).value = '';
  });
  openModal('modalCliente');
}

// ============================================================
//  VENTAS
// ============================================================
async function cargarVentas() {
  try {
    [productos, clientes, ventas] = await Promise.all([
      apiProductos.getAll(),
      apiClientes.getAll(),
      apiVentas.getAll(),
    ]);
    poblarSelectProducto();
    poblarSelectCliente();
    renderVentas();
  } catch(e) { showToast('Error al cargar módulo de ventas.', 'error'); }
}

function poblarSelectProducto() {
  const sel = document.getElementById('ventaProductoSelect');
  if (!sel) return;
  sel.innerHTML = '<option value="">Seleccionar producto...</option>';
  productos.forEach(p => {
    sel.innerHTML += `<option value="${p._id}" data-precio="${p.precio}" data-stock="${p.stock}">${p.nombre} — ${fmt(p.precio)}</option>`;
  });
}

function poblarSelectCliente() {
  const sel = document.getElementById('ventaCliente');
  if (!sel) return;
  sel.innerHTML = '<option value="">Seleccionar cliente...</option>';
  clientes.forEach(c => {
    sel.innerHTML += `<option value="${c._id}">${c.nombre}</option>`;
  });
}

function agregarItemVenta() {
  const sel = document.getElementById('ventaProductoSelect');
  const opt = sel.options[sel.selectedIndex];
  if (!opt.value) return showToast('Selecciona un producto.', 'error');
  const cant  = parseInt(document.getElementById('ventaCantidad').value) || 1;
  const precio = parseFloat(opt.dataset.precio);
  const stock  = parseInt(opt.dataset.stock);
  if (cant > stock) return showToast(`Stock disponible: ${stock}`, 'error');
  const exist = carrito.find(i => i.id === opt.value);
  if (exist) { exist.cantidad += cant; }
  else { carrito.push({ id: opt.value, nombre: opt.text.split(' — ')[0], precio, cantidad: cant }); }
  renderCarrito();
}

function quitarItemCarrito(id) {
  carrito = carrito.filter(i => i.id !== id);
  renderCarrito();
}

function renderCarrito() {
  const tbody = document.querySelector('#tablaCarrito tbody');
  tbody.innerHTML = '';
  let total = 0;
  carrito.forEach(i => {
    const sub = i.precio * i.cantidad;
    total += sub;
    tbody.innerHTML += `<tr>
      <td>${i.nombre}</td>
      <td>${fmt(i.precio)}</td>
      <td>${i.cantidad}</td>
      <td>${fmt(sub)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="quitarItemCarrito('${i.id}')">✕</button></td>
    </tr>`;
  });
  document.getElementById('ventaTotal').textContent = fmt(total);
}

async function registrarVenta() {
  const clienteId = document.getElementById('ventaCliente').value;
  if (!clienteId) return showToast('Selecciona un cliente.', 'error');
  if (carrito.length === 0) return showToast('Agrega al menos un producto.', 'error');
  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const cliente = clientes.find(c => c._id === clienteId);
  const data = {
    clienteId,
    clienteNombre: cliente?.nombre || '',
    productos: carrito.map(i => ({ productoId: i.id, nombre: i.nombre, precio: i.precio, cantidad: i.cantidad })),
    total,
    fecha: new Date().toISOString(),
  };
  try {
    const venta = await apiVentas.create(data);
    showToast('Venta registrada correctamente.');
    generarTicket(venta, cliente);
    carrito = [];
    renderCarrito();
    cargarVentas();
  } catch(e) { showToast(e.message, 'error'); }
}

function renderVentas() {
  const tbody = document.querySelector('#tablaVentas tbody');
  tbody.innerHTML = '';
  [...ventas].reverse().slice(0, 20).forEach(v => {
    tbody.innerHTML += `<tr>
      <td>${fmtFecha(v.fecha)}</td>
      <td>${v.clienteNombre || '—'}</td>
      <td>${fmt(v.total)}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="verTicketVenta('${v._id}')">Ver</button></td>
    </tr>`;
  });
}

function verTicketVenta(id) {
  const v = ventas.find(x => x._id === id);
  if (!v) return;
  const cliente = { nombre: v.clienteNombre };
  generarTicket(v, cliente);
}

function generarTicket(venta, cliente) {
  const lineas = (venta.productos || []).map(p =>
    `<div class="ticket-row"><span>${p.nombre} x${p.cantidad}</span><span>${fmt(p.precio * p.cantidad)}</span></div>`
  ).join('');
  document.getElementById('ticketContent').innerHTML = `
    <div class="ticket-header">
      <strong>⬡ TechStore</strong><br/>
      ${fmtFecha(venta.fecha || new Date())}
    </div>
    <hr class="ticket-divider"/>
    <div class="ticket-row"><span>Cliente:</span><span>${cliente?.nombre || '—'}</span></div>
    <hr class="ticket-divider"/>
    ${lineas}
    <hr class="ticket-divider"/>
    <div class="ticket-row ticket-total"><span>TOTAL</span><span>${fmt(venta.total)}</span></div>
    <hr class="ticket-divider"/>
    <div style="text-align:center;margin-top:.5rem;font-size:.72rem;color:#666">¡Gracias por tu compra!</div>
  `;
  openModal('modalTicket');
}

function imprimirTicket() {
  const win = window.open('', '_blank');
  win.document.write(`<html><head><title>Ticket TechStore</title>
    <style>body{font-family:'Courier New',monospace;font-size:12px;padding:1rem}
    .ticket-row{display:flex;justify-content:space-between}
    hr{border:none;border-top:1px dashed #aaa;margin:.5rem 0}</style></head>
    <body>${document.getElementById('ticketContent').innerHTML}</body></html>`);
  win.print();
  win.close();
}

// ============================================================
//  REPORTES
// ============================================================
async function reporteVentasFecha() {
  const ini = document.getElementById('fechaInicio').value;
  const fin = document.getElementById('fechaFin').value;
  if (!ini || !fin) return showToast('Selecciona un rango de fechas.', 'error');
  try {
    const data = await apiVentas.porFecha(ini, fin);
    const tbody = document.querySelector('#tablaReporteVentas tbody');
    tbody.innerHTML = '';
    data.forEach(v => {
      tbody.innerHTML += `<tr><td>${fmtFecha(v.fecha)}</td><td>${v.clienteNombre||'—'}</td><td>${fmt(v.total)}</td></tr>`;
    });
    if (!data.length) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-sub)">Sin resultados</td></tr>';
  } catch(e) { showToast(e.message, 'error'); }
}

async function reporteProductosMasVendidos() {
  try {
    const data = await apiVentas.masVendidos();
    const tbody = document.querySelector('#tablaReporteProductos tbody');
    tbody.innerHTML = '';
    data.forEach(p => {
      tbody.innerHTML += `<tr><td>${p.nombre}</td><td>${p.totalVendido}</td></tr>`;
    });
  } catch(e) { showToast(e.message, 'error'); }
}

async function reporteInventario() {
  try {
    const data = await apiProductos.getAll();
    const tbody = document.querySelector('#tablaInventario tbody');
    tbody.innerHTML = '';
    data.forEach(p => {
      const estado = p.stock === 0 ? ['badge-bad','Sin stock'] : p.stock < 5 ? ['badge-warn','Stock bajo'] : ['badge-ok','Disponible'];
      tbody.innerHTML += `<tr>
        <td>${p.nombre}</td>
        <td>${p.stock}</td>
        <td><span class="badge ${estado[0]}">${estado[1]}</span></td>
      </tr>`;
    });
  } catch(e) { showToast(e.message, 'error'); }
}

async function reporteVentasAltas() {
  try {
    const data = await apiVentas.altas();
    const tbody = document.querySelector('#tablaVentasAltas tbody');
    tbody.innerHTML = '';
    data.forEach(v => {
      tbody.innerHTML += `<tr><td>${fmtFecha(v.fecha)}</td><td>${v.clienteNombre||'—'}</td><td>${fmt(v.total)}</td></tr>`;
    });
    if (!data.length) tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--text-sub)">Sin ventas mayores a $10,000</td></tr>';
  } catch(e) { showToast(e.message, 'error'); }
}

// ============================================================
//  INIT
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  showScreen('loginScreen');
  // Override modal openers from HTML
  document.querySelector('[onclick="openModal(\'modalProducto\')"]')?.addEventListener('click', () => openModalProducto());
  document.querySelector('[onclick="openModal(\'modalCliente\')"]')?.addEventListener('click', () => openModalCliente());
});
