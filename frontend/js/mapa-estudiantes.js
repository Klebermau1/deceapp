import L from './leaflet-setup';
import 'leaflet.markercluster';
import 'leaflet.heat';

// Centro aproximado de Ecuador continental, usado solo si la institucion
// todavia no ha configurado su ubicacion.
const CENTRO_ECUADOR = [-1.8312, -78.1834];

function colorPorDistancia(km) {
    if (km === null || km === undefined) return '#6366f1';
    if (km <= 2) return '#16a34a';
    if (km <= 5) return '#d97706';
    return '#dc2626';
}

function iconoEstudiante(km) {
    const color = colorPorDistancia(km);
    return L.divIcon({
        className: '',
        html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,.5)"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
}

function iconoInstitucion() {
    return L.divIcon({
        className: '',
        html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#4338ca;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,.6);color:white;font-size:14px;">🏫</span>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
}

// Componente Alpine para los mapas de ubicaciones estudiantiles (/fichas/mapa
// y el panel de geografia de /fichas/estadisticas). Recibe la ubicacion de
// la institucion (o null si aun no se configura) y la lista de estudiantes ya
// geocodificados; opcionalmente cada ubicacion trae un campo "sector" que
// habilita el filtro por sector (usado desde la lista de barras de la pagina
// de estadisticas -- ambas piezas comparten la misma etiqueta de texto).
export default function mapaEstudiantes(config) {
    return {
        institucion: config.institucion ?? null,
        ubicaciones: config.ubicaciones ?? [],
        mostrarCalor: config.mostrarCalorInicial ?? false,
        mostrarPines: config.mostrarPinesInicial ?? true,
        sectorActivo: null,
        mapa: null,
        capaCluster: null,
        capaCalor: null,

        init() {
            const centro = this.institucion ? [this.institucion.lat, this.institucion.lng] : CENTRO_ECUADOR;
            const zoom = this.institucion ? 13 : 7;

            this.mapa = L.map(this.$refs.mapa).setView(centro, zoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(this.mapa);

            // Si el contenedor no tenia su tamano final cuando Leaflet midio
            // el mapa (comun con layouts flex/alpine), esto fuerza un
            // recalculo para que no quede en blanco o cortado.
            setTimeout(() => this.mapa.invalidateSize(), 100);

            if (this.institucion) {
                L.marker(centro, { icon: iconoInstitucion() })
                    .addTo(this.mapa)
                    .bindPopup('<strong>Institución</strong><br>' + (this.institucion.direccion ?? ''));
            }

            this.capaCluster = L.markerClusterGroup();
            this.capaCalor = L.heatLayer([], { radius: 30, blur: 20 });

            if (this.mostrarPines) this.mapa.addLayer(this.capaCluster);
            if (this.mostrarCalor) this.mapa.addLayer(this.capaCalor);

            this._refrescarCapas();
        },

        get ubicacionesFiltradas() {
            return this.sectorActivo
                ? this.ubicaciones.filter((u) => u.sector === this.sectorActivo)
                : this.ubicaciones;
        },

        toggleCalor() {
            this.mostrarCalor = !this.mostrarCalor;

            if (this.mostrarCalor) {
                this.mapa.addLayer(this.capaCalor);
            } else {
                this.mapa.removeLayer(this.capaCalor);
            }
        },

        togglePines() {
            this.mostrarPines = !this.mostrarPines;

            if (this.mostrarPines) {
                this.mapa.addLayer(this.capaCluster);
            } else {
                this.mapa.removeLayer(this.capaCluster);
            }
        },

        // Clic en un sector de la lista de barras: aisla sus puntos en el
        // mapa (clic de nuevo sobre el mismo sector quita el filtro).
        filtrarSector(sector) {
            this.sectorActivo = this.sectorActivo === sector ? null : sector;
            this._refrescarCapas();
        },

        _refrescarCapas() {
            const puntos = this.ubicacionesFiltradas;

            this.capaCluster.clearLayers();

            puntos.forEach((u) => {
                const marcador = L.marker([u.lat, u.lng], { icon: iconoEstudiante(u.distancia_km) });
                const distanciaTexto = u.distancia_km !== null && u.distancia_km !== undefined
                    ? u.distancia_km + ' km en línea recta'
                    : null;
                const sectorTexto = u.sector ? `Sector: ${u.sector}` : null;
                const enlace = u.url ? `<a href="${u.url}" class="text-indigo-600 underline">Ver ficha</a>` : '';
                const precisionTexto = u.fuente === 'automatica' && u.nivel_precision && u.nivel_precision !== 'dirección completa'
                    ? `<br><span style="color:#d97706">Ubicación aproximada por ${u.nivel_precision}</span>`
                    : '';

                marcador.bindPopup(`
                    <strong>${u.nombres}</strong><br>
                    ${[distanciaTexto, sectorTexto].filter(Boolean).join('<br>')}${precisionTexto}<br>
                    ${enlace}
                `);

                this.capaCluster.addLayer(marcador);
            });

            this.capaCalor.setLatLngs(puntos.map((u) => [u.lat, u.lng, 0.5]));
        },
    };
}
