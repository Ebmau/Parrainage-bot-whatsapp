# 🤝 Guide de Contribution - Mon Bot de parrainage pour WhatsApp 

Merci de votre intérêt pour contribuer à Ebmau Bot ! Ce guide vous aidera à participer efficacement au projet.

## 🚀 Comment Contribuer

### Types de Contributions Acceptées

- 🐛 **Corrections de bugs** - Résolution de problèmes existants
- ✨ **Nouvelles fonctionnalités** - Amélioration de l'application  
- 📚 **Documentation** - Guides, tutoriels, corrections
- 🎨 **Design** - Interface utilisateur, UX/UI
- 🌍 **Traductions** - Support multilingue
- 🔒 **Sécurité** - Signalement et correction de vulnérabilités
- 🧪 **Tests** - Amélioration de la couverture de tests
- ⚡ **Performance** - Optimisations et amélirations

## 📋 Avant de Commencer

### Prérequis
- 📝 Compte GitHub actif
- 💻 Éditeur de code (VS Code recommandé)
- 🌐 Navigateur moderne pour les tests
- 📱 Appareil mobile pour tester la responsivité

### Configuration de l'Environnement
```bash
# 1. Fork le repository
git clone https://github.com/[votre-nom]/ebmau-whatsapp-bot.git
cd ebmau-whatsapp-bot

# 2. Créer une branche de travail
git checkout -b feature/ma-super-fonctionnalite

# 3. Ouvrir avec votre éditeur
code . # Pour VS Code
```

## 🔄 Processus de Contribution

