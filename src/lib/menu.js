// Arma el menu principal (config/menu.js) para un usuario: quita las opciones
// sin permiso, las secciones y grupos que quedan vacios, y marca la opcion y
// el grupo de la pagina actual. Mientras dure la migracion por fases tambien
// oculta las opciones cuya ruta todavia no existe en esta version.
import menu from '../config/menu.js';
import { existeRuta, routeIs } from './rutas.js';
import { puede, tieneRol } from './usuarios.js';

function puedeVer(usuario, opcion) {
    if (!existeRuta(opcion.ruta)) {
        return false;
    }
    if (opcion.rol && !tieneRol(usuario, opcion.rol)) {
        return false;
    }
    return !opcion.can || puede(usuario, opcion.can);
}

export function menuPara(usuario, rutaActual) {
    if (!usuario) {
        return [];
    }

    const grupos = [];

    for (const [clave, grupo] of Object.entries(menu)) {
        if (grupo.ruta) {
            if (existeRuta(grupo.ruta)) {
                grupos.push({ clave, ...grupo, activo: routeIs(rutaActual, grupo.activo) });
            }
            continue;
        }

        const secciones = [];
        for (const [titulo, opciones] of Object.entries(grupo.secciones)) {
            const visibles = opciones
                .filter((opcion) => puedeVer(usuario, opcion))
                .map((opcion) => ({ ...opcion, activo: opcion.activo.length > 0 && routeIs(rutaActual, opcion.activo) }));
            if (visibles.length > 0) {
                secciones.push({ titulo, opciones: visibles });
            }
        }

        if (secciones.length === 0) {
            continue;
        }

        grupos.push({
            clave,
            ...grupo,
            secciones,
            activo: secciones.some((s) => s.opciones.some((o) => o.activo)),
        });
    }

    return grupos;
}
