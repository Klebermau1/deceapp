// Menu principal del personal DECE, agrupado por proceso. Lo lee
// lib/menu.js, que filtra segun los permisos del usuario y marca la opcion
// activa; views/partials/navigation.ejs lo pinta (escritorio y movil).
//
// Grupo:   etiqueta, icono, alinear (izquierda|centro|derecha del panel), secciones
//          -- o ruta si es un enlace directo sin submenu.
// Opcion:  etiqueta, descripcion, ruta, icono,
//          activo  => patrones de nombre de ruta que la marcan como actual,
//          can     => permiso (o lista: basta con tener uno),
//          rol     => rol requerido,
//          externo => abre en otra pestaña (paginas publicas).

export default {
    "inicio": {
        "etiqueta": "Inicio",
        "icono": "inicio",
        "ruta": "dashboard",
        "activo": [
            "dashboard"
        ]
    },
    "estudiantes": {
        "etiqueta": "Estudiantes",
        "icono": "estudiantes",
        "secciones": {
            "Nómina": [
                {
                    "etiqueta": "Expediente del estudiante",
                    "descripcion": "Todo del estudiante en una sola vista",
                    "ruta": "expedientes.index",
                    "icono": "ficha",
                    "activo": [
                        "expedientes.index",
                        "expedientes.show"
                    ],
                    "can": [
                        "ver fichas",
                        "ver actas",
                        "gestionar actas"
                    ]
                },
                {
                    "etiqueta": "Estudiantes por año lectivo",
                    "descripcion": "Listado vigente por nivel",
                    "ruta": "estudiantes.index",
                    "icono": "grupo",
                    "activo": [
                        "estudiantes.index"
                    ],
                    "can": "ver fichas"
                },
                {
                    "etiqueta": "Cargar nómina",
                    "descripcion": "Copiar y pegar desde Excel",
                    "ruta": "estudiantes.importar",
                    "icono": "cargar",
                    "activo": [
                        "estudiantes.importar",
                        "estudiantes.previsualizar"
                    ],
                    "can": "gestionar estudiantes"
                }
            ],
            "Fichas estudiantiles": [
                {
                    "etiqueta": "Directorio de fichas",
                    "descripcion": "Ficha completa de matrícula",
                    "ruta": "fichas.index",
                    "icono": "ficha",
                    "activo": [
                        "fichas.index",
                        "fichas.show"
                    ],
                    "can": "ver fichas"
                },
                {
                    "etiqueta": "Estadísticas",
                    "descripcion": "Salud, familia y situación socioeconómica",
                    "ruta": "fichas.estadisticas",
                    "icono": "grafico",
                    "activo": [
                        "fichas.estadisticas"
                    ],
                    "can": "ver fichas"
                },
                {
                    "etiqueta": "Mapa de ubicaciones",
                    "descripcion": "Domicilios georreferenciados",
                    "ruta": "fichas.mapa",
                    "icono": "mapa",
                    "activo": [
                        "fichas.mapa"
                    ],
                    "can": "ver fichas"
                }
            ]
        }
    },
    "acompanamiento": {
        "etiqueta": "Acompañamiento",
        "icono": "acompanamiento",
        "alinear": "centro",
        "secciones": {
            "Actas de reunión": [
                {
                    "etiqueta": "Actas registradas",
                    "descripcion": "Reuniones con representantes",
                    "ruta": "actas.index",
                    "icono": "documento",
                    "activo": [
                        "actas.index",
                        "actas.show",
                        "actas.edit"
                    ],
                    "can": [
                        "ver actas",
                        "gestionar actas"
                    ]
                },
                {
                    "etiqueta": "Nueva acta",
                    "descripcion": "Registrar una reunión",
                    "ruta": "actas.create",
                    "icono": "nuevo",
                    "activo": [
                        "actas.create"
                    ],
                    "can": "gestionar actas"
                }
            ],
            "Instrumento de aplicación": [
                {
                    "etiqueta": "Aplicaciones",
                    "descripcion": "Entrevistas por estudiante",
                    "ruta": "instrumento.index",
                    "icono": "lista",
                    "activo": [
                        "instrumento.index",
                        "instrumento.show"
                    ],
                    "can": [
                        "ver actas",
                        "gestionar actas"
                    ]
                },
                {
                    "etiqueta": "Nueva aplicación",
                    "descripcion": "Iniciar una entrevista",
                    "ruta": "instrumento.create",
                    "icono": "nuevo",
                    "activo": [
                        "instrumento.create"
                    ],
                    "can": "gestionar actas"
                },
                {
                    "etiqueta": "Resultados",
                    "descripcion": "Dashboard y resultados grupales",
                    "ruta": "instrumento.dashboard",
                    "icono": "panel",
                    "activo": [
                        "instrumento.dashboard",
                        "instrumento.grupal"
                    ],
                    "can": [
                        "ver actas",
                        "gestionar actas"
                    ]
                }
            ],
            "Estilos de aprendizaje": [
                {
                    "etiqueta": "Resultados del test",
                    "descripcion": "Visual, auditivo y kinestésico",
                    "ruta": "test-estilos.index",
                    "icono": "idea",
                    "activo": [
                        "test-estilos.index",
                        "test-estilos.resultado",
                        "test-estilos.perfil"
                    ],
                    "can": [
                        "ver actas",
                        "gestionar actas"
                    ]
                },
                {
                    "etiqueta": "Dashboard del curso",
                    "descripcion": "Resumen, recomendaciones IA y seguimiento",
                    "ruta": "test-estilos.dashboard",
                    "icono": "panel",
                    "activo": [
                        "test-estilos.dashboard"
                    ],
                    "can": [
                        "ver actas",
                        "gestionar actas"
                    ]
                },
                {
                    "etiqueta": "Reportes PDF",
                    "descripcion": "Individual, por nivel y general",
                    "ruta": "test-estilos.reportes.index",
                    "icono": "documento",
                    "activo": [
                        "test-estilos.reportes.*"
                    ],
                    "can": [
                        "ver actas",
                        "gestionar actas"
                    ]
                },
                {
                    "etiqueta": "Abrir test para estudiantes",
                    "descripcion": "Página pública, solo con cédula",
                    "ruta": "test-estilos.inicio",
                    "icono": "externo",
                    "activo": [],
                    "can": [
                        "ver actas",
                        "gestionar actas"
                    ],
                    "externo": true
                },
                {
                    "etiqueta": "Configurar tests",
                    "descripcion": "Niveles, preguntas, imágenes y resultados",
                    "ruta": "test-estilos.config.index",
                    "icono": "lista",
                    "activo": [
                        "test-estilos.config.*"
                    ],
                    "can": "configurar tests de estilos"
                },
                {
                    "etiqueta": "Asignaturas",
                    "descripcion": "Para las actividades sugeridas por IA",
                    "ruta": "test-estilos.config.asignaturas.index",
                    "icono": "lista",
                    "activo": [
                        "test-estilos.config.asignaturas.*"
                    ],
                    "can": "configurar tests de estilos"
                }
            ]
        }
    },
    "bienestar": {
        "etiqueta": "Bienestar docente",
        "icono": "bienestar",
        "alinear": "derecha",
        "secciones": {
            "Seguimiento": [
                {
                    "etiqueta": "Dashboard",
                    "descripcion": "Indicadores del ciclo vigente",
                    "ruta": "bienestar.dashboard",
                    "icono": "panel",
                    "activo": [
                        "bienestar.dashboard"
                    ],
                    "can": "ver bienestar docente"
                },
                {
                    "etiqueta": "Docentes",
                    "descripcion": "Ciclos, valoraciones y planes",
                    "ruta": "bienestar.docentes.index",
                    "icono": "grupo",
                    "activo": [
                        "bienestar.docentes.*",
                        "bienestar.ciclos.*",
                        "bienestar.evaluaciones.*",
                        "bienestar.valoraciones.*",
                        "bienestar.planes.*",
                        "bienestar.seguimientos.*",
                        "bienestar.cierres.*"
                    ],
                    "can": "gestionar bienestar docente"
                },
                {
                    "etiqueta": "Resultados de evaluaciones",
                    "descripcion": "Por cuestionario y dimensión",
                    "ruta": "bienestar.cuestionarios.resultados-index",
                    "icono": "grafico",
                    "activo": [
                        "bienestar.cuestionarios.resultados*"
                    ],
                    "can": "gestionar bienestar docente"
                }
            ],
            "Configuración": [
                {
                    "etiqueta": "Cuestionarios de evaluación",
                    "descripcion": "Dimensiones y preguntas",
                    "ruta": "bienestar.cuestionarios.index",
                    "icono": "lista",
                    "activo": [
                        "bienestar.cuestionarios.index",
                        "bienestar.cuestionarios.create",
                        "bienestar.cuestionarios.edit"
                    ],
                    "can": "gestionar bienestar docente",
                    "rol": "Administrador"
                }
            ]
        }
    },
    "administracion": {
        "etiqueta": "Administración",
        "icono": "administracion",
        "alinear": "derecha",
        "secciones": {
            "Institución": [
                {
                    "etiqueta": "Años lectivos",
                    "descripcion": "Año vigente para nómina y tests",
                    "ruta": "bienestar.ciclos-lectivos.index",
                    "icono": "calendario",
                    "activo": [
                        "bienestar.ciclos-lectivos.*"
                    ],
                    "can": "gestionar bienestar docente",
                    "rol": "Administrador"
                },
                {
                    "etiqueta": "Datos de la institución",
                    "descripcion": "Nombre, logo y ubicación",
                    "ruta": "institucion.edit",
                    "icono": "institucion",
                    "activo": [
                        "institucion.edit"
                    ],
                    "can": "gestionar configuracion"
                }
            ],
            "Seguridad": [
                {
                    "etiqueta": "Usuarios",
                    "descripcion": "Cuentas, roles y acceso",
                    "ruta": "usuarios.index",
                    "icono": "usuarios",
                    "activo": [
                        "usuarios.*"
                    ],
                    "can": "gestionar usuarios"
                },
                {
                    "etiqueta": "Perfiles y permisos",
                    "descripcion": "Qué puede ver y hacer cada perfil",
                    "ruta": "roles.index",
                    "icono": "lista",
                    "activo": [
                        "roles.*"
                    ],
                    "can": "gestionar usuarios"
                },
                {
                    "etiqueta": "Auditoría",
                    "descripcion": "Registro de cambios",
                    "ruta": "auditoria.index",
                    "icono": "auditoria",
                    "activo": [
                        "auditoria.*"
                    ],
                    "can": "ver auditoria"
                }
            ]
        }
    }
};
