// Mensajes flash, errores de validacion y datos anteriores del formulario,
// como session('status'), $errors y old() de Laravel. Todo vive en la sesion
// y dura exactamente una peticion: lo que se guarda al redirigir se muestra
// en la pagina siguiente y despues se borra.

const CAMPOS_SIN_OLD = ['password', 'password_confirmation', 'current_password', '_token', '_method'];

export function flash(req, res, next) {
    const anterior = req.session._flash ?? {};
    delete req.session._flash;

    req.flash = (clave, valor) => {
        req.session._flash ??= {};
        req.session._flash[clave] = valor;
    };

    /** Vuelve al formulario con errores (por bolsa) y lo que se habia escrito. */
    req.conErrores = (errores, bolsa = 'default') => {
        req.flash('errores', { [bolsa]: errores });
        const old = { ...req.body };
        for (const campo of CAMPOS_SIN_OLD) {
            delete old[campo];
        }
        req.flash('old', old);
    };

    const errores = anterior.errores ?? {};
    const old = anterior.old ?? {};

    res.locals.session = (clave) => anterior[clave];
    res.locals.old = (campo, porDefecto = '') => (campo in old ? old[campo] : porDefecto ?? '');
    res.locals.hayOld = Object.keys(old).length > 0;
    /** errors('email') -> lista de mensajes; errors('password', 'updatePassword') para otra bolsa. */
    res.locals.errors = (campo, bolsa = 'default') => errores[bolsa]?.[campo] ?? [];
    res.locals.tieneErrores = (bolsa = 'default') => Object.keys(errores[bolsa] ?? {}).length > 0;

    next();
}

/** Regenera el id de sesion (al iniciar o cerrar sesion) conservando datos. */
export function regenerar(req, conservar = {}) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((error) => {
            if (error) {
                return reject(error);
            }
            Object.assign(req.session, conservar);
            resolve();
        });
    });
}

export function destruir(req) {
    return new Promise((resolve, reject) => {
        req.session.destroy((error) => (error ? reject(error) : resolve()));
    });
}

/** Redirige a la pagina anterior, como back() de Laravel. */
export function atras(req, res, porDefecto = '/') {
    const referer = req.get('Referer');
    try {
        const url = referer ? new URL(referer) : null;
        if (url && url.host === req.get('host')) {
            return res.redirect(url.pathname + url.search);
        }
    } catch {
        // Referer mal formado: se usa la ruta por defecto.
    }
    return res.redirect(porDefecto);
}
