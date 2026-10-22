// Login y permisos del personal DECE (equivale a los middleware auth,
// activo, guest, permission:... y role:... de la version PHP).
import { cargarUsuario, puede, tieneRol } from '../lib/usuarios.js';
import { route } from '../lib/rutas.js';
import { regenerar } from './sesion.js';
import { regenerarToken } from './csrf.js';

/** Carga req.user en cada peticion si hay sesion iniciada. */
export async function usuarioActual(req, res, next) {
    try {
        req.user = req.session.userId ? await cargarUsuario(req.session.userId) : null;
        if (req.session.userId && !req.user) {
            // El usuario fue eliminado mientras tenia la sesion abierta.
            delete req.session.userId;
        }
        res.locals.user = req.user;
        res.locals.can = (permisos) => puede(req.user, permisos);
        res.locals.hasRole = (rol) => tieneRol(req.user, rol);
        next();
    } catch (error) {
        next(error);
    }
}

/** Exige sesion iniciada; si no, guarda la URL y manda al login. */
export function auth(req, res, next) {
    if (req.user) {
        return next();
    }
    if (req.method === 'GET') {
        req.session.urlDestino = req.originalUrl;
    }
    if (req.xhr || req.get('Accept')?.includes('application/json')) {
        return res.status(401).json({ message: 'No autenticado.' });
    }
    res.redirect(route('login'));
}

/** Cierra la sesion de una cuenta desactivada (EnsureUserIsActive). */
export async function activo(req, res, next) {
    if (req.user && !req.user.activo) {
        try {
            await regenerar(req);
            regenerarToken(req);
            req.conErrores({ email: ['Tu cuenta ha sido desactivada. Contacta al administrador del sistema DECE.'] });
            return res.redirect(route('login'));
        } catch (error) {
            return next(error);
        }
    }
    next();
}

/** Solo para quien NO tiene sesion (pantalla de login). */
export function invitado(req, res, next) {
    if (req.user) {
        return res.redirect(route('dashboard'));
    }
    next();
}

/** permission:a|b -> basta con tener uno. */
export function permiso(...permisos) {
    return (req, res, next) => {
        if (puede(req.user, permisos.flat())) {
            return next();
        }
        prohibido(req, res);
    };
}

export function rol(nombre) {
    return (req, res, next) => {
        if (tieneRol(req.user, nombre)) {
            return next();
        }
        prohibido(req, res);
    };
}

export function prohibido(req, res, mensaje = 'No tienes permiso para realizar esta acción.') {
    if (req.xhr || req.get('Accept')?.includes('application/json')) {
        return res.status(403).json({ message: mensaje });
    }
    res.status(403).render('errors/403', { layout: 'layouts/simple', titulo: 'Acceso denegado', mensaje });
}
