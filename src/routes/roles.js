// Administracion > Perfiles y permisos: que puede hacer cada perfil (rol).
// Los permisos se describen en config/permisos.js.
import { enrutador, route } from '../lib/rutas.js';
import { validar, unico } from '../lib/validacion.js';
import { ADMINISTRADOR, GUARD, MODELO_USUARIO, MODELO_ROL } from '../lib/usuarios.js';
import { registrar } from '../lib/actividad.js';
import { query, first, execute, transaction, ahora } from '../db/index.js';
import { auth, activo, permiso } from '../middleware/auth.js';
import { atras } from '../middleware/sesion.js';
import catalogoPermisos from '../config/permisos.js';

const r = enrutador();
const admin = [auth, activo, permiso('gestionar usuarios')];

// Permisos que el perfil Administrador conserva siempre, para que nadie
// pierda el acceso a esta pantalla.
const PERMISOS_FIJOS_ADMINISTRADOR = ['gestionar usuarios'];

/**
 * Permisos agrupados por modulo segun config/permisos.js, mas los que existan
 * en la base sin describir (grupo "Otros").
 */
async function catalogo() {
    const existentes = (await query('SELECT name FROM permissions WHERE guard_name = ? ORDER BY id', [GUARD])).map((p) => p.name);
    const resultado = [];
    const descritos = new Set();

    for (const [modulo, permisos] of Object.entries(catalogoPermisos)) {
        const presentes = Object.entries(permisos).filter(([nombre]) => existentes.includes(nombre));
        presentes.forEach(([nombre]) => descritos.add(nombre));
        if (presentes.length > 0) {
            resultado.push({ modulo, permisos: presentes.map(([nombre, info]) => ({ nombre, ...info })) });
        }
    }

    const otros = existentes.filter((n) => !descritos.has(n));
    if (otros.length > 0) {
        resultado.push({
            modulo: 'Otros',
            permisos: otros.map((nombre) => ({
                nombre,
                etiqueta: nombre.charAt(0).toUpperCase() + nombre.slice(1),
                descripcion: 'Permiso sin descripción en config/permisos.js.',
            })),
        });
    }
    return resultado;
}

async function buscarRol(id) {
    return first('SELECT id, name FROM roles WHERE id = ? AND guard_name = ?', [id, GUARD]);
}

async function permisosDe(rolId) {
    return (await query(
        'SELECT p.name FROM permissions p JOIN role_has_permissions rp ON rp.permission_id = p.id WHERE rp.role_id = ?',
        [rolId],
    )).map((p) => p.name);
}

async function usuariosCon(rolId) {
    const { total } = await first('SELECT COUNT(*) AS total FROM model_has_roles WHERE role_id = ? AND model_type = ?', [rolId, MODELO_USUARIO]);
    return Number(total);
}

async function sincronizarPermisos(conn, rolId, nombres) {
    await conn.execute('DELETE FROM role_has_permissions WHERE role_id = ?', [rolId]);
    if (nombres.length === 0) {
        return;
    }
    const ids = await conn.query('SELECT id FROM permissions WHERE guard_name = ? AND name IN (?)', [GUARD, nombres]);
    await conn.execute('INSERT INTO role_has_permissions (permission_id, role_id) VALUES ?', [ids.map((p) => [p.id, rolId])]);
}

/**
 * La version PHP guarda en cache los permisos (spatie) hasta 24 h. Mientras
 * las dos versiones convivan se borra esa cache para que vea el cambio.
 */
async function olvidarCachePermisosPhp() {
    try {
        await execute("DELETE FROM cache WHERE `key` LIKE '%spatie.permission.cache'");
    } catch {
        // Sin tabla cache (la version PHP ya no esta): nada que limpiar.
    }
}

async function validarRol(req, rol = null) {
    const esAdmin = rol?.name === ADMINISTRADOR;
    const reglasNombre = esAdmin
        ? ['nullable', 'string', 'max:60']
        : ['required', 'string', 'max:60', unico('roles', 'name', rol?.id, `AND guard_name = '${GUARD}'`)];

    const permisos = [req.body.permisos ?? []].flat();
    const datos = await validar({ ...req.body, permisos }, {
        name: reglasNombre,
        permisos: ['array'],
    }, {
        mensajes: {
            'name.required': 'Escribe el nombre del perfil.',
            'name.regla': 'Ya existe un perfil con ese nombre.',
        },
    });

    const validos = (await query('SELECT name FROM permissions WHERE guard_name = ?', [GUARD])).map((p) => p.name);
    const invalidos = datos.permisos.filter((p) => !validos.includes(p));
    if (invalidos.length > 0) {
        req.conErrores({ permisos: [`Permiso no válido: ${invalidos.join(', ')}`] });
        return null;
    }

    return { name: String(datos.name ?? '').trim(), permisos: [...new Set(datos.permisos)] };
}

