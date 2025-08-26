# WhatsApp Bot API

Bot de WhatsApp con integración de Google Gemini para responder consultas sobre pagos y productos digitales.

## � Estructura del proyecto

```
whatsapp_api/
├── index.js           # 🖥️  Desarrollo local
├── api/               # ☁️  Funciones serverless (Vercel)
│   ├── index.js       #     Dashboard web
│   ├── whatsapp.js    #     Bot principal
│   ├── webhook.js     #     API webhook
│   ├── status.js      #     Estado del bot
│   └── qr.js          #     Código QR
├── vercel.json        # ⚙️  Configuración Vercel
└── package.json       # 📦 Dependencias
```

## 🚀 Uso del proyecto

### 🖥️ **Desarrollo Local:**
```bash
npm install
npm run dev
# El bot corre en http://localhost:3000
```

### ☁️ **Producción (Vercel):**
1. Deploy a Vercel
2. Configura `GEMINI_API_KEY` en variables de entorno
3. Visita tu URL de Vercel para el dashboard

## 📱 Dashboard Web

El dashboard está disponible en la ruta principal `/` y incluye:

- 🟢 **Estado del bot** (conectado/desconectado)
- 📱 **Código QR** para escanear con WhatsApp
- 📋 **Logs en tiempo real** del sistema
- 🔄 **Auto-actualización** cada 10 segundos

### 🎯 **Características:**
- **Responsive design** para móviles y desktop
- **QR real** generado por WhatsApp Web
- **Estado persistente** del bot
- **Interfaz moderna** con animaciones

## 📡 API Endpoints

### `GET /`
Dashboard web principal

### `GET /api/status`
```json
{
  "clientReady": true,
  "lastActivity": "2025-08-26T10:30:00Z",
  "uptime": 1234,
  "logs": [...],
  "version": "1.0.0"
}
```

### `GET /api/qr`
```json
{
  "qr": "ASCII QR code...",
  "expiration": "2025-08-26T10:35:00Z",
  "status": "available",
  "isReal": true
}
```

### `POST /webhook`
```json
{
  "number": "123456789@c.us",
  "message": "Hola desde la API"
}
```

## 🤖 Configuración del Bot

### **Información que maneja:**
- 🏦 **Cuentas bancarias** (Pichincha, Guayaquil)
- 🎮 **Precios Robux** (80-2200 robux)
- 💎 **Precios Free Fire** (100-500 diamantes)
- 👋 **Conversación básica** (saludos, agradecimientos)

### **Características técnicas:**
- ⏱️ **Debounce**: 4 segundos para múltiples mensajes
- 🧠 **IA**: Gemini 2.0 Flash (económico)
- 📝 **Contexto**: Últimos 5 mensajes del usuario
- 🚫 **Filtros**: Solo chats individuales, no grupos

## ⚙️ Variables de entorno

```env
GEMINI_API_KEY=tu_api_key_de_gemini
```

## � Configuración de Vercel

El proyecto está optimizado para Vercel con:
- **Funciones serverless** separadas
- **Timeouts configurados** (10-30 segundos)
- **Rutas optimizadas** para cada endpoint
- **Variables de entorno** seguras

## ⚠️ Notas importantes

1. **WhatsApp Web**: Requiere escanear QR la primera vez
2. **Serverless**: Puede haber cold starts en Vercel
3. **Persistencia**: Los datos se mantienen en memoria temporal
4. **Desarrollo vs Producción**: Dos entornos separados
