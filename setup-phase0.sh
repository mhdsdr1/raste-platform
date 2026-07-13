#!/bin/bash
echo "🚀 شروع فاز صفر: راه‌اندازی پروژه راسته..."

# برو به پوشه اصلی
cd /workspaces/raste-platform

# ساخت پوشه‌های اصلی
mkdir -p backend/apps backend/config docs frontend/src
mkdir -p backend/apps/users backend/apps/shops backend/apps/orders backend/apps/deals
mkdir -p backend/apps/services backend/apps/courier backend/apps/chat backend/apps/loyalty backend/apps/ratings backend/apps/reports
mkdir -p backend/apps/integrations/bots backend/apps/integrations/sms backend/apps/integrations/payment
mkdir -p backend/tasks
mkdir -p frontend/public frontend/src/components frontend/src/pages frontend/src/services frontend/src/hooks frontend/src/utils
mkdir -p docs

# ساخت فایل‌های اولیه backend
touch backend/requirements.txt
touch backend/Dockerfile

# ساخت فایل‌های اپ‌ها
for app in users shops orders deals services courier chat loyalty ratings reports; do
    touch backend/apps/$app/__init__.py
    touch backend/apps/$app/models.py
    touch backend/apps/$app/views.py
    touch backend/apps/$app/serializers.py
    touch backend/apps/$app/urls.py
    touch backend/apps/$app/admin.py
    touch backend/apps/$app/apps.py
done

touch backend/apps/integrations/__init__.py
touch backend/apps/integrations/bots/__init__.py
touch backend/apps/integrations/bots/telegram.py
touch backend/apps/integrations/bots/eitaa.py
touch backend/apps/integrations/sms/__init__.py
touch backend/apps/integrations/sms/kavenegar.py
touch backend/apps/integrations/sms/webhook.py
touch backend/apps/integrations/payment/__init__.py
touch backend/apps/integrations/payment/zarinpal.py
touch backend/apps/integrations/payment/idpay.py

touch backend/tasks/__init__.py
touch backend/tasks/order_tasks.py
touch backend/tasks/deal_tasks.py
touch backend/tasks/discount_tasks.py

# ساخت فایل‌های frontend
touch frontend/public/manifest.json
touch frontend/public/sw.js
touch frontend/src/App.jsx
touch frontend/src/main.jsx
touch frontend/src/utils/fingerprint.js
touch frontend/src/utils/constants.js
touch frontend/src/services/api.js
touch frontend/src/services/authService.js
touch frontend/src/services/shopService.js
touch frontend/src/services/orderService.js
touch frontend/package.json
touch frontend/vite.config.js
touch frontend/Dockerfile
touch frontend/index.html

# فایل مستندات
touch docs/PRD.md

# نصب Django و DRF
echo "📦 نصب Django و ابزارهای پایه..."
pip install django djangorestframework django-cors-headers djangorestframework-simplejwt

# ایجاد پروژه Django
echo "🏗️ ایجاد پروژه Django..."
cd backend
django-admin startproject config .

# ایجاد requirements.txt
cat << 'REQS' > requirements.txt
Django>=5.0,<5.1
djangorestframework>=3.14,<4.0
django-cors-headers>=4.3,<5.0
djangorestframework-simplejwt>=5.3,<6.0
celery>=5.3,<6.0
redis>=5.0,<6.0
python-telegram-bot>=20.0,<21.0
kavenegar>=1.1,<2.0
requests>=2.31,<3.0
Pillow>=10.0,<11.0
gunicorn>=21.0,<22.0
psycopg2-binary>=2.9,<3.0
REQS

# ساخت پوشه تنظیمات چندمحیطی
mkdir -p config/settings
touch config/settings/__init__.py
mv config/settings.py config/settings/base.py

# فایل development.py
cat << 'DEV' > config/settings/development.py
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

CORS_ALLOW_ALL_ORIGINS = True
DEV

# فایل production.py
cat << 'PROD' > config/settings/production.py
from .base import *

DEBUG = False
ALLOWED_HOSTS = ['raste.ir', 'www.raste.ir']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'raste_db',
        'USER': 'raste_user',
        'PASSWORD': 'change_me',
        'HOST': 'db',
        'PORT': '5432',
    }
}

CORS_ALLOWED_ORIGINS = [
    'https://raste.ir',
    'https://www.raste.ir',
]
PROD

# فایل __init__.py تنظیمات
cat << 'INIT' > config/settings/__init__.py
import os

ENVIRONMENT = os.environ.get('DJANGO_ENV', 'development')

if ENVIRONMENT == 'production':
    from .production import *
else:
    from .development import *
INIT

# اصلاح manage.py
sed -i 's/config.settings/config.settings.development/' manage.py

# برگشت به ریشه
cd ..

echo ""
echo "✅ فاز صفر پروژه راسته با موفقیت کامل شد!"
echo "📁 ساختار پروژه:"
tree -L 3 -I 'node_modules|__pycache__|*.pyc' --dirsfirst
