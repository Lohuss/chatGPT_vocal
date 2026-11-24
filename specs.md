# Projet — Extension Chrome pour la lecture vocale de ChatGPT

## 1. Objectif

Développer une extension Chrome minimaliste permettant de combiner :

- La dictée vocale native de ChatGPT.
- Les capacités du mode conversation textuelle.
- La lecture à voix haute native des réponses.
- Une interface adaptée à une utilisation multitâche, sans avoir à scroller jusqu'à la fin des réponses.

## 2. Comportement fonctionnel

### Activation

- L'extension fonctionne exclusivement sur `chatgpt.com`.
- Par défaut, aucun bouton supplémentaire n'est affiché.
- Détecter l'activation de la dictée vocale native, à distinguer du mode conversation vocale.
- Dès la première activation de la dictée, afficher un bouton flottant.
- Conserver ce bouton pendant toute la conversation, même si les messages suivants sont saisis au clavier.

### Gestion des conversations

- Utiliser l'identifiant de conversation présent dans l'URL comme référentiel.
- Réinitialiser l'état et masquer le bouton lors d'un changement de conversation.
- Gérer le cas particulier d'une nouvelle conversation dont l'identifiant apparaît après l'envoi du premier message.
- Prendre en charge la navigation interne de ChatGPT sans rechargement complet de la page.

### États du bouton

| État | Apparence | Comportement |
|---|---|---|
| Inactif | Invisible | Aucune dictée activée |
| En attente | Gris | Attend une nouvelle réponse |
| Génération | Gris | Lecture indisponible |
| Disponible | Coloré | Lecture de la dernière réponse |
| Lecture | Icône d'arrêt | Permet d'interrompre la lecture si l'interface native le permet |

Ne pas permettre la lecture accidentelle d'une ancienne réponse pendant l'attente ou la génération d'une nouvelle réponse.

### Lecture vocale

- Déclencher le mécanisme natif « Lire à voix haute » de ChatGPT.
- Ne pas implémenter de moteur TTS indépendant.
- Ne pas utiliser d'API externe.
- Permettre le déclenchement par clic sur le bouton flottant ou par la touche Espace.
- Intercepter Espace uniquement lorsque la lecture est disponible et qu'aucun champ éditable ou autre contrôle interactif n'a le focus.
- Préserver le comportement natif de la touche dans les autres situations.

### Positionnement

- Position initiale en bas à gauche de l'interface, au-dessus des éventuels contrôles existants.
- Bouton flottant déplaçable par maintien du clic gauche.
- Utiliser un seuil de déplacement d'environ 5 pixels pour distinguer un clic d'un drag.
- Mémoriser localement la position.
- Empêcher le bouton de sortir de la zone visible.
- Ne pas intercepter les interactions autour du bouton.
- Autoriser son déplacement même lorsque la lecture est indisponible.

## 3. Architecture technique

Utiliser Chrome Manifest V3, JavaScript natif et CSS.

Structure indicative :

- `manifest.json`
- `content.js`
- `styles.css`
- `README.md`

Aucun framework ni processus de compilation sauf nécessité démontrée.

### Performances

Privilégier une architecture événementielle :

- Écoute des interactions utilisateur.
- MutationObserver ciblé pour détecter les changements pertinents du DOM.
- Détection des changements de conversation.
- Machine à états explicite.
- Événements Pointer Events pour le déplacement.

Éviter :

- Le polling.
- Les intervalles de vérification permanents.
- Les parcours complets et répétés du DOM.
- Les observateurs inutilement larges.
- Les écritures répétées dans le stockage pendant un déplacement.
- Les écouteurs dupliqués lors des navigations internes.

Effectuer les vérifications les moins coûteuses en premier et interrompre rapidement les traitements inutiles.

### Sécurité

- Périmètre limité à `https://chatgpt.com/*`.
- Principe du moindre privilège.
- Aucune dépendance tierce.
- Aucune télémétrie.
- Aucune communication réseau initiée par l'extension.
- Aucune collecte ni conservation du contenu des conversations.
- Aucun accès direct au microphone.
- Aucun code distant.
- Aucun usage d'eval.
- Installation locale en mode développeur.

## 4. Maintenance

Ne pas surconcevoir la résistance aux futures modifications de l'interface ChatGPT.

Centraliser les sélecteurs DOM pour faciliter leur modification manuelle.

En cas de changement incompatible de l'interface, privilégier une désactivation propre de la fonctionnalité plutôt qu'un comportement imprévisible.

## 5. Vérifications préalables

Avant l'implémentation, inspecter l'interface réelle de ChatGPT pour identifier :

- Le bouton de dictée vocale.
- Le bouton de conversation vocale, à exclure.
- Les indicateurs de génération en cours et de fin de génération.
- Les conteneurs des réponses assistant.
- Le bouton natif de lecture à voix haute.
- Les éventuels contrôles d'arrêt de lecture.
- Le mécanisme de navigation entre conversations.

Ne pas inventer de sélecteurs DOM non vérifiés. Si l'accès à une session ChatGPT authentifiée est nécessaire, demander à l'utilisateur de fournir les éléments DOM pertinents.

## 6. Tests d'acceptation

- [ ] Aucun bouton avant utilisation de la dictée.
- [ ] Activation correcte après utilisation de la dictée.
- [ ] Aucune activation depuis le mode conversation vocale.
- [ ] Conservation du bouton après un message écrit au clavier.
- [ ] Désactivation pendant la génération.
- [ ] Activation à la fin de la génération.
- [ ] Lecture de la dernière réponse uniquement.
- [ ] Fonctionnement du raccourci Espace.
- [ ] Absence d'interférence avec la saisie et les contrôles natifs.
- [ ] Déplacement du bouton sans déclencher la lecture.
- [ ] Mémorisation de la position.
- [ ] Réinitialisation lors d'un changement de conversation.
- [ ] Fonctionnement lors de la création d'une nouvelle conversation.
- [ ] Absence de duplication des boutons et écouteurs.
- [ ] Absence de polling permanent et de communication réseau externe.

## 7. Livrables

Produire une extension fonctionnelle, directement chargeable dans Chrome, accompagnée d'un README expliquant l'installation, l'architecture, les permissions et la maintenance des sélecteurs.

Privilégier la simplicité, la sécurité, la lisibilité du code et l'efficacité computationnelle. Ne pas ajouter de fonctionnalités non demandées.