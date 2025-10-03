#!/bin/sh

# Exit immediately if a command fails
set -e

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

# Create superuser if not exists (adjust email and password)
echo "from django.contrib.auth import get_user_model; \
User = get_user_model(); \
User.objects.filter(email='admin@example.com').exists() or \
User.objects.create_superuser('admin@example.com', 'badri')" | python manage.py shell

echo "Starting Daphne server..."
daphne -b 0.0.0.0 -p 8000 studybud.asgi:application
