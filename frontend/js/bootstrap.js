import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Token CSRF de la sesion (meta csrf-token del layout) para las peticiones
// que modifican datos desde JavaScript (autoguardado, analisis con IA, etc.).
const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
if (token) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
}
