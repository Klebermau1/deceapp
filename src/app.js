// Aplicacion Express: middleware comun, sesiones en MySQL, vistas EJS y
// rutas de cada modulo.
import path from 'node:path';
import express from 'express';
import session from 'express-session';
import MySQLStoreFactory from 'express-mysql-session';
import expressLayouts from 'express-ejs-layouts';
import methodOverride from 'method-override';
import helmet from 'helmet';
import compression from 'compression';

import config, { RAIZ } from './config/index.js';
import { principal } from './db/index.js';
import { route, existeRuta, routeIs } from './lib/rutas.js';
import { menuPara } from './lib/menu.js';
import { configuracionActual, urlLogo } from './lib/institucion.js';
import { iniciales } from './lib/usuarios.js';
import * as formato from './lib/formato.js';
import { icono } from './lib/iconos.js';
import { ErrorValidacion } from './lib/validacion.js';
import { flash, atras } from './middleware/sesion.js';
import { verificar as csrf } from './middleware/csrf.js';
import { usuarioActual } from './middleware/auth.js';

import rutasAuth from './routes/auth.js';
import rutasDashboard from './routes/dashboard.js';
import rutasPerfil from './routes/perfil.js';
import rutasUsuarios from './routes/usuarios.js';
import rutasRoles from './routes/roles.js';
import rutasInstitucion from './routes/institucion.js';
import rutasCiclosLectivos from './routes/ciclosLectivos.js';
import rutasAuditoria from './routes/auditoria.js';

export function crearApp() {
    const app = express();

    // Hostinger (y cualquier proxy) termina el HTTPS antes de llegar a Node.
    app.set('trust proxy', 1);
    app.set('views', path.join(RAIZ, 'src', 'views'));
    app.set('view engine', 'ejs');
    app.use(expressLayouts);
    app.set('layout', 'layouts/app');
    app.set('layout extractScripts', true);
    app.set('layout extractStyles', true);

    app.use(helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                // Alpine.js evalua expresiones de los atributos x-data / x-on.
                'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.bunny.net'],
                'font-src': ["'self'", 'https://fonts.bunny.net', 'data:'],
                'img-src': ["'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
                'connect-src': ["'self'"],
                'upgrade-insecure-requests': config.produccion ? [] : null,
            },
        },
        crossOriginEmbedderPolicy: false,
    }));
    app.use(compression());

    app.use(express.static(path.join(RAIZ, 'public'), { maxAge: config.produccion ? '7d' : 0 }));
    app.use(express.urlencoded({ extended: true, limit: '5mb' }));
    app.use(express.json({ limit: '5mb' }));
    // Formularios HTML con <input name="_method" value="PUT"> (como @method).
    app.use(methodOverride((req) => {
        if (req.body && typeof req.body === 'object' && '_method' in req.body) {
            const metodo = req.body._method;
            delete req.body._method;
            return metodo;
        }
        return undefined;
    }));

    const MySQLStore = MySQLStoreFactory(session);
    app.use(session({
        name: 'dece_sesion',
        secret: config.sesion.secreto,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        store: new MySQLStore({
            createDatabaseTable: true,
            // Tabla propia: no se mezcla con la tabla sessions de Laravel.
            schema: { tableName: 'node_sessions' },
            clearExpired: true,
            checkExpirationInterval: 15 * 60 * 1000,
        }, principal()),
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: config.produccion,
            maxAge: config.sesion.minutos * 60 * 1000,
        },
    }));

    app.use(flash);
    app.use(csrf);
    app.use(usuarioActual);

    // Variables disponibles en todas las vistas.
    app.use(async (req, res, next) => {
        try {
            const institucion = await configuracionActual();
            Object.assign(res.locals, {
                appNombre: config.nombre,
                institucion,
                nombreInstitucion: institucion?.nombre || config.nombre,
                logoUrl: urlLogo(institucion),
                route,
                hasRoute: existeRuta,
                routeIs: (...patrones) => routeIs(res.locals.routeName, ...patrones),
                iniciales,
                icono,
                f: formato,
                titulo: null,
                menu: () => menuPara(req.user, res.locals.routeName),
                anio: new Date().getFullYear(),
            });
            next();
        } catch (error) {
            next(error);
        }
    });

    app.use(rutasInstitucion);
    app.use(rutasAuth);
    app.use(rutasDashboard);
    app.use(rutasPerfil);
    app.use(rutasUsuarios);
    app.use(rutasRoles);
    app.use(rutasCiclosLectivos);
    app.use(rutasAuditoria);

    app.get('/up', (req, res) => res.type('text').send('ok'));

    app.use((req, res) => {
        res.status(404).render('errors/404', { layout: 'layouts/simple', titulo: 'Página no encontrada' });
    });

    // eslint-disable-next-line no-unused-vars
    app.use((error, req, res, next) => {
        if (error instanceof ErrorValidacion) {
            if (req.xhr || req.get('Accept')?.includes('application/json')) {
                return res.status(422).json({ message: 'Datos no válidos', errors: error.errores });
            }
            req.conErrores(error.errores, error.bolsa);
            return atras(req, res, '/');
        }

        console.error(error);
        res.status(500).render('errors/500', {
            layout: 'layouts/simple',
            titulo: 'Error del servidor',
            detalle: config.produccion ? null : error.stack,
        });
    });

    return app;
}
