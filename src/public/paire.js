// ==========================
// Parrainage - Lien de parrainage
// ==========================
document.addEventListener("DOMContentLoaded", function () {
    // Ajout gestion bouton parrainage
    const referralBtn = document.getElementById('referralBtn');
    const referralLinkDisplay = document.getElementById('referralLinkDisplay');
    const copyReferralBtn = document.getElementById('copyReferralBtn');

    if (referralBtn) {
        referralBtn.addEventListener('click', function () {
            const phone = document.getElementById('phoneNumber').value.trim();
            if (!phone || !validatePhoneNumber(phone)) {
                referralLinkDisplay.textContent = "Entre ton numéro WhatsApp valide pour générer ton lien !";
                referralLinkDisplay.classList.remove("hidden");
                copyReferralBtn.classList.add("hidden");
                return;
            }

            // Génère le lien avec ?ref=ID
            const baseUrl = window.location.origin + window.location.pathname;
            const referralCode = btoa(phone); // encode le numéro
            const referralLink = `${baseUrl}?ref=${referralCode}`;

            referralLinkDisplay.textContent = referralLink;
            referralLinkDisplay.classList.remove("hidden");
            copyReferralBtn.classList.remove("hidden");

            copyReferralBtn.onclick = () => {
                navigator.clipboard.writeText(referralLink);
                copyReferralBtn.textContent = "✅ Lien copié !";
                setTimeout(() => {
                    copyReferralBtn.textContent = "📋 Copier le lien de parrainage";
                }, 2000);
            };
        });
    }

    // Détecte la visite via un lien de parrainage
    const params = new URLSearchParams(window.location.search);
    if (params.has('ref')) {
        const refCode = params.get('ref');
        let inviterPhone = '';
        try {
            inviterPhone = atob(refCode);
        } catch {
            inviterPhone = '(Invalide)';
        }
        const globalErrorContainer = document.getElementById('globalErrorContainer');
        if (globalErrorContainer) {
            globalErrorContainer.innerHTML = 
              `<div class="info-message">🔗 Tu as été invité par le numéro WhatsApp : <b>${inviterPhone}</b></div>`;
        }

        // Ici, tu peux ajouter un appel API pour enregistrer le parrainage coté backend
        // fetch('/api/enregistrer-parrainage', {method: 'POST', body: JSON.stringify({parrain: inviterPhone, filleul: ...})})
    }
});
