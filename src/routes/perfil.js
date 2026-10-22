// "Mi perfil": nombre, correo, contraseña (ver routes/auth.js) y eliminar la
// propia cuenta.
import { enrutador, route } from '../lib/rutas.js';
import { validar, unico } from '../lib/validacion.js';
import { verificarClave, MODELO_USUARIO } from '../lib/usuarios.js';
import { registrar, cambios } from '../lib/actividad.js';
import { execute, first, ahora } from '../db/index.js';
import { auth, activo } from '../middleware/auth.js';
import { regenerar } from '../middleware/sesion.js';
import { regenerarToken } from '../middleware/csrf.js';
import { eliminarUsuario } from './usuarios.js';

const r = enrutador();
const staff = [auth, activo];

const CAMPOS_AUDITADOS = ['name', 'email', 'cargo', 'activo'];

r.get('profile.edit', '/profile', ...staff, (req, res) => {
    res.render('profile/edit', { titulo: 'Mi perfil' });
});

r.patch('profile.update', '/profile', ...staff, async (req, res) => {
    const datos = await validar(req.body, {
        name: ['required', 'string', 'max:255'],
        email: ['required', 'string', 'lowercase', 'email', 'max:255', unico('users', 'email', req.user.id)],
    });

    const antes = await first('SELECT name, email, cargo, activo FROM users WHERE id = ?', [req.user.id]);
    const cambioCorreo = antes.email !== datos.email;

    await execute(
        `UPDATE users SET name = ?, email = ?, ${cambioCorreo ? 'email_verified_at = NULL,' : ''} updated_at = ? WHERE id = ?`,
        [datos.name, datos.email, ahora(), req.user.id],
    );

    const diferencias = cambios(antes, { ...antes, ...datos }, CAMPOS_AUDITADOS);
    if (diferencias) {
        await registrar({
            log: 'usuarios', descripcion: 'updated', evento: 'updated', usuario: req.user,
            sujeto: { tipo: MODELO_USUARIO, id: req.user.id }, propiedades: diferencias,
        });
    }

    req.flash('status', 'profile-updated');
    res.redirect(route('profile.edit'));
});

r.delete('profile.destroy', '/profile', ...staff, async (req, res) => {
    const datos = await validar(req.body, { password: ['required', 'string'] }, { bolsa: 'userDeletion' });

    const { password } = await first('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!(await verificarClave(datos.password, password))) {
        req.conErrores({ password: ['La contraseña es incorrecta.'] }, 'userDeletion');
        return res.redirect(route('profile.edit'));
    }

    const error = await eliminarUsuario(req.user.id, req.user);
    if (error) {
        req.flash('error', error);
        return res.redirect(route('profile.edit'));
    }

    await regenerar(req);
    regenerarToken(req);
    res.redirect('/');
});

export default r.router;
