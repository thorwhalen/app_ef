# app_ef Migration Guide

This guide covers migration scenarios for app_ef, including upgrading between versions and migrating from local to cloud deployments.

## Table of Contents

1. [Version Migrations](#version-migrations)
2. [Local to Cloud Migration](#local-to-cloud-migration)
3. [Storage Backend Migration](#storage-backend-migration)
4. [Database Migration (Future)](#database-migration-future)
5. [Backup Before Migration](#backup-before-migration)
6. [Rollback Procedures](#rollback-procedures)

---

## Version Migrations

### Beta (0.1.0-beta) to v1.0.0 (Planned)

#### Overview

Version 1.0.0 will include:
- Real ef library integration (replacing mock)
- Complete S3/GCS storage backend
- Persistent execution state
- Advanced ML components
- Breaking changes to storage format

#### Migration Steps

**1. Backup Current Data**

```bash
# Stop the application
docker-compose down

# Backup data directory
tar -czf app_ef_backup_$(date +%Y%m%d).tar.gz data/

# Backup database (if using)
# pg_dump app_ef > backup.sql
```

**2. Update Code**

```bash
# Pull latest changes
git checkout main
git pull origin main

# Or download specific release
git checkout v1.0.0
```

**3. Update Dependencies**

```bash
# Backend
cd backend
pip install -r requirements.txt --upgrade

# Frontend
cd ../frontend
npm install
npm update
```

**4. Run Migration Script**

```bash
# Migration script will be provided in v1.0.0
python migrate_beta_to_v1.py
```

**5. Update Configuration**

```bash
# Review new environment variables
cp .env.template .env.v1
# Update with your settings
```

**6. Restart Application**

```bash
docker-compose up -d --build
```

**7. Verify Migration**

```bash
# Check health
curl http://localhost:8000/health

# Verify projects exist
curl http://localhost:8000/api/v1/projects

# Test creating a new project
curl -X POST http://localhost:8000/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Migration"}'
```

#### Breaking Changes (Expected)

1. **Storage Format Changes**
   - Project metadata format updated
   - Pipeline configuration schema changes
   - Migration script handles automatic conversion

2. **API Changes**
   - Some endpoints may have new required parameters
   - Response formats may include additional fields
   - WebSocket protocol version bump

3. **Configuration Changes**
   - New environment variables required
   - Some old variables deprecated
   - Database configuration mandatory for cloud deployments

---

## Local to Cloud Migration

### Scenario: Migrating from Filesystem to AWS S3

#### Prerequisites

- AWS account with S3 access
- AWS CLI configured
- S3 bucket created
- IAM credentials with S3 permissions

#### Migration Steps

**1. Create S3 Bucket**

```bash
# Create bucket
aws s3 mb s3://app-ef-production --region us-east-1

# Enable versioning (recommended)
aws s3api put-bucket-versioning \
  --bucket app-ef-production \
  --versioning-configuration Status=Enabled

# Set lifecycle policy (optional)
aws s3api put-bucket-lifecycle-configuration \
  --bucket app-ef-production \
  --lifecycle-configuration file://s3-lifecycle.json
```

**2. Upload Existing Data to S3**

```bash
# Sync local data to S3
aws s3 sync data/ s3://app-ef-production/data/

# Verify upload
aws s3 ls s3://app-ef-production/data/ --recursive
```

**3. Update Configuration**

```bash
# Update .env file
STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=app-ef-production
AWS_REGION=us-east-1
```

**4. Deploy to Cloud**

```bash
# Using Docker
docker-compose -f docker-compose.prod.yml up -d

# Or using Kubernetes
kubectl apply -f k8s/
```

**5. Verify Migration**

```bash
# Test API
curl https://api.yourdomain.com/health

# Test project access
curl https://api.yourdomain.com/api/v1/projects

# Create test project
curl -X POST https://api.yourdomain.com/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name": "Cloud Test", "backend": "s3"}'
```

**6. Monitor Logs**

```bash
# Check CloudWatch logs (AWS)
aws logs tail /ecs/app-ef --follow

# Or check container logs
docker logs -f app_ef_backend
```

#### Cost Optimization

**S3 Storage Classes:**
```bash
# Set intelligent tiering for cost savings
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket app-ef-production \
  --id app-ef-tiering \
  --intelligent-tiering-configuration file://intelligent-tiering.json
```

**Lifecycle Policy Example:**
```json
{
  "Rules": [
    {
      "Id": "Archive old projects",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 180,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

---

## Storage Backend Migration

### Filesystem to S3

See [Local to Cloud Migration](#local-to-cloud-migration) above.

### S3 to Google Cloud Storage (GCS)

**1. Export from S3**

```bash
# Download all data from S3
aws s3 sync s3://app-ef-production/data/ ./temp-data/
```

**2. Upload to GCS**

```bash
# Create GCS bucket
gsutil mb -l us-central1 gs://app-ef-production/

# Upload data
gsutil -m cp -r ./temp-data/* gs://app-ef-production/data/

# Verify
gsutil ls -r gs://app-ef-production/data/
```

**3. Update Configuration**

```bash
STORAGE_BACKEND=gcs
GCS_BUCKET=app-ef-production
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

**4. Deploy and Verify**

```bash
# Deploy with new configuration
docker-compose -f docker-compose.prod.yml up -d

# Verify
curl https://api.yourdomain.com/api/v1/projects
```

### Between Different S3 Buckets

**Using S3 Sync:**

```bash
# Sync between buckets
aws s3 sync s3://old-bucket/data/ s3://new-bucket/data/

# Update configuration
STORAGE_BACKEND=s3
AWS_S3_BUCKET=new-bucket

# Restart application
docker-compose restart backend
```

---

## Database Migration (Future)

**Note:** Current beta version uses JSON file storage. Future versions will support PostgreSQL.

### Expected Migration (v1.0.0+)

**1. Install PostgreSQL**

```bash
# Docker
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=app_ef \
  -p 5432:5432 \
  postgres:15-alpine
```

**2. Run Migration**

```bash
# Apply database schema
alembic upgrade head

# Import data from JSON
python scripts/import_json_to_db.py --data-dir ./data
```

**3. Update Configuration**

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/app_ef
```

**4. Verify**

```bash
# Check database
psql -h localhost -U user -d app_ef -c "SELECT COUNT(*) FROM projects;"
```

---

## Backup Before Migration

### Creating Complete Backup

```bash
#!/bin/bash
# backup.sh - Complete backup script

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating backup in $BACKUP_DIR..."

# 1. Backup data directory
tar -czf "$BACKUP_DIR/data.tar.gz" data/

# 2. Backup environment configuration
cp .env "$BACKUP_DIR/.env.backup"

# 3. Backup docker volumes (if using)
docker run --rm \
  -v app_ef_staging-data:/data \
  -v $(pwd)/$BACKUP_DIR:/backup \
  alpine tar -czf /backup/volumes.tar.gz /data

# 4. Export database (if using)
# docker exec postgres pg_dump -U user app_ef > "$BACKUP_DIR/database.sql"

# 5. Backup logs
cp -r logs/ "$BACKUP_DIR/logs/"

# 6. Create manifest
cat > "$BACKUP_DIR/manifest.txt" <<EOF
Backup created: $(date)
App version: $(git describe --tags --always)
Git commit: $(git rev-parse HEAD)
Environment: $(grep ENVIRONMENT .env | cut -d= -f2)
Storage backend: $(grep STORAGE_BACKEND .env | cut -d= -f2)
EOF

echo "Backup completed: $BACKUP_DIR"
echo "To restore: tar -xzf $BACKUP_DIR/data.tar.gz"
```

**Make Executable:**
```bash
chmod +x backup.sh
./backup.sh
```

### Automated Backups

**Using Cron:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/app_ef/backup.sh

# Add weekly cleanup (keep last 4 weeks)
0 3 * * 0 find /path/to/app_ef/backups -mtime +28 -delete
```

**Using systemd Timer:**

```ini
# /etc/systemd/system/app-ef-backup.timer
[Unit]
Description=Daily backup of app_ef

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/app-ef-backup.service
[Unit]
Description=Backup app_ef data

[Service]
Type=oneshot
ExecStart=/path/to/app_ef/backup.sh
User=appuser
```

```bash
# Enable timer
sudo systemctl enable app-ef-backup.timer
sudo systemctl start app-ef-backup.timer
```

---

## Rollback Procedures

### Rolling Back a Failed Migration

**1. Stop Application**

```bash
docker-compose down
```

**2. Restore Backup**

```bash
# Restore data
rm -rf data/
tar -xzf backups/20250116_120000/data.tar.gz

# Restore environment
cp backups/20250116_120000/.env.backup .env

# Restore volumes (if using)
docker run --rm \
  -v app_ef_staging-data:/data \
  -v $(pwd)/backups/20250116_120000:/backup \
  alpine sh -c "cd /data && tar -xzf /backup/volumes.tar.gz --strip-components=1"
```

**3. Checkout Previous Version**

```bash
# If using git
git checkout v0.1.0-beta

# Or restore from backup
cp -r backups/20250116_120000/code/* .
```

**4. Restart Application**

```bash
docker-compose up -d --build
```

**5. Verify Rollback**

```bash
# Check version
curl http://localhost:8000/health

# Verify data
curl http://localhost:8000/api/v1/projects
```

### Emergency Rollback

**Quick Rollback (No Backup):**

```bash
# Stop current version
docker-compose down

# Revert to previous version
git checkout HEAD~1

# Rebuild and start
docker-compose up -d --build
```

**Database Rollback:**

```bash
# Downgrade database schema
alembic downgrade -1

# Or restore from SQL backup
psql -h localhost -U user -d app_ef < backups/database.sql
```

---

## Migration Checklist

### Pre-Migration

- [ ] Read release notes for breaking changes
- [ ] Create complete backup (data, config, database)
- [ ] Test migration in staging environment
- [ ] Document current configuration
- [ ] Schedule maintenance window
- [ ] Notify users of downtime

### During Migration

- [ ] Stop application gracefully
- [ ] Verify backup integrity
- [ ] Update code/dependencies
- [ ] Run migration scripts
- [ ] Update configuration
- [ ] Apply database migrations
- [ ] Restart application
- [ ] Monitor logs for errors

### Post-Migration

- [ ] Verify health endpoint
- [ ] Test critical workflows
- [ ] Check data integrity
- [ ] Monitor performance metrics
- [ ] Verify backups working
- [ ] Update documentation
- [ ] Notify users of completion
- [ ] Keep backup for 30 days

---

## Troubleshooting Migrations

### Common Issues

**1. Data Loss After Migration**

```bash
# Check if data exists in S3
aws s3 ls s3://app-ef-production/data/projects/

# Verify storage backend setting
echo $STORAGE_BACKEND

# Check application logs
docker logs app_ef_backend | grep -i storage
```

**2. Permission Errors (S3)**

```bash
# Verify IAM permissions
aws s3 ls s3://app-ef-production/

# Check AWS credentials
aws sts get-caller-identity

# Test S3 access
aws s3 cp test.txt s3://app-ef-production/test.txt
```

**3. Configuration Mismatch**

```bash
# Verify environment variables loaded
docker exec app_ef_backend env | grep -E 'STORAGE|AWS'

# Check configuration in application
curl http://localhost:8000/admin/config  # (if endpoint exists)
```

**4. Database Connection Issues**

```bash
# Test database connection
psql -h localhost -U user -d app_ef -c "SELECT 1;"

# Check connection string
echo $DATABASE_URL

# Verify database exists
psql -h localhost -U user -l
```

---

## Getting Help

If you encounter issues during migration:

1. **Check Logs**: `docker-compose logs -f backend`
2. **Review Documentation**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
3. **Restore Backup**: Use rollback procedures above
4. **Report Issue**: GitHub Issues with migration details

---

## Migration Support Matrix

| From | To | Automated | Script | Support |
|------|-----|-----------|--------|---------|
| Beta → v1.0 | ✅ | ✅ | `migrate_beta_to_v1.py` | Full |
| Filesystem → S3 | ✅ | ⚠️ | Manual (documented above) | Full |
| Filesystem → GCS | ✅ | ⚠️ | Manual (documented above) | Full |
| S3 → GCS | ✅ | ⚠️ | Manual (documented above) | Community |
| JSON → PostgreSQL | ⏳ | ⏳ | Coming in v1.0 | Planned |

Legend:
- ✅ Supported
- ⚠️ Manual process required
- ⏳ Coming soon
- ❌ Not supported

---

## Best Practices

1. **Always Backup First**: Never migrate without a backup
2. **Test in Staging**: Run migration in staging environment first
3. **Gradual Rollout**: Migrate one project at a time if possible
4. **Monitor Closely**: Watch logs and metrics during migration
5. **Have Rollback Plan**: Know how to rollback before starting
6. **Document Changes**: Keep notes of what you changed
7. **Verify Thoroughly**: Test all critical functions after migration
8. **Keep Backups**: Retain backups for at least 30 days

---

## Version History

- **v0.1.0-beta** (2025-11-16): Initial release, filesystem storage
- **v1.0.0** (Planned Q1 2026): Real ef integration, S3 support, PostgreSQL
- **v1.1.0** (Planned Q2 2026): Multi-user, advanced features
