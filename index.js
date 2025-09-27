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

// Stockage temporaire des relations de parrainage (à remplacer par une BDD en prod)
const referralRelations = [];

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src/public')));

// Variables globales
let globalSock = null;
let isConnecting = false;
let lastPairingRequest = 0;

// Logger silencieux
const logger = pino({ 
    level: process.env.NODE_ENV === 'production' ? 'silent' : 'info' 
});

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src/public', 'index.html'));
});

// Génération d’un code de pairing
app.post('/generate-pairing-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
            return res.status(400).json({ 
                success: false,
                error: 'Numéro de téléphone invalide. Exemple: +243123456789' 
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
                phoneNumber
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
            logger,
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'),
            auth: state,
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            markOnlineOnConnect: true,
        });

        let pairingCode = null;
        let connectionTimeout = setTimeout(() => {
            console.log('⏰ Timeout de connexion');
            sock.end();
            isConnecting = false;
        }, 60000);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            console.log('📡 État de connexion:', connection);

            if (connection === 'close') {
                clearTimeout(connectionTimeout);
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('🔌 Connexion fermée. Reconnexion requise:', shouldReconnect);
                isConnecting = false;
            } 
            else if (connection === 'open') {
                clearTimeout(connectionTimeout);
                console.log('🟢 Bot WhatsApp connecté avec succès!');
                globalSock = sock;
                isConnecting = false;
                setupBotCommands(sock);
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
                        phoneNumber,
                        expiresIn: 300
                    });
                }
            } catch (error) {
                console.error('❌ Erreur lors de la génération du code:', error);
                clearTimeout(connectionTimeout);
                isConnecting = false;
                
                return res.status(500).json({
                    success: false,
                    error: error.message || error.toString(),
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
            error: error.message || error.toString(),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Vérifier un code déjà généré
app.get('/pairing-code/:phoneNumber', (req, res) => {
    const { phoneNumber } = req.params;
    const code = pairingCodeCache.get(phoneNumber);
    
    if (code) {
        res.json({ 
            success: true, 
            code,
            ttl: pairingCodeCache.getTtl(phoneNumber)
        });
    } else {
        res.json({ 
            success: false, 
            error: 'Aucun code disponible pour ce numéro' 
        });
    }
});

// Statut du bot
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

// ==========================
// API Parrainage
// ==========================
app.post('/api/parrainage', (req, res) => {
    const { parrain, filleul } = req.body;

    if (!parrain || !filleul) {
        return res.status(400).json({ success: false, error: 'Parrain ou filleul manquant.' });
    }

    // Vérifie si déjà enregistré
    const alreadyExists = referralRelations.find(r => r.parrain === parrain && r.filleul === filleul);
    if (alreadyExists) {
        return res.json({ success: false, error: 'Déjà parrainé.' });
    }

    referralRelations.push({ parrain, filleul, date: new Date().toISOString() });

    // Pour debug, affiche la liste
    console.log('🧑‍🤝‍🧑 Nouvelle relation de parrainage:', referralRelations);

    res.json({ success: true, message: 'Parrainage enregistré.', relation: { parrain, filleul } });
});

// Commandes bot
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
                           `📱 Plateforme: WhatsApp (Baileys)\n` +
                           `💻 Hébergé sur: Render.com\n` +
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

// Route santé
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        botConnected: !!globalSock,
        isConnecting,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version,
        cacheSize: pairingCodeCache.keys().length
    });
});

// Middleware erreurs
app.use((error, req, res, next) => {
    console.error('❌ Erreur middleware:', error);
    res.status(500).json({ 
        success: false, 
        error: error.message || 'Erreur serveur interne',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
});

app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Route non trouvée' 
    });
});

// Démarrage serveur
const server = app.listen(port, () => {
    console.log(`🚀 Serveur Ebmau Bot démarré sur le port ${port}`);
});

// Arrêt propre
const gracefulShutdown = (signal) => {
    console.log(`\n🔄 Signal ${signal} reçu. Arrêt en cours...`);
    server.close(() => {
        console.log('📡 Serveur HTTP fermé');
        if (globalSock) {
            console.log('🤖 Fermeture de la connexion WhatsApp...');
            globalSock.end();
        }
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
