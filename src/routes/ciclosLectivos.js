// Administracion > Años lectivos. El año marcado como actual define la
// nomina vigente, los tests y la evaluacion anual de los docentes. Solo un
// año puede estar activo a la vez. Exige el perfil Administrador.
import { enrutador, route } from '../lib/rutas.js';
import { validar, unico, booleano } from '../lib/validacion.js';
import { registrar, cambios } from '../lib/actividad.js';
import { paginar } from '../lib/paginacion.js';
import { first, transaction, ahora } from '../db/index.js';
import { auth, activo, permiso, rol } from '../middleware/auth.js';
import { ADMINISTRADOR } from '../lib/usuarios.js';

const r = enrutador();
const admin = [auth, activo, permiso('gestionar bienestar docente'), rol(ADMINISTRADOR)];

const MODELO = 'App\\Models\\CicloLectivo';
const CAMPOS_AUDITADOS = ['anio_lectivo', 'fecha_inicio', 'fecha_fin', 'activo'];

const reglas = (ignorarId = null) => ({
    anio_lectivo: ['required', 'string', 'max:20', unico('ciclos_lectivos', 'anio_lectivo', ignorarId)],
    fecha_inicio: ['nullable', 'date'],
    fecha_fin: ['nullable', 'date', 'after_or_equal:fecha_inicio'],
});
const atributos = { anio_lectivo: 'año lectivo', fecha_inicio: 'fecha de inicio', fecha_fin: 'fecha de fin' };

async function buscar(id) {
    const ciclo = await first('SELECT id, anio_lectivo, fecha_inicio, fecha_fin, activo FROM ciclos_lectivos WHERE id = ?', [id]);
    if (ciclo) {
        ciclo.activo = Boolean(ciclo.activo);
    }
    return ciclo;
}

r.get('bienestar.ciclos-lectivos.index', '/bienestar/ciclos-lectivos', ...admin, async (req, res) => {
    const pagina = await paginar(req, {
        sql: 'SELECT id, anio_lectivo, fecha_inicio, fecha_fin, activo FROM ciclos_lectivos ORDER BY anio_lectivo DESC',
        conteo: 'SELECT COUNT(*) AS total FROM ciclos_lectivos',
    });
    const { hay } = await first('SELECT EXISTS(SELECT 1 FROM ciclos_lectivos WHERE activo = 1) AS hay');

    res.render('ciclos-lectivos/index', { titulo: 'Años lectivos', pagina, hayActivo: Boolean(hay) });
});

r.get('bienestar.ciclos-lectivos.create', '/bienestar/ciclos-lectivos/crear', ...admin, async (req, res) => {
    // Si es el primer año, lo mas probable es que deba quedar activo de una
    // vez: evita crearlo y olvidar marcarlo, dejando el sistema sin año vigente.
    const { hay } = await first('SELECT EXISTS(SELECT 1 FROM ciclos_lectivos) AS hay');
    res.render('ciclos-lectivos/form', { titulo: 'Nuevo año lectivo', ciclo: null, sugerirActivo: !hay });
});

r.post('bienestar.ciclos-lectivos.store', '/bienestar/ciclos-lectivos', ...admin, async (req, res) => {
    const datos = await validar(req.body, reglas(), { atributos });
    const nuevo = { ...datos, activo: booleano(req.body, 'activo') };

    const id = await transaction(async (conn) => {
        if (nuevo.activo) {
            await conn.execute('UPDATE ciclos_lectivos SET activo = 0, updated_at = ? WHERE activo = 1', [ahora()]);
        }
        const fecha = ahora();
        const { insertId } = await conn.execute(
            'INSERT INTO ciclos_lectivos (anio_lectivo, fecha_inicio, fecha_fin, activo, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nuevo.anio_lectivo, nuevo.fecha_inicio, nuevo.fecha_fin, nuevo.activo ? 1 : 0, req.user.id, fecha, fecha],
        );
        return insertId;
    });

    await registrar({
        log: 'bienestar_docente', descripcion: 'created', evento: 'created', usuario: req.user,
        sujeto: { tipo: MODELO, id }, propiedades: cambios(null, nuevo, CAMPOS_AUDITADOS),
    });

    req.flash('status', 'Año lectivo creado.');
    res.redirect(route('bienestar.ciclos-lectivos.index'));
});

r.get('bienestar.ciclos-lectivos.edit', '/bienestar/ciclos-lectivos/:ciclo/editar', ...admin, async (req, res, next) => {
    const ciclo = await buscar(req.params.ciclo);
    if (!ciclo) {
        return next();
    }
    res.render('ciclos-lectivos/form', { titulo: 'Editar año lectivo', ciclo, sugerirActivo: false });
});

r.put('bienestar.ciclos-lectivos.update', '/bienestar/ciclos-lectivos/:ciclo', ...admin, async (req, res, next) => {
    const antes = await buscar(req.params.ciclo);
    if (!antes) {
        return next();
    }

    const datos = await validar(req.body, reglas(antes.id), { atributos });
    const despues = { ...datos, activo: booleano(req.body, 'activo') };

    await transaction(async (conn) => {
        const fecha = ahora();
        if (despues.activo) {
            await conn.execute('UPDATE ciclos_lectivos SET activo = 0, updated_at = ? WHERE activo = 1 AND id <> ?', [fecha, antes.id]);
        }
        await conn.execute(
            'UPDATE ciclos_lectivos SET anio_lectivo = ?, fecha_inicio = ?, fecha_fin = ?, activo = ?, updated_at = ? WHERE id = ?',
            [despues.anio_lectivo, despues.fecha_inicio, despues.fecha_fin, despues.activo ? 1 : 0, fecha, antes.id],
        );
    });

    const diferencias = cambios(antes, despues, CAMPOS_AUDITADOS);
    if (diferencias) {
        await registrar({
            log: 'bienestar_docente', descripcion: 'updated', evento: 'updated', usuario: req.user,
            sujeto: { tipo: MODELO, id: antes.id }, propiedades: diferencias,
        });
    }

    req.flash('status', 'Año lectivo actualizado.');
    res.redirect(route('bienestar.ciclos-lectivos.index'));
});

export default r.router;
