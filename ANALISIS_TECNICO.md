# 📊 Análisis Profundo de AutoBOT - Sistema Multi-Tenant de WhatsApp AI

## 🎯 Resumen Ejecutivo

**AutoBOT** es una plataforma multi-tenant completa que permite a múltiples usuarios gestionar bots de WhatsApp con inteligencia artificial. El sistema combina:

- **Backend Node.js** con arquitectura multi-sesión
- **Frontend React** con dashboard administrativo
- **Base de datos SQLite** con Prisma ORM
- **Integración OpenAI** para respuestas inteligentes (GPT-4o Vision + Whisper)
- **WhatsApp Web** mediante Baileys
- **Sistema CRM** integrado para gestión de clientes

---

## 🏗️ Arquitectura General

### Stack Tecnológico

```mermaid
graph TB
    subgraph Frontend
        A[React + Vite]
        B[TailwindCSS]
        C[Socket.IO Client]
        D[React Router]
    end
    
    subgraph Backend
        E[Express.js]
        F[Socket.IO Server]
        G[Prisma ORM]
        H[Baileys WhatsApp]
    end
    
    subgraph Servicios
        I[OpenAI API]
        J[Whisper STT]
        K[GPT-4o Vision]
    end
    
    subgraph Datos
        L[(SQLite DB)]
        M[Auth Sessions]
        N[Media Uploads]
    end
    
    A --> E
    C --> F
    E --> G
    G --> L
    E --> H
    H --> I
    H --> J
    H --> K
    E --> M
    E --> N
```

---

## 📂 Estructura del Proyecto

```
whatsapp-ai-bot/
├── server/                      # Backend Node.js
│   ├── src/
│   │   ├── config/
│   │   │   └── env.js          # Configuración de variables de entorno
│   │   ├── controllers/
│   │   │   └── api.controller.js    # Controladores de API REST
│   │   ├── middleware/
│   │   │   └── auth.middleware.js   # Middleware de autenticación JWT
│   │   ├── routes/
│   │   │   └── api.routes.js        # Definición de rutas
│   │   └── services/
│   │       ├── auth.service.js      # Gestión de usuarios y autenticación
│   │       ├── session.manager.js   # Gestor multi-sesión de WhatsApp
│   │       ├── whatsapp.service.js  # Lógica de WhatsApp (Baileys)
│   │       ├── openai.service.js    # Integración con OpenAI
│   │       ├── store.service.js     # Persistencia de datos
│   │       ├── client.service.js    # CRM de clientes
│   │       ├── cleanup.service.js   # Limpieza automática de datos
│   │       └── db.service.js        # Cliente Prisma
│   ├── prisma/
│   │   └── schema.prisma       # Esquema de base de datos
│   ├── uploads/                # Archivos multimedia
│   └── index.js                # Punto de entrada del servidor
│
├── client/                     # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatViewer.jsx       # Visor de conversaciones
│   │   │   ├── ConfigForm.jsx       # Formulario de configuración
│   │   │   ├── BroadcastModal.jsx   # Modal de difusión masiva
│   │   │   ├── ConnectionCard.jsx   # Tarjeta de estado de conexión
│   │   │   └── QRDisplay.jsx        # Visualizador de código QR
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # Página de login
│   │   │   ├── DashboardPage.jsx    # Dashboard principal
│   │   │   ├── AdminPage.jsx        # Panel de administración
│   │   │   └── ClientsPage.jsx      # Gestión de clientes CRM
│   │   ├── contexts/
│   │   │   └── AuthProvider.jsx     # Contexto de autenticación
│   │   └── App.jsx             # Componente raíz
│
├── sessions/                   # Sesiones de WhatsApp por usuario
│   └── [userId]/
│       └── auth_info/          # Credenciales de WhatsApp
│
├── docker-compose.yml          # Configuración Docker
└── package.json                # Dependencias del proyecto
```

---

## 🔐 Sistema de Autenticación Multi-Tenant

### Modelo de Datos (Prisma Schema)

El sistema utiliza **4 modelos principales**:

#### 1. **User** - Usuarios del sistema
```prisma
model User {
  id           String    @id @default(uuid())
  username     String    @unique
  passwordHash String
  role         String    @default("user")  // 'admin' o 'user'
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  bot          Bot?      // Relación 1:1 con Bot
}
```

**Funcionalidad:**
- Cada usuario tiene credenciales únicas
- Roles: `admin` (puede gestionar usuarios) y `user` (solo su bot)
- El primer usuario registrado se convierte automáticamente en admin
- Contraseñas hasheadas con bcrypt (10 salt rounds)

#### 2. **Bot** - Instancia de WhatsApp por usuario
```prisma
model Bot {
  id                String    @id @default(uuid())
  userId            String    @unique
  config            String    @default("{}")  // JSON con configuración
  silencedChats     String    @default("[]")  // Chats en modo manual
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  messages          Message[]
  reminders         Reminder[]
  clients           Client[]
}
```

**Funcionalidad:**
- Un bot por usuario (relación 1:1)
- Configuración personalizada (API keys, prompts, parámetros)
- Gestión de chats silenciados (handoff humano)

