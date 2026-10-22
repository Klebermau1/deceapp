import L from 'leaflet';

// leaflet.markercluster y leaflet.heat son plugins clasicos que esperan una
// variable global `L` (como cuando Leaflet se carga con <script>), pero no
// importan Leaflet ellos mismos. Con Vite/ESM, `import L from 'leaflet'` NO
// crea ningun global: solo un binding local al modulo. Sin esta linea, esos
// plugins lanzan "ReferenceError: L is not defined" al cargarse, lo cual
// rompe la ejecucion de todo app.js (no solo el mapa).
//
// Este archivo debe importarse ANTES que 'leaflet.markercluster'/'leaflet.heat'
// en cualquier modulo que los use, para que window.L ya exista cuando esos
// plugins se evaluen.
window.L = L;

export default L;
