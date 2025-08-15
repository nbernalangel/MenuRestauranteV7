const mongoose = require('mongoose');

// Este es el "sub-molde" para los diferentes tamaños de pizza.
// No se guarda como una colección separada, sino dentro de cada pizza.
const variantePizzaSchema = new mongoose.Schema({
    tamaño: { 
        type: String, 
        required: true,
        trim: true
    }, // Ej: "Personal", "Mediana", "Familiar", "Porción"
    precio: { 
        type: Number, 
        required: true 
    }
}, { _id: false }); // _id: false para no crear IDs innecesarios para cada tamaño.

// Este es el modelo principal para el producto "Pizza".
const pizzaSchema = new mongoose.Schema({
    nombre: { 
        type: String, 
        required: true,
        trim: true
    }, // Ej: "Hawaiana", "Pepperoni", "Vegetariana"
    descripcion: { 
        type: String,
        trim: true
    },
    
    // --- NUEVO CAMPO AÑADIDO ---
    categoria: {
        type: String,
        enum: ['Tradicional', 'Gourmet'],
        required: [true, 'La categoría de la pizza es obligatoria.'],
        default: 'Tradicional'
    },
    // --------------------------

    ingredientes: [String], // Un array de textos para los ingredientes
    imagenUrl: { 
        type: String,
        default: ''
    },
    disponible: {
        type: Boolean,
        default: true
    },
    restaurante: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Restaurante',
        required: true
    },
    
    // Aquí guardamos los diferentes tamaños y precios usando el sub-molde.
    variantes: [variantePizzaSchema],

    // Esta es la regla de negocio que nos dice si esta pizza se puede combinar.
    permiteMitades: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Pizza', pizzaSchema);