// Estado global del bot (en producción usarías una base de datos)
let botStatus = {
    isReady: false,
    lastActivity: null,
    qrCode: null,
    logs: []
};

// Función para agregar logs
function addLog(message) {
    const log = {
        timestamp: new Date().toISOString(),
        message: message
    };
    botStatus.logs.push(log);
    
    // Mantener solo los últimos 100 logs
    if (botStatus.logs.length > 100) {
        botStatus.logs.shift();
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
        // Simulación del estado del bot (en producción esto vendría del cliente real)
        const status = {
            clientReady: botStatus.isReady,
            lastActivity: botStatus.lastActivity,
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            logs: botStatus.logs.slice(-10), // Últimos 10 logs
            version: '1.0.0'
        };

        addLog('Estado consultado desde el dashboard');
        
        return res.json(status);

    } catch (error) {
        console.error('Error obteniendo estado:', error);
        return res.status(500).json({ 
            error: 'Error obteniendo estado del bot',
            details: error.message 
        });
    }
};
