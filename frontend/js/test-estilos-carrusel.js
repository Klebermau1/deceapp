// Carrusel del test de estilos de aprendizaje: muestra una pregunta a la vez
// y avanza sola al elegir una opcion. Sigue siendo un unico <form> (todas las
// preguntas se envian juntas y el servidor valida igual que antes); el
// carrusel solo decide que <fieldset data-pregunta="n"> se ve.
export default function testEstilosCarrusel({ total, inicial = 1 }) {
    return {
        total,
        actual: inicial,
        direccion: 'adelante',
        respondidas: {},
        temporizador: null,

        init() {
            this.$el.querySelectorAll('input[type=radio]:checked').forEach((radio) => {
                this.respondidas[this.numeroDe(radio)] = true;
            });
        },

        get totalRespondidas() {
            return Object.keys(this.respondidas).length;
        },

        get completo() {
            return this.totalRespondidas >= this.total;
        },

        numeroDe(elemento) {
            return Number(elemento.closest('[data-pregunta]').dataset.pregunta);
        },

        elegir(evento) {
            const numero = this.numeroDe(evento.target);
            this.respondidas[numero] = true;

            // Pequena pausa para que se vea la opcion marcada antes de pasar.
            clearTimeout(this.temporizador);
            this.temporizador = setTimeout(() => {
                if (numero === this.actual) {
                    this.irA(this.completo ? this.total : this.siguientePendiente(numero));
                }
            }, 450);
        },

        siguientePendiente(desde) {
            for (let n = desde + 1; n <= this.total; n++) {
                if (!this.respondidas[n]) return n;
            }
            for (let n = 1; n <= desde; n++) {
                if (!this.respondidas[n]) return n;
            }
            return Math.min(desde + 1, this.total);
        },

        irA(numero) {
            if (numero < 1 || numero > this.total || numero === this.actual) return;
            clearTimeout(this.temporizador);
            this.direccion = numero > this.actual ? 'adelante' : 'atras';
            this.actual = numero;
        },

        anterior() {
            this.irA(this.actual - 1);
        },

        siguiente() {
            this.irA(this.actual + 1);
        },

        teclado(evento) {
            if (evento.key === 'ArrowRight') this.siguiente();
            if (evento.key === 'ArrowLeft') this.anterior();
        },

        enviar(evento) {
            if (!this.completo) {
                evento.preventDefault();
                this.irA(this.siguientePendiente(0));
            }
        },
    };
}
