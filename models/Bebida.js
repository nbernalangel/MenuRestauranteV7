const mongoose = require('mongoose');

const bebidaSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    precio: { type: Number, required: true, min: 0 },
    // --- CAMPO CLAVE AÑADIDO ---
    // La categoría es fundamental para agrupar las bebidas (ej: "Gaseosas", "Jugos Naturales", "Licores").
    categoria: { type: String, required: true },
    // --- CAMPO AÑADIDO PARA CONSISTENCIA ---
    // Para que también puedas añadir imágenes a las bebidas.
    imagenUrl: { type: String, default: '' },
    disponible: { type: Boolean, default: true },
    restaurante: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Restaurante', 
        required: true 
    }
});

module.exports = mongoose.model('Bebida', bebidaSchema);