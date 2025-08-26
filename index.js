require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Configuración de Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('❌ Error: No se encontró GEMINI_API_KEY en las variables de entorno');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // Modelo más nuevo y económico

// Prompt del sistema para Gemini (optimizado)
const SYSTEM_PROMPT = `Eres un asistente amigable y natural que ayuda con información sobre pagos y productos digitales. Responde en español de forma conversacional, amable y BREVE.
(SI EN LOS ANTERIRES MENSAJES YA SALUDASTE NO SALUDES)
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

� Precios de robux:
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

// Iniciar cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('Escanea este QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ Bot conectado a WhatsApp!');
});

// Sistema de debounce para esperar múltiples mensajes
const userTimers = new Map(); // Para almacenar timers por usuario
const WAIT_TIME = 4000; // 4 segundos de espera

// Función para procesar mensajes con contexto completo
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
        
        // Enviar al webhook
        sendToWebhook(userId, {
            userMessages: userMessages.map(m => m.body),
            combined: combinedMessage,
            geminiResponse: geminiResponse,
            context: contextHistory
        });
        
    } catch (error) {
        console.error('❌ Error procesando mensajes:', error);
    }
}

// Función para obtener respuesta de Gemini
async function getGeminiResponse(userMessage, previousUserMessages = []) {
    try {
        // Construir el contexto con mensajes anteriores del usuario solamente
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

// Responder automáticamente con debounce
client.on('message', async msg => {
    console.log(`📩 Mensaje recibido: ${msg.body}`);

    // Obtener el chat donde se recibió el mensaje
    const chat = await msg.getChat();

    // Solo procesar mensajes de chats individuales (no grupos ni canales)
    if (!chat.isGroup) {
        console.log('✅ Mensaje de chat individual - procesando...');
    } else {
        console.log('❌ Mensaje de grupo/canal - ignorando...');
        return; // Salir sin procesar el mensaje
    }

    const userId = msg.from;
    
    // Cancelar timer anterior si existe
    if (userTimers.has(userId)) {
        clearTimeout(userTimers.get(userId));
        console.log('⏱️ Cancelando timer anterior - esperando más mensajes...');
    }
    
    // Crear nuevo timer para esperar más mensajes
    const timer = setTimeout(async () => {
        console.log('⌛ Tiempo de espera terminado - procesando mensajes...');
        userTimers.delete(userId);
        await processUserMessages(chat, userId);
    }, WAIT_TIME);
    
    userTimers.set(userId, timer);
    console.log(`⏳ Esperando ${WAIT_TIME/1000} segundos por más mensajes...`);
});

client.initialize();

// --- Servidor para el webhook ---
const app = express();
app.use(bodyParser.json());

function sendToWebhook(from, body) {
    // Aquí podrías mandar con fetch o axios
    console.log(`📤 Enviando al webhook: ${from} -> ${body}`);
}

app.post('/webhook', (req, res) => {
    const { number, message } = req.body;
    client.sendMessage(number, message);
    res.send({ status: 'ok' });
});

app.listen(3000, () => {
    console.log('🌐 Servidor webhook corriendo en http://localhost:3000');
});
