// ============================================================
//  api.js — Comunicación con el backend (Node.js/Express)
//  Cambia BASE_URL por la URL de tu backend en Render
// ============================================================

const BASE_URL = 'https://techstore-backend-yzjj.onrender.com'; 

// Helper general para requests
async function request(method, endpoint, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(BASE_URL + endpoint, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Error del servidor' }));
    throw new Error(err.message || 'Error desconocido');
  }
  return res.json();
}

// ====== USUARIOS ======
const apiUsuarios = {
  registro: (data) => request('POST', '/usuarios/registro', data),
  login:    (data) => request('POST', '/usuarios/login',    data),
};

// ====== PRODUCTOS ======
const apiProductos = {
  getAll:  ()       => request('GET',    '/productos'),
  create:  (data)   => request('POST',   '/productos', data),
  update:  (id, d)  => request('PUT',    `/productos/${id}`, d),
  delete:  (id)     => request('DELETE', `/productos/${id}`),
  stockBajo: ()     => request('GET',    '/productos/stock-bajo'),
};

// ====== CLIENTES ======
const apiClientes = {
  getAll:  ()       => request('GET',  '/clientes'),
  create:  (data)   => request('POST', '/clientes', data),
  update:  (id, d)  => request('PUT',  `/clientes/${id}`, d),
};

// ====== VENTAS ======
const apiVentas = {
  getAll:       ()       => request('GET',  '/ventas'),
  create:       (data)   => request('POST', '/ventas', data),
  porFecha:     (ini, fin) => request('GET', `/ventas/por-fecha?inicio=${ini}&fin=${fin}`),
  altas:        ()       => request('GET',  '/ventas/altas'),
  masVendidos:  ()       => request('GET',  '/ventas/mas-vendidos'),
  totalVendido: ()       => request('GET',  '/ventas/total-vendido'),
};
