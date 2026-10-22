// Punto de entrada (Hostinger: archivo de inicio = src/server.js, o "npm start").
import config from './config/index.js';
import { crearApp } from './app.js';
import { cerrar } from './db/index.js';

const app = crearApp();

const servidor = app.listen(config.puerto, () => {
    console.log(`${config.nombre} escuchando en el puerto ${config.puerto} (${config.produccion ? 'produccion' : 'desarrollo'})`);
});

async function apagar(senal) {
    console.log(`${senal} recibido: cerrando...`);
    servidor.close(async () => {
        await cerrar();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGTERM', () => apagar('SIGTERM'));
process.on('SIGINT', () => apagar('SIGINT'));
