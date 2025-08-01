// js/reportes.js (VERSIÓN FINAL CON LÓGICA PARA AMBOS REPORTES)

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('report-filters-form');
    const reportTypeSelect = document.getElementById('reportType');
    const pedidosFiltersDiv = document.getElementById('pedidos-filters');
    const restaurantesFiltersDiv = document.getElementById('restaurantes-filters');
    const restauranteSelect = document.getElementById('restauranteId');
    const statusMessage = document.getElementById('status-message');

    // Muestra u oculta los filtros según el tipo de reporte seleccionado
    function handleReportTypeChange() {
        if (reportTypeSelect.value === 'pedidos') {
            pedidosFiltersDiv.classList.remove('hidden');
            restaurantesFiltersDiv.classList.add('hidden');
        } else if (reportTypeSelect.value === 'restaurantes') {
            pedidosFiltersDiv.classList.add('hidden');
            restaurantesFiltersDiv.classList.remove('hidden');
        }
    }

    // Cargar restaurantes en el menú desplegable al iniciar
    async function fetchRestaurants() {
        try {
            const response = await fetch('/api/restaurantes');
            if (!response.ok) {
                throw new Error('Error al cargar la lista de restaurantes.');
            }
            const restaurantes = await response.json();
            
            // Añade una opción para todos los restaurantes
            const allOption = document.createElement('option');
            allOption.value = '';
            allOption.textContent = 'Todos los restaurantes';
            restauranteSelect.appendChild(allOption);

            // Llena el menú desplegable con los restaurantes de la API
            restaurantes.forEach(restaurante => {
                const option = document.createElement('option');
                option.value = restaurante._id;
                option.textContent = restaurante.nombre;
                restauranteSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error al cargar los restaurantes:', error);
            statusMessage.textContent = 'Error: No se pudo cargar la lista de restaurantes.';
        }
    }

    // Manejar el envío del formulario
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const reportType = reportTypeSelect.value;
        const params = new URLSearchParams();
        let downloadUrl = '';

        if (reportType === 'pedidos') {
            const restauranteId = restauranteSelect.value;
            const fechaInicio = document.getElementById('fechaInicio').value;
            const fechaFin = document.getElementById('fechaFin').value;
            const estado = document.getElementById('estado').value;

            if (restauranteId) params.append('restauranteId', restauranteId);
            if (fechaInicio) params.append('fechaInicio', fechaInicio);
            if (fechaFin) params.append('fechaFin', fechaFin);
            if (estado) params.append('estado', estado);

            downloadUrl = `/api/reportes/descargar?${params.toString()}`;
        
        } else if (reportType === 'restaurantes') {
            const restauranteNombre = document.getElementById('restauranteNombre').value;
            const restauranteUbicacion = document.getElementById('restauranteUbicacion').value;

            if (restauranteNombre) params.append('nombre', restauranteNombre);
            if (restauranteUbicacion) params.append('ubicacion', restauranteUbicacion);

            // Este es el nuevo endpoint que acabamos de crear en app.js
            downloadUrl = `/api/reportes/restaurantes/descargar?${params.toString()}`;
        }
        
        if (downloadUrl) {
            statusMessage.textContent = 'Generando y descargando reporte...';
            // Usamos un enlace para iniciar la descarga
            const link = document.createElement('a');
            link.href = downloadUrl;
            document.body.appendChild(link);
            link.click();
            link.remove();
            
            statusMessage.textContent = 'Reporte solicitado exitosamente. La descarga comenzará en breve.';
        }
    });

    // Añade el listener para el cambio de tipo de reporte
    reportTypeSelect.addEventListener('change', handleReportTypeChange);
    
    // Inicializa la página cargando los restaurantes y los filtros
    handleReportTypeChange(); // Muestra el filtro de pedidos por defecto
    fetchRestaurants();
});