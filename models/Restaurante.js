const mongoose = require('mongoose');

const restauranteSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: true, 
        unique: true 
    },
    slug: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true,
        trim: true
    },
    telefono: { 
        type: String 
    },
    mensajeBienvenida: {
        type: String,
        trim: true
    },
    logoUrl: {
        type: String,
        trim: true
    },
    direccion: { // Mantén este campo para la dirección de texto
        type: String,
        trim: true
    },
    // === ¡¡¡CAMBIO CLAVE AQUÍ: AÑADIR EL CAMPO 'location' para GeoJSON Point!!! ===
    location: {
        type: {
            type: String, // Debe ser 'Point' para un punto GeoJSON
            enum: ['Point'], // Asegura que solo se acepte el valor 'Point'
            required: false // No es estrictamente necesario que siempre haya una ubicación
        },
        coordinates: {
            type: [Number], // Array de números [longitud, latitud]
            required: false // No es estrictamente necesario que siempre haya coordenadas
            // Si planeas hacer búsquedas geospaciales complejas, considera añadir:
            // index: '2dsphere'
        }
    }
    // =========================================================================
}, { timestamps: true });

module.exports = mongoose.model('Restaurante', restauranteSchema);