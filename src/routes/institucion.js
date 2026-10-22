// Administracion > Datos de la institucion: nombre, logo, profesional
// responsable del DECE y ubicacion en el mapa. El logo es publico (se usa en
// el menu y en el login, sin sesion).
import path from 'node:path';
import { enrutador, route } from '../lib/rutas.js';
import { configuracionActual, olvidarConfiguracion, rutaLogo, MIMES } from '../lib/institucion.js';
import { validar } from '../lib/validacion.js';
import { subir, archivo, tipoImagen, guardar, borrar } from '../lib/subidas.js';
import { registrar } from '../lib/actividad.js';
import { first, transaction, ahora } from '../db/index.js';
import { auth, activo, permiso } from '../middleware/auth.js';
import { atras } from '../middleware/sesion.js';

const r = enrutador();
const config = [auth, activo, permiso('gestionar configuracion')];

r.get('institucion.logo', '/logo-institucion', async (req, res, next) => {
    const ruta = rutaLogo(await configuracionActual());
    if (!ruta) {
        return next();
    }
    const extension = path.extname(ruta).toLowerCase();
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Content-Type-Options', 'nosniff');
    if (extension === '.svg') {
        // Un SVG puede traer scripts: si alguien abre el logo directo en el
        // navegador, esta cabecera impide que se ejecuten.
        res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    }
    res.type(MIMES[extension] ?? 'image/png');
    res.sendFile(ruta);
});

r.get('institucion.edit', '/configuracion/institucion', ...config, async (req, res) => {
    res.render('configuracion/institucion', {
        titulo: 'Datos de la institución',
        ubicacion: await first('SELECT * FROM ubicacion_institucion ORDER BY id DESC LIMIT 1'),
        configuracion: await configuracionActual(),
    });
});

// Formulario con archivo: va por POST (ver lib/subidas.js).
r.post('institucion.update', '/configuracion/institucion', ...config, ...subir({ campos: ['logo'], mb: 2 }), async (req, res) => {
    const datos = await validar(req.body, {
        lat: ['required', 'numeric', 'between:-5.5,2.0'],
        lng: ['required', 'numeric', 'between:-92.0,-75.0'],
        direccion: ['nullable', 'string', 'max:255'],

        nombre: ['nullable', 'string', 'max:255'],

        responsable_nombre: ['nullable', 'string', 'max:255'],
        responsable_cargo: ['nullable', 'string', 'max:100'],
        responsable_correo: ['nullable', 'email', 'max:255'],
        responsable_telefono: ['nullable', 'string', 'max:30'],
    }, {
        atributos: { lat: 'ubicación', lng: 'ubicación', responsable_correo: 'correo del responsable' },
        mensajes: {
            'lat.required': 'Marca la ubicación de la institución en el mapa.',
            'lng.required': 'Marca la ubicación de la institución en el mapa.',
        },
    });

    const logo = archivo(req, 'logo');
    const tipoLogo = tipoImagen(logo, ['png', 'jpg', 'webp', 'svg']);
    if (logo && !tipoLogo) {
        req.conErrores({ logo: ['El logo debe ser una imagen PNG, JPG, SVG o WEBP.'] });
        return atras(req, res, route('institucion.edit'));
    }

    const anterior = await configuracionActual();
    let logoPath = anterior?.logo_path ?? null;
    if (logo) {
        logoPath = await guardar(logo, 'logos', tipoLogo);
    }

    await transaction(async (conn) => {
        const fecha = ahora();
        // Solo existe una fila vigente de cada tabla.
        await conn.execute('DELETE FROM ubicacion_institucion');
        await conn.execute(
            'INSERT INTO ubicacion_institucion (latitud, longitud, direccion, actualizado_por, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [datos.lat, datos.lng, datos.direccion, req.user.id, fecha, fecha],
        );
        await conn.execute('DELETE FROM configuracion_institucion');
        await conn.execute(
            `INSERT INTO configuracion_institucion
                (nombre, logo_path, responsable_nombre, responsable_cargo, responsable_correo, responsable_telefono, actualizado_por, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [datos.nombre, logoPath, datos.responsable_nombre, datos.responsable_cargo, datos.responsable_correo, datos.responsable_telefono, req.user.id, fecha, fecha],
        );
    });
    olvidarConfiguracion();

    // El logo anterior se borra recien cuando el nuevo ya quedo guardado.
    if (logo && anterior?.logo_path && anterior.logo_path !== logoPath) {
        await borrar(anterior.logo_path);
    }

    await registrar({ log: 'configuracion', usuario: req.user, descripcion: 'Actualizó la configuración de la institución' });

    req.flash('status', 'Configuración de la institución guardada.');
    res.redirect(route('institucion.edit'));
});

export default r.router;
