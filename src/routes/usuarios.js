// Administracion > Usuarios: cuentas del equipo DECE y su perfil (rol).
import { enrutador, route } from '../lib/rutas.js';
import { validar, unico, existe, booleano } from '../lib/validacion.js';
import { cifrarClave, MODELO_USUARIO, GUARD } from '../lib/usuarios.js';
import { registrar, cambios } from '../lib/actividad.js';
import { paginar } from '../lib/paginacion.js';
import { query, first, transaction, ahora } from '../db/index.js';
import { auth, activo, permiso } from '../middleware/auth.js';
import { atras } from '../middleware/sesion.js';

const r = enrutador();
const admin = [auth, activo, permiso('gestionar usuarios')];

const CAMPOS_AUDITADOS = ['name', 'email', 'cargo', 'activo'];

const nombresDeRoles = async () => (await query('SELECT name FROM roles WHERE guard_name = ? ORDER BY name', [GUARD])).map((f) => f.name);

async function buscarUsuario(id) {
    return first('SELECT id, name, email, cargo, activo FROM users WHERE id = ?', [id]);
}

async function rolDe(id) {
    const fila = await first(
        `SELECT r.name FROM roles r JOIN model_has_roles m ON m.role_id = r.id
         WHERE m.model_type = ? AND m.model_id = ? ORDER BY r.id LIMIT 1`,
        [MODELO_USUARIO, id],
    );
    return fila?.name ?? null;
}

/** Deja al usuario con un unico rol (syncRoles). */
async function asignarRol(conn, usuarioId, nombreRol) {
    const rol = await conn.first('SELECT id FROM roles WHERE name = ? AND guard_name = ?', [nombreRol, GUARD]);
    await conn.execute('DELETE FROM model_has_roles WHERE model_type = ? AND model_id = ?', [MODELO_USUARIO, usuarioId]);
    await conn.execute('INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, ?, ?)', [rol.id, MODELO_USUARIO, usuarioId]);
}

/**
 * Elimina un usuario. Devuelve un mensaje si no se puede porque tiene
 * registros asociados (actas, docentes, etc.), o null si se elimino.
 */
export async function eliminarUsuario(id, causante) {
    const antes = await buscarUsuario(id);
    try {
        await transaction(async (conn) => {
            await conn.execute('DELETE FROM model_has_roles WHERE model_type = ? AND model_id = ?', [MODELO_USUARIO, id]);
            await conn.execute('DELETE FROM model_has_permissions WHERE model_type = ? AND model_id = ?', [MODELO_USUARIO, id]);
            await conn.execute('DELETE FROM users WHERE id = ?', [id]);
        });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
            return 'No se puede eliminar este usuario porque tiene registros asociados (actas, docentes u otros). Desactiva la cuenta en su lugar.';
        }
        throw error;
    }

    await registrar({
        log: 'usuarios', descripcion: 'deleted', evento: 'deleted', usuario: causante,
        sujeto: { tipo: MODELO_USUARIO, id }, propiedades: { old: { ...pick(antes, CAMPOS_AUDITADOS), activo: Boolean(antes?.activo) } },
    });
    return null;
}

const pick = (obj, campos) => Object.fromEntries(campos.map((c) => [c, obj?.[c] ?? null]));

r.get('usuarios.index', '/usuarios', ...admin, async (req, res) => {
    const pagina = await paginar(req, {
        sql: `SELECT u.id, u.name, u.email, u.cargo, u.activo,
                     (SELECT GROUP_CONCAT(r.name ORDER BY r.id SEPARATOR ', ')
                      FROM model_has_roles m JOIN roles r ON r.id = m.role_id
                      WHERE m.model_type = ? AND m.model_id = u.id) AS roles
              FROM users u ORDER BY u.name`,
        conteo: 'SELECT COUNT(*) AS total FROM users',
        params: [MODELO_USUARIO],
        conteoParams: [],
        porPagina: 15,
    });

    res.render('usuarios/index', { titulo: 'Usuarios', pagina });
});

r.get('usuarios.create', '/usuarios/create', ...admin, async (req, res) => {
    res.render('usuarios/form', { titulo: 'Nuevo usuario', usuario: null, rolActual: null, roles: await nombresDeRoles() });
});

