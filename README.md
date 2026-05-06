# Kronos Concierge

Kronos Concierge is a full-stack watch marketplace built with Django REST Framework and React + Vite.

## Tech Stack

- Backend: Django 5, Django REST Framework, SQLite, django-cors-headers
- Frontend: React 19, React Router, Vite
- Media: local Django media storage for uploaded watch images

## Requirements

- Python 3.12 or newer
- Node.js 20.19 or newer, or Node.js 22.12 or newer
- npm

## Backend Setup

From the repo root:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```

The API runs at `http://localhost:8000/api/`.

## Frontend Setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173/` and calls the backend at port `8000` on the same host.

## Useful Commands

```bash
# Backend tests
cd backend
source venv/bin/activate
python manage.py test

# Frontend build and lint
cd frontend
npm run build
npm run lint
```

## Development Notes

- Run the backend and frontend servers at the same time during local development.
- Uploaded images are stored under `backend/media/`.
