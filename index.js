const express = require('express');
const { makeWASocket, useMultiFileAuthState, Browsers } = require('baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Variables globales pour stocker l'état
let globalSock = null;
let currentPairingCode = null;
let lastPairingRequest = 0;

// Route pour servir l'index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route pour générer un nouveau code de pairing
app.post('/generate-pairing-code', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        
        // Validation du numéro
        if (!phoneNumber || !phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
            return res.status(400).json({ 
                error: 'Numéro de téléphone invalide. Format requis: +33123456789' 
            });
        }

        // Protection anti-spam (1 requête par minute)
        const now = Date.now();
        if (now - lastPairingRequest < 60000) {
            return res.status(429).json({ 
                error: 'Veuillez attendre 1 minute entre chaque génération' 
            });
        }
        lastPairingRequest = now;

        console.log(`🔄 Génération d'un code de pairing pour: ${phoneNumber}`);

        // Créer une nouvelle instance WhatsApp
        const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
        
        const sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: Browsers.macOS('Desktop'),
            auth: state,
            generateHighQualityLinkPreview: true,
        });

        // Générer le code de pairing
        if (!sock.authState.creds.registered) {
            const pairingCode = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
            currentPairingCode = pairingCode;
            
            console.log(`✅ Code généré: ${pairingCode} pour ${phoneNumber}`);
            
            // Sauvegarder les credentials
            sock.ev.on('creds.update', saveCreds);
            
            // Gérer la connexion
            sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect } = update;
                if (connection === 'close') {
                    console.log('🔌 Connexion fermée');
                } else if (connection === 'open') {
                    console.log('🟢 Bot WhatsApp connecté avec succès!');
                    globalSock = sock;
                    setupBotCommands(sock);
                }
            });

            res.json({ 
                success: true, 
                code: pairingCode,
                message: 'Code généré avec succès',
                phoneNumber: phoneNumber
            });
        } else {
            res.json({ 
                success: false, 
                error: 'Le bot est déjà connecté' 
            });
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la génération:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erreur serveur lors de la génération du code' 
        });
    }
});

// Route pour obtenir le dernier code généré
app.get('/pairing-code', (req, res) => {
    if (currentPairingCode) {
        res.json({ 
            success: true, 
            code: currentPairingCode 
        });
    } else {
        res.json({ 
            success: false, 
            error: 'Aucun code disponible. Générez-en un nouveau.' 
        });
    }
});

// Route pour vérifier l'état du bot
app.get('/bot-status', (req, res) => {
    const isConnected = globalSock && globalSock.user;
    res.json({
        connected: isConnected,
        botInfo: isConnected ? {
            id: globalSock.user.id,
            name: globalSock.user.name
        } : null
    });
});

// Configuration des commandes du bot
function setupBotCommands(sock) {
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const m = messages[0];
            if (!m.message || m.key.fromMe) return;

            const remoteJid = m.key.remoteJid;
            const msgText = m.message.conversation || 
                           m.message.extendedTextMessage?.text || '';
            const senderName = m.pushName || 'Utilisateur';

            console.log(`📨 Message reçu de ${senderName}: ${msgText}`);

            // Commande !menu
            if (msgText.toLowerCase().startsWith('!menu')) {
                const menuMessage = `🤖 *Ebmau Bot - Menu Principal*\n\n` +
                                  `Salut ${senderName} ! Voici mes commandes :\n\n` +
                                  `🔹 *!menu* - Affiche ce menu\n` +
                                  `🔹 *!ping* - Test de connexion\n` +
                                  `🔹 *!aide* - Aide et support\n` +
                                  `🔹 *!info* - Informations du bot\n` +
                                  `🔹 *!time* - Heure actuelle\n\n` +
                                  `✨ Bot créé par Ebmau - Inspiré de @Hacker21`;
                
                await sock.sendMessage(remoteJid, { text: menuMessage });
            }

            // Commande !ping
            else if (msgText.toLowerCase().startsWith('!ping')) {
                const startTime = Date.now();
                const pongMsg = await sock.sendMessage(remoteJid, { text: '🏓 Calcul du ping...' });
                const endTime = Date.now();
                const latency = endTime - startTime;
                
                await sock.sendMessage(remoteJid, { 
                    text: `🏓 *Pong!*\n⚡ Latence: ${latency}ms\n✅ Bot en ligne et fonctionnel` 
                });
            }

            // Commande !aide
            else if (msgText.toLowerCase().startsWith('!aide')) {
                const helpMessage = `🆘 *Aide Ebmau Bot*\n\n` +
                                  `📞 Support: Pour toute question\n` +
                                  `🌐 Site: Ebmau Bot Interface\n` +
                                  `⚡ Status: Bot en ligne 24/7\n\n` +
                                  `💡 Astuce: Tapez !menu pour voir toutes les commandes`;
                
                await sock.sendMessage(remoteJid, { text: helpMessage });
            }

            // Commande !info
            else if (msgText.toLowerCase().startsWith('!info')) {
                const infoMessage = `ℹ️ *Informations du Bot*\n\n` +
                                  `🤖 Nom: Ebmau Bot\n` +
                                  `📱 Version: 2.0\n` +
                                  `💻 Hébergé sur: Render.com\n` +
                                  `🔗 Connecté via: Baileys API\n` +
                                  `⏰ Démarré: ${new Date().toLocaleString('fr-FR')}\n\n` +
                                  `✨ Créé avec ❤️ par Ebmau`;
                
                await sock.sendMessage(remoteJid, { text: infoMessage });
            }

            // Commande !time
            else if (msgText.toLowerCase().startsWith('!time')) {
                const now = new Date();
                const timeMessage = `🕐 *Heure Actuelle*\n\n` +
                                  `📅 Date: ${now.toLocaleDateString('fr-FR')}\n` +
                                  `⏰ Heure: ${now.toLocaleTimeString('fr-FR')}\n` +
                                  `🌍 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
                
                await sock.sendMessage(remoteJid, { text: timeMessage });
            }

        } catch (error) {
            console.error('❌ Erreur lors du traitement du message:', error);
        }
    });
}

// Route de health check pour Render
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        botConnected: !!globalSock
    });
});

// Gestion des erreurs
app.use((error, req, res, next) => {
    console.error('❌ Erreur serveur:', error);
    res.status(500).json({ error: 'Erreur serveur interne' });
});

// Démarrage du serveur
app.listen(port, () => {
    console.log(`🚀 Serveur Ebmau Bot démarré sur le port ${port}`);
    console.log(`🌐 Interface accessible sur: http://localhost:${port}`);
    console.log(`📱 Bot WhatsApp en attente de connexion...`);
});

// Gestion propre de l'arrêt
process.on('SIGINT', () => {
    console.log('🔄 Arrêt du serveur...');
    if (globalSock) {
        globalSock.end();
    }
    process.exit(0);
});
