import L from './leaflet-setup';

const CENTRO_ECUADOR = [-1.8312, -78.1834];

function haversineKm(lat1, lon1, lat2, lon2) {
    const radioTierraKm = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(radioTierraKm * c * 100) / 100;
}

function iconoEstudiante() {
    return L.divIcon({
        className: '',
        html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#4f46e5;border:2px solid white;box-shadow:0 0 2px rgba(0,0,0,.5)"></span>',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });
}

function iconoInstitucion() {
    return L.divIcon({
        className: '',
        html: '<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:#4338ca;border:3px solid white;box-shadow:0 0 4px rgba(0,0,0,.6);color:white;font-size:12px;">🏫</span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
}

// Componente Alpine para el mini-mapa de domicilio en la ficha del
// estudiante: geocodificacion automatica bajo demanda + pin arrastrable
// para ajuste manual.
export default function fichaUbicacion(config) {
    return {
        institucion: config.institucion ?? null,
        ubicacion: config.ubicacion ?? null, // {lat, lng, distancia_km, fuente}
        geocodificarUrl: config.geocodificarUrl,
        actualizarUrl: config.actualizarUrl,

        mapa: null,
        marcadorEstudiante: null,
        linea: null,
        cargando: false,
        error: null,
        cambiosSinGuardar: false,

        capaRuta: null,
        ruta: null, // {distancia_km, duracion_min}
        cargandoRuta: false,
        errorRuta: null,

        init() {
            const centro = this.ubicacion
                ? [this.ubicacion.lat, this.ubicacion.lng]
                : (this.institucion ? [this.institucion.lat, this.institucion.lng] : CENTRO_ECUADOR);

            this.mapa = L.map(this.$refs.mapa, { scrollWheelZoom: false }).setView(centro, this.ubicacion || this.institucion ? 14 : 7);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(this.mapa);

            setTimeout(() => this.mapa.invalidateSize(), 100);

            if (this.institucion) {
                L.marker([this.institucion.lat, this.institucion.lng], { icon: iconoInstitucion() })
                    .addTo(this.mapa)
                    .bindPopup('Institución');
            }

            if (this.ubicacion) {
                this._colocarMarcador(this.ubicacion.lat, this.ubicacion.lng);
            }

            this.mapa.on('click', (evento) => {
                if (!this.marcadorEstudiante) {
                    this._colocarMarcador(evento.latlng.lat, evento.latlng.lng);
                    this.cambiosSinGuardar = true;
                }
            });
        },

        _colocarMarcador(lat, lng) {
            if (this.marcadorEstudiante) {
                this.marcadorEstudiante.setLatLng([lat, lng]);
            } else {
                this.marcadorEstudiante = L.marker([lat, lng], { icon: iconoEstudiante(), draggable: true }).addTo(this.mapa);
                this.marcadorEstudiante.on('dragend', () => {
                    this.cambiosSinGuardar = true;
                    this._actualizarLinea();
                    this._recalcularDistanciaLocal();
                    this._limpiarRuta();
                });
            }

            this._actualizarLinea();
            this._limpiarRuta();
        },

        _limpiarRuta() {
            if (this.capaRuta) {
                this.mapa.removeLayer(this.capaRuta);
                this.capaRuta = null;
            }
            this.ruta = null;
            this.errorRuta = null;
        },

        async verRuta() {
            if (!this.institucion || !this.marcadorEstudiante) return;

            this.errorRuta = null;
            this.cargandoRuta = true;

            try {
                const { lat, lng } = this.marcadorEstudiante.getLatLng();
                const origen = `${lng},${lat}`;
                const destino = `${this.institucion.lng},${this.institucion.lat}`;

                const respuesta = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${origen};${destino}?overview=full&geometries=geojson`,
                );
                const datos = await respuesta.json();

                if (datos.code !== 'Ok' || !datos.routes || datos.routes.length === 0) {
                    this.errorRuta = 'No se encontró una ruta por carretera entre estos dos puntos.';
                    return;
                }

                const ruta = datos.routes[0];

                if (this.capaRuta) {
                    this.mapa.removeLayer(this.capaRuta);
                }

                const coordenadas = ruta.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
                this.capaRuta = L.polyline(coordenadas, { color: '#16a34a', weight: 4, opacity: 0.8 }).addTo(this.mapa);
                this.mapa.fitBounds(this.capaRuta.getBounds(), { padding: [20, 20] });

                this.ruta = {
                    distancia_km: Math.round((ruta.distance / 1000) * 100) / 100,
                    duracion_min: Math.round(ruta.duration / 60),
                };
            } catch (e) {
                this.errorRuta = 'No se pudo calcular la ruta (el servicio de rutas puede estar ocupado). Intenta de nuevo en un momento.';
            } finally {
                this.cargandoRuta = false;
            }
        },

        _actualizarLinea() {
            if (this.linea) {
                this.mapa.removeLayer(this.linea);
                this.linea = null;
            }

            if (this.institucion && this.marcadorEstudiante) {
                this.linea = L.polyline([
                    [this.institucion.lat, this.institucion.lng],
                    this.marcadorEstudiante.getLatLng(),
                ], { color: '#4f46e5', dashArray: '4 6', weight: 2 }).addTo(this.mapa);
            }
        },

        _recalcularDistanciaLocal() {
            if (!this.institucion || !this.marcadorEstudiante) return;

            const { lat, lng } = this.marcadorEstudiante.getLatLng();
            const km = haversineKm(this.institucion.lat, this.institucion.lng, lat, lng);

            this.ubicacion = { ...(this.ubicacion ?? {}), lat, lng, distancia_km: km };
        },

        async geocodificar() {
            this.error = null;
            this.cargando = true;

            try {
                const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                const respuesta = await fetch(this.geocodificarUrl, {
                    method: 'POST',
                    headers: { 'X-CSRF-TOKEN': token, Accept: 'application/json' },
                });
                const datos = await respuesta.json();

                if (!respuesta.ok || !datos.ok) {
                    this.error = datos.mensaje ?? 'No se pudo ubicar automáticamente.';
                    return;
                }

                // Si solo se encontro por sector/barrio (no la direccion
                // exacta) se aleja un poco el zoom: el pin representa una
                // zona aproximada, no un punto exacto.
                const zoom = datos.nivel_precision === 'dirección completa' ? 16 : 14;

                this._colocarMarcador(datos.lat, datos.lng);
                this.mapa.setView([datos.lat, datos.lng], zoom);
                this.ubicacion = {
                    lat: datos.lat,
                    lng: datos.lng,
                    distancia_km: datos.distancia_km,
                    fuente: 'automatica',
                    nivel_precision: datos.nivel_precision,
                };
                this.cambiosSinGuardar = false;
            } catch (e) {
                this.error = 'Error de conexión al intentar ubicar automáticamente.';
            } finally {
                this.cargando = false;
            }
        },

        async guardarAjuste() {
            if (!this.marcadorEstudiante) return;

            this.error = null;
            this.cargando = true;

            try {
                const { lat, lng } = this.marcadorEstudiante.getLatLng();
                const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                const respuesta = await fetch(this.actualizarUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': token,
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({ lat, lng }),
                });
                const datos = await respuesta.json();

                if (!respuesta.ok || !datos.ok) {
                    this.error = 'No se pudo guardar el ajuste.';
                    return;
                }

                this.ubicacion = { lat, lng, distancia_km: datos.distancia_km, fuente: 'manual' };
                this.cambiosSinGuardar = false;
            } catch (e) {
                this.error = 'Error de conexión al guardar el ajuste.';
            } finally {
                this.cargando = false;
            }
        },
    };
}
