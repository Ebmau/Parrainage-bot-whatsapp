// Variables globales
let generatedCode = '';
let totalCodesGenerated = parseInt(localStorage.getItem('totalCodes') || '0');
let isGenerating = false;
let lastGeneration = 0;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    updateStats();
    setupEventListeners();
    checkBotStatus();
    
    // Animation d'entrée du logo
    setTimeout(() => {
        const logo = document.getElementById('logo');
        if (logo) {
            logo.style.transform = 'scale(1.1)';
            setTimeout(() => {
                logo.style.transform = 'scale(1)';
            }, 200);
        }
    }, 500);
});

function setupEventListeners() {
    const phoneInput = document.getElementById('phoneNumber');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    
    if (phoneInput) {
        // Formatage en temps réel
        phoneInput.addEventListener('input', function(e) {
            formatPhoneNumber(e.target);
            validatePhoneNumber(e.target.value);
        });

        // Validation à la perte de focus
        phoneInput.addEventListener('blur', function(e) {
            validatePhoneNumber(e.target.value);
        });

        // Génération avec Enter
        phoneInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !isGenerating) {
                generatePairCode();
            }
        });
    }
    
    if (generateBtn) {
        generateBtn.addEventListener('click', generatePairCode);
    }
    
    if (copyBtn) {
        copyBtn.addEventListener('click', copyCode);
    }
}

function formatPhoneNumber(input) {
    let value = input.value.replace(/[^\d+]/g, '');
    
    if (value && !value.startsWith('+')) {
        value = '+' + value;
    }
    
    if (value.length > 15) {
        value = value.substring(0, 15);
    }
    
    input.value = value;
}

function validatePhoneNumber(phoneNumber) {
    const phoneInput = document.getElementById('phoneNumber');
    const errorMessage = document.getElementById('errorMessage');
    
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    const isValid = phoneRegex.test(phoneNumber);
    
    if (phoneNumber.length > 0 && !isValid) {
        phoneInput.classList.add('error');
        errorMessage.style.display = 'block';
        errorMessage.textContent = 'Format invalide. Exemple: +33123456789';
        return false;
    } else {
        phoneInput.classList.remove('error');
        errorMessage.style.display = 'none';
        return true;
    }
}

async function generatePairCode() {
    if (isGenerating) return;
    
    // Protection anti-spam
    const now = Date.now();
    if (now - lastGeneration < 5000) {
        showError('Veuillez attendre 5 secondes entre chaque génération');
        return;
    }
    
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    const codeDisplay = document.getElementById('codeDisplay');
    const copyBtn = document.getElementById('copyBtn');
    const generateBtn = document.getElementById('generateBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    
    // Validation
    if (!phoneNumber) {
        showError('Veuillez entrer votre numéro de téléphone');
        document.getElementById('phoneNumber').focus();
        return;
    }
    
    if (!validatePhoneNumber(phoneNumber)) {
        showError('Format de numéro invalide');
        return;
    }
    
    // Début de génération
    isGenerating = true;
    lastGeneration = now;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="loading"></div> Génération en cours...';
    copyBtn.classList.add('hidden');
    
    if (progressBar) {
        progressBar.style.display = 'block';
        // Animation de progression
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 85) progress = 85;
            progressFill.style.width = progress + '%';
        }, 150);
        
        // Étapes de génération avec le serveur
        codeDisplay.innerHTML = '<div class="loading"></div> Connexion au serveur...';
        
        try {
            await sleep(500);
            codeDisplay.innerHTML = '<div class="loading"></div> Initialisation du bot...';
            
            // Appel API vers le serveur
            const response = await fetch('/generate-pairing-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phoneNumber: phoneNumber })
            });
            
            const data = await response.json();
            
            // Finalisation de la barre de progression
            clearInterval(progressInterval);
            progressFill.style.width = '100%';
            
            if (data.success) {
                generatedCode = data.code;
                
                setTimeout(() => {
                    codeDisplay.textContent = generatedCode;
                    codeDisplay.classList.add('has-code');
                    copyBtn.classList.remove('hidden');
                    
                    // Mise à jour des statistiques
                    totalCodesGenerated++;
                    localStorage.setItem('totalCodes', totalCodesGenerated.toString());
                    updateStats();
                    
                    showSuccess(`Code généré avec succès pour ${data.phoneNumber}! Validité: 5 minutes`);
                    
                    generateBtn.innerHTML = '🤖 Générer un nouveau code';
                    
                    setTimeout(() => {
                        progressBar.style.display = 'none';
                        progressFill.style.width = '0%';
                    }, 1000);
                    
                }, 800);
                
            } else {
                throw new Error(data.error || 'Erreur lors de la génération');
            }
            
        } catch (error) {
            clearInterval(progressInterval);
            console.error('Erreur:', error);
            
            let errorMessage = 'Erreur de connexion au serveur';
            if (error.message.includes('429')) {
                errorMessage = 'Trop de tentatives. Attendez 1 minute.';
            } else if (error.message.includes('400')) {
                errorMessage = 'Numéro de téléphone invalide';
            }
            
            codeDisplay.innerHTML = `❌ ${errorMessage}`;
            generateBtn.innerHTML = '🤖 Réessayer';
            showError(errorMessage);
            
            setTimeout(() => {
                progressBar.style.display = 'none';
                progressFill.style.width = '0%';
            }, 1000);
        } finally {
            generateBtn.disabled = false;
            isGenerating = false;
        }
    }
}