#### 3. **Message** - Historial de conversaciones
```prisma
model Message {
  id          Int      @id @default(autoincrement())
  botId       String
  chatId      String   // Número de WhatsApp
  role        String   // 'user' o 'assistant'
  content     String
  timestamp   DateTime @default(now())
  isBroadcast Boolean  @default(false)
  isReminder  Boolean  @default(false)
  isManual    Boolean  @default(false)  // Mensaje del operador
  status      String   @default("SENT") // SENT, DELIVERED, READ
  whatsappId  String?  // ID de Baileys
  
  // Soporte multimedia
  hasMedia    Boolean  @default(false)
  mediaUrl    String?  // /uploads/filename.jpg
  mediaType   String?  // 'image', 'audio', 'video', 'document'
}
```

**Funcionalidad:**
- Almacena todo el historial de conversaciones
- Seguimiento de estado de mensajes (ticks de WhatsApp)
- Soporte para imágenes, audios, videos y documentos
- Diferencia entre mensajes automáticos, manuales, broadcasts y recordatorios

#### 4. **Client** - CRM de contactos
```prisma
model Client {
  id              String    @id @default(uuid())
  chatId          String    // Número de WhatsApp
  name            String?
  profilePicUrl   String?
  status          String    @default("LEAD")  // LEAD, CUSTOMER, ARCHIVED, BLOCKED
  notes           String?
  tags            String    @default("[]")
  lastBroadcastAt DateTime?
  isBotPaused     Boolean   @default(false)  // Modo manual activado
  
  botId           String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

**Funcionalidad:**
- Sistema CRM integrado
- Estados de cliente: Lead, Customer, Archived, Blocked
- Etiquetas personalizables
- Control de pausado del bot por cliente
- Tracking de última difusión enviada

#### 5. **Reminder** - Recordatorios programados
```prisma
model Reminder {
  id             String   @id @default(uuid())
  botId          String
  chatId         String
  dueDate        DateTime
  recurrenceDays Int?     // Repetición cada X días
  createdAt      DateTime @default(now())
}
```

**Funcionalidad:**
- Recordatorios de pago programables
- Soporte para recurrencia (30, 60, 90 días)
- Scheduler que verifica cada minuto

---

## 🔄 Flujo de Autenticación

### 1. Registro de Usuario

```javascript
// auth.service.js - register()
async register(username, password, role = 'user') {
    // 1. Verificar si el registro está habilitado
    const userCount = await prisma.user.count();
    if (userCount > 0 && !settings.allowRegistration) {
        throw new Error('Public registration is currently disabled.');
    }
    
    // 2. Verificar usuario existente
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) throw new Error('User already exists');
    
    // 3. Hashear contraseña
    const passwordHash = await bcrypt.hash(password, 10);
    
    // 4. Auto-asignar admin al primer usuario
    const finalRole = userCount === 0 ? 'admin' : role;
    
    // 5. Crear usuario
    const newUser = await prisma.user.create({
        data: { username, passwordHash, role: finalRole }
    });
    
    return { id: newUser.id, username: newUser.username, role: newUser.role };
}
```

### 2. Login y Generación de JWT

```javascript
// auth.service.js - login()
async login(username, password) {
    // 1. Buscar usuario
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw new Error('Invalid credentials');
    
    // 2. Verificar contraseña
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new Error('Invalid credentials');
    
    // 3. Generar JWT (válido por 7 días)
    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
    
    return { token, user: { id: user.id, username: user.username, role: user.role } };
}
```

### 3. Middleware de Autenticación

```javascript
// auth.middleware.js
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    
    const token = authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;  // { id, username, role }
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};
```

### 4. Autenticación de WebSocket

```javascript
// session.manager.js - init()
this.io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded;  // Adjuntar usuario al socket
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});
```

---

## 🤖 Sistema Multi-Sesión de WhatsApp

### SessionManager - Gestor de Sesiones

El **SessionManager** es el núcleo del sistema multi-tenant. Gestiona múltiples instancias de WhatsApp simultáneamente.

```javascript
class SessionManager {
    constructor() {
        this.sessions = new Map();           // userId -> WhatsAppService
        this.initializingSessions = new Map(); // userId -> Promise (evita race conditions)
        this.io = null;                       // Socket.IO server
    }
}
```

#### Flujo de Inicio de Sesión

```mermaid
sequenceDiagram
    participant U as Usuario
    participant F as Frontend
    participant S as SessionManager
    participant W as WhatsAppService
    participant B as Baileys
    participant WA as WhatsApp Web
    
    U->>F: Login
    F->>S: Socket.connect(token)
    S->>S: Verificar JWT
    S->>S: socket.join(userId)
    S->>S: startSession(userId)
    
    alt Sesión no existe
        S->>W: new WhatsAppService(userId)
        W->>B: makeWASocket()
        B->>WA: Conectar
        WA-->>B: QR Code
        B-->>W: event: qr
        W-->>S: emitStatus('scantocan', qr)
        S-->>F: emit('qr', qrCode)
        F->>U: Mostrar QR
        
        U->>WA: Escanear QR
        WA-->>B: Autenticado
        B-->>W: event: connection.open
        W->>W: status = 'connected'
        W-->>S: emitStatus('connected')
        S-->>F: emit('status', 'connected')
        F->>U: Bot Conectado ✅
    else Sesión existe
        S->>W: getStatus()
        W-->>F: Enviar estado actual
    end
