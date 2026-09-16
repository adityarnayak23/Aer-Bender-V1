# 🚀 Hosting & Deployment Guide for Aer Bender V1

Aer Bender V1 is a client-side Web Audio + Computer Vision application designed to run entirely in the browser. It requires HTTPS when hosted so browsers allow camera and microphone access.

---

## Option 1: GitHub Pages (Recommended & Free)

1. **Create a new repository on GitHub**:
   - Go to [GitHub New Repository](https://github.com/new).
   - Repository name: `air-bender` (or `aer-bender`).
   - Choose **Public** (or Private if you have GitHub Pro/Team for Pages).
   - Do **NOT** initialize with README or license (you already have them).

2. **Push your code from terminal**:
   ```bash
   cd "/Users/adityanayak/Documents/GitHub/Air Bender"
   git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/air-bender.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository on GitHub -> **Settings** -> **Pages**.
   - Under **Build and deployment** -> **Source**: Select `Deploy from a branch`.
   - Branch: select `main` / `/(root)` -> Click **Save**.
   - Within 1-2 minutes, your live site will be live at:
     `https://<YOUR-GITHUB-USERNAME>.github.io/air-bender/`

---

## Option 2: Vercel (Instant Global CDN)

1. Install Vercel CLI (or connect GitHub repository on [vercel.com](https://vercel.com)):
   ```bash
   cd "/Users/adityanayak/Documents/GitHub/Air Bender"
   npx vercel
   ```
2. Follow the 3 prompts (default settings work automatically).
3. Vercel provisions a free SSL HTTPS domain like:
   `https://air-bender.vercel.app`

---

## Option 3: Netlify

1. Run:
   ```bash
   cd "/Users/adityanayak/Documents/GitHub/Air Bender"
   npx netlify deploy --prod
   ```
   Or drag-and-drop the `Air Bender` folder directly into [Netlify Drop](https://app.netlify.com/drop).

---

## Option 4: Local Server

Run locally with zero dependencies:
```bash
cd "/Users/adityanayak/Documents/GitHub/Air Bender"
npm start
# or ./start.sh
```
Open `http://localhost:8081` in Chrome, Safari, or Edge.
