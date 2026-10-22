// Componente Alpine para el formulario de la ficha de docente: busca, entre
// los empleados ACTIVOS del sistema biometrico, coincidencias por cedula o
// nombre y prellena los campos del formulario al seleccionar un resultado.
export default function docenteBiometricoForm(config) {
    return {
        buscarUrl: config.buscarUrl,
        busqueda: '',
        resultados: [],
        buscando: false,
        cargadoDesdeBiometrico: config.preseleccionado ?? false,

        async buscar() {
            if (this.busqueda.trim().length < 2) {
                this.resultados = [];
                return;
            }

            this.buscando = true;
            try {
                const respuesta = await fetch(this.buscarUrl + '?q=' + encodeURIComponent(this.busqueda));
                this.resultados = await respuesta.json();
            } finally {
                this.buscando = false;
            }
        },

        seleccionar(empleado) {
            const asignar = (id, valor) => {
                const campo = document.getElementById(id);
                if (campo && valor) {
                    campo.value = valor;
                }
            };

            asignar('cedula', empleado.cedula);
            asignar('nombres', empleado.nombres);
            asignar('apellidos', empleado.apellidos);
            asignar('correo_institucional', empleado.correo_institucional);
            asignar('telefono', empleado.telefono);
            asignar('direccion', empleado.direccion);
            asignar('fecha_nacimiento', empleado.fecha_nacimiento);
            asignar('fecha_ingreso', empleado.fecha_ingreso);
            asignar('especialidad', empleado.especialidad);
            asignar('nivel_educativo', empleado.nivel_educativo);
            asignar('area', empleado.area);
            asignar('cargo', empleado.cargo);

            this.cargadoDesdeBiometrico = true;
            this.resultados = [];
            this.busqueda = '';
        },
    };
}
