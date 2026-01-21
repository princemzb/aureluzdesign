#!/bin/bash

# Script de backup de la base de données Supabase
# Usage: ./scripts/backup-database.sh [nom_backup]

set -e

# Configuration
CONTAINER_NAME="supabase_db_aureluz"
DB_NAME="postgres"
DB_USER="postgres"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="${1:-backup_$TIMESTAMP}"

# Créer le dossier de backups s'il n'existe pas
mkdir -p "$BACKUP_DIR"

echo "🔄 Backup de la base de données Supabase..."
echo "   Container: $CONTAINER_NAME"
echo "   Database: $DB_NAME"
echo "   Backup: $BACKUP_DIR/$BACKUP_NAME.sql"

# Vérifier que le container est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Erreur: Le container $CONTAINER_NAME n'est pas en cours d'exécution"
    exit 1
fi

# Exécuter pg_dump dans le container
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" \
    --schema=public \
    --no-owner \
    --no-privileges \
    > "$BACKUP_DIR/$BACKUP_NAME.sql"

# Vérifier que le backup a été créé
if [ -f "$BACKUP_DIR/$BACKUP_NAME.sql" ]; then
    SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.sql" | cut -f1)
    echo "✅ Backup créé avec succès!"
    echo "   Fichier: $BACKUP_DIR/$BACKUP_NAME.sql"
    echo "   Taille: $SIZE"

    # Créer aussi une version compressée
    gzip -c "$BACKUP_DIR/$BACKUP_NAME.sql" > "$BACKUP_DIR/$BACKUP_NAME.sql.gz"
    SIZE_GZ=$(du -h "$BACKUP_DIR/$BACKUP_NAME.sql.gz" | cut -f1)
    echo "   Compressé: $BACKUP_DIR/$BACKUP_NAME.sql.gz ($SIZE_GZ)"
else
    echo "❌ Erreur: Le backup n'a pas été créé"
    exit 1
fi

echo ""
echo "📋 Pour restaurer ce backup:"
echo "   cat $BACKUP_DIR/$BACKUP_NAME.sql | docker exec -i $CONTAINER_NAME psql -U $DB_USER -d $DB_NAME"