r.post('usuarios.store', '/usuarios', ...admin, async (req, res) => {
    const datos = await validar(req.body, {
        name: ['required', 'string', 'max:150'],
        email: ['required', 'email', 'max:150', unico('users', 'email')],
        password: ['required', 'string', 'min:8', 'confirmed'],
        cargo: ['nullable', 'string', 'max:100'],
        role: ['required', existe('roles', 'name')],
    });

    const nuevo = {
        name: datos.name,
        email: datos.email,
        cargo: datos.cargo ?? null,
        activo: booleano(req.body, 'activo', false),
    };

    const id = await transaction(async (conn) => {
        const fecha = ahora();
        const { insertId } = await conn.execute(
            'INSERT INTO users (name, email, password, cargo, activo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nuevo.name, nuevo.email, await cifrarClave(datos.password), nuevo.cargo, nuevo.activo ? 1 : 0, fecha, fecha],
        );
        await asignarRol(conn, insertId, datos.role);
        return insertId;
    });

    await registrar({
        log: 'usuarios', descripcion: 'created', evento: 'created', usuario: req.user,
        sujeto: { tipo: MODELO_USUARIO, id }, propiedades: { attributes: nuevo },
    });

    req.flash('status', 'Usuario creado correctamente.');
    res.redirect(route('usuarios.index'));
});

r.get('usuarios.edit', '/usuarios/:usuario/edit', ...admin, async (req, res, next) => {
    const usuario = await buscarUsuario(req.params.usuario);
    if (!usuario) {
        return next();
    }
    res.render('usuarios/form', {
        titulo: 'Editar usuario',
        usuario,
        rolActual: await rolDe(usuario.id),
        roles: await nombresDeRoles(),
    });
});

r.put('usuarios.update', '/usuarios/:usuario', ...admin, async (req, res, next) => {
    const antes = await buscarUsuario(req.params.usuario);
    if (!antes) {
        return next();
    }

    const datos = await validar(req.body, {
        name: ['required', 'string', 'max:150'],
        email: ['required', 'email', 'max:150', unico('users', 'email', antes.id)],
        password: ['nullable', 'string', 'min:8', 'confirmed'],
        cargo: ['nullable', 'string', 'max:100'],
        role: ['required', existe('roles', 'name')],
    });

    const despues = {
        name: datos.name,
        email: datos.email,
        cargo: datos.cargo ?? null,
        activo: booleano(req.body, 'activo', false),
    };

    await transaction(async (conn) => {
        const campos = ['name = ?', 'email = ?', 'cargo = ?', 'activo = ?', 'updated_at = ?'];
        const valores = [despues.name, despues.email, despues.cargo, despues.activo ? 1 : 0, ahora()];
        if (datos.password) {
            campos.push('password = ?');
            valores.push(await cifrarClave(datos.password));
        }
        await conn.execute(`UPDATE users SET ${campos.join(', ')} WHERE id = ?`, [...valores, antes.id]);
        await asignarRol(conn, antes.id, datos.role);
    });

    const diferencias = cambios({ ...antes, activo: Boolean(antes.activo) }, despues, CAMPOS_AUDITADOS);
    if (diferencias) {
        await registrar({
            log: 'usuarios', descripcion: 'updated', evento: 'updated', usuario: req.user,
            sujeto: { tipo: MODELO_USUARIO, id: antes.id }, propiedades: diferencias,
        });
    }

    req.flash('status', 'Usuario actualizado correctamente.');
    res.redirect(route('usuarios.index'));
});

r.delete('usuarios.destroy', '/usuarios/:usuario', ...admin, async (req, res, next) => {
    const usuario = await buscarUsuario(req.params.usuario);
    if (!usuario) {
        return next();
    }
    if (usuario.id === req.user.id) {
        req.flash('error', 'No puedes eliminar tu propia cuenta.');
        return atras(req, res, route('usuarios.index'));
    }

    const error = await eliminarUsuario(usuario.id, req.user);
    req.flash(error ? 'error' : 'status', error ?? 'Usuario eliminado.');
    res.redirect(route('usuarios.index'));
});

export default r.router;
