document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateBtn');
    const codeDisplay = document.getElementById('codeDisplay');
    const copyBtn = document.getElementById('copyBtn');
    const phoneNumberInput = document.getElementById('phoneNumber');
    
    // Événement pour le bouton "Générer le code"
    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<div class="loading"></div> Connexion en cours...';
            codeDisplay.innerHTML = 'Génération du code de connexion...';
            copyBtn.classList.add('hidden');
            phoneNumberInput.disabled = true;

            try {
                const response = await fetch('/pairing-code');
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.code) {
                        codeDisplay.innerText = data.code;
                        codeDisplay.classList.add('has-code');
                        copyBtn.classList.remove('hidden');
                        generateBtn.innerHTML = '🤖 Générer un nouveau code';
                    } else {
                        codeDisplay.innerText = "Code non disponible, veuillez réessayer.";
                        generateBtn.innerHTML = '🤖 Réessayer';
                    }
                } else {
                    throw new Error('Erreur HTTP: ' + response.status);
                }
            } catch (error) {
                console.error('Erreur:', error);
                codeDisplay.innerText = "Erreur de connexion au serveur.";
                generateBtn.innerHTML = '🤖 Réessayer';
            } finally {
                generateBtn.disabled = false;
                phoneNumberInput.disabled = false;
            }
        });
    }

    // Événement pour le bouton "Copier le code"
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const code = codeDisplay.innerText;
            if (code && code !== 'Génération du code de connexion...') {
                try {
                    await navigator.clipboard.writeText(code);
                    const originalText = copyBtn.innerHTML;
                    copyBtn.innerHTML = '✅ Code copié !';
                    setTimeout(() => {
                        copyBtn.innerHTML = originalText;
                    }, 2000);
                } catch (err) {
                    console.error('Échec de la copie:', err);
                    alert("Impossible de copier le code. Veuillez le faire manuellement.");
                }
            }
        });
    }
});
