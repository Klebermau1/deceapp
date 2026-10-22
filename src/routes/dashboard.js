import { enrutador, route } from '../lib/rutas.js';
import { query, first } from '../db/index.js';
import { puede } from '../lib/usuarios.js';
import { auth, activo } from '../middleware/auth.js';

const r = enrutador();

r.get(null, '/', (req, res) => res.redirect(route('dashboard')));

r.get('dashboard', '/dashboard', auth, activo, async (req, res) => {
    // Quien no puede ver todas las actas solo cuenta las que registro.
    const todas = puede(req.user, ['ver actas', 'gestionar actas']);
    const donde = todas ? '1 = 1' : 'created_by = ?';
    const params = todas ? [] : [req.user.id];

    const [totales, recientes] = await Promise.all([
        first(
            `SELECT COUNT(*) AS total,
                    SUM(MONTH(fecha_reunion) = MONTH(CURDATE()) AND YEAR(fecha_reunion) = YEAR(CURDATE())) AS este_mes,
                    SUM(estado = 'borrador') AS borrador
             FROM actas_reunion WHERE ${donde}`,
            params,
        ),
        query(
            `SELECT id, tema_reunion, estudiante_nombres, fecha_reunion, estado
             FROM actas_reunion WHERE ${donde}
             ORDER BY fecha_reunion DESC, id DESC LIMIT 5`,
            params,
        ),
    ]);

    res.render('dashboard', {
        titulo: 'Panel DECE',
        totalActas: Number(totales.total ?? 0),
        actasEsteMes: Number(totales.este_mes ?? 0),
        actasBorrador: Number(totales.borrador ?? 0),
        actasRecientes: recientes,
    });
});

export default r.router;
