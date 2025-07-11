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
        // ¡Ahora sí se encriptará antes de guardarla gracias al middleware 'pre' de abajo!
    },
    // --- CAMPOS PARA VERIFICACIÓN DE CORREO (si los usas) ---
    isVerified: {
        type: Boolean,
        default: false // El usuario no está verificado por defecto al registrarse
    },
    verificationCode: {
        type: String,
        required: false // Solo existirá mientras la cuenta no esté verificada
    },
    verificationCodeExpires: {
        type: Date,
        required: false // La fecha y hora en que el código expira
    },
    // --- FIN DE CAMPOS DE VERIFICACIÓN ---
    rol: { 
        type: String, 
        enum: ['superadmin', 'admin_restaurante'], 
        required: true 
    },
    // Conecta al usuario con su restaurante, si no es un superadmin.
    restaurante: { 
        type: mongoose.Schema.Types.ObjectId, // Asegúrate de que sea 'mongoose.Schema.Types.ObjectId'
        ref: 'Restaurante'
    }
}, { timestamps: true });

// Middleware 'pre' de Mongoose: Se ejecuta ANTES de que un documento 'usuario' se guarde
usuarioSchema.pre('save', async function(next) {
    // 'this' se refiere al documento de usuario que se está guardando
    
    // Solo hasheamos la contraseña si ha sido modificada (o es nueva)
    // Esto evita re-hashear una contraseña ya hasheada si el usuario solo actualiza otros datos
    if (this.isModified('password')) {
        // Generamos un 'salt' (una cadena aleatoria) para añadir seguridad al hash
        // El '10' es el costo (número de rondas de hashing), un valor estándar y seguro
        const salt = await bcrypt.genSalt(10); 
        
        // Hasheamos la contraseña original y la reemplazamos con su versión hasheada
        this.password = await bcrypt.hash(this.password, salt);
    }
    
    next(); // Continúa con el proceso de guardado (guarda el usuario en la base de datos)
});

// Método personalizado para comparar una contraseña ingresada con la contraseña hasheada en la BD
usuarioSchema.methods.comparePassword = async function(candidatePassword) {
    // 'candidatePassword' es la contraseña que el usuario intentó ingresar
    // 'this.password' es la contraseña hasheada que está guardada en la base de datos
    
    // bcrypt.compare() compara la contraseña de texto plano con el hash de forma segura
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema);