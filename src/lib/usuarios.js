// Usuarios del personal DECE con sus perfiles (roles) y permisos. Usa las
// mismas tablas que spatie/laravel-permission en la version PHP, asi que los
// cambios hechos desde cualquiera de las dos versiones se ven en la otra.
import bcrypt from 'bcryptjs';
import { query, first } from '../db/index.js';

// Valores que Laravel guarda en model_type / subject_type / causer_type.
export const MODELO_USUARIO = 'App\\Models\\User';
export const MODELO_ROL = 'Spatie\\Permission\\Models\\Role';
export const GUARD = 'web';

export const ADMINISTRADOR = 'Administrador';

/** Usuario con roles[] y permisos[] (directos + heredados de sus roles). */
export async function cargarUsuario(id) {
    const usuario = await first(
        'SELECT id, name, email, cargo, activo, created_at, updated_at FROM users WHERE id = ?',
        [id],
    );
    if (!usuario) {
        return null;
    }

    const [roles, permisos] = await Promise.all([
        query(
            `SELECT r.name FROM roles r
             JOIN model_has_roles m ON m.role_id = r.id
             WHERE m.model_type = ? AND m.model_id = ? AND r.guard_name = ?
             ORDER BY r.id`,
            [MODELO_USUARIO, id, GUARD],
        ),
        query(
            `SELECT p.name FROM permissions p
             JOIN role_has_permissions rp ON rp.permission_id = p.id
             JOIN model_has_roles m ON m.role_id = rp.role_id
             WHERE m.model_type = ? AND m.model_id = ? AND p.guard_name = ?
             UNION
             SELECT p.name FROM permissions p
             JOIN model_has_permissions mp ON mp.permission_id = p.id
             WHERE mp.model_type = ? AND mp.model_id = ? AND p.guard_name = ?`,
            [MODELO_USUARIO, id, GUARD, MODELO_USUARIO, id, GUARD],
        ),
    ]);

    usuario.activo = Boolean(usuario.activo);
    usuario.roles = roles.map((r) => r.name);
    usuario.permisos = new Set(permisos.map((p) => p.name));

    return usuario;
}

/** Permiso (o lista: basta con tener uno), como $user->canAny(). */
export function puede(usuario, permisos) {
    if (!usuario) {
        return false;
    }
    return [permisos].flat().some((p) => usuario.permisos.has(p));
}

export function tieneRol(usuario, rol) {
    return Boolean(usuario) && usuario.roles.includes(rol);
}

/**
 * Laravel guarda bcrypt como $2y$; es el mismo algoritmo que $2a$/$2b$. Los hashes
 * nuevos se crean como $2y$ para que la version PHP los siga aceptando.
 */
export async function verificarClave(clave, hash) {
    if (!hash) {
        return false;
    }
    return bcrypt.compare(String(clave), hash.replace(/^\$2y\$/, '$2b$'));
}

export async function cifrarClave(clave) {
    const hash = await bcrypt.hash(String(clave), 12);
    return hash.replace(/^\$2[ab]\$/, '$2y$');
}

export async function buscarPorCorreo(email) {
    return first('SELECT id, email, password, activo FROM users WHERE email = ?', [email]);
}

/** Iniciales para el avatar del menu: "Ana María Pérez" -> "AM". */
export function iniciales(nombre) {
    return String(nombre ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p.charAt(0).toLocaleUpperCase('es'))
        .join('');
}
