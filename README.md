# ArchivIA Pro

Une application intelligente de gestion d'archives multi-tenant avec séparation complète des données par organisation.

## Fonctionnalités Principales

### Gestion Multi-Tenant
- Chaque organisation possède son propre espace isolé et sécurisé
- Code d'organisation unique pour l'authentification
- Séparation totale des données entre organisations

### Gestion des Documents
- Upload de documents avec drag-and-drop
- Métadonnées automatiques et personnalisables
- Catégorisation flexible
- Marquage des documents importants
- Recherche avancée avec filtres multiples

### Système d'Authentification
- Connexion sécurisée avec code organisation + identifiant + mot de passe
- Trois niveaux de rôles:
  - **Lecteur**: Consultation uniquement
  - **Éditeur**: Consultation et ajout/modification
  - **Administrateur**: Contrôle total

### Administration
- Gestion des utilisateurs
- Gestion des catégories personnalisées
- Visualisation des informations d'organisation
- Traçabilité complète des actions

### Sécurité
- Row Level Security (RLS) sur toutes les tables
- Isolation complète des données par organisation
- Authentification robuste via Supabase
- Stockage sécurisé des fichiers

## Architecture

### Base de Données
- **organizations**: Informations des organisations
- **users**: Profils utilisateurs liés aux organisations
- **categories**: Catégories personnalisées par organisation
- **documents**: Documents archivés avec métadonnées
- **activity_logs**: Journal d'audit

### Technologies
- React + TypeScript
- Tailwind CSS pour le design
- Supabase (PostgreSQL + Auth + Storage)
- Vite pour le bundling
- Lucide React pour les icônes

## Installation

1. Cloner le projet
2. Installer les dépendances:
   ```bash
   npm install
   ```

3. Configurer les variables d'environnement (créer un fichier `.env`):
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Lancer le serveur de développement:
   ```bash
   npm run dev
   ```

## Utilisation

### Première Connexion

1. **Créer une Organisation**:
   - Cliquer sur "Créer Organisation"
   - Remplir le formulaire avec les informations de l'organisation
   - Un code unique sera généré (ex: MEMP_2024)
   - Un compte administrateur sera créé automatiquement

2. **Se Connecter**:
   - Entrer le code d'organisation
   - Entrer l'identifiant utilisateur
   - Entrer le mot de passe

### Workflow Typique

1. **Ajouter un Document**:
   - Aller sur "Nouveau Document"
   - Glisser-déposer ou sélectionner un fichier
   - Remplir les métadonnées
   - Cliquer sur "Archiver"

2. **Rechercher un Document**:
   - Utiliser la barre de recherche globale
   - Ou aller sur "Recherche Avancée" pour des filtres détaillés
   - Cliquer sur un document pour le voir ou le télécharger

3. **Gérer l'Organisation** (Administrateurs):
   - Aller sur "Administration"
   - Ajouter/supprimer des utilisateurs
   - Créer/modifier des catégories
   - Voir les informations de l'organisation

## Design

L'interface utilise un design moderne et professionnel avec:
- Palette de couleurs neutres et élégantes
- Typographie claire et lisible
- Animations subtiles et micro-interactions
- Design responsive pour tous les appareils
- Hiérarchie visuelle claire

## Sécurité

### Row Level Security (RLS)
Toutes les tables utilisent RLS pour garantir:
- Les utilisateurs ne peuvent voir que les données de leur organisation
- Les permissions sont vérifiées au niveau de la base de données
- Impossible d'accéder aux données d'autres organisations même avec l'ID

### Authentification
- Utilisation de Supabase Auth
- Emails virtuels pour la gestion multi-tenant
- Mots de passe hashés et sécurisés

### Storage
- Fichiers organisés par organisation_id
- Politiques RLS sur le storage bucket
- URLs publiques mais accès contrôlé

## Développement

### Structure du Projet
```
src/
├── components/     # Composants réutilisables (Layout)
├── contexts/       # Contextes React (AuthContext)
├── lib/           # Configuration (Supabase client, types)
├── pages/         # Pages de l'application
└── main.tsx       # Point d'entrée
```

### Commandes
```bash
npm run dev        # Développement
npm run build      # Production
npm run lint       # Linter
npm run typecheck  # Vérification TypeScript
```

## Prochaines Étapes

Pour améliorer l'application, vous pourriez ajouter:
- Traitement IA des documents (OCR, extraction de métadonnées)
- Export de documents en masse
- Notifications et rappels
- Statistiques avancées
- Intégration email
- Recherche en texte intégral dans les PDFs
- Versioning des documents

## Support

Pour toute question ou problème, contactez l'équipe de développement.

## Licence

Propriétaire - Tous droits réservés
