const mongoose = require('mongoose');

const restauranteSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: true, 
        unique: true 
    },
    // El 'slug' es el identificador único para la URL, ej: "la-trattoria-feliz"
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
    // FIX: Añadido el campo para el mensaje de bienvenida
    mensajeBienvenida: {
        type: String,
        trim: true // Buena práctica para quitar espacios al inicio/final
    }
}, { timestamps: true });

module.exports = mongoose.model('Restaurante', restauranteSchema);
