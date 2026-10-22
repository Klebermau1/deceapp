import L from './leaflet-setup';

const CENTRO_ECUADOR = [-1.8312, -78.1834];

function iconoInstitucion() {
    return L.divIcon({
        className: '',
        html: '<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:#4338ca;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,.6);color:white;font-size:14px;">🏫</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
}

// Componente Alpine para que el Administrador fije, con un clic o
// arrastrando el pin, la ubicacion de la institucion (centro de referencia
// para calcular la distancia de cada estudiante).
export default function institucionMapa(config) {
    return {
        lat: config.lat ?? null,
        lng: config.lng ?? null,
        mapa: null,
        marcador: null,

        init() {
            const centro = this.lat && this.lng ? [this.lat, this.lng] : CENTRO_ECUADOR;
            const zoom = this.lat && this.lng ? 15 : 7;

            this.mapa = L.map(this.$refs.mapa).setView(centro, zoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(this.mapa);

            setTimeout(() => this.mapa.invalidateSize(), 100);

            if (this.lat && this.lng) {
                this._colocarMarcador(this.lat, this.lng);
            }

            this.mapa.on('click', (evento) => {
                this._colocarMarcador(evento.latlng.lat, evento.latlng.lng);
            });
        },

        _colocarMarcador(lat, lng) {
            this.lat = lat;
            this.lng = lng;

            if (this.marcador) {
                this.marcador.setLatLng([lat, lng]);
            } else {
                this.marcador = L.marker([lat, lng], { icon: iconoInstitucion(), draggable: true }).addTo(this.mapa);
                this.marcador.on('dragend', () => {
                    const pos = this.marcador.getLatLng();
                    this.lat = pos.lat;
                    this.lng = pos.lng;
                });
            }
        },
    };
}
