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
    direccion: { 
        type: String,
        trim: true
    },
    titulosPersonalizados: {
        platos: String,
        bebidas: String,
        pizzas: String,
        especiales: String,
        menuDia: String,
    },
    location: {
        type: {
            type: String, 
            enum: ['Point'], 
            required: false 
        },
        coordinates: {
            type: [Number], 
            required: false
        }
    },
    aceptaDomicilios: {
        type: Boolean,
        default: true
    },
    aceptaServicioEnMesa: {
        type: Boolean,
        default: true
    },
    // --- NUEVO CAMPO AÑADIDO ---
    metodosDePago: {
        efectivo: { type: Boolean, default: true },
        tarjeta: { type: Boolean, default: false },
        transferencia: { type: Boolean, default: false }
    }
    // --------------------------
}, { timestamps: true });

module.exports = mongoose.model('Restaurante', restauranteSchema);