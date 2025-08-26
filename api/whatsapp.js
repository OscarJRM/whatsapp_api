const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Variables globales para mantener el estado
let client = null;
let isClientReady = false;
let currentQR = null;

// Configuración de Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Prompt del sistema (copiado del index.js original)
const SYSTEM_PROMPT = `Eres un asistente amigable y natural que ayuda con información sobre pagos y productos digitales. Responde en español de forma conversacional, amable y BREVE.
(SI EN LOS ANTERIORES MENSAJES YA SALUDASTE NO SALUDES)
SI PUEDES RESPONDE CON SALTOS DE LINEA, PARA QUE NO SE VEA UN MENSAJE MUY LARGO.
⚡ IMPORTANTE: Mantén tus respuestas cortas, máximo 2-3 líneas. Sé directo pero amigable.

🤖 Puedes responder a:
- Saludos básicos (hola, buenos días, etc.) de forma amigable
- Preguntas sobre números de cuenta para pagos
- Consultas sobre precios de robux y diamantes de Free Fire
- Agradecimientos de forma cordial

📋 Información disponible:

🟡 Banco Pichincha:  
Cuenta de ahorros - Oscar Ramirez  
N.º de cuenta: 2208577366

🟣 Banco Guayaquil:  
Cuenta de ahorros - Oscar Ramírez  
N.º de cuenta: 0013645218

🧾 Cédula: 1850210004

🎮 Precios de robux:
🟢 80 robux: $1,50  
🟢 450 robux: $6,00
🟢 500 robux: $6,00  
🟢 1000 robux: $11,00  
🟢 2200 robux: $22,00

💎 Precios de Free Fire:
💎 100 diamantes: $1.25
💎 300 diamantes: $3.50
💎 500 diamantes: $6.00

🗣️ Responde de forma natural y amigable pero SIEMPRE BREVE. Máximo 2-3 líneas. Sé directo.
`;

// Sistema de timers para usuarios
const userTimers = new Map();
const WAIT_TIME = 4000;

// Función para verificar relevancia (del index.js original)
function isRelevantMessage(message) {
    const relevantKeywords = [
        'cuenta', 'numero', 'pago', 'transferencia', 'deposito', 
        'pichincha', 'guayaquil', 'banco', 'cedula', 'oscar',
        'robux', 'diamante', 'free fire', 'precio', 'costo',
        'hola', 'buenos', 'gracias', 'info', 'informacion',
        'cuanto', 'vale', 'como', 'donde', 'cuando'
    ];
    
    const messageWords = message.toLowerCase();
    return relevantKeywords.some(keyword => messageWords.includes(keyword));
}

// Función para obtener respuesta de Gemini
async function getGeminiResponse(userMessage, previousUserMessages = []) {
    try {
        let contextMessage = SYSTEM_PROMPT + '\n\n';
        
        if (previousUserMessages.length > 0) {
            contextMessage += 'Mensajes anteriores del usuario:\n';
            previousUserMessages.forEach((msg, index) => {
                contextMessage += `${index + 1}. ${msg}\n`;
            });
            contextMessage += '\n';
        }
        
        contextMessage += `Mensaje actual del usuario: ${userMessage}\n\nTu respuesta:`;
        
        const result = await model.generateContent(contextMessage);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('❌ Error al consultar Gemini:', error);
        return null;
    }
}

// Función para procesar mensajes (del index.js original)
async function processUserMessages(chat, userId) {
    try {
        // Obtener los últimos 7 mensajes para mejor contexto
        const messages = await chat.fetchMessages({ limit: 7 });
        
        // Filtrar solo mensajes del usuario (sin respuestas del bot)
        const userMessages = messages
            .filter(m => m.from === userId)
            .slice(0, 5) // Máximo 5 mensajes del usuario
            .reverse(); // Orden cronológico
        
        if (userMessages.length === 0) return;
        
        console.log(`📥 Procesando ${userMessages.length} mensajes del usuario:`);
        userMessages.forEach((m, i) => {
            console.log(`${i + 1}. "${m.body}"`);
        });
        
        // Combinar todos los mensajes del usuario en uno solo
        const combinedMessage = userMessages.map(m => m.body).join(' ');
        
        // Verificar si al menos uno de los mensajes es relevante
        const isRelevant = userMessages.some(m => isRelevantMessage(m.body));
        
        if (!isRelevant) {
            console.log('🔇 Ningún mensaje es relevante - no consultando Gemini');
            return;
        }
        
        // Preparar historial para contexto (solo mensajes del usuario, no del bot)
        const contextHistory = messages
            .filter(m => m.from === userId && !userMessages.some(um => um.id._serialized === m.id._serialized))
            .map(m => m.body)
            .reverse()
            .slice(0, 3); // Solo 3 mensajes anteriores del usuario
        
        // Obtener respuesta de Gemini
        console.log('🤖 Consultando Gemini con contexto completo...');
        const geminiResponse = await getGeminiResponse(combinedMessage, contextHistory);
        
        if (geminiResponse && geminiResponse.trim() !== '') {
            console.log(`✅ Respuesta de Gemini: ${geminiResponse}`);
            // Enviar mensaje normal sin citar/responder al mensaje original
            await chat.sendMessage(geminiResponse);
        } else {
            console.log('🔇 Gemini no generó respuesta (probablemente fuera del tema)');
        }
        
    } catch (error) {
        console.error('❌ Error procesando mensajes:', error);
    }
}

// Inicializar cliente WhatsApp
function initializeWhatsApp() {
    if (client) return client;
    
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: '/tmp/.wwebjs_auth'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('QR Code generado - disponible en /api/qr');
        currentQR = qr; // Guardamos el QR real para el dashboard
    });

    client.on('ready', () => {
        console.log('✅ Bot conectado a WhatsApp!');
        isClientReady = true;
    });

    client.on('message', async msg => {
        console.log(`📩 Mensaje: ${msg.body}`);

        const chat = await msg.getChat();
        if (chat.isGroup) return;

        const userId = msg.from;
        
        if (userTimers.has(userId)) {
            clearTimeout(userTimers.get(userId));
        }
        
        const timer = setTimeout(async () => {
            userTimers.delete(userId);
            await processUserMessages(chat, userId);
        }, WAIT_TIME);
        
        userTimers.set(userId, timer);
    });

    client.initialize();
    return client;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Inicializar WhatsApp si no está iniciado
        if (!client) {
            initializeWhatsApp();
        }

        if (req.method === 'GET') {
            return res.json({
                status: 'ok',
                message: 'WhatsApp Bot API corriendo',
                clientReady: isClientReady,
                timestamp: new Date().toISOString()
            });
        }

        return res.status(405).json({ error: 'Método no permitido' });
        
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
};
