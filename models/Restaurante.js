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
    // FIX: Añadido el campo para la URL del logo
    logoUrl: {
        type: String,
        trim: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Restaurante', restauranteSchema);
