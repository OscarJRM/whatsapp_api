const qrcode = require('qrcode-terminal');

// Importar el QR actual del bot (esto requiere una mejor arquitectura en producción)
let currentQR = null;
let qrExpiration = null;

// Función para obtener el QR del cliente de WhatsApp
function getRealQR() {
    // En un entorno serverless real, esto sería más complejo
    // Por ahora, usamos el QR almacenado globalmente
    try {
        // Aquí deberíamos obtener el QR real del cliente de WhatsApp
        // pero en serverless es complicado mantener el estado
        return currentQR;
    } catch (error) {
        return null;
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Intentar obtener el QR real primero
        const realQR = getRealQR();
        
        if (realQR) {
            // Convertir el QR a ASCII para mostrar en el dashboard
            let qrText = '';
            try {
                // Generar QR en formato ASCII
                qrText = await new Promise((resolve, reject) => {
                    const output = [];
                    const originalLog = console.log;
                    console.log = (data) => output.push(data);
                    
                    qrcode.generate(realQR, { small: true }, (qr) => {
                        console.log = originalLog;
                        resolve(output.join('\n') + '\n\nEscanea este código con WhatsApp');
                    });
                });
                
                currentQR = qrText;
                qrExpiration = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
                
            } catch (error) {
                console.error('Error generando QR ASCII:', error);
                currentQR = generateQRText('sample-data');
            }
        } else {
            // Si no hay QR real, usar uno simulado
            if (!currentQR || (qrExpiration && new Date() > qrExpiration)) {
                currentQR = generateQRText('sample-data');
                qrExpiration = new Date(Date.now() + 5 * 60 * 1000);
            }
        }

        return res.json({
            qr: currentQR,
            expiration: qrExpiration,
            timestamp: new Date().toISOString(),
            status: currentQR ? 'available' : 'generating',
            isReal: !!realQR
        });

    } catch (error) {
        console.error('Error obteniendo QR:', error);
        return res.status(500).json({ 
            error: 'Error obteniendo código QR',
            details: error.message 
        });
    }
};

function generateQRText(data) {
    // Simulación de un código QR en ASCII
    // En producción, esto sería el QR real de WhatsApp
    return `
██████████████    ██    ██████████████
██          ██  ██  ██  ██          ██
██  ██████  ██    ██    ██  ██████  ██
██  ██████  ██  ████    ██  ██████  ██
██  ██████  ██    ██    ██  ██████  ██
██          ██████████  ██          ██
██████████████  ██  ██  ██████████████
                ████                  
██  ██    ██████    ██    ████  ██  ██
    ██████      ██████████      ██████
██    ██    ████      ████  ██    ████
████      ██████████████    ██████    
  ██  ██████  ██    ██████████      ██
                ████                  
██████████████    ██████  ██  ██  ████
██          ██████  ██████████████  ██
██  ██████  ██  ██      ██    ████  ██
██  ██████  ██████████    ██████████  
██  ██████  ██    ██  ██████  ██    ██
██          ██  ████  ██    ██████████
██████████████    ██████  ████      ██

Escanea este código con WhatsApp
Código válido por 5 minutos
`;
}
