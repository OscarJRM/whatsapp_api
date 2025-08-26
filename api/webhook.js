const { Client } = require('whatsapp-web.js');

// Referencia al cliente global (esto debe ser manejado de manera más robusta en producción)
let globalClient = null;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Solo se permite POST' });
    }

    try {
        const { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({ 
                error: 'Faltan parámetros requeridos: number, message' 
            });
        }

        // Aquí deberías tener una referencia al cliente de WhatsApp
        // En un ambiente serverless, esto es más complejo de manejar
        console.log(`📤 Webhook: ${number} -> ${message}`);

        return res.json({ 
            status: 'ok', 
            message: 'Webhook procesado',
            data: { number, message },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en webhook:', error);
        return res.status(500).json({ 
            error: 'Error procesando webhook',
            details: error.message 
        });
    }
};
