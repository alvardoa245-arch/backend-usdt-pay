const express = require('express');
const cors = require('cors');
const TronWeb = require('tronweb');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de TronWeb para el servidor
// NOTA: En Render, lo ideal es configurar esta clave privada como una Variable de Entorno (Environment Variable)
// llamada PRIVATE_KEY, para mayor seguridad.
const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: process.env.PRIVATE_KEY  
});
