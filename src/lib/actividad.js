// Registro de auditoria en la tabla activity_log, con el mismo formato que
// spatie/laravel-activitylog: la pantalla de Auditoria muestra igual lo que
// registra la version PHP y lo que registra esta.
import { execute, ahora } from '../db/index.js';
import { MODELO_USUARIO } from './usuarios.js';

/**
 * registrar({ log: 'seguridad', descripcion: 'Perfil creado', usuario,
 *             sujeto: { tipo: MODELO_ROL, id: 3 }, evento: 'created',
 *             propiedades: {...} })
 */
export async function registrar({ log = 'default', descripcion, usuario = null, sujeto = null, evento = null, propiedades = {} }) {
    const fecha = ahora();
    await execute(
        `INSERT INTO activity_log
            (log_name, description, subject_type, subject_id, event, causer_type, causer_id, properties, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            log,
            descripcion,
            sujeto?.tipo ?? null,
            sujeto?.id ?? null,
            evento,
            usuario ? MODELO_USUARIO : null,
            usuario?.id ?? null,
            JSON.stringify(propiedades ?? {}),
            fecha,
            fecha,
        ],
    );
}

/**
 * Cambios de un modelo como los registra LogsActivity con logOnlyDirty():
 * solo los campos vigilados que cambiaron. Devuelve null si no cambio nada.
 */
export function cambios(antes, despues, campos) {
    const attributes = {};
    const old = {};
    for (const campo of campos) {
        const a = antes?.[campo] ?? null;
        const d = despues?.[campo] ?? null;
        if (antes === null || String(a) !== String(d)) {
            attributes[campo] = d;
            if (antes !== null) {
                old[campo] = a;
            }
        }
    }
    if (Object.keys(attributes).length === 0) {
        return null;
    }
    return antes === null ? { attributes } : { attributes, old };
}