```

#### Código de Inicio de Sesión

```javascript
// session.manager.js - startSession()
async startSession(userId) {
    // 1. Verificar si ya existe
    if (this.sessions.has(userId)) {
        return this.sessions.get(userId);
    }
    
    // 2. Evitar inicializaciones duplicadas
    if (this.initializingSessions.has(userId)) {
        return this.initializingSessions.get(userId);
    }
    
    // 3. Crear promesa de inicialización
    const initPromise = (async () => {
        try {
            // Instanciar Store dedicado
            const userStore = new StoreService(userId);
            
            // Instanciar WhatsApp Service
            const userBot = new WhatsAppService(userId, userStore);
            
            // Inicializar conexión
            await userBot.init(this.io);
            
            // Guardar sesión activa
            this.sessions.set(userId, userBot);
            return userBot;
        } finally {
            // Limpiar lock de inicialización
            this.initializingSessions.delete(userId);
        }
    })();
    
    this.initializingSessions.set(userId, initPromise);
    return initPromise;
}
```

#### Restauración Automática de Sesiones

Al iniciar el servidor, todas las sesiones se restauran automáticamente:

```javascript
// session.manager.js - restoreSessions()
async restoreSessions() {
    const users = await authService.getAllUsers();
    for (const user of users) {
        // Iniciar en paralelo (no await)
        this.startSession(user.id).catch((err) => {
            console.error(`Failed to restore session for ${user.username}:`, err);
        });
    }
}
```

---

## 💬 WhatsAppService - Lógica del Bot

### Inicialización de Baileys

```javascript
// whatsapp.service.js - connectToWhatsApp()
async connectToWhatsApp() {
    // 1. Crear directorio de autenticación
    const authDir = `sessions/${this.userId}/auth_info`;
    await fsPromises.mkdir(authDir, { recursive: true });
    
    // 2. Cargar credenciales
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    // 3. Crear socket de WhatsApp
    this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        browser: ['WhatsApp AI Bot', 'Chrome', '1.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: true
    });
    
    // 4. Eventos
    this.sock.ev.on('connection.update', this.handleConnection);
    this.sock.ev.on('creds.update', saveCreds);
    this.sock.ev.on('messages.upsert', this.handleMessage);
    this.sock.ev.on('messages.update', this.handleMessageStatus);
}
```

### Manejo de Mensajes Entrantes

El flujo completo cuando llega un mensaje:

```javascript
// whatsapp.service.js - messages.upsert event
this.sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message) return;
    
    // ===== FILTROS =====
    
    // 1. Ignorar status broadcasts
    if (m.key.remoteJid === 'status@broadcast') return;
    
    // 2. Deduplicación (evitar procesar el mismo mensaje 2 veces)
    const messageId = m.key.id;
    if (this.processedMessages.has(messageId)) return;
    this.processedMessages.add(messageId);
    
    // ===== EXTRACCIÓN DE CONTENIDO =====
    
    let text = m.message.conversation || m.message.extendedTextMessage?.text;
    let mediaUrl = null;
    let mediaType = null;
    let imageBase64 = null;
    
    // Procesar imágenes
    if (m.message.imageMessage) {
        const buffer = await downloadMediaMessage(m, 'buffer', ...);
        const fileName = `${Date.now()}_${m.key.id}.jpg`;
        await fsPromises.writeFile(`uploads/${fileName}`, buffer);
        
        mediaUrl = `/uploads/${fileName}`;
        mediaType = 'image';
        imageBase64 = buffer.toString('base64');  // Para OpenAI Vision
        text = m.message.imageMessage.caption || 'Describe esta imagen';
    }
    
    // Procesar audios
    if (m.message.audioMessage && config.enableAudio) {
        const buffer = await downloadMediaMessage(m, 'buffer', ...);
        // Convertir OGG a MP3 con ffmpeg
        await convertAudio(buffer, inputPath, outputPath);
        // Transcribir con Whisper
        text = await openaiService.transcribeAudio(outputPath, config);
    }
    
    // ===== RESOLVER JID (LID vs Phone Number) =====
    
    let chatId = jidNormalizedUser(m.key.remoteJid);
    if (chatId.includes('@lid') && m.key.senderPn) {
        chatId = jidNormalizedUser(m.key.senderPn);
    }
    
    // ===== AUTO-CRM: REGISTRAR CLIENTE =====
    
    const contactName = m.pushName;
    const profilePicUrl = await this.sock.profilePictureUrl(chatId, 'image');
    await clientService.upsertClient(bot.id, chatId, contactName, profilePicUrl);
    
    // ===== COMANDOS ESPECIALES =====
    
    if (text === '!off') {
        await this.storeService.setSilence(chatId, true);
        await this.sock.sendMessage(chatId, { text: '🔇 Bot desactivado. Modo humano activado.' });
        return;
    }
    
    if (text === '!on') {
        await this.storeService.setSilence(chatId, false);
        await this.sock.sendMessage(chatId, { text: '🔊 Bot reactivado.' });
        return;
    }
    
    if (text.startsWith('!pay')) {
        const days = parseInt(text.split(' ')[1]);
        const dueDate = Date.now() + days * 24 * 60 * 60 * 1000;
        await this.storeService.addReminder(chatId, dueDate);
        await this.sock.sendMessage(chatId, { 
            text: `✅ Recordatorio de pago configurado para dentro de ${days} días.` 
        });
        return;
    }
    
    // ===== IGNORAR MENSAJES PROPIOS =====
    
    if (m.key.fromMe) return;
    
    // ===== VERIFICAR SI ESTÁ SILENCIADO =====
    
    const isSilenced = await this.storeService.isSilenced(chatId);
    
    // ===== RATE LIMITING =====
    
    if (config.enableRateLimit) {
        const userActivity = this.rateLimitMap.get(chatId) || { count: 0, startTime: Date.now() };
        if (Date.now() - userActivity.startTime > config.rateLimit.window * 1000) {
            userActivity.count = 1;
            userActivity.startTime = Date.now();
        } else {
            userActivity.count++;
        }
        this.rateLimitMap.set(chatId, userActivity);
        
        if (userActivity.count > config.rateLimit.max) {
            console.log(`Rate limit exceeded for ${chatId}`);
            return;
        }
    }
    
    // ===== HORARIO COMERCIAL =====
    
    if (config.businessHours?.enabled) {
        const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        const isWorkingHours = currentTime >= config.businessHours.start && currentTime <= config.businessHours.end;
        
        if (!isWorkingHours) {
            await this.sock.sendMessage(chatId, { text: config.businessHours.message });
            return;
        }
    }
    
    // ===== DETECCIÓN DE ENOJO (AUTO-SILENCE) =====
    
    if (config.enableAngerProtection) {
        const badWords = config.badWords || [];
        const detectedBadWord = badWords.find(word => text.toLowerCase().includes(word.toLowerCase()));
        const isYelling = text.length > 10 && text.replace(/[^A-Z]/g, '').length / text.length > 0.7;
        
        if (detectedBadWord || isYelling) {
            await this.storeService.setSilence(chatId, true);
            return;
        }
    }
    
    // ===== GUARDAR MENSAJE DEL USUARIO =====
    
    await this.sock.readMessages([m.key]);  // Marcar como leído (ticks azules)
    
    const userMsg = await this.storeService.addMessage(
        chatId, 'user', text, false, false, messageId, 'READ', false, mediaUrl, mediaType
    );
    this.emitNewMessage(userMsg);  // Enviar a frontend vía Socket.IO
    
    // ===== SI ESTÁ SILENCIADO, NO RESPONDER =====
    
    if (isSilenced) {
        console.log(`Chat ${chatId} is silenced. Skipping AI response.`);
        return;
    }
    
    // ===== GENERAR RESPUESTA DE IA =====
    
    await this.sock.sendPresenceUpdate('composing', chatId);  // "Escribiendo..."
    
    const limit = parseInt(config.memoryWindow) || 10;
    let history = await this.storeService.getHistory(chatId, limit);
    
    // Eliminar el último mensaje (ya lo pasaremos manualmente a OpenAI)
    if (history.length > 0 && history[history.length - 1].role === 'user') {
        history.pop();
    }
    
    // Delay natural (más largo para imágenes/audios)
    const delay = imageBase64 || audioMessage ? 1000 : Math.min(Math.max(text.length * 50, 1000), 3000);
    
    setTimeout(async () => {
        let response = '';
        let sentMsgId = null;
        
        try {
            // Llamar a OpenAI
            response = await openaiService.generateResponse(text, history, imageBase64, config, mimeType);
            if (!response) throw new Error('Empty response from OpenAI');
            
            // Simular escritura
            await this.sock.sendPresenceUpdate('composing', chatId);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Enviar respuesta
            const sentMsg = await this.sock.sendMessage(chatId, { text: response });
            sentMsgId = sentMsg?.key?.id;
            
        } catch (aiError) {
            console.error('CRITICAL AI FAILURE:', aiError);
            // Mensaje de fallback
            if (config.fallbackMessage) {
                response = config.fallbackMessage;
                const sentMsg = await this.sock.sendMessage(chatId, { text: response });
                sentMsgId = sentMsg?.key?.id;
            }
        } finally {
            await this.sock.sendPresenceUpdate('paused', chatId);
            
            // Guardar respuesta del bot
            if (response) {
                const assistantMsg = await this.storeService.addMessage(
                    chatId, 'assistant', response, false, false, sentMsgId, 'SENT'
                );
                this.emitNewMessage(assistantMsg);
            }
        }
    }, delay);
});
```

---

## 🧠 Integración con OpenAI

### Generación de Respuestas

```javascript
// openai.service.js - generateResponse()
async generateResponse(userMessage, history = [], imageBase64 = null, config = null, mimeType = 'image/jpeg') {
    const currentConfig = config || await storeService.getConfig();
    
    if (!currentConfig.openaiApiKey) {
        return '⚠️ Error: No se ha configurado la API Key de OpenAI.';
    }
    
    const openai = new OpenAI({ apiKey: currentConfig.openaiApiKey });
    
    // ===== CONSTRUIR SYSTEM PROMPT =====
    
    let systemMessageContent = currentConfig.systemPrompt;
    
    // Inyectar contexto de negocio
    if (currentConfig.businessContext) {
        systemMessageContent += `\n\n[BASE DE CONOCIMIENTO / INFORMACIÓN DE NEGOCIO]:\n${currentConfig.businessContext}\n\nUsa esta información para responder preguntas sobre productos, precios o servicios.`;
    }
    
    // ===== SANITIZAR HISTORIAL =====
    
    const sanitizedHistory = history.map(msg => ({
        role: msg.role,
        content: (msg.content && msg.content.trim() !== '') ? msg.content : '[Multimedia/Sin Texto]'
    }));
    
    const messages = [
        { role: 'system', content: systemMessageContent },
        ...sanitizedHistory
    ];
    
    // ===== VISION: IMÁGENES =====
    
    if (imageBase64 && currentConfig.enableVision) {
        messages.push({
            role: 'user',
            content: [
                { type: 'text', text: userMessage || '¿Qué hay en esta imagen?' },
                {
                    type: 'image_url',
                    image_url: {
                        url: `data:${mimeType};base64,${imageBase64}`
                    }
                }
            ]
        });
        
        const completion = await openai.chat.completions.create({
            messages: messages,
            model: 'gpt-4o',  // Forzar GPT-4o para visión
            temperature: parseFloat(currentConfig.temperature) || 0.7,
            max_tokens: parseInt(currentConfig.maxTokens) || 300
        });
        
        return completion.choices[0].message.content;
    }
    
    // ===== TEXTO ESTÁNDAR =====
    
    messages.push({ role: 'user', content: userMessage });
    
    const completion = await openai.chat.completions.create({
        messages: messages,
        model: currentConfig.model || 'gpt-3.5-turbo',
        temperature: parseFloat(currentConfig.temperature) || 0.7,
        max_tokens: parseInt(currentConfig.maxTokens) || 150
    });
    
    return completion.choices[0].message.content;
}
```

### Transcripción de Audio (Whisper)

```javascript
// openai.service.js - transcribeAudio()
async transcribeAudio(audioPath, config = null) {
    const currentConfig = config || await storeService.getConfig();
    
    if (!currentConfig.openaiApiKey) {
        return null;
    }
    
    const openai = new OpenAI({ apiKey: currentConfig.openaiApiKey });
    
    const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: 'whisper-1'
    });
    
    return transcription.text;
}
```

---

## 📊 Sistema CRM de Clientes

### Auto-Registro de Clientes

Cada vez que llega un mensaje, el cliente se registra automáticamente:

```javascript
// whatsapp.service.js - Auto-CRM
const contactName = m.pushName;
let profilePicUrl = null;

