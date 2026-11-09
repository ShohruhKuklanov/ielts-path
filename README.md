# IELTS PATH

A learning app that takes a learner from zero English (A0) to IELTS Band 9.
The full plan is in the **IELTS 0→9 App — Technical Blueprint** doc.

| Part | Folder | Tech |
| --- | --- | --- |
| Learner app (iOS, Android, web) | `apps/mobile` | Expo SDK 57, Expo Router, TypeScript |
| Shared logic and types | `packages/shared` | TypeScript |
| Database, auth, server functions | `supabase` | Supabase (Postgres + RLS, Auth, Edge Functions) |
| Admin panel | `apps/admin` | Next.js 16 (content review, AI drafting) |

## Branding

- **Name:** IELTS PATH (store name and the app's display name; bundle ID `com.ieltspath.app`).
- **Path Blue `#2F62E9`** — primary brand colour: light-theme `primary`, Expo `primaryColor`,
  web theme colour, and the colour for store listing assets. White text on it is 5.2:1 (AA).
- **Path Blue Dark `#6C93FF`** — the brand blue in dark mode (Path Blue is only 3.6:1 on the dark
  background); `#0E1117` text on it is 6.5:1.
- **Path Navy `#17345F`** — the "IELTS" half of the wordmark on light backgrounds.
- Source of truth: `apps/mobile/src/theme/tokens.ts` (mobile) and `apps/admin/app/globals.css` (admin).
- Wordmark: `apps/mobile/src/components/BrandWordmark.tsx` and `apps/mobile/assets/ielts-path-logo.svg`
  (SVG uses live text, not outlines).

Still to be created before a store build (not in the repo yet):
app icon (1024×1024 PNG), Android adaptive icon foreground, splash image, web/admin favicon,
App Store and Google Play screenshots, and the Google Play feature graphic (1024×500).

## Build progress

- [x] **Step 1:** monorepo, full database schema with security rules, app shell (light/dark, 5 tabs), sign-in
- [x] **Step 2:** shared logic: 10 exercise types with validation and grading, IELTS band maths, SM-2 flashcard scheduling (41 tests)
- [x] **Step 3:** content pipeline: Foundation syllabus (8 modules, 45 lessons), 2 hand-written lessons, AI drafting with Claude, admin review queue
- [ ] Step 4: Foundation and Elementary content
- [ ] Step 5: placement test and onboarding
- [ ] Step 6: study plan and Today screen
- [ ] Step 7: learning path, lessons, stage tests
- [ ] Step 8: vocabulary flashcards (spaced repetition)
- [ ] Step 9: AI Writing assessment
- [ ] Step 10: progress dashboard and test builds

---

## Run it on your Mac (first time)

You need:

- **Node.js 20.19.4 or newer**. Check with `node -v`; install from [nodejs.org](https://nodejs.org) if missing.
- **Docker Desktop**, for the local database. Install it from [docker.com](https://www.docker.com/products/docker-desktop/) and open it once.
- **Expo Go** on your phone, or the iOS Simulator (Xcode) / Android Emulator.
  Expo Go for SDK 57 may not be in the app stores yet. On iPhone, run `npx eas-cli go` to install it.
  On Android, `pnpm android` installs it for you.

Then, in Terminal:

```bash
cd ~/Documents/ielts-app

# 1. Install pnpm and the project's packages
sudo npm install -g pnpm   # asks for your Mac password
pnpm install
pnpm fix-deps            # aligns Expo package versions with SDK 57

# 2. Start the local database. The first run downloads images and takes a few minutes.
pnpm db:start
```

`pnpm db:start` prints an **API URL** and a **publishable key** (older CLIs call it the *anon key*).
Put them in the app's settings file:

```bash
cp apps/mobile/.env.example apps/mobile/.env
open -e apps/mobile/.env      # paste the URL and key, then save
```

Then start the app:

```bash
pnpm dev
```

Scan the QR code with your phone camera (iPhone) or with Expo Go (Android). You can also press `i` for the iOS Simulator or `w` for the web.

> On a real phone, `127.0.0.1` means the phone itself. In `apps/mobile/.env`, use your Mac's network address instead,
> e.g. `http://192.168.1.20:54321` (System Settings → Wi-Fi → Details → IP address).

### Try sign-in

- **Email:** type any email address. The code does not go to a real inbox locally.
  Open **http://127.0.0.1:54324** to read it, then type the 6 digits in the app.
- **Phone:** sending real SMS needs a provider (see below). To test now, add a fixed code for your number in
  `supabase/config.toml` under `[auth.sms.test_otp]` (e.g. `998901234567 = "123456"`), then run `supabase stop && pnpm db:start`.
- **Google / Apple:** these need developer accounts (see below). Until they're set up, the buttons show
  "This sign-in option is not ready yet".

After signing in you land on **Today**. Check the five tabs, then on **Me** switch Light/Dark and sign out.
To look at the data, open Supabase Studio at **http://127.0.0.1:54323**. You'll find your new row in `profiles`,
and stage 1 unlocked in `stage_progress`.

---

## Admin panel and AI lessons

1. Run **setup.command** once (it applies the new database changes and loads the lessons from `content/`).
2. Double-click **admin.command**. It opens **http://localhost:3001**.
3. Sign in with your email (the code is at http://127.0.0.1:54324).
4. Double-click **make-admin.command**, type the same email, then reload the admin page.
5. To let Claude write lessons: double-click **set-api-key.command** and paste your Anthropic API key
   (from console.anthropic.com → API keys). It is saved only in `supabase/.env` on your Mac.

In the admin: **Content** shows every planned lesson; **Write with AI** drafts one (about a minute).
Every lesson, AI or human, waits in the **Review queue** until someone approves it. **Request changes**
sends it back with your notes, and the next AI draft takes the notes into account.

Where content lives:

| What | Where |
| --- | --- |
| Syllabus (modules, lessons, goals) | `content/<stage>/syllabus.json` |
| Hand-written lessons | `content/<stage>/lessons/*.json` (checked by `pnpm test`) |
| AI prompt and output schema | `supabase/functions/content-generate/prompt.ts` |
| Model | `claude-sonnet-5-5` by default; set `ANTHROPIC_MODEL` in `supabase/.env` to change |

## Setting up the sign-in providers

| Provider | What you need | Where it goes |
| --- | --- | --- |
| Email codes | Nothing locally. For production, a custom SMTP sender (e.g. Resend, Postmark) | Supabase dashboard → Auth → SMTP |
| Phone (SMS) | Twilio, or a local Uzbek provider such as Eskiz via the Send SMS hook | Supabase dashboard → Auth → Phone |
| Google | Google Cloud project → OAuth client IDs (Web, iOS, Android) | `supabase/.env` locally; dashboard → Auth → Providers in production |
| Apple | Apple Developer account ($99/year): App ID with Sign in with Apple; a Services ID and key for Android/web | Same as Google. `client_id` = bundle ID `com.ieltspath.app` (add `host.exp.Exponent` while testing in Expo Go) |

Redirect URLs already allowed locally: `ieltsapp://**`, `exp://**`, `http://localhost:8081/**`.
Add the same ones in the dashboard for the hosted project.

---

## Project layout

```
apps/mobile/
  app/                 screens (Expo Router: one file = one screen)
    (auth)/            welcome, sign-in, verify
    (tabs)/            today (index), learn, practice, words, me
    auth/callback.tsx  return point after Google/Apple sign-in
  src/
    components/        Button, TextField, Card, Screen, SegmentedControl, ComingSoon
    features/auth/     session + profile provider
    lib/               Supabase client, sign-in functions
    theme/             colours, spacing, type; light/dark provider
packages/shared/       code used everywhere: exercise schemas + grading, IELTS band maths, SM-2, stages, types
supabase/
  migrations/          database schema + security rules (RLS)
  templates/           sign-in email
  config.toml          local Supabase settings
```

## Security model (summary)

- Every table has Row Level Security. Learners can read only their own data.
- Learners can change only safe profile fields: name, photo, time zone, IELTS module, target band, exam date and daily minutes.
  Plan, XP, streak, level and current stage can be changed only by server functions.
- Exercises from paid stages are readable only by Premium users.
- Placement and stage-test questions are never sent to the app with their answers. Server functions mark them.
- Content (lessons, words, tasks) can be edited only by staff. To give someone staff access, add a row to `user_roles`
  (`admin` or `editor`).

## Useful commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the app (Expo) |
| `pnpm db:start` / `supabase stop` | Start / stop the local database |
| `pnpm db:reset` | Rebuild the local database from the migrations (deletes local data) |
| `pnpm db:types` | Regenerate TypeScript types from the database |
| `pnpm typecheck` | Type-check all packages |
| `pnpm test` | Run the unit tests (exercise grading, band maths, SM-2, content files) |
| `pnpm content:load` | Load new syllabus/lesson files into the local database |
| `pnpm admin` | Start the admin panel on http://localhost:3001 |
