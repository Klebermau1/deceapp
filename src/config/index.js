// Configuracion leida del .env (equivale a config/*.php de Laravel).
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const env = (clave, porDefecto = undefined) => {
    const valor = process.env[clave];
    return valor === undefined || valor === '' ? porDefecto : valor;
};

const conexion = (prefijo, baseDatos) => ({
    host: env(`${prefijo}_HOST`, '127.0.0.1'),
    port: Number(env(`${prefijo}_PORT`, 3306)),
    database: env(`${prefijo}_DATABASE`, baseDatos),
    user: env(`${prefijo}_USERNAME`, 'root'),
    password: env(`${prefijo}_PASSWORD`, ''),
});

const produccion = env('NODE_ENV') === 'production';

const config = {
    nombre: env('APP_NAME', 'Plataforma DECE'),
    produccion,
    puerto: Number(env('PORT', 3000)),
    url: env('APP_URL', 'http://localhost:3000'),

    sesion: {
        secreto: env('SESSION_SECRET'),
        minutos: Number(env('SESSION_LIFETIME', 120)),
    },

    db: {
        principal: conexion('DB', 'dece_db'),
        ficha: conexion('FICHA_DB', 'ficha_estudiantil_db'),
        biometrico: conexion('BIOMETRICO_DB', 'biometrico'),
    },

    almacenamiento: {
        publico: path.resolve(RAIZ, env('STORAGE_PATH', './storage/public')),
        biometrico: env('BIOMETRICO_UPLOADS_PATH'),
        matricula: env('MATRICULA_UPLOADS_PATH'),
    },

    instrumentoClave: env('INSTRUMENTO_CLAVE_ACCESO'),

    openai: {
        clave: env('OPENAI_API_KEY'),
        modelo: env('OPENAI_MODEL', 'gpt-4o-mini'),
        timeout: Number(env('OPENAI_TIMEOUT', 20)),
        maxLlamadasHora: Number(env('OPENAI_MAX_LLAMADAS_HORA', 30)),
    },
};

if (!config.sesion.secreto) {
    if (produccion) {
        throw new Error('Falta SESSION_SECRET en el .env (obligatorio en produccion).');
    }
    config.sesion.secreto = 'solo-desarrollo-cambiar-en-produccion';
}

export default config;
