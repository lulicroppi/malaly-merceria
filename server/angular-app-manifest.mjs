
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: 'Malaly',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/Malaly"
  },
  {
    "renderMode": 2,
    "route": "/Malaly/proveedores"
  },
  {
    "renderMode": 2,
    "route": "/Malaly/proveedores/crear"
  },
  {
    "renderMode": 2,
    "route": "/Malaly/proveedores/crear/productos"
  },
  {
    "renderMode": 2,
    "route": "/Malaly/proveedores/modificar"
  },
  {
    "renderMode": 2,
    "redirectTo": "/Malaly",
    "route": "/Malaly/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 971, hash: '198144d7e1c159ac4c28c0fcaae5ba1e8a3047cc19de074b82042f93b5357064', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1017, hash: 'acf1406f5038aa3a2100249510de213c7e5a15073bb8eafd4a49dae34f9a51d7', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'proveedores/index.html': {size: 0, hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', text: () => import('./assets-chunks/proveedores_index_html.mjs').then(m => m.default)},
    'proveedores/crear/productos/index.html': {size: 0, hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', text: () => import('./assets-chunks/proveedores_crear_productos_index_html.mjs').then(m => m.default)},
    'proveedores/modificar/index.html': {size: 0, hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', text: () => import('./assets-chunks/proveedores_modificar_index_html.mjs').then(m => m.default)},
    'index.html': {size: 0, hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'proveedores/crear/index.html': {size: 0, hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', text: () => import('./assets-chunks/proveedores_crear_index_html.mjs').then(m => m.default)},
    'styles-G3BQARG4.css': {size: 342, hash: 'jfiSA2zg3z0', text: () => import('./assets-chunks/styles-G3BQARG4_css.mjs').then(m => m.default)}
  },
};
