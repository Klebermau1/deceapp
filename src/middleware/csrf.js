// Proteccion CSRF como @csrf de Laravel: cada sesion tiene un token, los
// formularios lo envian en el campo _token (o en la cabecera X-CSRF-TOKEN
// para fetch/axios) y toda peticion que modifica datos lo debe traer.
import crypto from 'node:crypto';

const SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function tokenDe(req) {
    if (!req.session._token) {
        req.session._token = crypto.randomBytes(32).toString('hex');
    }
    return req.session._token;
}

export function regenerarToken(req) {
    req.session._token = crypto.randomBytes(32).toString('hex');
    return req.session._token;
}

function coincide(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
        return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function verificar(req, res, next) {
    const token = tokenDe(req);
    res.locals.csrfToken = token;
    res.locals.csrf = `<input type="hidden" name="_token" value="${token}">`;

    if (SEGUROS.has(req.method)) {
        return next();
    }

    // Los formularios multipart (con archivos) se verifican despues de
    // leerlos con multer, en verificarDespuesDeSubir.
    if (req.is('multipart/form-data')) {
        return next();
    }

    const enviado = req.body?._token ?? req.get('X-CSRF-TOKEN');
    if (!coincide(enviado, token)) {
        return res.status(419).render('errors/419', { layout: 'layouts/simple', titulo: 'Página expirada' });
    }
    next();
}

/** Para rutas con multer: va despues del middleware que lee los archivos. */
export function verificarDespuesDeSubir(req, res, next) {
    if (!coincide(req.body?._token ?? req.get('X-CSRF-TOKEN'), tokenDe(req))) {
        return res.status(419).render('errors/419', { layout: 'layouts/simple', titulo: 'Página expirada' });
    }
    next();
}
