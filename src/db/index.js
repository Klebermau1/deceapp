// Conexiones MySQL. La principal es la misma base que usa la version PHP
// (mismas tablas, mismos datos). Ficha y biometrico son de solo lectura y se
// abren recien cuando un modulo las usa.
import mysql from 'mysql2/promise';
import config from '../config/index.js';

const opcionesComunes = {
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4',
    // Laravel guarda los timestamp en la zona del servidor; se leen como
    // texto local para no desplazar horas al convertir a Date en UTC.
    dateStrings: true,
    decimalNumbers: true,
};

const pools = {};

function pool(nombre) {
    if (!pools[nombre]) {
        pools[nombre] = mysql.createPool({ ...config.db[nombre], ...opcionesComunes });
    }
    return pools[nombre];
}

/** Pool de la base principal (para pasar a express-mysql-session). */
export const principal = () => pool('principal');

/** SELECT en la base principal: devuelve las filas. */
export async function query(sql, params = []) {
    const [filas] = await pool('principal').query(sql, params);
    return filas;
}

/** SELECT que devuelve solo la primera fila (o null). */
export async function first(sql, params = []) {
    const filas = await query(sql, params);
    return filas[0] ?? null;
}

/** INSERT/UPDATE/DELETE: devuelve { insertId, affectedRows }. */
export async function execute(sql, params = []) {
    const [resultado] = await pool('principal').query(sql, params);
    return resultado;
}

/**
 * Ejecuta fn(conn) dentro de una transaccion. conn tiene query/first/execute
 * con la misma firma que este modulo.
 */
export async function transaction(fn) {
    const conn = await pool('principal').getConnection();
    const envoltura = {
        query: async (sql, params = []) => (await conn.query(sql, params))[0],
        first: async (sql, params = []) => (await conn.query(sql, params))[0][0] ?? null,
        execute: async (sql, params = []) => (await conn.query(sql, params))[0],
    };
    try {
        await conn.beginTransaction();
        const resultado = await fn(envoltura);
        await conn.commit();
        return resultado;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

/** Consultas a la ficha estudiantil (solo lectura). */
export async function queryFicha(sql, params = []) {
    const [filas] = await pool('ficha').query(sql, params);
    return filas;
}

/** Consultas al biometrico (solo lectura). */
export async function queryBiometrico(sql, params = []) {
    const [filas] = await pool('biometrico').query(sql, params);
    return filas;
}

/** Fecha/hora actual en el formato DATETIME de MySQL (zona local). */
export function ahora() {
    const d = new Date();
    const dos = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

export async function cerrar() {
    await Promise.all(Object.values(pools).map((p) => p.end()));
}
