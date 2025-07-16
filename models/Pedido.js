// models/Pedido.js
const mongoose = require('mongoose');

const pedidoSchema = new mongoose.Schema({
    // A qué restaurante se le hizo el pedido
    restaurante: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurante',
        required: true
    },
    // Qué productos se incluyeron en el pedido
    items: [{
        nombre: String,
        cantidad: Number,
        precio: Number
    }],
    // El total del pedido
    total: {
        type: Number,
        required: true
    },
    // Información (opcional) del cliente que pidió
    cliente: {
        nombre: String,
        telefono: String,
        direccion: String
    }
}, { timestamps: true }); // timestamps: true añade automáticamente la fecha de creación

module.exports = mongoose.model('Pedido', pedidoSchema);