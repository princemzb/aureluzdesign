# Documentation Technique - AureLuz Design

Ce dossier contient la documentation technique detaillee de chaque feature de l'application.

## Objectif

Cette documentation est destinee aux :
- **Developpeurs** qui rejoignent le projet
- **IA assistants** (Claude, etc.) pour maintenir le contexte
- **Maintenance future** pour comprendre les choix techniques

## Structure de la Documentation

Chaque fichier documente une feature complete avec :
- Vue d'ensemble et diagramme d'architecture
- Fichiers impliques
- Concepts cles avec exemples de code
- Schema de la base de donnees
- Points d'extension
- Guide de maintenance

## Index des Features

| Feature | Fichier | Description |
|---------|---------|-------------|
| Apercu Site | [preview-system.md](./preview-system.md) | Preview responsive du site client dans l'admin |
| Analytics | [analytics-system.md](./analytics-system.md) | Tracking visiteurs RGPD-compliant sans cookies |
| Reservation | [booking-system.md](./booking-system.md) | Prise de RDV avec calendrier et creneaux |
| Temoignages | [testimonials-system.md](./testimonials-system.md) | Avis clients avec moderation |
| Devis | [quotes-system.md](./quotes-system.md) | Creation et gestion de devis |
| Mailing | [mailing-system.md](./mailing-system.md) | Emails transactionnels et campagnes |
| Galerie | [gallery-system.md](./gallery-system.md) | Portfolio photos avec upload et ordre |
| Config | [services-settings-system.md](./services-settings-system.md) | Services et parametres du site |

## Document Principal

Pour une vue d'ensemble de l'architecture complete de l'application, consultez :

**[ARCHITECTURE.md](../ARCHITECTURE.md)** - Architecture globale, stack technique, concepts fondamentaux

## Conventions

### Nommage des fichiers

- `feature-system.md` pour les features principales
- Minuscules avec tirets

### Structure type d'un document

```markdown
# Nom du Systeme

## Vue d'ensemble
[Description + cas d'usage]

## Architecture
[Diagramme ASCII]

## Fichiers impliques
[Table des fichiers]

## Concepts cles
[Explications avec code]

## Schema de la base
[SQL ou description]

## Points d'extension
[Comment ajouter/modifier]

## Maintenance
[Checklist + problemes courants]
```

## Contribuer

Quand vous ajoutez une nouvelle feature :

1. Creer un fichier `feature-system.md` dans ce dossier
2. Suivre la structure type ci-dessus
3. Ajouter l'entree dans l'index de ce README
4. Mettre a jour ARCHITECTURE.md si necessaire

## Derniere mise a jour

Janvier 2026
