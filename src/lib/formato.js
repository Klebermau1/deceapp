// Formatos para las vistas (disponibles como f.fecha(...), etc.).
// Las fechas llegan de MySQL como texto 'YYYY-MM-DD' o 'YYYY-MM-DD HH:MM:SS'.

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function partes(valor) {
    if (!valor) {
        return null;
    }
    if (valor instanceof Date) {
        return { a: valor.getFullYear(), m: valor.getMonth() + 1, d: valor.getDate(), h: valor.getHours(), i: valor.getMinutes() };
    }
    const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
    if (!m) {
        return null;
    }
    return { a: Number(m[1]), m: Number(m[2]), d: Number(m[3]), h: Number(m[4] ?? 0), i: Number(m[5] ?? 0) };
}

const dos = (n) => String(n).padStart(2, '0');

/** 05/03/2026 */
export function fecha(valor) {
    const p = partes(valor);
    return p ? `${dos(p.d)}/${dos(p.m)}/${p.a}` : '';
}

/** 05/03/2026 14:30 */
export function fechaHora(valor) {
    const p = partes(valor);
    return p ? `${dos(p.d)}/${dos(p.m)}/${p.a} ${dos(p.h)}:${dos(p.i)}` : '';
}

/** 5 de marzo de 2026 */
export function fechaLarga(valor) {
    const p = partes(valor);
    return p ? `${p.d} de ${MESES[p.m - 1]} de ${p.a}` : '';
}

/** Valor para <input type="date">. */
export function fechaInput(valor) {
    const p = partes(valor);
    return p ? `${p.a}-${dos(p.m)}-${dos(p.d)}` : '';
}

/** Clases condicionales como @class([...]) de Blade: clases('a', { b: true, c: false }). */
export function clases(...args) {
    const lista = [];
    for (const arg of args) {
        if (!arg) {
            continue;
        }
        if (typeof arg === 'string') {
            lista.push(arg);
        } else {
            for (const [clase, activa] of Object.entries(arg)) {
                if (activa) {
                    lista.push(clase);
                }
            }
        }
    }
    return lista.join(' ');
}
