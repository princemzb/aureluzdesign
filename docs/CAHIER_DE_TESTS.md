# Cahier de Tests - AureLuz Design

**Version :** 1.0
**Date :** Janvier 2026
**Environnement de test :** https://www.aureluzdesign.fr
**Admin :** https://www.aureluzdesign.fr/admin

---

## Table des matières

1. [Informations générales](#1-informations-générales)
2. [Système de réservation](#2-système-de-réservation)
3. [Ouvertures exceptionnelles](#3-ouvertures-exceptionnelles)
4. [Système de devis](#4-système-de-devis)
5. [Paiement en ligne (Stripe)](#5-paiement-en-ligne-stripe)
6. [Gestion des factures](#6-gestion-des-factures)
7. [Galerie photos](#7-galerie-photos)
8. [Témoignages](#8-témoignages)
9. [Analytics](#9-analytics)
10. [Paramètres du site](#10-paramètres-du-site)

---

## 1. Informations générales

### 1.1 Accès de test

| Environnement | URL | Identifiants |
|---------------|-----|--------------|
| Site public | https://www.aureluzdesign.fr | N/A |
| Admin | https://www.aureluzdesign.fr/admin | Fournis séparément |
| Stripe (test) | Dashboard Stripe | Mode test activé |

### 1.2 Données de test Stripe

Pour les paiements en mode test, utiliser :

| Champ | Valeur |
|-------|--------|
| Numéro de carte | `4242 4242 4242 4242` |
| Date d'expiration | Toute date future (ex: `12/30`) |
| CVC | `123` |
| Code postal | `75001` |

### 1.3 Légende des statuts de test

| Statut | Signification |
|--------|---------------|
| ✅ PASS | Test réussi |
| ❌ FAIL | Test échoué |
| ⚠️ PARTIAL | Partiellement réussi |
| ⏭️ SKIP | Test ignoré |

---

## 2. Système de réservation

### TEST-RES-001 : Affichage du calendrier

**Objectif :** Vérifier que le calendrier de réservation s'affiche correctement

**Prérequis :** Aucun

**Procédure de test :**
1. Accéder à https://www.aureluzdesign.fr/booking
2. Observer le calendrier affiché

**Résultats attendus :**
- [ ] Le calendrier s'affiche avec le mois courant
- [ ] Les jours passés sont grisés et non cliquables
- [ ] Les weekends (samedi/dimanche) sont grisés par défaut
- [ ] Les boutons de navigation mois précédent/suivant fonctionnent
- [ ] La légende est visible en bas du calendrier

**Jeu de données :** N/A

---

### TEST-RES-002 : Sélection d'une date

**Objectif :** Vérifier la sélection d'une date disponible

**Prérequis :** TEST-RES-001 réussi

**Procédure de test :**
1. Cliquer sur une date disponible (jour de semaine, non grisé)
2. Observer le changement d'étape

**Résultats attendus :**
- [ ] La date sélectionnée est mise en surbrillance (couleur primaire)
- [ ] L'étape passe automatiquement à "Choix du créneau"
- [ ] L'indicateur d'étape (1-2-3) se met à jour
- [ ] Les créneaux horaires s'affichent

**Jeu de données :**
- Date de test : Premier lundi disponible dans le calendrier

---

### TEST-RES-003 : Affichage des créneaux horaires

**Objectif :** Vérifier l'affichage correct des créneaux disponibles

**Prérequis :** TEST-RES-002 réussi

**Procédure de test :**
1. Après sélection d'une date, observer les créneaux affichés
2. Vérifier les informations affichées

**Résultats attendus :**
- [ ] La date sélectionnée est affichée en haut (format : "Lundi 20 janvier")
- [ ] Les créneaux de 9h à 17h sont affichés (horaires par défaut)
- [ ] Le nombre de créneaux disponibles est indiqué
- [ ] Les créneaux déjà réservés sont grisés
- [ ] La durée "1 heure" est mentionnée

**Jeu de données :** N/A

---

### TEST-RES-004 : Sélection d'un créneau

**Objectif :** Vérifier la sélection d'un créneau horaire

**Prérequis :** TEST-RES-003 réussi

**Procédure de test :**
1. Cliquer sur un créneau disponible (non grisé)
2. Observer le changement d'étape

**Résultats attendus :**
- [ ] Le créneau sélectionné est mis en surbrillance
- [ ] L'étape passe à "Vos informations"
- [ ] Le formulaire de contact s'affiche
- [ ] Le bouton "Retour" est visible

**Jeu de données :**
- Créneau de test : `10:00`

---

### TEST-RES-005 : Remplissage du formulaire de réservation

**Objectif :** Vérifier le formulaire de réservation

**Prérequis :** TEST-RES-004 réussi

**Procédure de test :**
1. Remplir tous les champs du formulaire
2. Sélectionner un type d'événement
3. Cliquer sur "Confirmer la réservation"

**Résultats attendus :**
- [ ] Tous les champs obligatoires sont marqués
- [ ] La validation du téléphone fonctionne (format français)
- [ ] La validation de l'email fonctionne
- [ ] Le type d'événement est sélectionnable (Signature, Instants, Coaching)
- [ ] Le champ message est optionnel
- [ ] La soumission affiche un loader
- [ ] La page de confirmation s'affiche après soumission

**Jeu de données :**

| Champ | Valeur |
|-------|--------|
| Nom | `Jean Dupont` |
| Email | `test.aureluz@yopmail.com` |
| Téléphone | `06 12 34 56 78` |
| Type | `Signature` |
| Message | `Ceci est un test de réservation` |

---

### TEST-RES-006 : Page de confirmation

**Objectif :** Vérifier la page de confirmation après réservation

**Prérequis :** TEST-RES-005 réussi

**Procédure de test :**
1. Observer la page de confirmation affichée
2. Vérifier les emails reçus

**Résultats attendus :**
- [ ] Message de confirmation affiché avec le prénom du client
- [ ] Récapitulatif : date, heure, type d'événement
- [ ] Email de confirmation reçu par le client
- [ ] Email de notification reçu par l'admin

**Jeu de données :** Utiliser l'email de TEST-RES-005

---

### TEST-RES-007 : Validation des erreurs de formulaire

**Objectif :** Vérifier les messages d'erreur du formulaire

**Prérequis :** TEST-RES-004 réussi

**Procédure de test :**
1. Soumettre le formulaire avec des champs vides
2. Soumettre avec un email invalide
3. Soumettre avec un téléphone invalide

**Résultats attendus :**
- [ ] Message d'erreur pour champs vides
- [ ] Message "Email invalide" pour email incorrect
- [ ] Message d'erreur pour téléphone au mauvais format
- [ ] Les erreurs s'affichent sous les champs concernés

**Jeu de données :**

| Test | Email | Téléphone |
|------|-------|-----------|
| Email invalide | `test@` | `06 12 34 56 78` |
| Téléphone invalide | `test@test.com` | `12345` |
| Champs vides | (vide) | (vide) |

---

## 3. Ouvertures exceptionnelles

### TEST-OPEN-001 : Création d'une ouverture exceptionnelle

**Objectif :** Vérifier la création d'un créneau exceptionnel (weekend)

**Prérequis :** Accès admin

**Procédure de test :**
1. Se connecter à l'admin
2. Aller dans "Paramètres"
3. Dans la section "Ouvertures exceptionnelles", cliquer sur "Ajouter"
4. Sélectionner un samedi ou dimanche
5. Définir les horaires (ex: 10:00 - 14:00)
6. Ajouter une raison (optionnel)
7. Valider

**Résultats attendus :**
- [ ] Le formulaire s'affiche correctement
- [ ] La date est sélectionnable (y compris weekends)
- [ ] Les heures de début/fin sont configurables
- [ ] L'ouverture apparaît dans la liste après création
- [ ] Le jour de la semaine est affiché en français

**Jeu de données :**

| Champ | Valeur |
|-------|--------|
| Date | Prochain samedi |
| Heure début | `10:00` |
| Heure fin | `14:00` |
| Raison | `Ouverture exceptionnelle test` |

---

### TEST-OPEN-002 : Affichage des ouvertures dans le calendrier public

**Objectif :** Vérifier que les ouvertures exceptionnelles sont visibles côté client

**Prérequis :** TEST-OPEN-001 réussi

**Procédure de test :**
1. Accéder à https://www.aureluzdesign.fr/booking
2. Naviguer vers le mois contenant l'ouverture créée
3. Observer la date du weekend ouvert

**Résultats attendus :**
- [ ] La date du weekend est colorée en **vert**
- [ ] La date est **cliquable** (non grisée)
- [ ] La légende indique "Ouverture exceptionnelle"
- [ ] Au clic, les créneaux exceptionnels s'affichent

**Jeu de données :** Date créée dans TEST-OPEN-001

---

### TEST-OPEN-003 : Affichage des créneaux exceptionnels

**Objectif :** Vérifier que seuls les créneaux exceptionnels sont verts

**Prérequis :** TEST-OPEN-002 réussi

**Procédure de test :**
1. Cliquer sur la date verte (ouverture exceptionnelle)
2. Observer les créneaux affichés

**Résultats attendus :**
- [ ] Les créneaux de l'ouverture exceptionnelle sont colorés en **vert**
- [ ] Une icône calendrier+ apparaît sur les créneaux verts
- [ ] Le compteur indique "dont X exceptionnel(s)"
- [ ] Les créneaux verts sont cliquables

**Jeu de données :** Créneaux 10:00, 11:00, 12:00, 13:00 (selon TEST-OPEN-001)

---

### TEST-OPEN-004 : Réservation sur créneau exceptionnel

**Objectif :** Vérifier qu'on peut réserver sur un créneau exceptionnel

**Prérequis :** TEST-OPEN-003 réussi

**Procédure de test :**
1. Sélectionner un créneau vert (exceptionnel)
2. Remplir le formulaire de réservation
3. Confirmer la réservation

**Résultats attendus :**
- [ ] Le créneau est sélectionnable
- [ ] Le formulaire s'affiche normalement
- [ ] La réservation est confirmée
- [ ] Le créneau devient grisé après réservation

**Jeu de données :**

| Champ | Valeur |
|-------|--------|
| Nom | `Marie Test` |
| Email | `marie.test@yopmail.com` |
| Téléphone | `07 11 22 33 44` |
| Type | `Instants` |

---

### TEST-OPEN-005 : Suppression d'une ouverture exceptionnelle

**Objectif :** Vérifier la suppression d'une ouverture

**Prérequis :** TEST-OPEN-001 réussi, accès admin

**Procédure de test :**
1. Aller dans Admin > Paramètres
2. Dans la liste des ouvertures, cliquer sur "Supprimer"
3. Confirmer la suppression

**Résultats attendus :**
- [ ] L'ouverture disparaît de la liste
- [ ] Côté public, la date redevient grisée (si weekend)
- [ ] Les réservations existantes ne sont PAS supprimées

**Jeu de données :** Ouverture créée dans TEST-OPEN-001

---

## 4. Système de devis

### TEST-DEV-001 : Création d'un nouveau devis

**Objectif :** Vérifier la création d'un devis depuis l'admin

**Prérequis :** Accès admin

**Procédure de test :**
1. Se connecter à l'admin
2. Aller dans "Devis" > "Nouveau devis"
3. Remplir les informations client
4. Ajouter des lignes de prestation
5. Configurer l'échéancier de paiement
6. Enregistrer

**Résultats attendus :**
- [ ] Le formulaire s'affiche correctement
- [ ] Les lignes s'ajoutent dynamiquement
- [ ] Les calculs (sous-total, TVA, total) sont automatiques
- [ ] L'échéancier est configurable (pourcentages)
- [ ] Le devis est créé avec statut "Brouillon"
- [ ] Un numéro de devis est généré (format: 2026-XXXX)

**Jeu de données :**

| Champ | Valeur |
|-------|--------|
| Nom client | `Entreprise Test SARL` |
| Email | `contact@entreprise-test.com` |
| Téléphone | `01 23 45 67 89` |
| Date événement | Dans 2 mois |
| Type | `Mariage` |
| Ligne 1 - Description | `Décoration florale` |
| Ligne 1 - Quantité | `1` |
| Ligne 1 - Prix unitaire | `500` |
| Ligne 2 - Description | `Location mobilier` |
| Ligne 2 - Quantité | `10` |
| Ligne 2 - Prix unitaire | `50` |
| Taux TVA | `20%` |
| Échéancier | `30% / 40% / 30%` |

---

### TEST-DEV-002 : Aperçu du devis

**Objectif :** Vérifier l'aperçu du devis avant envoi

**Prérequis :** TEST-DEV-001 réussi

**Procédure de test :**
1. Depuis la liste des devis, cliquer sur le devis créé
2. Observer l'aperçu affiché

**Résultats attendus :**
- [ ] Toutes les informations client sont affichées
- [ ] Les lignes de prestation sont listées
- [ ] Les totaux sont corrects (HT, TVA, TTC)
- [ ] L'échéancier de paiement est visible
- [ ] Le statut "Brouillon" est affiché

**Jeu de données :** Devis créé dans TEST-DEV-001

**Calculs attendus :**
- Sous-total HT : 500 + (10 × 50) = 1000 €
- TVA 20% : 200 €
- Total TTC : 1200 €
- Acompte 30% : 360 €

---

### TEST-DEV-003 : Envoi du devis par email

**Objectif :** Vérifier l'envoi du devis au client

**Prérequis :** TEST-DEV-002 réussi

**Procédure de test :**
1. Depuis la page du devis, cliquer sur "Envoyer au client"
2. Confirmer l'envoi
3. Vérifier l'email reçu

**Résultats attendus :**
- [ ] Confirmation d'envoi affichée
- [ ] Statut passe à "Envoyé"
- [ ] Date d'envoi enregistrée
- [ ] Date d'expiration calculée (30 jours par défaut)
- [ ] Email reçu avec bouton "Consulter et accepter le devis"
- [ ] Le PDF du devis est attaché à l'email

**Jeu de données :** Email de TEST-DEV-001

---

### TEST-DEV-004 : Téléchargement du PDF

**Objectif :** Vérifier la génération du PDF du devis

**Prérequis :** TEST-DEV-001 réussi

**Procédure de test :**
1. Depuis la page du devis, cliquer sur "Télécharger PDF"
2. Ouvrir le fichier téléchargé

**Résultats attendus :**
- [ ] Le PDF se télécharge correctement
- [ ] Le logo AureLuz est présent et bien positionné
- [ ] Les informations client sont correctes
- [ ] Les lignes de prestation sont listées
- [ ] Les montants sont formatés correctement (pas d'erreur d'encodage)
- [ ] Le numéro de devis est visible

**Jeu de données :** Devis créé dans TEST-DEV-001

---

## 5. Paiement en ligne (Stripe)

### TEST-PAY-001 : Accès à la page de validation (client)

**Objectif :** Vérifier l'accès client à la page de validation du devis

**Prérequis :** TEST-DEV-003 réussi (devis envoyé)

**Procédure de test :**
1. Ouvrir l'email reçu par le client
2. Cliquer sur le bouton "Consulter et accepter le devis"
3. Observer la page affichée

**Résultats attendus :**
- [ ] La page s'affiche sans erreur
- [ ] Les informations du devis sont visibles
- [ ] Le montant total est affiché
- [ ] L'échéancier de paiement est visible
- [ ] Le bouton "Accepter le devis" est présent

**Jeu de données :** Lien reçu par email dans TEST-DEV-003

---

### TEST-PAY-002 : Acceptation du devis

**Objectif :** Vérifier l'acceptation du devis par le client

**Prérequis :** TEST-PAY-001 réussi

**Procédure de test :**
1. Sur la page de validation, cliquer sur "Accepter le devis"
2. Observer le changement d'état

**Résultats attendus :**
- [ ] Message de confirmation d'acceptation
- [ ] Le bouton "Payer l'acompte" apparaît
- [ ] Le montant de l'acompte est affiché
- [ ] Côté admin : statut passe à "Accepté"
- [ ] Côté admin : date d'acceptation enregistrée

**Jeu de données :** Page de TEST-PAY-001

---

### TEST-PAY-003 : Paiement de l'acompte via Stripe

**Objectif :** Vérifier le paiement en ligne via Stripe

**Prérequis :** TEST-PAY-002 réussi

**Procédure de test :**
1. Cliquer sur "Payer l'acompte"
2. Remplir le formulaire Stripe avec les données de test
3. Confirmer le paiement

**Résultats attendus :**
- [ ] Redirection vers la page Stripe Checkout
- [ ] Le montant affiché correspond à l'acompte
- [ ] La description indique "Acompte Devis XXXX"
- [ ] Paiement accepté avec la carte de test
- [ ] Redirection vers la page de succès
- [ ] Message de confirmation avec bouton "Télécharger la facture"

**Jeu de données Stripe :**

| Champ | Valeur |
|-------|--------|
| Numéro de carte | `4242 4242 4242 4242` |
| Expiration | `12/30` |
| CVC | `123` |
| Code postal | `75001` |

---

### TEST-PAY-004 : Vérification post-paiement

**Objectif :** Vérifier les actions automatiques après paiement

**Prérequis :** TEST-PAY-003 réussi

**Procédure de test :**
1. Vérifier l'email de confirmation
2. Vérifier le statut dans l'admin
3. Télécharger la facture

**Résultats attendus :**
- [ ] Email de confirmation reçu par le client
- [ ] Facture PDF attachée à l'email
- [ ] Côté admin : paiement marqué comme "Payé"
- [ ] Côté admin : montant payé enregistré
- [ ] Facture générée avec numéro (FAC-2026-XXXX)

**Jeu de données :** Email du client de TEST-DEV-001

---

### TEST-PAY-005 : Paiement refusé

**Objectif :** Vérifier le comportement en cas de paiement refusé

**Prérequis :** TEST-PAY-002 réussi (nouveau devis accepté)

**Procédure de test :**
1. Cliquer sur "Payer l'acompte"
2. Utiliser une carte de test qui échoue
3. Observer le comportement

**Résultats attendus :**
- [ ] Message d'erreur Stripe affiché
- [ ] Possibilité de réessayer
- [ ] Le devis reste en statut "Accepté" (pas "Payé")
- [ ] Aucune facture générée

**Jeu de données (carte refusée) :**

| Champ | Valeur |
|-------|--------|
| Numéro de carte | `4000 0000 0000 0002` |
| Expiration | `12/30` |
| CVC | `123` |

---

## 6. Gestion des factures

### TEST-FAC-001 : Génération automatique de facture

**Objectif :** Vérifier la génération automatique de facture après paiement

**Prérequis :** TEST-PAY-003 réussi

**Procédure de test :**
1. Accéder à l'admin
2. Vérifier les détails du devis payé
3. Accéder à la facture générée

**Résultats attendus :**
- [ ] Facture créée automatiquement
- [ ] Numéro de facture au format FAC-2026-XXXX
- [ ] Lien vers le devis d'origine
- [ ] Montant correspondant au paiement effectué
- [ ] Date de création = date du paiement

**Jeu de données :** Devis payé dans TEST-PAY-003

---

### TEST-FAC-002 : Téléchargement de la facture PDF

**Objectif :** Vérifier le contenu de la facture PDF

**Prérequis :** TEST-FAC-001 réussi

**Procédure de test :**
1. Télécharger la facture PDF
2. Vérifier le contenu

**Résultats attendus :**
- [ ] PDF téléchargé correctement
- [ ] Logo AureLuz présent et bien positionné
- [ ] Numéro de facture visible
- [ ] Informations client correctes
- [ ] Montant HT, TVA, TTC corrects
- [ ] Badge "PAIEMENT REÇU" en vert
- [ ] Pas d'erreur d'encodage (espaces, symboles €)

**Jeu de données :** Facture de TEST-FAC-001

---

## 7. Galerie photos

### TEST-GAL-001 : Upload d'une photo

**Objectif :** Vérifier l'upload de photos dans la galerie

**Prérequis :** Accès admin

**Procédure de test :**
1. Aller dans Admin > Site > Galerie
2. Cliquer sur "Ajouter une photo"
3. Sélectionner une image
4. Remplir les informations
5. Valider

**Résultats attendus :**
- [ ] Prévisualisation de l'image avant upload
- [ ] Upload réussi avec indicateur de progression
- [ ] Photo ajoutée à la galerie
- [ ] Catégorie correctement assignée
- [ ] Photo visible sur le site public

**Jeu de données :**

| Champ | Valeur |
|-------|--------|
| Image | Fichier JPG < 5MB |
| Alt | `Décoration mariage test` |
| Catégorie | `Signature` |

---

### TEST-GAL-002 : Réorganisation des photos

**Objectif :** Vérifier le drag & drop pour réorganiser

**Prérequis :** Au moins 3 photos dans la galerie

**Procédure de test :**
1. Glisser-déposer une photo vers une autre position
2. Vérifier l'ordre sur le site public

**Résultats attendus :**
- [ ] Drag & drop fonctionnel
- [ ] Nouvel ordre sauvegardé
- [ ] Ordre reflété sur le site public

**Jeu de données :** Photos existantes

---

### TEST-GAL-003 : Suppression d'une photo

**Objectif :** Vérifier la suppression de photos

**Prérequis :** TEST-GAL-001 réussi

**Procédure de test :**
1. Cliquer sur le bouton de suppression d'une photo
2. Confirmer la suppression

**Résultats attendus :**
- [ ] Demande de confirmation
- [ ] Photo supprimée de la liste
- [ ] Photo supprimée du site public
- [ ] Fichier supprimé du storage

**Jeu de données :** Photo uploadée dans TEST-GAL-001

---

## 8. Témoignages

### TEST-TEM-001 : Soumission d'un témoignage (public)

**Objectif :** Vérifier la soumission d'un témoignage par un visiteur

**Prérequis :** Aucun

**Procédure de test :**
1. Accéder au site public
2. Scroller jusqu'à la section témoignages
3. Cliquer sur "Laisser un avis"
4. Remplir le formulaire
5. Soumettre

**Résultats attendus :**
- [ ] Formulaire accessible
- [ ] Notation par étoiles fonctionnelle
- [ ] Champs obligatoires validés
- [ ] Message de confirmation après soumission
- [ ] Témoignage NON visible immédiatement (modération)

**Jeu de données :**

| Champ | Valeur |
|-------|--------|
| Nom | `Client Satisfait` |
| Email | `client.satisfait@yopmail.com` |
| Type d'événement | `Mariage` |
| Note | `5 étoiles` |
| Titre | `Service exceptionnel` |
| Avis | `Très satisfait de la prestation...` |

---

### TEST-TEM-002 : Modération des témoignages (admin)

**Objectif :** Vérifier la modération des témoignages

**Prérequis :** TEST-TEM-001 réussi, accès admin

**Procédure de test :**
1. Aller dans Admin > Témoignages
2. Trouver le témoignage en attente
3. Approuver le témoignage

**Résultats attendus :**
- [ ] Liste des témoignages en attente visible
- [ ] Détails du témoignage affichés
- [ ] Boutons Approuver / Rejeter disponibles
- [ ] Après approbation : statut "Approuvé"
- [ ] Témoignage visible sur le site public

**Jeu de données :** Témoignage de TEST-TEM-001

---

## 9. Analytics

### TEST-ANA-001 : Tracking de visite

**Objectif :** Vérifier que les visites sont trackées

**Prérequis :** Accès admin

**Procédure de test :**
1. Ouvrir le site public dans un navigateur privé
2. Naviguer sur plusieurs pages
3. Aller dans Admin > Analytics
4. Vérifier les statistiques

**Résultats attendus :**
- [ ] Nouvelle session enregistrée
- [ ] Pages vues comptabilisées
- [ ] Type d'appareil détecté
- [ ] Navigateur détecté
- [ ] Géolocalisation approximative

**Jeu de données :** Navigation de test

---

### TEST-ANA-002 : Entonnoir de conversion

**Objectif :** Vérifier le suivi de l'entonnoir de réservation

**Prérequis :** TEST-RES-005 réussi (réservation complète)

**Procédure de test :**
1. Aller dans Admin > Analytics
2. Consulter l'entonnoir de conversion

**Résultats attendus :**
- [ ] Étapes de l'entonnoir affichées
- [ ] Compteurs par étape
- [ ] Taux de conversion calculés
- [ ] Visualisation graphique

**Jeu de données :** Réservation de TEST-RES-005

---

## 10. Paramètres du site

### TEST-SET-001 : Modification du logo

**Objectif :** Vérifier le changement de logo

**Prérequis :** Accès admin

**Procédure de test :**
1. Aller dans Admin > Paramètres
2. Section Logo, uploader un nouveau logo
3. Vérifier sur le site public

**Résultats attendus :**
- [ ] Upload réussi
- [ ] Prévisualisation du nouveau logo
- [ ] Logo mis à jour dans le header public
- [ ] Logo mis à jour dans le footer

**Jeu de données :** Image PNG/JPG < 2MB

---

### TEST-SET-002 : Modification des informations de contact

**Objectif :** Vérifier la mise à jour des contacts

**Prérequis :** Accès admin

**Procédure de test :**
1. Aller dans Admin > Paramètres
2. Modifier email/téléphone/adresse
3. Sauvegarder
4. Vérifier sur le site public

**Résultats attendus :**
- [ ] Champs modifiables
- [ ] Sauvegarde confirmée
- [ ] Informations mises à jour dans le footer
- [ ] Informations mises à jour dans la page contact

**Jeu de données :**

| Champ | Valeur |
|-------|--------|
| Email | `nouveau@aureluzdesign.fr` |
| Téléphone | `06 99 88 77 66` |

---

### TEST-SET-003 : Blocage de créneaux

**Objectif :** Vérifier le blocage de créneaux (vacances, etc.)

**Prérequis :** Accès admin

**Procédure de test :**
1. Aller dans Admin > Paramètres
2. Section "Créneaux bloqués"
3. Ajouter une période bloquée
4. Vérifier dans le calendrier public

**Résultats attendus :**
- [ ] Période ajoutée à la liste
- [ ] Dates bloquées grisées dans le calendrier public
- [ ] Créneaux non réservables

**Jeu de données :**

| Champ | Valeur |
|-------|--------|
| Date | Un jour de la semaine prochaine |
| Heure début | `09:00` |
| Heure fin | `18:00` |
| Raison | `Congés test` |

---

## Annexe A : Fiche de suivi des tests

| ID Test | Description | Testeur | Date | Statut | Commentaires |
|---------|-------------|---------|------|--------|--------------|
| TEST-RES-001 | Affichage calendrier | | | | |
| TEST-RES-002 | Sélection date | | | | |
| TEST-RES-003 | Affichage créneaux | | | | |
| TEST-RES-004 | Sélection créneau | | | | |
| TEST-RES-005 | Formulaire réservation | | | | |
| TEST-RES-006 | Page confirmation | | | | |
| TEST-RES-007 | Validation erreurs | | | | |
| TEST-OPEN-001 | Création ouverture | | | | |
| TEST-OPEN-002 | Affichage calendrier | | | | |
| TEST-OPEN-003 | Créneaux exceptionnels | | | | |
| TEST-OPEN-004 | Réservation exception | | | | |
| TEST-OPEN-005 | Suppression ouverture | | | | |
| TEST-DEV-001 | Création devis | | | | |
| TEST-DEV-002 | Aperçu devis | | | | |
| TEST-DEV-003 | Envoi devis | | | | |
| TEST-DEV-004 | PDF devis | | | | |
| TEST-PAY-001 | Page validation | | | | |
| TEST-PAY-002 | Acceptation devis | | | | |
| TEST-PAY-003 | Paiement Stripe | | | | |
| TEST-PAY-004 | Vérification post-paiement | | | | |
| TEST-PAY-005 | Paiement refusé | | | | |
| TEST-FAC-001 | Génération facture | | | | |
| TEST-FAC-002 | PDF facture | | | | |
| TEST-GAL-001 | Upload photo | | | | |
| TEST-GAL-002 | Réorganisation | | | | |
| TEST-GAL-003 | Suppression photo | | | | |
| TEST-TEM-001 | Soumission témoignage | | | | |
| TEST-TEM-002 | Modération | | | | |
| TEST-ANA-001 | Tracking visite | | | | |
| TEST-ANA-002 | Entonnoir conversion | | | | |
| TEST-SET-001 | Logo | | | | |
| TEST-SET-002 | Contacts | | | | |
| TEST-SET-003 | Blocage créneaux | | | | |

---

## Annexe B : Contacts support

| Rôle | Contact |
|------|---------|
| Support technique | À définir |
| Admin Stripe | À définir |
| Admin Supabase | À définir |

---

**Fin du document**