### 1. Planification
- 📋 Vérifiez les [Issues existantes](https://github.com/[votre-nom]/ebmau-whatsapp-bot/issues)
- 💡 Créez une nouvelle issue pour discuter de votre idée
- 🎯 Attendez l'approbation pour les grandes fonctionnalités

### 2. Développement
```bash
# Travaillez sur votre branche
git add .
git commit -m "feat: ajouter authentification biométrique"

# Suivez la convention de commit (voir plus bas)
git commit -m "fix: corriger validation numéro mobile"
git commit -m "docs: mettre à jour guide installation"
```

### 3. Tests Obligatoires
Avant de soumettre :
- [ ] ✅ Test sur Chrome/Firefox/Safari
- [ ] ✅ Test sur mobile (responsive)
- [ ] ✅ Test PWA (installation/fonctionnement hors-ligne)
- [ ] ✅ Test génération de codes
- [ ] ✅ Test validation des numéros
- [ ] ✅ Vérification des erreurs console
- [ ] ✅ Test accessibilité (lecteurs d'écran)

### 4. Soumission
```bash
# Push votre branche
git push origin feature/ma-super-fonctionnalite

# Créer une Pull Request sur GitHub
# Titre : "✨ Authentification biométrique"
# Description : Détaillez vos changements
```

## 📝 Convention de Commits

Utilisez la convention [Conventional Commits](https://www.conventionalcommits.org/) :

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types Acceptés
- `feat:` ✨ Nouvelle fonctionnalité
- `fix:` 🐛 Correction de bug
- `docs:` 📚 Documentation
- `style:` 💎 Formatage, style
- `refactor:` ♻️ Refactorisation du code
- `perf:` ⚡ Amélioration performance
- `test:` 🧪 Ajout/modification de tests
- `chore:` 🔧 Maintenance, configuration
- `security:` 🔒 Correctif de sécurité

### Exemples
```bash
feat: ajouter support mode sombre
fix: corriger génération codes sur Safari
docs: ajouter guide d'installation PWA
style: améliorer espacement interface mobile
refactor: optimiser fonction de validation
perf: réduire taille bundle de 30%
security: encoder entrées utilisateur pour XSS
```

## 🎨 Standards de Code

### HTML
```html
<!-- Utilisez l'indentation 2 espaces -->
<div class="container">
  <h1>Ebmau Bot</h1>
  <p class="subtitle">Description</p>
</div>

<!-- Attributs sur nouvelles lignes si > 3 -->
<input 
  type="tel" 
  class="phone-input" 
  id="phoneNumber"
  placeholder="+33123456789"
  maxlength="15"
  autocomplete="tel"
>
```

### CSS
```css
/* Utilisez les custom properties */
:root {
  --primary-color: #25D366;
  --border-radius: 12px;
}

/* Classes organisées par composant */
.container {
  background: var(--bg-light);
  border-radius: var(--border-radius);
  /* Propriétés par ordre alphabétique */
}

/* Media queries à la fin */
@media (max-width: 480px) {
  .container {
    padding: 20px;
  }
}
```

### JavaScript
```javascript
// Utilisez const/let, pas var
const CONFIG = {
  MAX_ATTEMPTS: 3,
  COOLDOWN_TIME: 3000
};

// Fonctions documentées
/**
 * Valide un numéro de téléphone international
 * @param {string} phoneNumber - Le numéro à valider
 * @returns {boolean} True si valide
 */
function validatePhoneNumber(phoneNumber) {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}

// Gestion d'erreurs
try {
  const result = await generatePairCode();
  handleSuccess(result);
} catch (error) {
  handleError('Génération échouée', error);
}
```

## 🧪 Tests et Qualité

### Tests Manuels Obligatoires
```javascript
// Test de fonctionnalité basique
function testBasicFunctionality() {
  console.group('🧪 Tests Fonctionnels');
  
  // Test 1: Génération de code
  console.assert(
    generatedCode.length === 9, // XXXX-XXXX
    'Code doit faire 9 caractères'
  );
  
  // Test 2: Validation numéro
  console.assert(
    validatePhoneNumber('+33123456789') === true,
    'Numéro français valide'
  );
  
  console.assert(
    validatePhoneNumber('123456789') === false,
    'Numéro sans indicatif invalide'
  );
  
  console.groupEnd();
}
```

### Performance
- ⚡ **Lighthouse Score** : Minimum 90/100
- 📦 **Taille** : Pas d'augmentation > 10KB
- 🚀 **Load Time** : < 2 secondes
- 📱 **Mobile Friendly** : Test Google requis

### Accessibilité
```html
<!-- Labels obligatoires -->
<label for="phoneNumber">Numéro de téléphone</label>
<input id="phoneNumber" aria-describedby="phone-help">
<div id="phone-help">Format: +33123456789</div>

<!-- Contraste suffisant -->
<!-- Ratio minimum 4.5:1 pour le texte normal -->
<!-- Navigation clavier fonctionnelle -->
```

## 🌍 Internationalisation

### Ajouter une Langue
1. **Créer le fichier de traduction**
```javascript
// i18n/fr.js
const translations_fr = {
  'title': 'Ebmau Bot',
  'subtitle': 'Connectez votre bot WhatsApp',
  'generate_button': 'Générer le code',
  'copy_button': 'Copier le code',
  'phone_label': 'Numéro WhatsApp',
  'phone_placeholder': '+33123456789',
  'error_invalid_format': 'Format invalide',
  'success_generated': 'Code généré avec succès'
};
```

2. **Intégrer dans l'HTML**
```javascript
function setLanguage(lang) {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });
}
```

### Langues Prioritaires
1. 🇫🇷 **Français** - Langue principale
2. 🇺🇸 **Anglais** - International  
3. 🇪🇸 **Espagnol** - Large audience
4. 🇩🇪 **Allemand** - Europe
5. 🇦🇷 **Arabe** - Afrique du Nord

## 🎯 Fonctionnalités Demandées

### Priorité Haute 🔥
- [ ] **Mode sombre automatique** (system preference)
- [ ] **Historique des codes** (stockage local)
- [ ] **Export des statistiques** (JSON/CSV)
- [ ] **Notifications push** (PWA)

### Priorité Moyenne ⚡
- [ ] **QR Code alternatif** pour connexion
- [ ] **Thèmes personnalisables** (couleurs)
- [ ] **Raccourcis clavier** (génération, copie)
- [ ] **Mode développeur** (debug info)

### Priorité Basse 💡
- [ ] **Intégration Telegram Bot** 
- [ ] **API REST** pour intégrations
- [ ] **Système de plugins**
- [ ] **Dashboard analytics**

## 🐛 Signalement de Bugs

### Template d'Issue Bug
```markdown
## 🐛 Description du Bug
Décrivez clairement le problème rencontré.

## 🔄 Étapes pour Reproduire
1. Aller sur la page...
2. Cliquer sur '....'
3. Faire défiler vers le bas jusqu'à '....'
4. Voir l'erreur

## ✅ Comportement Attendu
Décrivez ce qui devrait se passer.

## 📱 Environnement
- OS: [ex: Windows 10, macOS Big Sur, Android 11]
- Navigateur: [ex: Chrome 96, Firefox 94, Safari 15]
- Appareil: [ex: iPhone 13, Samsung Galaxy S21, Desktop]
- Résolution: [ex: 1920x1080, 375x667]

## 📸 Captures d'Écran
Si applicable, ajoutez des captures d'écran.

## 📋 Informations Additionnelles
Console errors, network requests, etc.
```

## 💡 Proposition de Fonctionnalité

### Template d'Issue Feature
```markdown
## ✨ Fonctionnalité Proposée
Description claire et concise de la fonctionnalité souhaitée.

## 🎯 Problème Résolu
Quel problème cette fonctionnalité résoudrait-elle ?

## 💭 Solution Proposée
Décrivez votre idée de solution.

## 🔄 Alternatives Considérées
Autres solutions envisagées.

## 📊 Impact Utilisateur
- Qui bénéficierait de cette fonctionnalité ?
- Quel est le niveau de priorité ?

## 🛠️ Complexité Technique
- Simple / Moyenne / Complexe
- Ressources nécessaires
- Délai estimé
```

## 🏆 Reconnaissance des Contributeurs

### Hall of Fame
Les contributeurs sont reconnus dans :
- 📄 README.md (section contributeurs)
- 🏷️ Releases GitHub (changelog)
- 🐦 Réseaux sociaux (remerciements)
- 📧 Newsletter mensuelle

### Système de Points
- 🐛 **Bug Fix** : 10 points
- ✨ **Feature** : 25 points  
- 📚 **Documentation** : 15 points
- 🔒 **Security** : 50 points
- 🎨 **UI/UX** : 20 points

### Récompenses
- 🥇 **100+ points** : Accès early-access aux nouvelles versions
- 🥈 **250+ points** : Stickers et goodies Ebmau Bot
- 🥉 **500+ points** : Co-maintainer status
- 👑 **1000+ points** : Mention spéciale + récompense personnalisée

## 📞 Support et Communication

### Canaux de Communication
- 💬 **GitHub Issues** : Bugs et fonctionnalités
- 🗨️ **GitHub Discussions** : Questions générales
- 📧 **Email** : contact@ebmau.dev
- 💻 **Discord** : Serveur Ebmau Bot (lien dans README)

### Temps de Réponse
- 🐛 **Bugs critiques** : 24h
- ✨ **Nouvelles fonctionnalités** : 72h
- 📚 **Documentation** : 48h  
- 💬 **Questions générales** : 5 jours

### Code de Conduite
- ✅ Respectueux et professionnel
- ✅ Constructif dans les critiques
- ✅ Inclusif et accueillant
- ❌ Pas de harcèlement ou discrimination
- ❌ Pas de spam ou autopromotion

## 📚 Ressources Utiles

### Documentation Technique
- [MDN Web Docs](https://developer.mozilla.org/) - Référence HTML/CSS/JS
- [PWA Builder](https://www.pwabuilder.com/) - Outils PWA
- [Web.dev](https://web.dev/) - Best practices web

### Outils Recommandés
- **VS Code** avec extensions :
  - Live Server
  - Prettier
  - ESLint
  - HTML CSS Support
- **Browser DevTools** (Chrome/Firefox)
- **Lighthouse** pour l'audit
- **Git** pour le versionning

### Design System
- **Couleurs** : Palette WhatsApp + variations
- **Typography** : System fonts (Segoe UI, SF Pro)
- **Icons** : Émojis natifs + Lucide (si nécessaire)
- **Spacing** : Système 8px base
- **Animations** : CSS transitions, pas de JS

---

## 🎉 Merci de Contribuer !

Votre contribution, quelle que soit sa taille, fait la différence. Ensemble, nous rendons Ebmau Bot meilleur pour tous ! 

**Questions ?** N'hésitez pas à créer une issue ou nous contacter.

---

*Ce guide est vivant et évolue avec le projet. Dernière mise à jour : Janvier 2025*
