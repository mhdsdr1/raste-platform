#!/bin/bash

# تنظیمات
DATE=$(date +%Y-%m-%d_%H-%M)
PROJECT_NAME="raste-platform"
BACKUP_DIR="/workspaces"
BACKUP_FILE="${BACKUP_DIR}/${PROJECT_NAME}-full-backup-${DATE}.tar.gz"

echo "🔄 شروع بکاپ کامل از پروژه ${PROJECT_NAME}..."

# گرفتن بکاپ با حذف فایل‌های غیرضروری
cd /workspaces
tar -czf "${BACKUP_FILE}" \
  --exclude="${PROJECT_NAME}/node_modules" \
  --exclude="${PROJECT_NAME}/.venv" \
  --exclude="${PROJECT_NAME}/backend/__pycache__" \
  --exclude="${PROJECT_NAME}/backend/*.pyc" \
  --exclude="${PROJECT_NAME}/.git" \
  --exclude="${PROJECT_NAME}/.vscode" \
  --exclude="${PROJECT_NAME}/.pytest_cache" \
  --exclude="${PROJECT_NAME}/.coverage" \
  --exclude="${PROJECT_NAME}/htmlcov" \
  --exclude="${PROJECT_NAME}/.DS_Store" \
  --exclude="${PROJECT_NAME}/backend/staticfiles" \
  --exclude="${PROJECT_NAME}/backend/media" \
  --exclude="${PROJECT_NAME}/backend/*.log" \
  "${PROJECT_NAME}/"

echo "✅ بکاپ کامل با موفقیت ساخته شد!"
echo "📁 مسیر فایل: ${BACKUP_FILE}"
echo "📊 حجم فایل: $(du -h ${BACKUP_FILE} | cut -f1)"
echo ""
echo "🔽 برای دانلود روی هارد شخصی:"
echo "   1. در پنل سمت چپ VSCode، روی فایل ${BACKUP_FILE} کلیک راست کن"
echo "   2. گزینه 'Download...' رو انتخاب کن"
echo "   3. فایل رو روی هاردت ذخیره کن"
