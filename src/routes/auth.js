// Login del personal DECE. El autorregistro esta deshabilitado a proposito:
// las cuentas solo las crea un Administrador desde el modulo de Usuarios.
import { enrutador, route } from '../lib/rutas.js';
import { validar, booleano } from '../lib/validacion.js';
import { buscarPorCorreo, verificarClave, cifrarClave } from '../lib/usuarios.js';
import { demasiadosIntentos, registrarIntento, limpiar, segundosRestantes } from '../lib/limitador.js';
import { execute, first, ahora } from '../db/index.js';
import { auth, invitado } from '../middleware/auth.js';
import { regenerar, atras } from '../middleware/sesion.js';
import { regenerarToken } from '../middleware/csrf.js';
import config from '../config/index.js';

const r = enrutador();

const MAX_INTENTOS = 5;
const RECORDAR_DIAS = 30;

r.get('login', '/login', invitado, (req, res) => {
    res.render('auth/login', { layout: 'layouts/guest' });
});

r.post(null, '/login', invitado, async (req, res) => {
    const datos = await validar(req.body, {
        email: ['required', 'string', 'email'],
        password: ['required', 'string'],
    });

    const clave = `${datos.email.toLowerCase()}|${req.ip}`;
    if (demasiadosIntentos(clave, MAX_INTENTOS)) {
        req.conErrores({ email: [`Demasiados intentos de acceso. Por favor intenta de nuevo en ${segundosRestantes(clave)} segundos.`] });
        return res.redirect(route('login'));
    }

    const usuario = await buscarPorCorreo(datos.email);
    if (!usuario || !(await verificarClave(datos.password, usuario.password))) {
        registrarIntento(clave);
        req.conErrores({ email: ['Estas credenciales no coinciden con nuestros registros.'] });
        return res.redirect(route('login'));
    }

    limpiar(clave);

    const destino = req.session.urlDestino;
    await regenerar(req, { userId: usuario.id });
    regenerarToken(req);
    req.session.cookie.maxAge = booleano(req.body, 'remember')
        ? RECORDAR_DIAS * 24 * 60 * 60 * 1000
        : config.sesion.minutos * 60 * 1000;

    res.redirect(destino && destino.startsWith('/') && !destino.startsWith('//') ? destino : route('dashboard'));
});

r.post('logout', '/logout', auth, async (req, res) => {
    await regenerar(req);
    regenerarToken(req);
    res.redirect('/');
});

// Cambiar la contraseña desde "Mi perfil".
r.put('password.update', '/password', auth, async (req, res) => {
    const datos = await validar(req.body, {
        current_password: ['required', 'string'],
        password: ['required', 'string', 'min:8', 'confirmed'],
    }, { bolsa: 'updatePassword' });

    const { password } = await first('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!(await verificarClave(datos.current_password, password))) {
        req.conErrores({ current_password: ['La contraseña es incorrecta.'] }, 'updatePassword');
        return atras(req, res, route('profile.edit'));
    }

    await execute('UPDATE users SET password = ?, updated_at = ? WHERE id = ?', [await cifrarClave(datos.password), ahora(), req.user.id]);

    req.flash('status', 'password-updated');
    atras(req, res, route('profile.edit'));
});

export default r.router;