try {
    profilePicUrl = await this.sock.profilePictureUrl(chatId, 'image');
} catch (ppError) {
    // Sin foto de perfil
}

await clientService.upsertClient(bot.id, chatId, contactName, profilePicUrl);
```

```javascript
// client.service.js - upsertClient()
async upsertClient(botId, chatId, name, profilePicUrl = null) {
    return await prisma.client.upsert({
        where: {
            botId_chatId: { botId, chatId }
        },
        update: {
            updatedAt: new Date(),
            ...(name ? { name } : {}),
            ...(profilePicUrl ? { profilePicUrl } : {})
        },
        create: {
            botId,
            chatId,
            name: name || chatId,
            profilePicUrl,
            status: 'LEAD',
            tags: '[]'
        }
    });
}
```

### Difusión Masiva (Broadcast)

```javascript
// client.service.js - sendBroadcast()
async sendBroadcast(botInstance, criteria, messageTemplate, imageBuffer = null) {
    // 1. Filtrar clientes
    const where = { botId: botInstance.id };
    if (criteria.ids && criteria.ids.length > 0) {
        where.id = { in: criteria.ids };
    } else if (criteria.status && criteria.status !== 'ALL') {
        where.status = criteria.status;
    }
    
    const clients = await prisma.client.findMany({ where });
    
    // 2. Enviar a cada cliente
    for (let i = 0; i < clients.length; i++) {
        const client = clients[i];
        const chatId = client.chatId;
        const text = messageTemplate.replace('{name}', client.name || 'Cliente');
        
        try {
            // Preparar contenido
            const messageContent = imageBuffer
                ? { image: imageBuffer, caption: text }
                : { text };
            
            // Enviar con reintentos
            const sentMsg = await sendWithRetry(chatId, messageContent, 3);
            const whatsappId = sentMsg?.key?.id;
            
            // Guardar en historial
            await botInstance.storeService.addMessage(
                chatId, 'assistant', text, true, false, whatsappId, 'SENT'
            );
            
            // Actualizar timestamp de broadcast
            await prisma.client.update({
                where: { botId_chatId: { botId: bot.id, chatId } },
                data: { lastBroadcastAt: new Date() }
            });
            
        } catch (err) {
            console.error(`Failed for ${chatId}:`, err.message);
        }
        
        // Delay aleatorio (15-90 segundos)
        if (i < clients.length - 1) {
            const delay = Math.floor(Math.random() * (90000 - 15000 + 1)) + 15000;
            await new Promise(r => setTimeout(r, delay));
        }
    }
}
```

---

## ⏰ Sistema de Recordatorios

### Scheduler de Recordatorios

```javascript
// whatsapp.service.js - startReminderScheduler()
startReminderScheduler() {
    this.reminderInterval = setInterval(async () => {
        try {
            const reminders = await this.storeService.getDueReminders();
            
            if (reminders.length > 0) {
                const config = await this.storeService.getConfig();
                const message = config.paymentMessage || 'Recordatorio de pago pendiente.';
                
                for (const r of reminders) {
                    // Enviar mensaje
                    const sentMsg = await this.sock.sendMessage(r.chatId, { text: message });
                    
                    // Guardar en historial
                    await this.storeService.addMessage(
                        r.chatId, 'assistant', message, false, false, sentMsg?.key?.id, 'SENT', true
                    );
                    
                    // Si es recurrente, crear siguiente recordatorio
                    if (r.recurrenceDays) {
                        const nextDate = new Date(r.dueDate);
                        nextDate.setDate(nextDate.getDate() + r.recurrenceDays);
                        await this.storeService.addReminder(
                            r.chatId,
                            nextDate.getTime(),
                            r.recurrenceDays
                        );
                    }
                    
                    // Eliminar recordatorio actual
                    await this.storeService.removeReminder(r.id);
                }
            }
        } catch (error) {
            console.error('Error in reminder scheduler:', error);
        }
    }, 60 * 1000);  // Cada minuto
}
```

---

## 🎨 Frontend React

### Estructura de Componentes

#### 1. **AuthProvider** - Contexto de Autenticación

```jsx
// contexts/AuthProvider.jsx
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    
    useEffect(() => {
        if (token) {
            // Verificar token al cargar
            api.get('/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => {
                setUser(res.data);
            }).catch(() => {
                logout();
            });
        }
    }, [token]);
    
    const login = async (username, password) => {
        const res = await api.post('/auth/login', { username, password });
        setToken(res.data.token);
        setUser(res.data.user);
        localStorage.setItem('token', res.data.token);
    };
    
    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
    };
    
    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
