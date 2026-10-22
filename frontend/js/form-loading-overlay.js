// Overlay bloqueante generico: se muestra en CUALQUIER <form> que se envia
// (staff, portal docente, login), para que el usuario sepa que la pagina
// esta procesando algo y no vuelva a hacer clic. Un formulario puede
// personalizar el mensaje con data-loading-mensaje="..."; puede optar por no
// mostrarlo (ej. un formulario de busqueda instantanea) con data-sin-overlay.
export default function iniciarOverlayDeCarga() {
    const overlay = document.getElementById('form-loading-overlay');
    const mensaje = document.getElementById('form-loading-overlay-mensaje');

    if (!overlay || !mensaje) {
        return;
    }

    const mensajePorDefecto = mensaje.textContent;

    const mostrar = () => overlay.classList.replace('hidden', 'flex');
    const ocultar = () => overlay.classList.replace('flex', 'hidden');

    document.addEventListener('submit', (evento) => {
        const form = evento.target;

        if (!(form instanceof HTMLFormElement) || form.hasAttribute('data-sin-overlay') || evento.defaultPrevented) {
            return;
        }

        mensaje.textContent = form.dataset.loadingMensaje || mensajePorDefecto;
        mostrar();
    });

    // Si el usuario vuelve con el boton "atras" del navegador (bfcache), la
    // pagina puede reaparecer con el overlay todavia visible de un envio
    // anterior -- se oculta siempre al mostrarse la pagina.
    window.addEventListener('pageshow', ocultar);
}
