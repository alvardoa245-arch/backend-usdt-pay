const express = require('express');
const cors = require('cors');
const TronWeb = require('tronweb');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de TronWeb para el servidor utilizando la variable de entorno segura de Render
const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: process.env.PRIVATE_KEY
});

const USDT_CONTRACT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // USDT TRC20 Mainnet
const WALLET_DESTINO = "TLaWm1eHRzZ7cR8m8xaRBjhmXJKmc6Mree"; // Tu billetera receptora

app.post('/api/procesar-pago', async (req, res) => {
    try {
        const { userAddress, monto, mensaje, firma } = req.body;

        if (!userAddress || !monto || !mensaje || !firma) {
            return res.status(400).json({ success: false, error: "Faltan datos en la solicitud." });
        }

        // 1. Verificar criptográficamente que la firma pertenezca al usuario
        const mensajeHex = tronWeb.toHex(mensaje);
        const direccionRecuperada = await tronWeb.trx.verifyMessage(mensajeHex, firma);

        if (direccionRecuperada.toLowerCase() !== userAddress.toLowerCase()) {
            return res.status(400).json({ success: false, error: "La firma digital no es válida." });
        }

        console.log(`Firma verificada con éxito para el usuario: ${userAddress}`);

        // 2. Ejecutar la transferencia de USDT TRC20 hacia tu billetera destino desde el servidor
        const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
        const montoEnSun = Math.floor(parseFloat(monto) * 1000000); // Conversión a unidades Sun (6 decimales)

        const txHash = await contract.transfer(
            WALLET_DESTINO,
            montoEnSun
        ).send({
            feeLimit: 100000000 // Límite de energía/gas cubierto por el servidor
        });

        console.log(`¡Transferencia ejecutada con éxito! Hash: ${txHash}`);
        res.json({ success: true, txHash: txHash });

    } catch (error) {
        console.error("Error al procesar el pago en el servidor:", error);
        res.status(500).json({ success: false, error: error.message || "Error interno en el servidor." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend de pagos TRON corriendo en el puerto ${PORT}`);
});
