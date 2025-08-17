const express = require('express');
const { 
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const NodeCache = require('node-cache');

const app = express();
const port = process.env.PORT || 3000;

// Cache pour stocker les codes temporairement
const pairingCodeCache = new NodeCache({ stdTTL: 300 }); // 5 minutes

// Middleware
app.use(express.json());
// 🔧 Correction : pointer vers src/public
app.use(express.static(path.join(__dirname, 'src/public')));

// Variables globales
let globalSock = null;
let isConnecting = false;
let lastPairingRequest = 0;

// Logger silencieux pour éviter le spam
const logger = pino({ 
    level: process.env.NODE_ENV === 'production' ? 'silent' : 'info' 
});

// Route pour servir l'index.html
// 🔧 Correction : pointer vers src/public
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/public', 'index.html'));
});

// Route pour générer un nouveau code de pairing
app.post('/generate-pairing-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
            return res.status(400).json({ 
                success: false,
                error: 'Numéro de téléphone invalide. Format requis: +243123456789' 
            });
        }

        const now = Date.now();
        if (now - lastPairingRequest < 30000) {
            const waitTime = Math.ceil((30000 - (now - lastPairingRequest)) / 1000);
            return res.status(429).json({ 
                success: false,
                error: `Veuillez attendre ${waitTime} secondes avant de générer un nouveau code` 
            });
        }

        const existingCode = pairingCodeCache.get(phoneNumber);
        if (existingCode) {
            return res.json({
                success: true,
                code: existingCode,
                message: 'Code existant récupéré',
                phoneNumber: phoneNumber
            });
        }

        if (isConnecting) {
            return res.status(503).json({
                success: false,
                error: 'Une connexion est déjà en cours. Veuillez patienter.'
            });
        }

        lastPairingRequest = now;
        isConnecting = true;

        console.log(`🔄 Génération d'un code de pairing pour: ${phoneNumber}`);

        const cleanNumber = phoneNumber.replace(/[^\d]/g, '');

        const authDir = path.join(__dirname, 'auth_info_baileys');
        if (!fs.existsSync(authDir)) {
            fs.mkdirSync(authDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(authDir);
        
        const sock = makeWASocket({
            logger: logger,
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'),
            auth: state,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: true,
        });

        let pairingCode = null;
        let connectionTimeout;

        connectionTimeout = setTimeout(() => {
            console.log('⏰ Timeout de connexion');
            sock.end();
            isConnecting = false;
        }, 60000);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            console.log('📡 État de connexion:', connection);

            if (connection === 'close') {
                clearTimeout(connectionTimeout);
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('🔌 Connexion fermée. Reconnexion requise:', shouldReconnect);
                
                if (shouldReconnect && !pairingCode) {
                    setTimeout(() => {
                        isConnecting = false;
                    }, 5000);
                } else {
                    isConnecting = false;
                }
            } 
            else if (connection === 'open') {
                clearTimeout(connectionTimeout);
                console.log('🟢 Bot WhatsApp connecté avec succès!');
                globalSock = sock;
                isConnecting = false;
                setupBotCommands(sock);
                
                setInterval(() => {
                    if (sock && !sock.isOnline) {
                        sock.connect();
                    }
                }, 30000);
            }
        });

        if (!state.creds.registered) {
            console.log('📱 Demande de code de pairing...');
            
            try {
                pairingCode = await sock.requestPairingCode(cleanNumber);
                
                if (pairingCode) {
                    pairingCodeCache.set(phoneNumber, pairingCode);
                    
                    console.log(`✅ Code généré: ${pairingCode} pour ${phoneNumber}`);
                    
                    clearTimeout(connectionTimeout);
                    isConnecting = false;
                    
                    return res.json({ 
                        success: true, 
                        code: pairingCode,
                        message: 'Code généré avec succès',
                        phoneNumber: phoneNumber,
                        expiresIn: 300
                    });
                }
            } catch (error) {
                console.error('❌ Erreur lors de la génération du code:', error);
                clearTimeout(connectionTimeout);
                isConnecting = false;
                
                return res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la génération du code de pairing'
                });
            }
        } else {
            clearTimeout(connectionTimeout);
            isConnecting = false;
            return res.json({ 
                success: false, 
                error: 'Ce numéro est déjà enregistré' 
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur serveur:', error);
        isConnecting = false;
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur lors de la génération du code',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/pairing-code/:phoneNumber', (req, res) => {
    const { phoneNumber } = req.params;
    const code = pairingCodeCache.get(phoneNumber);
    
    if (code) {
        res.json({ 
            success: true, 
            code: code,
            ttl: pairingCodeCache.getTtl(phoneNumber)
        });
    } else {
        res.json({ 
            success: false, 
            error: 'Aucun code disponible pour ce numéro' 
        });
    }
});

app.get('/bot-status', (req, res) => {
    const isConnected = globalSock && globalSock.user;
    res.json({
        connected: isConnected,
        connecting: isConnecting,
        botInfo: isConnected ? {
            id: globalSock.user.id,
            name: globalSock.user.name || 'Ebmau Bot'
        } : null,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

function setupBotCommands(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;

            const remoteJid = m.key.remoteJid;
            const msgText = (m.message.conversation || 
                           m.message.extendedTextMessage?.text || '').trim();
            const senderName = m.pushName || 'Utilisateur';

            if (!msgText.startsWith('!')) return;

            console.log(`📨 Commande reçue de ${senderName}: ${msgText}`);

            const commands = {
                '!menu': () => {
                    return `🤖 *Ebmau Bot - Menu Principal*\n\n` +
                           `Salut ${senderName} ! Voici mes commandes :\n\n` +
                           `🔹 *!menu* - Affiche ce menu\n` +
                           `🔹 *!ping* - Test de connexion\n` +
                           `🔹 *!aide* - Aide et support\n` +
                           `🔹 *!info* - Informations du bot\n` +
                           `🔹 *!time* - Heure actuelle\n` +
                           `🔹 *!status* - État du serveur\n\n` +
                           `✨ Bot créé par Ebmau - Inspiré de @Hacker21`;
                },

                '!ping': async () => {
                    const startTime = Date.now();
                    await sock.sendMessage(remoteJid, { text: '🏓 Calcul du ping...' });
                    const endTime = Date.now();
                    const latency = endTime - startTime;
                    
                    return `🏓 *Pong!*\n⚡ Latence: ${latency}ms\n✅ Bot en ligne et fonctionnel`;
                },

                '!aide': () => {
                    return `🆘 *Aide Ebmau Bot*\n\n` +
                           `📞 Support: Pour toute question, contactez l'admin\n` +
                           `🌐 Interface: Générez vos codes de pairing\n` +
                           `⚡ Status: Bot en ligne 24/7\n` +
                           `🔄 Version: 2.0 (Baileys compatible)\n\n` +
                           `💡 Astuce: Tapez !menu pour voir toutes les commandes`;
                },

                '!info': () => {
                    return `ℹ️ *Informations du Bot*\n\n` +
                           `🤖 Nom: Ebmau Bot v2.0\n` +
                           `📱 Plateforme: WhatsApp Business API\n` +
                           `💻 Hébergé sur: Render.com\n` +
                           `🔗 Connecté via: @whiskeysockets/baileys\n` +
                           `⏰ Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m\n` +
                           `📊 Mémoire: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n\n` +
                           `✨ Créé avec ❤️ par Ebmau`;
                },

                '!time': () => {
                    const now = new Date();
                    return `🕐 *Heure Actuelle*\n\n` +
                           `📅 Date: ${now.toLocaleDateString('fr-FR')}\n` +
                           `⏰ Heure: ${now.toLocaleTimeString('fr-FR')}\n` +
                           `🌍 Timezone: UTC${now.getTimezoneOffset() / -60 >= 0 ? '+' : ''}${now.getTimezoneOffset() / -60}`;
                },

                '!status': () => {
                    return `📊 *Status du Serveur*\n\n` +
                           `🟢 Bot: En ligne\n` +
                           `⚡ Serveur: Opérationnel\n` +
                           `🔄 Uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m\n` +
                           `💾 Codes en cache: ${pairingCodeCache.keys().length}\n` +
                           `📱 Connexions actives: 1\n\n` +
                           `✅ Tous les systèmes fonctionnent normalement`;
                }
            };

            const command = msgText.toLowerCase();
            const handler = commands[command];

            if (handler) {
                const response = await handler();
                await sock.sendMessage(remoteJid, { text: response });
            } else {
                await sock.sendMessage(remoteJid, { 
                    text: `❓ Commande inconnue: ${msgText}\n\nTapez *!menu* pour voir les commandes disponibles.` 
                });
            }

        } catch (error) {
            console.error('❌ Erreur lors du traitement du message:', error);
        }
    });
}

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        botConnected: !!globalSock,
        isConnecting: isConnecting,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        cacheSize: pairingCodeCache.keys().length
    });
});

app.use((error, req, res, next) => {
    console.error('❌ Erreur serveur:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Erreur serveur interne',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Route non trouvée' 
    });
});

const server = app.listen(port, () => {
    console.log(`🚀 Serveur Ebmau Bot démarré sur le port ${port}`);
    console.log(`🌐 Interface accessible sur: http://localhost:${port}`);
    console.log(`📱 Bot WhatsApp prêt à recevoir des connexions...`);
    console.log(`🔧 Environnement: ${process.env.NODE_ENV || 'development'}`);
});

const gracefulShutdown = (signal) => {
    console.log(`\n🔄 Signal ${signal} reçu. Arrêt en cours...`);
    
    server.close(() => {
        console.log('📡 Serveur HTTP fermé');
        
        if (globalSock) {
            console.log('🤖 Fermeture de la connexion WhatsApp...');
            globalSock.end();
        }
        
        console.log('✅ Arrêt propre terminé');
        process.exit(0);
    });
    
    setTimeout(() => {
        console.log('⚠️ Arrêt forcé après timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
    console.error('❌ Exception non capturée:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Rejet de promesse non géré à', promise, 'raison:', reason);
});
