// Configuracion de la institucion (nombre y logo). Solo existe una fila
// vigente; se lee en cada pagina para el logo del menu y el favicon, asi que
// se guarda en memoria unos segundos.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { first } from '../db/index.js';
import config from '../config/index.js';
import { route } from './rutas.js';

let cache = { valor: undefined, vence: 0 };

export async function configuracionActual() {
    if (cache.vence > Date.now()) {
        return cache.valor;
    }
    const fila = await first('SELECT * FROM configuracion_institucion ORDER BY id DESC LIMIT 1');
    cache = { valor: fila, vence: Date.now() + 30 * 1000 };
    return fila;
}

export function olvidarConfiguracion() {
    cache = { valor: undefined, vence: 0 };
}

/** Ruta en disco del logo, o null si no hay logo o no existe el archivo. */
export function rutaLogo(configuracion) {
    if (!configuracion?.logo_path) {
        return null;
    }
    const ruta = path.resolve(config.almacenamiento.publico, configuracion.logo_path);
    // El logo siempre vive dentro de la carpeta de almacenamiento publico.
    if (!ruta.startsWith(path.resolve(config.almacenamiento.publico) + path.sep)) {
        return null;
    }
    return fs.existsSync(ruta) ? ruta : null;
}

/** URL del logo con version, para que el navegador recargue si cambia. */
export function urlLogo(configuracion) {
    if (!configuracion?.logo_path) {
        return null;
    }
    const version = crypto.createHash('md5').update(configuracion.logo_path).digest('hex').slice(0, 8);
    return `${route('institucion.logo')}?v=${version}`;
}

/** Logo embebido como data URI, para los PDF. */
export function logoDataUri(configuracion) {
    const ruta = rutaLogo(configuracion);
    if (!ruta) {
        return null;
    }
    const mime = MIMES[path.extname(ruta).toLowerCase()] ?? 'image/png';
    return `data:${mime};base64,${fs.readFileSync(ruta).toString('base64')}`;
}

export const MIMES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
};
