// js/landing.js (VERSIÓN FINAL Y COMPLETA PARA MAPA CON MEJORAS)

let map; // Variable global para la instancia del mapa
let openInfoWindow = null; // Para cerrar ventanas de información anteriores

// La función initMap es llamada por el API de Google Maps cuando está listo.
async function initMap() {
    console.log("=== initMap se está ejecutando ==="); // Mantén esto por si quieres verificar

    // Coordenadas iniciales centradas en Bogotá, Colombia (si la geolocalización falla)
    const bogota = { lat: 4.60971, lng: -74.08175 };

    // Inicializa el mapa con una vista por defecto
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: bogota,
    });

    // Intenta obtener la ubicación actual del usuario
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLatLng = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                // Centra el mapa en la ubicación del usuario
                map.setCenter(userLatLng);
                map.setZoom(14); // Un zoom más cercano para su ubicación

                // Opcional: Añade un marcador para la ubicación del usuario
                new google.maps.Marker({
                    position: userLatLng,
                    map: map,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: '#4285F4', // Azul de Google
                        fillOpacity: 0.9,
                        strokeWeight: 0,
                        scale: 8, // Tamaño del círculo
                    },
                    title: 'Tu ubicación actual'
                });

                // Carga los restaurantes después de obtener la ubicación del usuario
                loadRestaurants(userLatLng);
            },
            () => {
                // Función de error de geolocalización (usuario denegó o falló)
                console.warn("Error: El servicio de geolocalización falló o el usuario denegó el permiso.");
                // Carga los restaurantes sin la ubicación del usuario (mapa centrado en Bogotá)
                loadRestaurants(null);
            }
        );
    } else {
        // El navegador no soporta Geolocation
        console.warn("Error: Tu navegador no soporta geolocalización. El mapa se centrará en la ubicación predeterminada.");
        // Carga los restaurantes sin la ubicación del usuario (mapa centrado en Bogotá)
        loadRestaurants(null);
    }

    // Cierra cualquier InfoWindow abierta si se hace clic en el mapa (fuera de un marcador)
    map.addListener('click', () => {
        if (openInfoWindow) {
            openInfoWindow.close();
            openInfoWindow = null;
        }
    });
}

// Función para cargar y mostrar los restaurantes en el mapa
async function loadRestaurants(userLatLng = null) {
    try {
        const response = await fetch('/api/restaurantes/locations');

        if (!response.ok) {
            throw new Error(`El servidor respondió con un error: ${response.status}`);
        }

        const restaurantes = await response.json();

        if (!Array.isArray(restaurantes)) {
            throw new Error("La respuesta del servidor no fue una lista de restaurantes.");
        }

        console.log("Restaurantes con ubicación encontrados:", restaurantes);

        // Si tenemos la ubicación del usuario, podemos ordenar los restaurantes por distancia
        if (userLatLng && google.maps.geometry) { // Verifica que geometry library esté cargada
            restaurantes.sort((a, b) => {
                // Asegúrate de que los restaurantes tengan coordenadas válidas para calcular distancia
                if (!a.location || !Array.isArray(a.location.coordinates) || a.location.coordinates.length !== 2 ||
                    !b.location || !Array.isArray(b.location.coordinates) || b.location.coordinates.length !== 2) {
                    return 0; // No se pueden comparar si faltan coordenadas
                }

                const distA = google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(userLatLng.lat, userLatLng.lng),
                    new google.maps.LatLng(a.location.coordinates[1], a.location.coordinates[0])
                );
                const distB = google.maps.geometry.spherical.computeDistanceBetween(
                    new google.maps.LatLng(userLatLng.lat, userLatLng.lng),
                    new google.maps.LatLng(b.location.coordinates[1], b.location.coordinates[0])
                );
                return distA - distB;
            });
        }

        restaurantes.forEach(restaurante => {
            // Verifica que el restaurante tenga coordenadas válidas antes de intentar añadir un marcador
            if (restaurante.location && Array.isArray(restaurante.location.coordinates) && restaurante.location.coordinates.length === 2) {
                const marker = new google.maps.Marker({
                    position: {
                        lat: restaurante.location.coordinates[1], // Latitud
                        lng: restaurante.location.coordinates[0]  // Longitud
                    },
                    map: map,
                    title: restaurante.nombre
                });

                // Contenido mejorado y estilizado para la InfoWindow
                const infoWindowContent = `
                    <div style="font-family: 'Poppins', sans-serif; padding: 10px; min-width: 200px;">
                        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 5px; color: #00183A;">${restaurante.nombre || 'Nombre no disponible'}</h3>
                        <p style="font-size: 0.9rem; color: #555; margin-bottom: 10px;">${restaurante.direccion || 'Dirección no disponible'}</p>
                        <a href="/r/${restaurante.slug}" target="_blank" style="display: inline-block; background-color: #94C120; color: #00183A; padding: 8px 15px; border-radius: 5px; text-decoration: none; font-weight: 600; font-size: 0.85rem;">
                            Ver Menú
                        </a>
                    </div>
                `;

                const infoWindow = new google.maps.InfoWindow({ content: infoWindowContent });

                marker.addListener("click", () => {
                    // Cierra cualquier InfoWindow abierta previamente
                    if (openInfoWindow) {
                        openInfoWindow.close();
                    }
                    infoWindow.open(map, marker);
                    openInfoWindow = infoWindow; // Guarda la referencia de la InfoWindow abierta
                });
            } else {
                console.warn(`Restaurante "${restaurante.nombre || 'Sin Nombre'}" no tiene coordenadas válidas para el mapa y será omitido.`, restaurante);
            }
        });

    } catch (error) {
        console.error('Error final al cargar los restaurantes para el mapa:', error);
        document.getElementById("map").innerHTML = "No se pudieron cargar los restaurantes en el mapa.";
    }
}

// Hacemos que la función initMap sea explícitamente accesible globalmente para el callback de Google Maps
window.initMap = initMap;