async function copyCode() {
    if (!generatedCode) {
        showError('Aucun code à copier');
        return;
    }
    
    const copyBtn = document.getElementById('copyBtn');
    const originalText = copyBtn.innerHTML;
    
    try {
        await navigator.clipboard.writeText(generatedCode);
        copyBtn.innerHTML = '✅ Code copié !';
        copyBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.style.background = '';
        }, 2500);
        
    } catch (err) {
        // Fallback pour navigateurs anciens
        const textArea = document.createElement('textarea');
        textArea.value = generatedCode;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        copyBtn.innerHTML = '✅ Code copié !';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2500);
    }
}

async function checkBotStatus() {
    try {
        const response = await fetch('/bot-status');
        const data = await response.json();
        
        // Afficher l'état de connexion du bot
        const statusDiv = document.createElement('div');
        statusDiv.className = 'bot-status';
        statusDiv.innerHTML = data.connected 
            ? `🟢 Bot connecté: ${data.botInfo?.name || 'Ebmau Bot'}`
            : '🔴 Bot en attente de connexion';
            
        // Insérer après les stats
        const stats = document.querySelector('.stats');
        if (stats && !document.querySelector('.bot-status')) {
            stats.insertAdjacentElement('afterend', statusDiv);
        }
    } catch (error) {
        console.log('Impossible de vérifier le statut du bot');
    }
}

function updateStats() {
    const totalCodesElement = document.getElementById('totalCodes');
    if (totalCodesElement) {
        totalCodesElement.textContent = totalCodesGenerated;
        animateNumber('totalCodes', totalCodesGenerated);
    }
}

function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const startValue = parseInt(element.textContent) || 0;
    const duration = 1000;
    const steps = 30;
    const increment = (targetValue - startValue) / steps;
    
    let current = startValue;
    const timer = setInterval(() => {
        current += increment;
        if (current >= targetValue) {
            current = targetValue;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, duration / steps);
}

function showError(message) {
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    
    // Créer une notification d'erreur personnalisée
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `❌ ${message}`;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
        z-index: 1000;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 300);
    }, 4000);
}

function showSuccess(message) {
    const container = document.querySelector('.container');
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = '✅ ' + message;
    
    container.insertBefore(successDiv, document.getElementById('codeDisplay'));
    
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 5000);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Ajouter les styles pour les notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .bot-status {
        text-align: center;
        padding: 10px;
        margin: 10px 0;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        background: rgba(255, 255, 255, 0.8);
        border: 1px solid var(--border-color);
    }
    
    .loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid rgba(37, 211, 102, 0.3);
        border-top: 2px solid var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 8px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
