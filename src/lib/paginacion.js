// Paginacion como ->paginate(15) de Laravel. La vista usa
// include('partials/paginacion', { pagina }) para pintar los enlaces.
import { query, first } from '../db/index.js';

/**
 * paginar(req, { sql: 'SELECT ... FROM users', conteo: 'SELECT COUNT(*) AS total FROM users',
 *                params: [], porPagina: 15 })
 * sql NO debe llevar LIMIT: se agrega aqui.
 */
export async function paginar(req, { sql, conteo, params = [], conteoParams = params, porPagina = 15 }) {
    const { total } = await first(conteo, conteoParams);
    const ultima = Math.max(1, Math.ceil(total / porPagina));
    const actual = Math.min(ultima, Math.max(1, parseInt(req.query.page, 10) || 1));
    const items = await query(`${sql} LIMIT ? OFFSET ?`, [...params, porPagina, (actual - 1) * porPagina]);

    const url = (n) => {
        const qs = new URLSearchParams(req.query);
        qs.set('page', n);
        return `${req.baseUrl}${req.path}?${qs}`;
    };

    return {
        items,
        total,
        porPagina,
        actual,
        ultima,
        desde: total === 0 ? 0 : (actual - 1) * porPagina + 1,
        hasta: Math.min(total, actual * porPagina),
        anterior: actual > 1 ? url(actual - 1) : null,
        siguiente: actual < ultima ? url(actual + 1) : null,
        url,
    };
}
