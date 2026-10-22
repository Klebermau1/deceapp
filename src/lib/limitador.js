// Limite de intentos en memoria, como el RateLimiter de Laravel: N intentos
// por clave dentro de una ventana de tiempo. Sirve para el login (5 por
// correo+IP) y para los formularios publicos. Al ser en memoria se reinicia
// al reiniciar la app, igual que el cache "array".

const intentos = new Map();

function entrada(clave, segundos) {
    const ahora = Date.now();
    let e = intentos.get(clave);
    if (!e || e.vence <= ahora) {
        e = { cuenta: 0, vence: ahora + segundos * 1000 };
        intentos.set(clave, e);
    }
    return e;
}

export function demasiadosIntentos(clave, maximo, segundos = 60) {
    return entrada(clave, segundos).cuenta >= maximo;
}

export function registrarIntento(clave, segundos = 60) {
    entrada(clave, segundos).cuenta += 1;
}

export function limpiar(clave) {
    intentos.delete(clave);
}

export function segundosRestantes(clave) {
    const e = intentos.get(clave);
    return e ? Math.max(0, Math.ceil((e.vence - Date.now()) / 1000)) : 0;
}

/**
 * Middleware equivalente a ->middleware('throttle:20,1'): maximo de
 * peticiones por IP y ruta en `minutos`.
 */
export function throttle(maximo, minutos = 1) {
    return (req, res, next) => {
        const clave = `throttle|${req.ip}|${req.method}|${req.baseUrl}${req.path}`;
        if (demasiadosIntentos(clave, maximo, minutos * 60)) {
            res.set('Retry-After', String(segundosRestantes(clave)));
            return res.status(429).render('errors/429', { layout: 'layouts/simple', titulo: 'Demasiadas solicitudes' });
        }
        registrarIntento(clave, minutos * 60);
        next();
    };
}

// Limpia entradas vencidas cada 10 minutos para que el mapa no crezca.
setInterval(() => {
    const ahora = Date.now();
    for (const [clave, e] of intentos) {
        if (e.vence <= ahora) {
            intentos.delete(clave);
        }
    }
}, 10 * 60 * 1000).unref();
