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
