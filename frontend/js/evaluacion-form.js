// Carrusel de la evaluacion anual de bienestar docente: una pregunta a la
// vez, con validacion propia antes de avanzar (los inputs de pasos ocultos
// quedan fuera de la validacion nativa del navegador, asi que esto evita
// que alguien "salte" preguntas sin responder antes de llegar al final).
export default function evaluacionForm(config) {
    return {
        paso: config.pasoInicial ?? 0,
        orden: config.orden ?? [], // ids de pregunta en el orden del carrusel
        tipos: config.tipos ?? {}, // { [preguntaId]: 'escala_1_5' | 'abierta' }
        respuestas: config.respuestas ?? {}, // { [preguntaId]: valor } , reactivo
        error: '',

        get total() {
            return this.orden.length;
        },

        get preguntaActualId() {
            return this.orden[this.paso];
        },

        get esUltimoPaso() {
            return this.paso === this.total - 1;
        },

        get porcentaje() {
            return this.total > 0 ? Math.round(((this.paso + 1) / this.total) * 100) : 0;
        },

        respondida(preguntaId) {
            const valor = this.respuestas[preguntaId];
            return valor !== null && valor !== undefined && String(valor).trim() !== '';
        },

        siguiente() {
            if (!this.respondida(this.preguntaActualId)) {
                this.error = 'Responde esta pregunta antes de continuar.';
                return;
            }

            this.error = '';
            if (!this.esUltimoPaso) {
                this.paso++;
            }
        },

        anterior() {
            this.error = '';
            if (this.paso > 0) {
                this.paso--;
            }
        },

        ir(indice) {
            // Solo permite saltar hacia atras a preguntas ya respondidas, o
            // avanzar si todo lo anterior esta respondido (evita huecos).
            for (let i = 0; i < indice; i++) {
                if (!this.respondida(this.orden[i])) {
                    return;
                }
            }
            this.error = '';
            this.paso = indice;
        },

        alEnviar(evento) {
            // Ultima validacion, defensiva, por si el usuario llega al
            // final sin haber pasado por siguiente() en algun paso.
            const faltante = this.orden.find((id) => !this.respondida(id));
            if (faltante) {
                evento.preventDefault();
                this.ir(this.orden.indexOf(faltante));
                this.error = 'Falta responder esta pregunta.';
            }
        },
    };
}
