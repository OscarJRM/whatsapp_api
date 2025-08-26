module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>WhatsApp Bot Dashboard</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                padding: 20px;
            }
            
            .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 2.5em;
                margin-bottom: 10px;
                font-weight: 600;
            }
            
            .header p {
                opacity: 0.9;
                font-size: 1.1em;
            }
            
            .content {
                padding: 30px;
            }
            
            .status-card {
                background: #f8f9fa;
                border-radius: 15px;
                padding: 25px;
                margin-bottom: 25px;
                border-left: 5px solid #25D366;
            }
            
            .status-indicator {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                font-size: 1.2em;
                font-weight: 600;
                margin-bottom: 10px;
            }
            
            .status-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #dc3545;
                animation: pulse 2s infinite;
            }
            
            .status-dot.connected {
                background: #25D366;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            
            .qr-section {
                text-align: center;
                margin: 30px 0;
                padding: 30px;
                background: #f8f9fa;
                border-radius: 15px;
            }
            
            .qr-code {
                background: white;
                padding: 20px;
                border-radius: 10px;
                display: inline-block;
                margin: 20px 0;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            }
            
            .logs-section {
                background: #2d3748;
                color: #e2e8f0;
                border-radius: 15px;
                padding: 25px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .logs-header {
                color: #63b3ed;
                font-weight: bold;
                margin-bottom: 15px;
                font-size: 16px;
            }
            
            .log-line {
                margin: 5px 0;
                padding: 5px 0;
                border-bottom: 1px solid #4a5568;
            }
            
            .log-time {
                color: #9ca3af;
                margin-right: 10px;
            }
            
            .log-message {
                color: #e2e8f0;
            }
            
            .btn {
                background: #25D366;
                color: white;
                border: none;
                padding: 12px 25px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                margin: 10px;
            }
            
            .btn:hover {
                background: #128C7E;
                transform: translateY(-2px);
            }
            
            .btn:disabled {
                background: #9ca3af;
                cursor: not-allowed;
                transform: none;
            }
            
            .loading {
                display: inline-block;
                width: 20px;
                height: 20px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #25D366;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-right: 10px;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .hidden {
                display: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🤖 WhatsApp Bot</h1>
                <p>Dashboard de control y monitoreo</p>
            </div>
            
            <div class="content">
                <div class="status-card">
                    <div class="status-indicator">
                        <span class="status-dot" id="statusDot"></span>
                        <span id="statusText">Verificando estado...</span>
                    </div>
                    <p id="statusDesc">Conectando con el servidor...</p>
                </div>
                
                <div class="qr-section" id="qrSection">
                    <h3>📱 Código QR de WhatsApp</h3>
                    <p>Escanea este código con tu WhatsApp para conectar el bot</p>
                    <div class="qr-code" id="qrCode">
                        <div class="loading"></div>
                        Generando código QR...
                    </div>
                    <button class="btn" onclick="refreshQR()">🔄 Actualizar QR</button>
                </div>
                
                <div class="logs-section">
                    <div class="logs-header">📋 Logs del Sistema</div>
                    <div id="logs">
                        <div class="log-line">
                            <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
                            <span class="log-message">🚀 Dashboard iniciado</span>
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button class="btn" onclick="checkStatus()">🔍 Verificar Estado</button>
                    <button class="btn" onclick="clearLogs()">🗑️ Limpiar Logs</button>
                </div>
            </div>
        </div>
        
        <script>
            let logs = [];
            let isConnected = false;
            
            function addLog(message, type = 'info') {
                const now = new Date();
                const timeStr = now.toLocaleTimeString();
                logs.push({ time: timeStr, message, type });
                
                const logsContainer = document.getElementById('logs');
                const logLine = document.createElement('div');
                logLine.className = 'log-line';
                logLine.innerHTML = \`
                    <span class="log-time">[\${timeStr}]</span>
                    <span class="log-message">\${message}</span>
                \`;
                logsContainer.appendChild(logLine);
                logsContainer.scrollTop = logsContainer.scrollHeight;
                
                // Mantener solo los últimos 50 logs
                if (logs.length > 50) {
                    logs.shift();
                    logsContainer.removeChild(logsContainer.firstChild);
                }
            }
            
            async function checkStatus() {
                try {
                    addLog('🔍 Verificando estado del bot...');
                    const response = await fetch('/api/status');
                    const data = await response.json();
                    
                    const statusDot = document.getElementById('statusDot');
                    const statusText = document.getElementById('statusText');
                    const statusDesc = document.getElementById('statusDesc');
                    
                    if (data.clientReady) {
                        statusDot.classList.add('connected');
                        statusText.textContent = 'Bot Conectado ✅';
                        statusDesc.textContent = 'WhatsApp está conectado y funcionando correctamente';
                        isConnected = true;
                        document.getElementById('qrSection').classList.add('hidden');
                        addLog('✅ Bot conectado exitosamente');
                    } else {
                        statusDot.classList.remove('connected');
                        statusText.textContent = 'Bot Desconectado ❌';
                        statusDesc.textContent = 'Esperando conexión de WhatsApp. Escanea el código QR.';
                        isConnected = false;
                        document.getElementById('qrSection').classList.remove('hidden');
                        addLog('⏳ Bot esperando conexión de WhatsApp');
                        await getQRCode();
                    }
                } catch (error) {
                    addLog('❌ Error verificando estado: ' + error.message);
                }
            }
            
            async function getQRCode() {
                try {
                    addLog('📱 Obteniendo código QR...');
                    const response = await fetch('/api/qr');
                    const data = await response.json();
                    
                    const qrCode = document.getElementById('qrCode');
                    if (data.qr) {
                        qrCode.innerHTML = \`<pre style="font-size: 8px; line-height: 8px;">\${data.qr}</pre>\`;
                        addLog('✅ Código QR generado');
                    } else {
                        qrCode.innerHTML = 'Código QR no disponible. Verifica el estado del bot.';
                        addLog('⚠️ No se pudo obtener el código QR');
                    }
                } catch (error) {
                    addLog('❌ Error obteniendo QR: ' + error.message);
                }
            }
            
            function refreshQR() {
                addLog('🔄 Actualizando código QR...');
                getQRCode();
            }
            
            function clearLogs() {
                logs = [];
                document.getElementById('logs').innerHTML = '';
                addLog('🗑️ Logs limpiados');
            }
            
            // Auto-actualizar estado cada 10 segundos
            setInterval(checkStatus, 10000);
            
            // Verificar estado inicial
            checkStatus();
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
};
