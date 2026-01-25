# Instructions pour Claude Code

## Contexte du projet

**OBLIGATOIRE** : Avant toute réflexion ou action :

1. **Consulter ARCHITECTURE.md** pour connaître le stack, l'infrastructure et les conventions
2. **Consulter docs/*.md** pour comprendre les systèmes existants
3. **Ne jamais demander** des informations déjà documentées (ex: plateforme de déploiement, services utilisés)

Le projet est déployé sur **Vercel** avec **Supabase** (plan Free). Toujours vérifier la doc avant de poser des questions.

## Avant toute implémentation

**OBLIGATOIRE** : Avant de commencer une nouvelle fonctionnalité ou correction de bug :

1. **Reformuler** ce qui a été compris de la demande
2. **Lister** les fichiers qui seront impactés
3. **Présenter le plan d'action** étape par étape
4. **Attendre la validation** de l'utilisateur avant de commencer

Ne JAMAIS commencer à coder sans validation explicite du plan.

## Correction de bugs et erreurs

**OBLIGATOIRE** : Avant de corriger une erreur (build, TypeScript, runtime, etc.) :

1. **Expliquer le problème** : Quelle est l'erreur exacte et sa cause profonde
2. **Expliquer la solution** : Comment la correction résout le problème
3. **Ensuite seulement** : Implémenter la correction

Ne JAMAIS corriger silencieusement sans expliquer.

## Migrations SQL

**OBLIGATOIRE** : Avant de proposer une migration SQL :

1. **Vérifier les conventions** existantes dans `supabase/migrations/` (noms de fonctions, triggers, etc.)
2. **Tester localement** via Docker (`docker exec supabase_db_aureluz psql ...`)
3. **Ne jamais donner** un script non testé pour la production

## Commits Git

- Ne JAMAIS ajouter de ligne "Co-Authored-By" dans les messages de commit
- Utiliser le français pour les messages de commit
- Préfixes: feat:, fix:, docs:, refactor:, chore:

## Documentation

Après chaque développement ou modification de fonctionnalité :

1. **ARCHITECTURE.md** : Mettre à jour si la modification impacte l'architecture globale
   - Nouvelles tables/migrations
   - Nouveaux services ou providers
   - Changements de flux de données

2. **docs/*.md** : Mettre à jour ou créer la doc technique de la feature
   - Si nouvelle feature → créer `docs/nom-feature-system.md`
   - Si modification → mettre à jour le fichier existant
   - Mettre à jour `docs/README.md` si nouveau fichier créé

Structure d'une doc technique :
- Vue d'ensemble
- Architecture (diagramme ASCII)
- Fichiers impliqués
- Concepts clés avec exemples de code
- Points d'extension
- Maintenance
