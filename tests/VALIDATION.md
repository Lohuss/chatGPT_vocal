# Validation du 24 novembre 2026

- Syntaxe : `node --check` sur `state.js`, `content.js` et les scripts de la page de test : OK.
- Machine à états : `node --test tests/state.test.cjs` : **11/11 tests réussis**.
- Intégration dans Google Chrome du serveur : `tests/browser.html` : **26/26 tests réussis**.
- Manifest MV3 : JSON valide, permission limitée à `storage`, injection uniquement sur `https://chatgpt.com/*`, fichiers référencés présents.
- Revue des scripts distribués : pas de polling, API réseau, TTS indépendant, accès microphone, code distant ou `eval`.

## Inspection réelle de ChatGPT

Session Chrome authentifiée : dictée et conversation vocale distinguées par leurs attributs ; envoi suivi d’une génération avec bouton `Stop`, puis contrôle `Read aloud` disponible ; lecture et arrêt natifs vérifiés ; URL `/` devenue `/c/<id>` au premier envoi ; structure du transcript et des tours inspectée. Les sélecteurs réellement utilisés sont documentés dans le README.

## Portée des tests d’intégration

Le vrai code de l’extension est exécuté dans une page locale. La page simule les contrôles ChatGPT et le stockage Chrome, avec les attributs observés. Les tests couvrent les états, les clics de lecture et d’arrêt, Espace et ses exclusions, le drag et la fréquence des écritures, les limites du viewport, la virtualisation, les envois successifs, les changements de conversation, l’apparition du premier identifiant, la réinjection et la création d’une nouvelle conversation sans changement d’URL.

La capture native du pointeur est simulée pour les événements synthétiques. Les tests ne prétendent pas valider un cycle microphone réel ni une installation dans le profil Chrome. Une recette manuelle après chargement local de l’extension reste nécessaire ; le cahier des charges original est conservé sans cocher artificiellement ses cases.
