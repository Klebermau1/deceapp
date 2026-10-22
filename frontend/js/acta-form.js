// Componente Alpine para el formulario de actas de reunion: busqueda de
// estudiante, filas dinamicas de acuerdos/asistentes, firma en canvas y
// transcripcion de voz en vivo (Web Speech API) con autoguardado.
export default function actaForm(config) {
    return {
        estudiante: config.estudiante ?? null,
        busquedaEstudiante: '',
        resultadosBusqueda: [],
        buscandoEstudiante: false,

        acuerdos: config.acuerdos ?? [],
        asistentes: config.asistentes ?? [],

        desarrollo: config.desarrollo ?? '',
        transcripcionParcial: '',

        soportaVoz: false,
        grabando: false,
        errorVoz: null,
        reconocimiento: null,

        actaId: config.actaId ?? null,
        autoguardarUrl: config.autoguardarUrl ?? null,
        buscarEstudianteUrl: config.buscarEstudianteUrl ?? '/fichas-buscar',
        estadoGuardado: '',
        _autoguardarTimer: null,
        _uidContador: 0,

        init() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.soportaVoz = !!SpeechRecognition;

            if (this.soportaVoz) {
                this.reconocimiento = new SpeechRecognition();
                this.reconocimiento.lang = 'es-EC';
                this.reconocimiento.continuous = true;
                this.reconocimiento.interimResults = true;

                this.reconocimiento.onresult = (evento) => this._alRecibirResultado(evento);
                this.reconocimiento.onerror = (evento) => {
                    this.errorVoz = 'Error de reconocimiento de voz: ' + evento.error;
                };
                this.reconocimiento.onend = () => {
                    // El navegador puede cortar el reconocimiento tras un silencio;
                    // si el usuario sigue en "grabando", se reinicia automaticamente.
                    if (this.grabando) {
                        try {
                            this.reconocimiento.start();
                        } catch (e) {
                            // ya estaba iniciado, se ignora
                        }
                    }
                };
            }

            this.acuerdos.forEach((a) => { a._uid = a._uid ?? this._nuevoUid(); });
            this.asistentes.forEach((a) => { a._uid = a._uid ?? this._nuevoUid(); });
        },

        _nuevoUid() {
            this._uidContador += 1;
            return 'row-' + this._uidContador + '-' + Date.now();
        },

        _alRecibirResultado(evento) {
            let finalNuevo = '';
            let parcial = '';

            for (let i = evento.resultIndex; i < evento.results.length; i++) {
                const resultado = evento.results[i];
                if (resultado.isFinal) {
                    finalNuevo += resultado[0].transcript + ' ';
                } else {
                    parcial += resultado[0].transcript;
                }
            }

            if (finalNuevo) {
                this.desarrollo = (this.desarrollo ? this.desarrollo.trimEnd() + '\n' : '') + finalNuevo.trim();
                this._programarAutoguardado();
            }

            this.transcripcionParcial = parcial;
        },

        toggleGrabacion() {
            if (!this.soportaVoz) {
                return;
            }

            if (this.grabando) {
                this.grabando = false;
                this.reconocimiento.stop();
            } else {
                this.errorVoz = null;
                this.grabando = true;
                this.reconocimiento.start();
            }
        },

        _programarAutoguardado() {
            if (!this.actaId || !this.autoguardarUrl) {
                return;
            }

            clearTimeout(this._autoguardarTimer);
            this._autoguardarTimer = setTimeout(() => this.autoguardar(), 4000);
        },

        async autoguardar() {
            if (!this.autoguardarUrl) {
                return;
            }

            try {
                const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
                const respuesta = await fetch(this.autoguardarUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': token,
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify({ desarrollo_reunion: this.desarrollo }),
                });

                if (respuesta.ok) {
                    const datos = await respuesta.json();
                    this.estadoGuardado = 'Guardado automáticamente a las ' + datos.hora;
                }
            } catch (e) {
                this.estadoGuardado = 'No se pudo autoguardar (revisa tu conexión).';
            }
        },

        async buscarEstudiante() {
            if (this.busquedaEstudiante.trim().length < 2) {
                this.resultadosBusqueda = [];
                return;
            }

            this.buscandoEstudiante = true;
            try {
                const respuesta = await fetch(this.buscarEstudianteUrl + '?q=' + encodeURIComponent(this.busquedaEstudiante));
                this.resultadosBusqueda = await respuesta.json();
            } finally {
                this.buscandoEstudiante = false;
            }
        },

        seleccionarEstudiante(item) {
            this.estudiante = item;
            this.resultadosBusqueda = [];
            this.busquedaEstudiante = '';
        },

        quitarEstudiante() {
            this.estudiante = null;
        },

        agregarAcuerdo() {
            this.acuerdos.push({ _uid: this._nuevoUid(), descripcion: '', responsable: '', fecha_plazo: '' });
        },

        quitarAcuerdo(index) {
            this.acuerdos.splice(index, 1);
        },

        agregarAsistente() {
            this.asistentes.push({ _uid: this._nuevoUid(), nombres: '', cargo: '', correo: '', telefono: '', firma: '' });
        },

        quitarAsistente(index) {
            this.asistentes.splice(index, 1);
        },

        // --- Firma en canvas ---
        _trazando: false,

        posicionEvento(evento, canvas) {
            const rect = canvas.getBoundingClientRect();
            const origen = evento.touches ? evento.touches[0] : evento;
            return { x: origen.clientX - rect.left, y: origen.clientY - rect.top };
        },

        iniciarTrazo(evento, canvas) {
            this._trazando = true;
            const ctx = canvas.getContext('2d');
            const { x, y } = this.posicionEvento(evento, canvas);
            ctx.beginPath();
            ctx.moveTo(x, y);
        },

        trazar(evento, canvas) {
            if (!this._trazando) return;
            const ctx = canvas.getContext('2d');
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#1f2937';
            const { x, y } = this.posicionEvento(evento, canvas);
            ctx.lineTo(x, y);
            ctx.stroke();
        },

        terminarTrazo(canvas, index) {
            if (!this._trazando) return;
            this._trazando = false;
            this.asistentes[index].firma = canvas.toDataURL('image/png');
        },

        limpiarFirma(canvas, index) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.asistentes[index].firma = '';
        },
    };
}
