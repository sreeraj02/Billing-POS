#!/usr/bin/env bash
# Build step for hosts such as Render: installs deps, collects static files, migrates and seeds demo data.
set -o errexit
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
python manage.py seed_demo
