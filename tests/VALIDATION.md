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

# Correction 1.0.1 — 25 novembre 2026

## Problème signalé

Dans Brave avec ChatGPT en français, le bouton flottant n’apparaît pas. L’extrait DOM fourni confirme que le microphone porte déjà `data-dictation-button="idle"`, indépendamment du libellé `Dicter`. Le bouton d’envoi fourni porte `aria-label="Envoyer"`, qui n’était pas reconnu par la version 1.0.0.

La cause exacte de l’absence du bouton n’a pas été observée directement dans Brave. Deux conditions bloquantes de la première implémentation ont été corrigées et reproduites dans les tests : l’activation dépendait d’un conteneur particulier, et une transition native depuis `idle` avant le traitement de `click` empêchait la reconnaissance du microphone.

## Changements

- Détection en capture sur `pointerdown`, puis au clavier, sans annuler les événements natifs.
- Suivi des transitions natives depuis `idle`, y compris avant la première activation et lorsqu’une réponse précédente est déjà lisible.
- Activation indépendante du conteneur principal spécifique ; prise en charge des conteneurs `main` et `ds-document-layout` observés.
- Alias d’envoi français vérifié (`Envoyer`) ; conservation de l’anglais.
- Alias français de lecture/génération et de nouvelle conversation ; arrêt en suivant le bouton natif de lecture déjà identifié plutôt que son libellé traduit.
- Aucun changement des permissions et aucune désactivation des protections Brave.

## Vérifications et limites

- **11/11 tests unitaires réussis** pour la machine à états.
- **32/32 tests d’intégration réussis dans chacune des deux variantes (anglais et français)**.
- Deux variantes d’intégration : anglaise et française ; la seconde utilise le conteneur `main`, `Dicter`, `Envoyer`, `Lire à voix haute` et un libellé d’arrêt audio volontairement différent.
- Les tests reproduisent le changement d’état du microphone avant `click`, l’activation au clavier, l’absence de conteneur spécifique, et une nouvelle dictée native alors qu’une ancienne réponse était encore lisible.
- Les extraits Brave fournis concernent le microphone et l’envoi. Les alias français des autres contrôles sont validés sur la fixture, sans inspection directe dans Brave.
- Brave n’est ni installé sur le serveur ni connecté aux outils de navigateur : l’intégration s’exécute dans Chrome. La confirmation dans Brave doit suivre le rechargement de l’extension 1.0.1 et de l’onglet ChatGPT.
