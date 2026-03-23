# Home Assist - Phase 1

Phase 1 includes:
- Next.js + TypeScript strict + Tailwind setup
- Firebase client + Firestore connection scaffolding
- Simple login using `localStorage` key `homeassist_username`
- Route guard for protected routes (`/dashboard`)

## 1) Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from sample file:

```bash
# macOS/Linux
cp .env.local.example .env.local

# Windows (PowerShell)
copy .env.local.example .env.local
```

3. Fill Firebase values in `.env.local` from your Firebase project settings.

4. Run app:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

## 2) Required environment variables

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 3) Scripts

- `npm run dev` - run development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run lint checks

## 4) Vercel auto deploy (GitHub)

1. Push this repo to GitHub.
2. Go to [Vercel](https://vercel.com), click **Add New Project**.
3. Import the GitHub repository.
4. Framework preset: **Next.js** (auto-detected).
5. In Project Settings -> Environment Variables, add all variables from `.env.local.example`.
6. Click **Deploy**.

After first deploy:
- Every push to `main` triggers automatic production deployment.
- Every pull request creates a preview deployment automatically.

## 5) Verify deploy success

1. In Vercel dashboard, confirm latest deployment status is **Ready**.
2. Open deployed URL.
3. Confirm flow:
   - first visit shows login page
   - submit name -> redirect to `/dashboard`
   - click logout -> back to `/login`
