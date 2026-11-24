# ChatGPT Vocal

Extension Chrome Manifest V3 pour déclencher la **lecture native** de la dernière réponse ChatGPT depuis un bouton flottant, après utilisation de la dictée native. JavaScript et CSS natifs, sans compilation ni dépendance.

## Installation locale

1. Ouvrir `chrome://extensions` dans Chrome.
2. Activer **Mode développeur**.
3. Choisir **Charger l’extension non empaquetée** et sélectionner `/opt/chatGPT_vocal` (le dossier contenant `manifest.json`).
4. Recharger les onglets `https://chatgpt.com` déjà ouverts.

Après une modification du code, recharger l’extension dans `chrome://extensions`, puis recharger ChatGPT. Aucune installation automatique dans le profil Chrome n’est effectuée par ce dépôt.

## Utilisation

- Aucun bouton avant un clic sur la dictée native. Le bouton de conversation vocale est exclu.
- Après dictée : bouton gris, en attente d’un **nouveau message envoyé**, puis d’une nouvelle réponse terminée.
- Bouton vert : cliquer pour lire la dernière réponse, ou appuyer sur **Espace** hors d’un champ éditable et hors d’un contrôle interactif.
- Bouton rouge avec carré : arrêter la lecture native. Espace conserve son comportement normal pendant la lecture.
- Déplacer le bouton par clic gauche maintenu. Un déplacement d’au moins 5 px empêche le clic de lecture. Le déplacement reste possible quand le bouton est gris.
- La position initiale est en bas à gauche, à 96 px du bas. La position est bornée au viewport et enregistrée à la fin d’un déplacement.
- Changer de conversation masque le bouton et efface son activation. Le premier envoi depuis une nouvelle conversation conserve l’activation lorsque son identifiant apparaît dans l’URL.

L’activation n’est pas restaurée après un rechargement de page. Seule la position est persistée.

## Architecture

| Fichier | Rôle |
| --- | --- |
| `manifest.json` | Injection uniquement sur `https://chatgpt.com/*`, MV3 |
| `state.js` | Machine à états indépendante du DOM, identité de conversation, réponse autorisée |
| `content.js` | Sélecteurs, événements, observation du DOM, lecture native, raccourci et déplacement |
| `styles.css` | Apparence du bouton, sans conteneur interceptant les clics voisins |
| `specs.md` | Cahier des charges original |
| `tests/` | Tests Node sans dépendance et interface locale de tests d’intégration |

États : `inactive`, `waiting`, `generating`, `ready`, `playing`. Chaque envoi désactive immédiatement la lecture. L’identifiant du tour autorisé est conservé en mémoire : si ChatGPT démonte ce tour lors du défilement, une ancienne réponse visible ne le remplace pas. La lecture redevient possible si le tour courant est remonté dans le DOM.

L’observateur vise le conteneur principal de ChatGPT, sans observer le texte en cours de streaming, les classes ou les styles. Ses notifications sont regroupées par animation frame. Lorsqu’il n’y a aucune activation, elles ne déclenchent pas de recherche des réponses. Un observateur temporaire plus large sert uniquement à attendre l’apparition du conteneur initial. Les navigations internes sont suivies par `navigation.currententrychange`, avec `popstate` et les liens internes. Aucun polling ni intervalle permanent. Une garde empêche la duplication à la réinjection.

## Permissions et confidentialité

- Seule permission explicite : **storage**, pour `chrome.storage.local.floatingPosition`, contenant uniquement `{x, y}`.
- Le périmètre de l’injection est limité à `https://chatgpt.com/*`, dans la fenêtre principale.
- Pas de permission microphone, onglets, historique ou accès général aux sites.
- Pas de moteur TTS, de requête réseau, d’API externe, de télémétrie, de code distant ou d’`eval`.
- Aucun texte de conversation n’est lu ou enregistré par le code de l’extension. Les identifiants nécessaires au suivi restent uniquement en mémoire.
- Le clic délégué à la fonction native de ChatGPT peut naturellement entraîner les communications du service ChatGPT et l’usage de sa dictée ; l’extension ne les implémente pas.

## Sélecteurs et limites de compatibilité

Les sélecteurs sont centralisés dans `SELECTORS` au début de `content.js`. Ils ont été inspectés le **24 novembre 2026**, sur la session ChatGPT authentifiée du Chrome du serveur :

| Élément observé | Attributs utilisés |
| --- | --- |
| Dictée inactive | `button[data-dictation-button="idle"]` |
| Conversation vocale exclue | `button[data-composer-voice-start="true"]` |
| Conteneur principal | `[data-app-shell-main-content-layout]` |
| Transcript courant | `[data-chatgpt-conversation-selection-target][data-rail-chat-transcript]` |
| Tour | `[data-turn-key]` |
| Rôle assistant | `[data-conversation-role="assistant"]` |
| État terminé | `[data-talvt-turn-state="complete"]`, combiné à la présence du contrôle de lecture |
| Envoi / génération | `button[aria-label="Send"]` / `button[aria-label="Stop"]` |
| Lecture / arrêt | `button[aria-label="Read aloud"][aria-pressed="false"]` / `button[aria-label="Stop reading aloud"][aria-pressed="true"]` |
| Nouvelle conversation | `button.sidebar-item` dont le texte est `New chat` |
| Compositeur | `[contenteditable="true"][data-composer-markdown]` |

Les libellés vérifiés étaient **en anglais**. Les autres langues et anciennes variantes de l’interface ne sont pas couvertes par des sélecteurs supposés. Si les attributs changent, inspecter les éléments réels dans les outils développeur, modifier cette table de sélecteurs, puis rejouer les tests. En l’absence d’un état ou d’un contrôle reconnu, la lecture reste indisponible.

La capture de la dictée correspond à l’activation du bouton natif, même si l’utilisateur annule ensuite l’enregistrement. Le bouton reste alors gris jusqu’à un nouvel envoi. Les envois suivis sont le bouton natif **Send** et **Entrée** dans le compositeur (sans modificateur). Les mécanismes d’envoi externes au compositeur ne sont pas pris en charge. Une réponse démontée par la virtualisation n’est pas lue tant que ChatGPT ne remet pas son contrôle natif dans le DOM : aucune tentative de lecture d’une réponse plus ancienne n’est faite.

## Vérification

Prérequis de développement : Node.js pour les tests unitaires ; Python 3 et un navigateur pour la page locale. Rien n’est requis pour charger l’extension elle-même.

```sh
cd /opt/chatGPT_vocal
node --check content.js
node --check state.js
node --test tests/state.test.cjs
python3 -m http.server 18765 --bind 127.0.0.1
```

Ouvrir ensuite `http://127.0.0.1:18765/tests/browser.html`. Cette page exécute le vrai `content.js` sur un DOM simulant les attributs observés, avec stockage et contrôles audio simulés. Elle ne contacte pas ChatGPT et n’accède pas au microphone. Le serveur local sert uniquement au développement et peut être arrêté après les tests.

Les événements Pointer Events synthétiques des tests ne peuvent pas établir une capture native du pointeur : seule cette capture est simulée. Le cycle complet d’une vraie dictée et l’extension effectivement chargée dans le profil Chrome doivent encore être vérifiés manuellement après installation. Le plan de recette complet reste dans `specs.md` ; ses cases ne sont pas cochées pour des validations uniquement simulées.
