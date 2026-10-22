// Rutas con nombre, como route('usuarios.edit', id) de Laravel. Cada ruta se
// registra con definir(); las vistas y redirecciones la piden por nombre, y
// el menu marca la opcion activa comparando el nombre de la ruta actual.
import express from 'express';

const rutas = new Map();

/**
 * URL de una ruta con nombre. Los parametros se pasan en orden
 * (route('usuarios.edit', 5)) o como objeto ({ usuario: 5 }); un objeto como
 * ultimo argumento con claves sobrantes se agrega como query string.
 */
export function route(nombre, ...args) {
    const patron = rutas.get(nombre);
    if (!patron) {
        throw new Error(`Ruta sin definir: ${nombre}`);
    }

    let posicionales = args;
    let porNombre = {};
    if (args.length === 1 && args[0] !== null && typeof args[0] === 'object' && !('id' in args[0])) {
        porNombre = { ...args[0] };
        posicionales = [];
    }

    const query = {};
    let i = 0;
    const url = patron.replace(/:(\w+)(\([^)]*\))?\??/g, (_, clave) => {
        let valor;
        if (clave in porNombre) {
            valor = porNombre[clave];
            delete porNombre[clave];
        } else {
            valor = posicionales[i++];
        }
        if (valor !== null && typeof valor === 'object') {
            valor = valor.id;
        }
        return encodeURIComponent(String(valor ?? ''));
    });

    Object.assign(query, porNombre);
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();

    return qs ? `${url}?${qs}` : url;
}

/** true si ya hay una ruta con ese nombre (los modulos se migran por fases). */
export function existeRuta(nombre) {
    return rutas.has(nombre);
}

/** true si el nombre de la ruta actual coincide con algun patron (admite *). */
export function routeIs(actual, ...patrones) {
    if (!actual) {
        return false;
    }
    return patrones.flat().some((p) => {
        if (!p.includes('*')) {
            return p === actual;
        }
        const re = new RegExp('^' + p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
        return re.test(actual);
    });
}

/**
 * Router de Express con rutas con nombre:
 *   const r = enrutador();
 *   r.get('usuarios.index', '/usuarios', puedeVer, handler);
 * Los handlers async pasan sus errores a next() automaticamente.
 */
export function enrutador(prefijo = '') {
    const router = express.Router();
    const api = { router };

    for (const metodo of ['get', 'post', 'put', 'patch', 'delete']) {
        api[metodo] = (nombre, ruta, ...handlers) => {
            if (nombre) {
                if (rutas.has(nombre)) {
                    throw new Error(`Ruta duplicada: ${nombre}`);
                }
                rutas.set(nombre, prefijo + ruta);
            }
            const conNombre = (req, res, next) => {
                req.routeName = nombre;
                res.locals.routeName = nombre;
                next();
            };
            router[metodo](ruta, conNombre, ...handlers.map(envolver));
            return api;
        };
    }

    /** Middleware para todas las rutas que se definan despues en este router. */
    api.use = (...handlers) => {
        router.use(...handlers.map(envolver));
        return api;
    };

    return api;
}

function envolver(handler) {
    if (handler.length === 4) {
        return handler;
    }
    return function (req, res, next) {
        try {
            const resultado = handler(req, res, next);
            if (resultado && typeof resultado.catch === 'function') {
                resultado.catch(next);
            }
        } catch (error) {
            next(error);
        }
    };
}
