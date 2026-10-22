// Carrusel de preguntas para la entrevista del Instrumento de Aplicacion.
// Todas las preguntas viven en el DOM (inputs ocultos ligados a este estado),
// pero solo se muestra una a la vez -- el envio del formulario sigue siendo
// un PUT normal con "respuestas[preguntaId]" para cada pregunta, exactamente
// igual que antes del carrusel.
export default function instrumentoResponder(config) {
    return {
        preguntas: config.preguntas ?? [],
        indice: 0,

        init() {
            const primeraSinResponder = this.preguntas.findIndex((p) => p.valor === null);
            this.indice = primeraSinResponder === -1 ? 0 : primeraSinResponder;
        },

        get actual() {
            return this.preguntas[this.indice];
        },

        get totalRespondidas() {
            return this.preguntas.filter((p) => p.valor !== null).length;
        },

        get esUltima() {
            return this.indice === this.preguntas.length - 1;
        },

        get esPrimera() {
            return this.indice === 0;
        },

        escalaPara(componente) {
            return componente === 1
                ? [{ valor: 3, etiqueta: 'Alcanzado' }, { valor: 2, etiqueta: 'En proceso' }, { valor: 1, etiqueta: 'Iniciado' }]
                : [{ valor: 3, etiqueta: 'Favorable' }, { valor: 2, etiqueta: 'Medianamente favorable' }, { valor: 1, etiqueta: 'No favorable' }];
        },

        seleccionar(valor) {
            this.actual.valor = valor;
            if (!this.esUltima) {
                setTimeout(() => this.siguiente(), 200);
            }
        },

        siguiente() {
            if (!this.esUltima) {
                this.indice += 1;
            }
        },

        anterior() {
            if (!this.esPrimera) {
                this.indice -= 1;
            }
        },

        irA(i) {
            this.indice = i;
        },
    };
}
