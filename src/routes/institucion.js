// Logo de la institucion: publico (se usa en el menu y en el login, sin
// sesion). Se lee del disco en cada peticion con cache del navegador.
import path from 'node:path';
import { enrutador } from '../lib/rutas.js';
import { configuracionActual, rutaLogo, MIMES } from '../lib/institucion.js';

const r = enrutador();

r.get('institucion.logo', '/logo-institucion', async (req, res, next) => {
    const ruta = rutaLogo(await configuracionActual());
    if (!ruta) {
        return next();
    }
    res.set('Cache-Control', 'public, max-age=3600');
    res.type(MIMES[path.extname(ruta).toLowerCase()] ?? 'image/png');
    res.sendFile(ruta);
});

export default r.router;
