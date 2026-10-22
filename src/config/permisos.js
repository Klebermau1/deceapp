// Catalogo de permisos para la pantalla Administracion > Perfiles y permisos.
// Agrupa los permisos (tabla permissions) por modulo y explica en lenguaje
// claro que habilita cada uno. Las claves son los nombres reales que usan las
// rutas (puede(...)), el menu (config/menu.js) y las vistas (can(...)). Un
// permiso que exista en la base de datos pero no este aqui sale en "Otros".

export default {
    Estudiantes: {
        'ver fichas': {
            etiqueta: 'Ver fichas estudiantiles',
            descripcion: 'Directorio de fichas, estadísticas, mapa de ubicaciones y listado de estudiantes por año lectivo.',
        },
        'gestionar estudiantes': {
            etiqueta: 'Cargar la nómina',
            descripcion: 'Cargar, actualizar y eliminar estudiantes de la nómina de cada año lectivo.',
        },
    },

    'Acompañamiento': {
        'ver actas': {
            etiqueta: 'Ver acompañamiento',
            descripcion: 'Consultar actas, aplicaciones y resultados del Instrumento, resultados del test de estilos y sus reportes PDF.',
        },
        'gestionar actas': {
            etiqueta: 'Registrar acompañamiento',
            descripcion: 'Crear, editar y eliminar actas; iniciar aplicaciones del Instrumento; eliminar resultados del test de estilos para que el estudiante lo repita.',
        },
        'configurar tests de estilos': {
            etiqueta: 'Configurar el test de estilos',
            descripcion: 'Editar tests, niveles, preguntas, imágenes y textos de resultado del test de estilos de aprendizaje.',
        },
    },

    'Bienestar docente': {
        'ver bienestar docente': {
            etiqueta: 'Ver bienestar docente',
            descripcion: 'Dashboard e indicadores del ciclo vigente.',
        },
        'gestionar bienestar docente': {
            etiqueta: 'Gestionar bienestar docente',
            descripcion: 'Docentes, ciclos, evaluaciones, valoraciones, planes, seguimientos y cierres. Los años lectivos y cuestionarios además requieren el perfil Administrador.',
        },
        'ver bienestar docente confidencial': {
            etiqueta: 'Ver información confidencial (todos)',
            descripcion: 'Ver el contenido confidencial de las valoraciones y seguimientos de todos los profesionales.',
        },
        'ver bienestar docente confidencial propia': {
            etiqueta: 'Ver información confidencial (solo la propia)',
            descripcion: 'Ver solo el contenido confidencial registrado por el propio usuario.',
        },
    },

    'Administración': {
        'gestionar configuracion': {
            etiqueta: 'Datos de la institución',
            descripcion: 'Editar nombre, logo y ubicación de la institución.',
        },
        'gestionar usuarios': {
            etiqueta: 'Usuarios, perfiles y permisos',
            descripcion: 'Crear usuarios, asignarles perfil y definir qué puede hacer cada perfil (esta pantalla).',
        },
        'ver auditoria': {
            etiqueta: 'Auditoría',
            descripcion: 'Consultar el registro de cambios hechos en la plataforma.',
        },
    },
};
