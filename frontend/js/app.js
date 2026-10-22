import './bootstrap';

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import Alpine from 'alpinejs';
import actaForm from './acta-form';
import mapaEstudiantes from './mapa-estudiantes';
import fichaUbicacion from './ficha-ubicacion';
import institucionMapa from './institucion-mapa';
import evaluacionForm from './evaluacion-form';
import docenteBiometricoForm from './docente-biometrico-form';
import instrumentoResponder from './instrumento-responder';
import testEstilosCarrusel from './test-estilos-carrusel';
import iniciarOverlayDeCarga from './form-loading-overlay';

window.Alpine = Alpine;
Alpine.data('actaForm', actaForm);
Alpine.data('mapaEstudiantes', mapaEstudiantes);
Alpine.data('fichaUbicacion', fichaUbicacion);
Alpine.data('institucionMapa', institucionMapa);
Alpine.data('evaluacionForm', evaluacionForm);
Alpine.data('docenteBiometricoForm', docenteBiometricoForm);
Alpine.data('instrumentoResponder', instrumentoResponder);
Alpine.data('testEstilosCarrusel', testEstilosCarrusel);

Alpine.start();

iniciarOverlayDeCarga();
