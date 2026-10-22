// Administracion > Auditoria: registro de cambios (tabla activity_log), lo
// registre la version PHP o esta.
import { enrutador } from '../lib/rutas.js';
import { paginar } from '../lib/paginacion.js';
import { auth, activo, permiso } from '../middleware/auth.js';
import { MODELO_USUARIO } from '../lib/usuarios.js';

const r = enrutador();

r.get('auditoria.index', '/auditoria', auth, activo, permiso('ver auditoria'), async (req, res) => {
    const pagina = await paginar(req, {
        sql: `SELECT a.id, a.description, a.subject_type, a.subject_id, a.created_at, u.name AS causante
              FROM activity_log a
              LEFT JOIN users u ON a.causer_type = ? AND u.id = a.causer_id
              ORDER BY a.created_at DESC, a.id DESC`,
        conteo: 'SELECT COUNT(*) AS total FROM activity_log',
        params: [MODELO_USUARIO],
        conteoParams: [],
        porPagina: 25,
    });

    // "App\Models\ActaReunion" -> "ActaReunion", como class_basename().
    for (const registro of pagina.items) {
        registro.tipo = registro.subject_type ? registro.subject_type.split('\\').pop() : '';
    }

    res.render('auditoria/index', { titulo: 'Auditoría', pagina });
});

export default r.router;
