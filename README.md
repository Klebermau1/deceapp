# Plataforma DECE — versión Node.js

Migración de la Plataforma DECE (Departamento de Consejería Estudiantil) desde
Laravel/PHP a **Node.js + Express + vistas EJS**, con Tailwind CSS y Alpine.js
en el navegador (igual que la versión PHP).

Usa **la misma base de datos MySQL** que la versión PHP: mismas tablas, mismos
datos, mismos usuarios y contraseñas. No hay que migrar datos, y durante la
migración las dos versiones pueden funcionar a la vez sobre la misma base.

## Requisitos

- Node.js 18, 20, 22 o 24 (Hostinger los admite todos; se recomienda 22).
- MySQL / MariaDB con la base de la versión PHP ya creada.

## Instalación local

```bash
npm install
cp .env.example .env      # completar DB_*, SESSION_SECRET, STORAGE_PATH
npm run build             # compila Tailwind (styles.css) y el JS (app.js)
npm run dev               # http://localhost:3000, se reinicia al guardar
```

Mientras se editan vistas o JS del navegador, en otras terminales:
`npm run watch:css` y `npm run watch:js`.

## Despliegue en Hostinger (Node.js administrado)

1. En hPanel → **Sitios web → Agregar sitio → Node.js** (o en el sitio existente,
   **Node.js**), conectar este repositorio de GitHub.
2. Configuración de la app:
   - **Versión de Node:** 22
   - **Comando de instalación:** `npm install`
   - **Comando de build:** `npm run build`
   - **Archivo de inicio / comando:** `src/server.js` (o `npm start`)
3. **Variables de entorno** (las de `.env.example`), como mínimo:
   - `NODE_ENV=production`
   - `SESSION_SECRET=` (clave larga aleatoria; sin ella la app no arranca en producción)
   - `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` de la
     base MySQL de Hostinger (hPanel → Bases de datos → MySQL)
   - `STORAGE_PATH` (ver “Archivos subidos”)
   - Hostinger asigna `PORT` solo; no hace falta definirlo.
4. **Archivos subidos:** copiar el contenido de `storage/app/public` de la
   versión PHP (logos, entrevistas, imágenes del test, etc.) a la carpeta que
   indique `STORAGE_PATH`. Esa carpeta no va en git.
5. La primera vez que arranca, la app crea la tabla `node_sessions` para las
   sesiones (no toca la tabla `sessions` de Laravel). El usuario de MySQL
   necesita permiso CREATE.

Comprobación: `https://tu-dominio/up` responde `ok`.

## Estructura

```
src/
  server.js            punto de entrada
  app.js               middleware, sesiones, vistas y rutas
  config/              .env, menú (menu.js) y catálogo de permisos (permisos.js)
  db/                  conexiones MySQL (principal, ficha, biométrico)
  lib/                 rutas con nombre, validación, usuarios/permisos, auditoría...
  middleware/          sesión/flash, CSRF, login y permisos
  routes/              un archivo por módulo
  views/               plantillas EJS (layouts, partials, components, módulos)
frontend/              JS (Alpine.js, Leaflet) y CSS (Tailwind) del navegador
public/                archivos estáticos; public/build lo genera `npm run build`
```

Equivalencias con Laravel, para quien conoce la versión PHP:

| Laravel | Aquí |
|---|---|
| `route('usuarios.edit', $u)` | `route('usuarios.edit', u.id)` (vistas y rutas) |
| `middleware('permission:a\|b')` | `permiso('a', 'b')` |
| `middleware('role:Administrador')` | `rol('Administrador')` |
| `$request->validate([...])` | `await validar(req.body, {...})` (`lib/validacion.js`) |
| `old()`, `$errors`, `session('status')` | `old()`, `errors()`, `session('status')` en EJS |
| `@csrf`, `@method('PUT')` | `<%- csrf %>`, `<input type="hidden" name="_method" value="PUT">` |
| `@can('x')` | `<% if (can('x')) { %>` |
| `activity()->log()` | `registrar({...})` (`lib/actividad.js`, misma tabla `activity_log`) |

## Plan de migración por módulos

El menú solo muestra las opciones cuyos módulos ya están migrados, así que cada
fase se puede publicar por separado.

- [x] **Fase 1 — Base:** conexión MySQL, sesiones, CSRF, login del personal
      (con límite de intentos y cuentas desactivadas), permisos/roles, menú,
      layout, panel de inicio, mi perfil, usuarios, perfiles y permisos, logo.
- [ ] **Fase 2 — Administración:** datos de la institución (logo, mapa), años
      lectivos, auditoría.
- [ ] **Fase 3 — Estudiantes:** nómina (importar desde Excel), listado por año,
      fichas estudiantiles (base de matrícula), estadísticas, mapa, expediente.
- [ ] **Fase 4 — Actas de reunión:** CRUD, autoguardado, exportar PDF y Word.
- [ ] **Fase 5 — Instrumento de aplicación:** acceso público con clave,
      entrevistas, resultados grupales, dashboard, informe PDF, análisis con IA.
- [ ] **Fase 6 — Test de estilos de aprendizaje:** test público, resultados,
      perfil y dashboard con IA, reportes PDF, configuración, asignaturas.
- [ ] **Fase 7 — Bienestar docente:** docentes (biométrico), ciclos,
      evaluaciones, valoraciones, planes, seguimientos, cierres, cuestionarios,
      resultados PDF, dashboard.
- [ ] **Fase 8 — Portal docente:** login por cédula, mi evaluación, historial, perfil.
- [ ] **Fase 9 — Corte:** pruebas finales, apagar la versión PHP.

## Diferencias con la versión PHP (a propósito)

- **Usuarios:** en PHP, desmarcar “Cuenta activa” no desactivaba la cuenta
  (el formulario siempre la dejaba activa). Aquí desmarcarla sí la desactiva.
- **Perfiles:** al cambiar permisos se limpia la caché de permisos de la versión
  PHP, para que las dos versiones vean el cambio al instante mientras convivan.
- **Recuperar contraseña por correo:** la versión PHP no tenía correo
  configurado (`MAIL_MAILER=log`), así que no se migró. La contraseña la
  restablece un Administrador desde Usuarios.
