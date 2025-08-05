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
    location: {
        type: {
            type: String, // Debe ser 'Point' para un punto GeoJSON
            enum: ['Point'], // Asegura que solo se acepte el valor 'Point'
            required: false 
        },
        coordinates: {
            type: [Number], // Array de números [longitud, latitud]
            required: false
        }
    },
    // --- BLOQUE FALTANTE AÑADIDO AQUÍ ---
    aceptaDomicilios: {
        type: Boolean,
        default: true
    },
    aceptaServicioEnMesa: {
        type: Boolean,
        default: true
    }
    // ------------------------------------
}, { timestamps: true });

module.exports = mongoose.model('Restaurante', restauranteSchema);