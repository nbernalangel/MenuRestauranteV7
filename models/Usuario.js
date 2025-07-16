// models/Usuario.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Importamos bcryptjs para el hashing de contraseñas

const usuarioSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    isVerified: {
        type: Boolean,
        default: false 
    },
    verificationCode: {
        type: String,
        required: false 
    },
    verificationCodeExpires: {
        type: Date,
        required: false 
    },
    rol: { 
        type: String, 
        enum: ['superadmin', 'admin_restaurante'], 
        required: true 
    },
    restaurante: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Restaurante'
    },
    // --- NUEVOS CAMPOS PARA RESTABLECIMIENTO DE CONTRASEÑA ---
    resetToken: { // Campo para guardar el token de restablecimiento
        type: String,
        required: false // No es requerido, solo existe cuando se solicita un restablecimiento
    },
    resetTokenExpires: { // Campo para guardar la fecha de expiración del token
        type: Date,
        required: false // No es requerido
    }
    // --- FIN DE NUEVOS CAMPOS ---
}, { timestamps: true });

// Middleware 'pre' de Mongoose: Se ejecuta ANTES de que un documento 'usuario' se guarde
usuarioSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10); 
        this.password = await bcrypt.hash(this.password, salt);
    }
    next(); 
});

// Método para comparar la contraseña ingresada con la contraseña hasheada en la base de datos
usuarioSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);
