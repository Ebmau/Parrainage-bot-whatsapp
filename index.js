const express = require('express');
const { makeWASocket, useMultiFileAuthState, Browsers } = require('@adiwajshing/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public')); // Servez les fichiers statiques depuis un dossier 'public'

async function startWhatsAppBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: Browsers.macOS('Desktop'),
        auth: state
    });

    if (!sock.authState.creds.pairingCode) {
        const phoneNumber = '243'; // Remplace '243' par l'indicatif de ton pays
        const pairingCode = await sock.requestPairingCode(phoneNumber);
        console.log("Code d'appariement généré :", pairingCode);
        
        // Route pour le code d'appariement
        app.get('/pairing-code', (req, res) => {
            res.json({ code: pairingCode });
        });
    }

    // GESTION DES COMMANDES DU BOT
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message) return;

        const remoteJid = m.key.remoteJid;
        const msgText = m.message.conversation || m.message.extendedTextMessage?.text || '';

        // Récupérer le nom de l'expéditeur
        const senderName = m.pushName || 'Utilisateur';

        // Commande !menu
        if (msgText.startsWith('!menu')) {
            const menuMessage = `Salut ${senderName} ! Voici les commandes disponibles :\n\n` +
                                `!menu - Affiche le menu\n` +
                                `!ping - Répond "Pong !"\n` +
                                `!aide - Aide et support`;
            await sock.sendMessage(remoteJid, { text: menuMessage });
        }

        // Commande !ping
        if (msgText.startsWith('!ping')) {
            await sock.sendMessage(remoteJid, { text: 'Pong !' });
        }
        
        // Commande !aide
        if (msgText.startsWith('!aide')) {
            const helpMessage = `Pour toute question, contacte l'administrateur du bot.`;
            await sock.sendMessage(remoteJid, { text: helpMessage });
        }
    });

    // Sauvegarde des identifiants
    sock.ev.on('creds.update', saveCreds);

    // Gestion de l'état de la connexion
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
            console.log('Connexion fermée. Reconnexion requise ?', shouldReconnect);
            if (shouldReconnect) {
                startWhatsAppBot();
            }
        } else if (connection === 'open') {
            console.log('Connexion WhatsApp réussie ! Le bot est en ligne.');
        }
    });
}

startWhatsAppBot();

app.listen(port, () => {
    console.log(`Serveur en cours d'exécution sur le port ${port}`);
});
