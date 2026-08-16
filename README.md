# Iron Log

A shared workout tracker for two people, built with React + Firestore.

## 1. Create a free Firebase project (one-time, ~5 min)

1. Go to https://console.firebase.google.com and sign in with a Google account.
2. Click **Add project**, name it anything (e.g. "iron-log"), and finish the wizard (you can decline Google Analytics).
3. In the left sidebar, go to **Build > Firestore Database** > **Create database**. Choose any region close to you, and start in **test mode** (this keeps setup simple — see the security note below).
4. Back in **Project settings** (gear icon, top left) > **General** tab, scroll to "Your apps" and click the **</>** (web) icon to register a new web app. Give it any nickname.
5. Firebase will show you a `firebaseConfig` object. Copy it.

## 2. Add your config to the project

Open `src/firebase.js` and paste your copied values in over the placeholder ones:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

These keys are meant to be public (they identify your project, they don't grant access by themselves) — it's normal and safe for them to end up in the deployed site's code.

## 3. Push to GitHub

Create a new repo (e.g. `iron-log`) and push this folder to it:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/iron-log.git
git push -u origin main
```

## 4. Turn on GitHub Pages

In your repo on GitHub: **Settings > Pages** > under "Build and deployment", set **Source** to **GitHub Actions**.

That's it — the included workflow (`.github/workflows/deploy.yml`) will build the site and deploy it automatically on every push to `main`. Check the **Actions** tab for progress; once it's green, your site is live at:

```
https://YOUR_USERNAME.github.io/iron-log/
```

## 5. Send Zach the link

Send him that same URL. The first time either of you opens it, you'll each pick your name — after that the app remembers who's who on each phone, and splits/logs/bodyweight sync between you through Firestore.

## Security note

Firestore's "test mode" leaves the database open to anyone with your project ID for 30 days, then locks it — you'll want to tighten the rules before then. Since this is just for two people and nothing sensitive, the simplest fix is going to **Firestore Database > Rules** and setting:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /iron-log/{document} {
      allow read, write: if true;
    }
  }
}
```

This keeps it open to anyone who has your URL (fine for a private link only you two use) without it silently expiring. If you want real login-gated access later, that's a bigger step (Firebase Auth) — just say the word.

## Local development (optional)

If you want to preview changes on your own machine before pushing:

```bash
npm install
npm run dev
```

Requires [Node.js](https://nodejs.org) installed.
