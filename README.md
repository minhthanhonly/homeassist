# Home Assist

Current status: completed up to Phase 5.
- Phase 1: project setup + Firebase + localStorage login
- Phase 2: realtime CRUD members/task templates
- Phase 3: daily plan by date + generate daily tasks
- Phase 4: round-robin spin assignment + spin logs
- Phase 5: mobile polish + basic PWA + deploy checklist

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

## 6) Phase 5 PWA

PWA assets added:
- `src/app/manifest.ts`
- `public/sw.js`
- `public/icons/icon-192.svg`
- `public/icons/icon-512.svg`

How to test PWA install:
1. Deploy to Vercel (HTTPS required).
2. Open site on mobile Chrome/Edge.
3. Open browser menu -> **Add to Home screen** / **Install app**.
4. Launch app from icon and verify it opens in standalone window.

Offline basic behavior:
- Service worker caches app shell and recent GET requests.
- If network is unavailable, it falls back to cached content.

## 7) Production deploy checklist

- [ ] All `NEXT_PUBLIC_FIREBASE_*` env vars set in Vercel.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Firestore rules are set for your intended environment.
- [ ] Open production URL and verify login, CRUD, daily plan, spin, and logs.
- [ ] Test install prompt on a mobile browser.
