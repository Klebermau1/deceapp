// Archivos subidos (logo, fotos, etc.), guardados en STORAGE_PATH como el
// disco "public" de Laravel: la base guarda la ruta relativa (logos/xyz.png)
// y los archivos de la version PHP se leen sin cambios.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import config from '../config/index.js';
import { verificarDespuesDeSubir } from '../middleware/csrf.js';
import { atras } from '../middleware/sesion.js';

/**
 * Middleware que lee el formulario multipart (archivos en memoria, como
 * maximo `mb` MB cada uno) y despues verifica el token CSRF.
 *   r.post('x', '/x', ...subir({ campos: ['logo'], mb: 2 }), handler)
 * Los formularios con archivos se envian como POST sin _method: Express elige
 * la ruta por el metodo antes de que se lea el cuerpo multipart.
 */
export function subir({ campos, mb = 2 }) {
    const lector = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: mb * 1024 * 1024, files: campos.length },
    }).fields(campos.map((name) => ({ name, maxCount: 1 })));

    const leer = (req, res, next) => {
        lector(req, res, (error) => {
            if (error?.code === 'LIMIT_FILE_SIZE') {
                // multer deja de leer el formulario: se vuelve directo a el.
                req.conErrores({ [error.field]: [`El archivo no debe pesar más de ${mb} MB.`] });
                return atras(req, res, '/');
            }
            next(error);
        });
    };

    return [leer, verificarDespuesDeSubir];
}

/** El archivo subido en un campo, o null. */
export function archivo(req, campo) {
    return req.files?.[campo]?.[0] ?? null;
}

// Firma de los primeros bytes de cada formato de imagen aceptado: no basta
// con la extension que manda el navegador.
const FIRMAS = {
    png: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    webp: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
    gif: (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString()),
    svg: (b) => /^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(b.subarray(0, 2048).toString('utf8')),
};

/** Extension real de la imagen segun su contenido, o null si no es de los formatos permitidos. */
export function tipoImagen(subido, permitidos = ['png', 'jpg', 'webp']) {
    if (!subido) {
        return null;
    }
    return permitidos.find((tipo) => FIRMAS[tipo]?.(subido.buffer)) ?? null;
}

/** Guarda el archivo en STORAGE_PATH/carpeta con nombre aleatorio; devuelve la ruta relativa. */
export async function guardar(subido, carpeta, extension) {
    const nombre = `${crypto.randomBytes(20).toString('base64url')}.${extension}`;
    const destino = path.join(config.almacenamiento.publico, carpeta);
    await fs.mkdir(destino, { recursive: true });
    await fs.writeFile(path.join(destino, nombre), subido.buffer);
    return `${carpeta}/${nombre}`;
}

/** Borra un archivo de STORAGE_PATH (si existe y esta dentro de esa carpeta). */
export async function borrar(rutaRelativa) {
    if (!rutaRelativa) {
        return;
    }
    const base = path.resolve(config.almacenamiento.publico);
    const ruta = path.resolve(base, rutaRelativa);
    if (!ruta.startsWith(base + path.sep)) {
        return;
    }
    await fs.rm(ruta, { force: true });
}