r.get('roles.index', '/perfiles', ...admin, async (req, res) => {
    const roles = await query(
        `SELECT r.id, r.name,
                (SELECT COUNT(*) FROM model_has_roles m WHERE m.role_id = r.id AND m.model_type = ?) AS users_count
         FROM roles r WHERE r.guard_name = ? ORDER BY r.id`,
        [MODELO_USUARIO, GUARD],
    );
    for (const rol of roles) {
        rol.users_count = Number(rol.users_count);
        rol.permisos = new Set(await permisosDe(rol.id));
    }

    res.render('roles/index', { titulo: 'Perfiles y permisos', roles, catalogo: await catalogo(), ADMINISTRADOR });
});

r.get('roles.create', '/perfiles/create', ...admin, async (req, res) => {
    res.render('roles/form', {
        titulo: 'Nuevo perfil', rol: null, catalogo: await catalogo(), marcados: [], fijos: [], usuarios: 0, ADMINISTRADOR,
    });
});

r.post('roles.store', '/perfiles', ...admin, async (req, res) => {
    const datos = await validarRol(req);
    if (!datos) {
        return atras(req, res, route('roles.create'));
    }

    const id = await transaction(async (conn) => {
        const fecha = ahora();
        const { insertId } = await conn.execute(
            'INSERT INTO roles (name, guard_name, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [datos.name, GUARD, fecha, fecha],
        );
        await sincronizarPermisos(conn, insertId, datos.permisos);
        return insertId;
    });
    await olvidarCachePermisosPhp();

    await registrar({
        log: 'seguridad', usuario: req.user, sujeto: { tipo: MODELO_ROL, id },
        propiedades: { permisos: datos.permisos },
        descripcion: `Perfil «${datos.name}» creado con ${datos.permisos.length} permiso(s)`,
    });

    req.flash('status', `Perfil «${datos.name}» creado.`);
    res.redirect(route('roles.index'));
});

r.get('roles.edit', '/perfiles/:rol/edit', ...admin, async (req, res, next) => {
    const rol = await buscarRol(req.params.rol);
    if (!rol) {
        return next();
    }
    res.render('roles/form', {
        titulo: `Perfil: ${rol.name}`,
        rol,
        catalogo: await catalogo(),
        marcados: await permisosDe(rol.id),
        fijos: rol.name === ADMINISTRADOR ? PERMISOS_FIJOS_ADMINISTRADOR : [],
        usuarios: await usuariosCon(rol.id),
        ADMINISTRADOR,
    });
});

r.put('roles.update', '/perfiles/:rol', ...admin, async (req, res, next) => {
    const rol = await buscarRol(req.params.rol);
    if (!rol) {
        return next();
    }

    const datos = await validarRol(req, rol);
    if (!datos) {
        return atras(req, res, route('roles.edit', rol.id));
    }
    if (rol.name === ADMINISTRADOR) {
        datos.name = ADMINISTRADOR;
        datos.permisos = [...new Set([...datos.permisos, ...PERMISOS_FIJOS_ADMINISTRADOR])];
    }

    const antes = await permisosDe(rol.id);

    await transaction(async (conn) => {
        await conn.execute('UPDATE roles SET name = ?, updated_at = ? WHERE id = ?', [datos.name, ahora(), rol.id]);
        await sincronizarPermisos(conn, rol.id, datos.permisos);
    });
    await olvidarCachePermisosPhp();

    const agregados = datos.permisos.filter((p) => !antes.includes(p));
    const quitados = antes.filter((p) => !datos.permisos.includes(p));

    if (agregados.length || quitados.length || rol.name !== datos.name) {
        const detalle = [
            rol.name !== datos.name ? `renombrado desde «${rol.name}»` : null,
            agregados.length ? `agrega: ${agregados.join(', ')}` : null,
            quitados.length ? `quita: ${quitados.join(', ')}` : null,
        ].filter(Boolean).join('; ');

        await registrar({
            log: 'seguridad', usuario: req.user, sujeto: { tipo: MODELO_ROL, id: rol.id },
            propiedades: { agregados, quitados, nombre_anterior: rol.name },
            descripcion: `Perfil «${datos.name}» modificado (${detalle})`,
        });
    }

    req.flash('status', `Perfil «${datos.name}» actualizado. Los usuarios verán el cambio al cargar la siguiente página.`);
    res.redirect(route('roles.index'));
});

r.delete('roles.destroy', '/perfiles/:rol', ...admin, async (req, res, next) => {
    const rol = await buscarRol(req.params.rol);
    if (!rol) {
        return next();
    }
    if (rol.name === ADMINISTRADOR) {
        req.flash('error', 'El perfil Administrador no se puede eliminar.');
        return atras(req, res, route('roles.index'));
    }
    const usuarios = await usuariosCon(rol.id);
    if (usuarios > 0) {
        req.flash('error', `No se puede eliminar «${rol.name}»: tiene ${usuarios} usuario(s). Cámbiales el perfil en Usuarios primero.`);
        return atras(req, res, route('roles.index'));
    }

    await execute('DELETE FROM roles WHERE id = ?', [rol.id]);
    await olvidarCachePermisosPhp();
    await registrar({ log: 'seguridad', usuario: req.user, descripcion: `Perfil «${rol.name}» eliminado` });

    req.flash('status', `Perfil «${rol.name}» eliminado.`);
    res.redirect(route('roles.index'));
});

export default r.router;
