# Mon activité sportive ⚡

Application personnelle de visualisation de données Strava, avec connexion Google.

## Stack
- **Frontend** : React + Vite + Recharts
- **Backend** : Netlify Functions (serverless)
- **Auth** : Google OAuth 2.0 + Strava OAuth 2.0
- **Session** : JWT cookie HttpOnly

## Variables d'environnement

À configurer dans Netlify → Site settings → Environment variables :

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
STRAVA_CLIENT_ID=257380
STRAVA_CLIENT_SECRET=...  ← régénérer sur strava.com/settings/api
JWT_SECRET=...            ← chaîne aléatoire longue (ex: openssl rand -hex 32)
SITE_URL=https://mon-activite-sportive.netlify.app
```

## Installation locale

```bash
npm install
npm install -g netlify-cli
netlify dev
```

Copie `.env.example` en `.env` et remplis les valeurs.

## Déploiement

```bash
# Connecter le repo GitHub à Netlify via l'interface web
# Ou déployer manuellement :
netlify deploy --prod
```

## Structure

```
netlify/functions/
  auth-google.js      ← OAuth Google
  auth-strava.js      ← OAuth Strava
  me.js               ← infos session
  strava-activities.js← récupérer les activités
  strava-sync.js      ← synchroniser tout l'historique
  logout.js           ← déconnexion

src/
  pages/
    Login.jsx
    Dashboard.jsx
    Activities.jsx
    Stats.jsx
  components/
    Layout.jsx
  hooks/
    useAuth.jsx
  utils/
    sports.js
```

## ⚠️ Sécurité

- Régénère ton Client Secret Strava sur strava.com/settings/api
- Régénère ton Client Secret Google sur console.cloud.google.com
- Ne commite jamais le fichier `.env`
