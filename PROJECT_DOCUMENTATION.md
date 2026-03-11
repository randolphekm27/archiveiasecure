# 📚 ArchivIA Pro - Documentation Technique & Fonctionnelle Complète

## Table des Matières
1. [Architecture Générale](#1-architecture-générale)
2. [Processus d'Inscription et d'Invitation](#2-processus-dinscription-et-dinvitation)
3. [Gestion des Utilisateurs et des Rôles](#3-gestion-des-utilisateurs-et-des-rôles)
4. [Personnalisation de l'Organisation](#4-personnalisation-de-lorganisation)
5. [Gestion des Catégories](#5-gestion-des-catégories)
6. [Processus de Suppression Sécurisée](#6-processus-de-suppression-sécurisée)
7. [Journal d'Activité et Transparence](#7-journal-dactivité-et-transparence)
8. [Intelligence Artificielle Intégrée](#8-intelligence-artificielle-intégrée)
9. [Interface Utilisateur Détaillée](#9-interface-utilisateur-détaillée)
10. [Gestion des Documents](#10-gestion-des-documents)

---

## 1. Architecture Générale

### Concept "Multi-Tenant"
ArchivIA Pro est une plateforme **SaaS Multi-Tenant**. Cela signifie que plusieurs organisations utilisent la même infrastructure et la même base de données, mais leurs données sont **strictement isolées** les unes des autres via un identifiant unique `organization_id`.

### Schéma de la Base de Données (Supabase / PostgreSQL)

| Table | Rôle | Champs Clés |
|-------|------|-------------|
| `organizations` | Profil de l'entreprise | `id`, `code`, `name`, `logo_url`, `favicon_url`, `admin_email`, `primary_color`, `secondary_color`, `accent_color`, `font_family`, `deletion_votes_required` |
| `users` | Comptes utilisateurs | `id` (FK auth), `organization_id`, `email`, `username`, `full_name`, `role`, `department`, `job_title`, `phone_extension`, `signature`, `category_ids` |
| `documents` | Archives numériques | `id`, `organization_id`, `title`, `file_url`, `file_type`, `document_date`, `category_id`, `keywords`, `is_important`, `uploaded_by`, `ai_analysis` |
| `categories` | Classement thématique | `id`, `organization_id`, `name`, `description`, `color` |
| `activity_logs` | Traçabilité | `id`, `organization_id`, `user_id`, `action`, `details`, `ip_address`, `user_agent` |
| `user_invitations` | Inscriptions membres | `id`, `organization_id`, `email`, `role`, `token`, `expires_at`, `accepted_at` |
| `deletion_votes` | Gouvernance suppression | `id`, `request_id`, `voter_id`, `vote` (approve/reject), `comment` |
| `secure_trash` | Corbeille temporaire (30j) | `id`, `document_id`, `document_data`, `deleted_by`, `expires_at` |

---

## 2. Processus d'Inscription et d'Invitation

### Création d'Organisation (Propriétaire)
1. Un futur administrateur remplit le formulaire "Créer mon organisation".
2. Le système génère un **Code Organisation** unique (ex: `MEMP_2024`).
3. Le compte utilisateur est créé dans Supabase Auth.
4. Un profil "Admin" est créé dans la table `users`.

### Invitation de Nouveaux Membres
1. L'administrateur saisit l'email et définit le rôle (Lecteur, Éditeur, Admin).
2. Une **Edge Function** génère un token unique et envoie un email via **Resend**.
3. Le futur membre clique sur le lien d'invitation (`/join/TOKEN`).
4. Il définit son mot de passe et son identifiant.
5. L'accès est validé et lié à l'organisation mère.

---

## 3. Gestion des Utilisateurs et des Rôles

### Rôles et Permissions

| Fonctionnalité | Lecteur | Éditeur | Administrateur |
|----------------|:-------:|:-------:|:--------------:|
| Consulter les documents | ✅ | ✅ | ✅ |
| Télécharger les fichiers | ✅ | ✅ | ✅ |
| Ajouter des documents | ❌ | ✅ | ✅ |
| Modifier les métadonnées | ❌ | ✅ | ✅ |
| Gérer les catégories | ❌ | ❌ | ✅ |
| Inviter des utilisateurs | ❌ | ❌ | ✅ |
| Supprimer des documents | ❌ | ❌ | ✅ (Vote requis) |
| Paramètres organisation | ❌ | ❌ | ✅ |

---

## 4. Personnalisation de l'Organisation

### Identité Visuelle
L'administrateur peut personnaliser l'interface pour qu'elle corresponde à l'image de marque de son organisation :
- **Logotype** : Import du logo officiel (Stocké sur Supabase Storage).
- **Favicon** : Icône de l'onglet navigateur.
- **Palette de Couleurs** : Sélection hexadécimale pour les boutons (Primaire), les menus (Secondaire) et les liens (Accent).
- **Typographie** : Choix parmi une sélection de polices Google Fonts.

### Paramétrage Fonctionnel
- **Code Organisation** : Identifiant unique requis pour la connexion.
- **Politique de Suppression** : Nombre de votes d'administrateurs requis pour valider une suppression définitive.

---

## 5. Gestion des Catégories

Les catégories permettent de structurer l'archive (ex: Factures, RH, Juridique, Technique).
- **Nom & Description** : Pour identifier l'usage de la catégorie.
- **Code Couleur** : Repère visuel dans les listes et graphiques.
- **Affectation Utilisateur** : Un administrateur peut limiter l'accès d'un utilisateur à certaines catégories uniquement (ex: l'équipe RH ne voit que la catégorie RH).

---

## 6. Processus de Suppression Sécurisée

La suppression d'un document est un acte grave. ArchivIA Pro implémente une **Double Sécurisation**.

### Étape 1 : La Demande de Suppression
Lorsqu'un administrateur souhaite supprimer un document, le document n'est pas effacé mais déplacé dans la **Corbeille Sécurisée (`secure_trash`)**.

### Étape 2 : Le Vote de Gouvernance
Si l'organisation a configuré un quota de votes (ex: 3 administrateurs requis) :
- Une notification est envoyée aux autres admins.
- Ils doivent voter "Approuver" ou "Rejeter" via le tableau de bord.
- Si le quota est atteint, le fichier est définitivement supprimé du stockage.

### Étape 3 : Restauration
Pendant 30 jours, un administrateur peut annuler la suppression et restaurer le document à son emplacement d'origine.

---

## 7. Journal d'Activité et Transparence

Chaque action sur la plateforme est **horodatée et tracée** pour des besoins d'audit :
- *"QUI a consulté QUEL document QUAND ?"*
- *"QUI a modifié les paramètres de l'organisation ?"*
- *"Échecs de connexion suspectés."*

Les administrateurs peuvent exporter ces rapports au format JSON ou CSV.

---

## 8. Intelligence Artificielle Intégrée

ArchivIA Pro utilise des modèles de traitement du langage naturel (via Edge Functions) pour :
1. **Analyse Automatique** : Lors de l'upload, l'IA suggère des mots-clés et une catégorie.
2. **Recherche Sémantique** : Permet de trouver un document par son contenu même si le titre est différent (ex: chercher "congés" pour trouver un document nommé "Demande_Absence").

---

## 9. Interface Utilisateur Détaillée

### Page de Connexion (Portail d'Accès)
L'entrée dans l'application nécessite 3 informations :
1. **Code Organisation** (Isolateur principal).
2. **Identifiant/Email**.
3. **Mot de passe**.

### Le Tableau de Bord (Dashboard)
Vue d'ensemble synthétique :
- **Widgets de statistiques** : Nombre total de documents, poids total utilisé.
- **Raccourcis** : Scanner un document, Recherche Express.
- **Alerte de Gouvernance** : Affiche les votes de suppression en attente.

### Explorateur de Documents
Interface de type "Data-Grid" avec :
- Tri par colonnes.
- Filtres dynamiques (Date, Catégorie, Importance).
- Prévisualisation instantanée (PDF, Image, Texte).

---

## 10. Gestion des Documents

### Propriétés d'un document
- **Importants** : Marqueur visuel (Étoile) pour un accès rapide.
- **Mots-clés** : Tags pour faciliter la recherche manuelle.
- **Date du Document** : Différente de la date d'upload (ex: date réelle d'une facture de 2023).
- **Métadonnées IA** : Résumé généré automatiquement lors du scan.

### Stockage & Sécurité
- Les documents physiques sont stockés dans des **Buckets Supabase Storage** chiffrés.
- Les liens de téléchargement sont **signés et temporaires** (valables 60 secondes).

---
*Fin de la documentation technique ArchivIA Pro.*
