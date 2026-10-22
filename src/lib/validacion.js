// Validacion de formularios al estilo de $request->validate() de Laravel:
//
//   const datos = await validar(req.body, {
//       name: ['required', 'string', 'max:150'],
//       email: ['required', 'email', unico('users', 'email', usuario.id)],
//   });
//
// Si algo falla lanza ErrorValidacion; el manejador de errores (app.js)
// vuelve al formulario con los mensajes y lo que el usuario habia escrito.
// Igual que Laravel, los textos se recortan y los vacios quedan en null.
import { first } from '../db/index.js';

export class ErrorValidacion extends Error {
    constructor(errores, bolsa = 'default') {
        super('Datos no validos');
        this.errores = errores;
        this.bolsa = bolsa;
    }
}

const NOMBRES = {
    name: 'nombre',
    email: 'correo electrónico',
    password: 'contraseña',
    current_password: 'contraseña actual',
    cargo: 'cargo',
    role: 'rol',
    permisos: 'permisos',
};

const etiqueta = (campo, atributos) => atributos[campo] ?? NOMBRES[campo] ?? campo.replace(/_/g, ' ');

const vacio = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0);

/** Regla async: el valor no debe existir en tabla.columna (salvo el id ignorado). */
export function unico(tabla, columna, ignorarId = null, extra = '') {
    return async (valor, campo, atributos) => {
        const fila = await first(
            `SELECT id FROM \`${tabla}\` WHERE \`${columna}\` = ? ${ignorarId ? 'AND id <> ?' : ''} ${extra} LIMIT 1`,
            ignorarId ? [valor, ignorarId] : [valor],
        );
        return fila ? `El ${etiqueta(campo, atributos)} ya ha sido registrado.` : null;
    };
}

/** Regla async: el valor (o cada valor de un arreglo) debe existir en tabla.columna. */
export function existe(tabla, columna, extra = '') {
    return async (valor, campo, atributos) => {
        for (const v of [valor].flat()) {
            const fila = await first(`SELECT 1 AS ok FROM \`${tabla}\` WHERE \`${columna}\` = ? ${extra} LIMIT 1`, [v]);
            if (!fila) {
                return `El ${etiqueta(campo, atributos)} seleccionado no es válido.`;
            }
        }
        return null;
    };
}

function reglaSimple(regla, valor, campo, datos, atributos) {
    const [nombre, parametro] = regla.split(':');
    const nombreCampo = etiqueta(campo, atributos);

    switch (nombre) {
        case 'string':
            return typeof valor === 'string' ? null : `El campo ${nombreCampo} debe ser texto.`;
        case 'email':
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) ? null : `El campo ${nombreCampo} debe ser un correo electrónico válido.`;
        case 'max':
            return String(valor).length <= Number(parametro) ? null : `El campo ${nombreCampo} no debe tener más de ${parametro} caracteres.`;
        case 'min':
            return String(valor).length >= Number(parametro) ? null : `El campo ${nombreCampo} debe tener al menos ${parametro} caracteres.`;
        case 'confirmed':
            return valor === datos[`${campo}_confirmation`] ? null : `La confirmación del campo ${nombreCampo} no coincide.`;
        case 'numeric':
            return Number.isFinite(Number(valor)) ? null : `El campo ${nombreCampo} debe ser un número.`;
        case 'integer':
            return /^-?\d+$/.test(String(valor)) ? null : `El campo ${nombreCampo} debe ser un número entero.`;
        case 'boolean':
            return ['1', '0', 'true', 'false', 'on', true, false, 1, 0].includes(valor) ? null : `El campo ${nombreCampo} debe ser verdadero o falso.`;
        case 'array':
            return Array.isArray(valor) ? null : `El campo ${nombreCampo} debe ser una lista.`;
        case 'in':
            return parametro.split(',').includes(String(valor)) ? null : `El ${nombreCampo} seleccionado no es válido.`;
        case 'date':
            return !Number.isNaN(Date.parse(valor)) ? null : `El campo ${nombreCampo} debe ser una fecha válida.`;
        case 'lowercase':
            return valor === String(valor).toLowerCase() ? null : `El campo ${nombreCampo} debe estar en minúsculas.`;
        default:
            throw new Error(`Regla de validacion desconocida: ${nombre}`);
    }
}

/**
 * Valida y devuelve solo los campos declarados en reglas, ya limpios.
 * opciones: { mensajes: { 'name.required': '...' }, atributos: { name: 'nombre' }, bolsa }
 */
export async function validar(entrada, reglas, opciones = {}) {
    const { mensajes = {}, atributos = {}, bolsa = 'default' } = opciones;
    const datos = {};
    const errores = {};

    for (const [campo, lista] of Object.entries(reglas)) {
        let valor = entrada?.[campo];
        if (typeof valor === 'string') {
            valor = valor.trim();
        }
        if (vacio(valor)) {
            valor = Array.isArray(valor) ? [] : null;
        }

        const requerido = lista.includes('required');
        if (vacio(valor)) {
            if (requerido) {
                errores[campo] = [mensajes[`${campo}.required`] ?? `El campo ${etiqueta(campo, atributos)} es obligatorio.`];
            }
            if (campo in (entrada ?? {}) || requerido || lista.includes('array')) {
                datos[campo] = valor;
            }
            continue;
        }

        for (const regla of lista) {
            if (regla === 'required' || regla === 'nullable' || regla === 'sometimes') {
                continue;
            }
            const error = typeof regla === 'function'
                ? await regla(valor, campo, atributos)
                : reglaSimple(regla, valor, campo, entrada, atributos);
            if (error) {
                const clave = typeof regla === 'string' ? `${campo}.${regla.split(':')[0]}` : `${campo}.${regla.name || 'regla'}`;
                errores[campo] = [mensajes[clave] ?? error];
                break;
            }
        }
        datos[campo] = valor;
    }

    if (Object.keys(errores).length > 0) {
        throw new ErrorValidacion(errores, bolsa);
    }
    return datos;
}

/** Valor booleano de un checkbox, como $request->boolean(campo, porDefecto). */
export function booleano(entrada, campo, porDefecto = false) {
    if (!entrada || !(campo in entrada)) {
        return porDefecto;
    }
    return ['1', 'true', 'on', 'yes', true, 1].includes(entrada[campo]);
}