```

#### 2. **DashboardPage** - Panel Principal

```jsx
// pages/DashboardPage.jsx
export const DashboardPage = () => {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [status, setStatus] = useState('disconnected');
    const [qr, setQr] = useState('');
    const [config, setConfig] = useState({});
    
    useEffect(() => {
        // Conectar Socket.IO con autenticación
        const newSocket = io('http://localhost:3000', {
            auth: { token }
        });
        
        newSocket.on('status', (newStatus) => setStatus(newStatus));
        newSocket.on('qr', (newQr) => setQr(newQr));
        newSocket.on('connection_info', (info) => setUserInfo(info));
        newSocket.on('new_message', (msg) => {
            // Actualizar UI con nuevo mensaje
        });
        
        setSocket(newSocket);
        
        return () => newSocket.disconnect();
    }, [token]);
    
    return (
        <div>
            <ConnectionCard status={status} userInfo={userInfo} />
            {status === 'scantocan' && <QRDisplay qr={qr} />}
            <ConfigForm config={config} onSave={handleSaveConfig} />
        </div>
    );
};
```

#### 3. **ClientsPage** - Gestión de Clientes

```jsx
// pages/ClientsPage.jsx
export const ClientsPage = () => {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [messages, setMessages] = useState([]);
    
    useEffect(() => {
        loadClients();
    }, []);
    
    const loadClients = async () => {
        const res = await api.get('/api/clients', {
            headers: { Authorization: `Bearer ${token}` }
        });
        setClients(res.data.data);
    };
    
    const handleSelectClient = async (client) => {
        setSelectedClient(client);
        const res = await api.get(`/api/clients/${client.chatId}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data.data);
    };
    
    const handleSendMessage = async (message, file) => {
        const formData = new FormData();
        formData.append('message', message);
        if (file) formData.append('file', file);
        
        await api.post(`/api/clients/${selectedClient.chatId}/send`, formData, {
            headers: { Authorization: `Bearer ${token}` }
        });
    };
    
    return (
        <div className="flex">
            <ClientList clients={clients} onSelect={handleSelectClient} />
            {selectedClient && (
                <ChatViewer
                    client={selectedClient}
                    messages={messages}
                    onSend={handleSendMessage}
                />
            )}
        </div>
    );
};
```

---

## 🔄 Comunicación en Tiempo Real (Socket.IO)

### Eventos del Backend al Frontend

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `status` | `'connected' \| 'disconnected' \| 'scantocan'` | Estado de conexión de WhatsApp |
| `qr` | `string` | Código QR para escanear |
| `connection_info` | `{ name, id, number, profilePicUrl }` | Información del usuario conectado |
| `new_message` | `Message` | Nuevo mensaje recibido o enviado |
| `message_status` | `{ messageId, status }` | Actualización de estado (SENT, DELIVERED, READ) |
| `config` | `Config` | Configuración actualizada |

### Eventos del Frontend al Backend

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `connection` | `{ auth: { token } }` | Autenticación inicial |
| `disconnect` | - | Desconexión del cliente |

---

## 🛡️ Características de Seguridad

### 1. **Rate Limiting**

```javascript
if (config.enableRateLimit) {
    const { max, window } = config.rateLimit || { max: 10, window: 60 };
    const userActivity = this.rateLimitMap.get(chatId) || { count: 0, startTime: Date.now() };
    
    if (Date.now() - userActivity.startTime > window * 1000) {
        userActivity.count = 1;
        userActivity.startTime = Date.now();
    } else {
        userActivity.count++;
    }
    
    if (userActivity.count > max) {
        console.log(`Rate limit exceeded for ${chatId}`);
        return;  // Ignorar mensaje
    }
}
```

### 2. **Detección de Enojo (Anger Protection)**

```javascript
if (config.enableAngerProtection) {
    const badWords = config.badWords || [];
    const detectedBadWord = badWords.find(word => text.toLowerCase().includes(word.toLowerCase()));
    const isYelling = text.length > 10 && text.replace(/[^A-Z]/g, '').length / text.length > 0.7;
    
    if (detectedBadWord || isYelling) {
        await this.storeService.setSilence(chatId, true);  // Auto-silenciar
        return;
    }
}
```

### 3. **Horario Comercial**

```javascript
if (config.businessHours?.enabled) {
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const isWorkingHours = currentTime >= config.businessHours.start && currentTime <= config.businessHours.end;
    
    if (!isWorkingHours) {
        await this.sock.sendMessage(chatId, { text: config.businessHours.message });
        return;
    }
}
```

### 4. **Deduplicación de Mensajes**

```javascript
const messageId = m.key.id;
if (this.processedMessages.has(messageId)) {
    console.log(`Ignoring duplicate message: ${messageId}`);
    return;
}
this.processedMessages.add(messageId);

// Limitar tamaño del Set (últimos 1000 mensajes)
if (this.processedMessages.size > 1000) {
    const firstItem = this.processedMessages.values().next().value;
    this.processedMessages.delete(firstItem);
}
```

---

## 🔧 Configuración del Bot

### Parámetros Configurables

```javascript
const DEFAULT_CONFIG = {
    // OpenAI
    openaiApiKey: '',
    systemPrompt: 'Eres Neo, un asistente virtual profesional y útil.',
    temperature: 0.7,
    maxTokens: 150,
    model: 'gpt-3.5-turbo',
    
    // Características
    enableVision: false,        // GPT-4o Vision para imágenes
    enableAudio: true,          // Whisper para audios
    enableAngerProtection: true,
    enableRateLimit: true,
    
    // Memoria
    memoryWindow: 10,           // Últimos N mensajes en contexto
    
    // Contexto de Negocio
    businessContext: '',        // Información de productos/servicios
    
    // Seguridad
    badWords: ['asqueroso', 'engañar', 'mentiroso'],
    rateLimit: { max: 10, window: 60 },
    
    // Horario
    businessHours: {
        enabled: false,
        start: '09:00',
        end: '18:00',
        message: '😴 Nuestros asesores duermen. Te escribiremos a las 8 AM.'
    },
    
    // Mensajes
    fallbackMessage: '🔧 Estamos ajustando nuestros sistemas de IA. Un asesor humano revisará tu mensaje pronto.',
    paymentMessage: 'Hola, te recordamos que tu pago vence pronto. Por favor realiza tu abono para continuar disfrutando del servicio.'
};
```

---

## 🚀 Despliegue

### Docker Compose

```yaml
version: '3.8'

services:
  whatsapp-bot:
    build: .
    container_name: whatsapp-ai-bot
    restart: unless-stopped
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    volumes:
      - ./auth_info:/app/auth_info
      - ./data:/app/data
    environment:
      - PORT=3000
      - NODE_ENV=development
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/autobot?schema=public

  postgres:
    image: postgres:15-alpine
    container_name: autobot-postgres
    restart: always
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=autobot
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Instalar dependencias del sistema
RUN apk add --no-cache ffmpeg

# Copiar archivos de dependencias
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Instalar dependencias
RUN npm install
RUN cd server && npm install
RUN cd client && npm install

# Copiar código fuente
COPY . .

# Construir frontend
RUN cd client && npm run build

# Copiar build al servidor
RUN mkdir -p server/public
RUN cp -r client/dist/* server/public/

# Generar Prisma Client
RUN cd server && npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
```

---

## 📈 Flujos de Datos Principales

### Flujo de Mensaje Entrante

```mermaid
sequenceDiagram
    participant WA as WhatsApp
    participant B as Baileys
    participant WS as WhatsAppService
    participant OS as OpenAIService
    participant SS as StoreService
    participant DB as SQLite
    participant IO as Socket.IO
    participant FE as Frontend
    
    WA->>B: Mensaje entrante
    B->>WS: event: messages.upsert
    WS->>WS: Filtrar y validar
    WS->>SS: addMessage(user)
    SS->>DB: INSERT Message
    WS->>IO: emit('new_message')
    IO->>FE: Actualizar UI
    
    WS->>SS: getHistory(chatId, 10)
    SS->>DB: SELECT últimos 10 mensajes
    DB-->>SS: Historial
    SS-->>WS: Historial
    
    WS->>OS: generateResponse(text, history)
    OS->>OS: Construir prompt
    OS->>OpenAI: API Call
    OpenAI-->>OS: Respuesta
    OS-->>WS: Respuesta
    
    WS->>B: sendMessage(chatId, response)
    B->>WA: Enviar mensaje
    WA-->>B: Confirmación
    
    WS->>SS: addMessage(assistant)
    SS->>DB: INSERT Message
    WS->>IO: emit('new_message')
    IO->>FE: Actualizar UI
```

### Flujo de Broadcast

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as API Controller
    participant CS as ClientService
    participant WS as WhatsAppService
    participant DB as SQLite
    
    FE->>API: POST /api/broadcast
    API->>CS: sendBroadcast(criteria, message)
    CS->>DB: SELECT clientes filtrados
    DB-->>CS: Lista de clientes
    
    loop Para cada cliente
        CS->>WS: sock.sendMessage(chatId, message)
        WS-->>CS: Confirmación
        CS->>DB: INSERT Message (isBroadcast=true)
        CS->>DB: UPDATE Client (lastBroadcastAt)
        CS->>CS: Esperar delay aleatorio (15-90s)
    end
    
    CS-->>API: Broadcast completado
    API-->>FE: { success: true }
```

---

## 🎯 Características Destacadas

### 1. **Multi-Tenant Completo**
- Cada usuario tiene su propia instancia de WhatsApp
- Sesiones aisladas con autenticación independiente
- Configuración personalizada por usuario

### 2. **Handoff Humano**
- Comando `!off` para pausar el bot
- Modo manual para intervención humana
- Comando `!on` para reactivar

### 3. **Visión Artificial (GPT-4o Vision)**
- Análisis automático de imágenes
- Detección de comprobantes de pago
- Descripción de productos visuales

### 4. **Transcripción de Audio (Whisper)**
- Conversión automática de notas de voz a texto
- Procesamiento con ffmpeg (OGG → MP3)
- Respuesta basada en transcripción

### 5. **CRM Integrado**
- Auto-registro de contactos
- Estados: Lead, Customer, Archived, Blocked
- Etiquetas personalizables
- Notas por cliente

### 6. **Difusión Masiva Inteligente**
- Filtrado por estado o IDs específicos
- Personalización con `{name}`
- Delays aleatorios anti-ban (15-90s)
- Reintentos automáticos

### 7. **Recordatorios Programados**
- Comando `!pay <días>`
- Recurrencia automática
- Scheduler cada minuto

### 8. **Seguimiento de Estado de Mensajes**
- SENT (enviado)
- DELIVERED (entregado)
- READ (leído)
- Actualización en tiempo real

### 9. **Protecciones de Seguridad**
- Rate limiting configurable
- Detección de enojo
- Horario comercial
- Deduplicación de mensajes

### 10. **Contexto de Negocio**
- Base de conocimiento inyectable
- Información de productos/servicios
- Respuestas personalizadas al negocio

---

## 🔍 Puntos Clave de Funcionamiento

### 1. **Aislamiento de Sesiones**
Cada usuario tiene:
- Directorio de autenticación: `sessions/{userId}/auth_info/`
- Instancia de `WhatsAppService`
- Instancia de `StoreService`
- Socket.IO room: `userId`

### 2. **Persistencia de Configuración**
La configuración se guarda en el campo `config` del modelo `Bot` como JSON string:
```javascript
await prisma.bot.update({
    where: { userId: this.userId },
    data: { config: JSON.stringify(updatedConfig) }
});
```

### 3. **Resolución de LID (LinkedIn ID)**
WhatsApp usa LIDs para contactos nuevos. El sistema:
- Escucha eventos `contacts.upsert` y `contacts.update`
- Cachea mapeos LID → Phone Number
- Actualiza `chatId` en la base de datos

### 4. **Memoria Conversacional**
```javascript
const limit = parseInt(config.memoryWindow) || 10;
let history = await this.storeService.getHistory(chatId, limit);
```
Solo los últimos N mensajes se envían a OpenAI para contexto.

### 5. **Fallback en Caso de Error**
```javascript
catch (aiError) {
    if (config.fallbackMessage) {
        response = config.fallbackMessage;
        await this.sock.sendMessage(chatId, { text: response });
    }
}
```

---

## 📊 Métricas y Monitoreo

### Logs Importantes

```javascript
console.log(`[${this.userId}] Bot Conectado! 🤖`);
console.log(`[${this.userId}] Reminder scheduler started`);
console.log(`[Broadcast] Starting for ${clients.length} clients...`);
console.log(`[SessionManager] Auto-starting session for user: ${user.username}`);
```

### Estados del Bot

| Estado | Descripción |
|--------|-------------|
| `disconnected` | Sin conexión a WhatsApp |
| `scantocan` | Esperando escaneo de QR |
| `connected` | Conectado y operativo |

---

## 🛠️ Mantenimiento

### Limpieza Automática de Datos

```javascript
// cleanup.service.js
class CleanupService {
    startScheduler() {
        // Ejecutar cada 24 horas
        setInterval(async () => {
            await this.cleanOldMessages();
            await this.cleanOldReminders();
        }, 24 * 60 * 60 * 1000);
    }
    
    async cleanOldMessages() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);  // 90 días
        
        const result = await prisma.message.deleteMany({
            where: {
                timestamp: { lte: cutoffDate },
                isBroadcast: false,
                isReminder: false
            }
        });
        
        console.log(`Deleted ${result.count} old messages`);
    }
}
```

---

## 🎓 Conclusión

**AutoBOT** es un sistema robusto y escalable que combina:

✅ **Arquitectura multi-tenant** con aislamiento completo de sesiones  
✅ **Integración profunda con WhatsApp** mediante Baileys  
✅ **IA avanzada** con GPT-4o Vision y Whisper  
✅ **CRM completo** con gestión de clientes  
✅ **Seguridad** con rate limiting, detección de enojo y horarios  
✅ **Tiempo real** con Socket.IO  
✅ **Persistencia** con Prisma + SQLite  
✅ **Frontend moderno** con React + TailwindCSS  

El sistema está diseñado para escalar y soportar múltiples usuarios simultáneos, cada uno con su propia configuración, sesión de WhatsApp y base de clientes.

---

**Autor:** Sistema AutoBOT  
**Versión:** 1.0.0  
**Última actualización:** Febrero 2026
