# React + Vite

## Automated checks

GitHub Actions runs `npm test` and `npm run build` on every push and pull
request. Database migrations are intentionally not deployed by CI.

## Deploying to GitHub Pages

The app is published at `https://migo4mimi.github.io/KiddocationWeb/` whenever
changes are pushed to `main`. The deployment workflow builds the app with this
project-page base path and downloads the Grade 5 video from Git LFS.

Before the first deployment, add these as repository secrets or Actions
variables under **Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

In Supabase **Authentication → URL Configuration**, set the site URL to
`https://migo4mimi.github.io/KiddocationWeb/` and add
`https://migo4mimi.github.io/KiddocationWeb/**` to the redirect URL allow list.

The project is editable in this repository; pushing to `main` triggers a new
deployment. Install Git LFS before working with the Grade 5 video.

## Supabase setup

The migrations below update an existing app database; they do not create the
core application schema from scratch. Make sure the project already has the
tables and functions used by the app before applying them. If a migration was
previously run through the Supabase SQL Editor, reconcile its migration history
before using Supabase CLI deployment so it is not run a second time.

## Google and Facebook sign-in

Before using the social logins, enable the providers in the Supabase dashboard:

1. Open **Authentication → Providers**.
2. Turn on **Google** and **Facebook**.
3. Add the OAuth client ID and secret for each provider.
4. Add your app URL to **Authentication → URL Configuration**.
   - Local: `http://localhost:3000`
   - Production: `https://your-domain.com`
5. Save the project URL and anon key in your local `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

If the error says `Unsupported provider: provider is not enabled`, the provider
is still turned off in Supabase and the app is working as designed.

Apply the SQL migration in `supabase/migrations/20261110090000_teacher_requests.sql`
to the Supabase project used by the app. In the Supabase Dashboard, open **SQL
Editor**, paste the migration contents, and run it. It creates the teacher
request table and its access-control policies and functions, records future
teacher sign-ups, and backfills existing teacher sign-ups that have not already
been approved or requested.
If approving a teacher fails with a `profiles_role_check` error, apply
`supabase/migrations/20261112150000_profiles_role_check.sql` in the SQL Editor.
It allows the profile roles used by the app: student, teacher, and admin.

Apply `supabase/migrations/20261111100000_practice_points.sql`,
`supabase/migrations/20261111170000_category_tutorials_and_game_points.sql`, and
`supabase/migrations/20261111230000_flat_game_points.sql` in that order. These
migrations award 10 points per correct answer in Practice, Ranked, and Custom,
once per completed game. Previously completed, unawarded games are included;
existing Practice awards are retained and cannot be awarded a second time. The
final migration also adds the `profiles.points` balance column if it is missing.
Tutorial completion is saved to each student's account once; the setup screen
also includes a tutorial review option.

Apply `supabase/migrations/20261111150000_confirm_to_advance.sql` to enable
answer confirmation and shared round advancement. Practice advances after its
player confirms; Ranked and Custom advance when every player in the room has
confirmed. If not everyone confirms, the existing round timer continues.
Apply `supabase/migrations/20261111233000_room_confirmation_status.sql` to show
the confirmed and pending player counts during multiplayer rounds.

Apply `supabase/migrations/20261111235000_avatar_store.sql` to create the avatar
catalog and the secure `buy_avatar(p_avatar)` and `equip_avatar(p_avatar)`
functions used by the Avatar Store.

Apply `supabase/migrations/20261111160000_practice_round_timer.sql` to enable
Practice question timers. Players can choose 15 seconds, 30 seconds, or a custom
duration from 5 to 120 seconds.

Apply `supabase/migrations/20261111130000_leaderboard.sql` to install the
`leaderboard(p_period)` function used by the RANKS tab. It ranks students by
their existing `rank_points` for all time and records future rank-point
increases for monthly rankings. Monthly history starts when this migration is
applied; past monthly point changes cannot be reconstructed from current totals.

Apply `supabase/migrations/20261111140000_daily_streaks.sql` to enable daily
play streaks. Completing any game updates the current and best streak once per
room; playing again on the same local calendar day does not add another day.
Account rank is based on level: each level advances a division, and every
three levels advances the rank tier (Bronze through Radiant).

For custom circular profile photos, apply
`supabase/migrations/20261110100000_profile_pictures.sql` and
`supabase/migrations/20261111110000_profile_picture_crop.sql`, then
`supabase/migrations/20261111120000_profile_picture_drag_crop.sql`. In Profile
settings, players can upload a photo, drag it within the circle, zoom in, and
save the crop used throughout the app.

For friend requests and friends-only chat, apply
`supabase/migrations/20261112130000_friends_chat.sql`. Players can search by
display name, accept or decline requests, chat with friends, and report, block,
remove, or unblock players. Chat rejects links, contact information, and
specified abusive language in both the app and database. Messages are polled
while a conversation is open. Admins can read reported message details through
the `list_chat_reports()` RPC. Apply
`supabase/migrations/20261112140000_friends_all_accounts.sql` to allow every
signed-in account role to search for and add players.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Run `npm test` to execute the Node.js regression tests.

## Learning Pocket videos

The Learning Pocket plays the matching grade MP4 from `public/videos/`, named
`Grade 1.mp4` through `Grade 6.mp4`. The grade's video is used for each
available category at that grade. Multiplication starts at Grade 2 and division
at Grade 3, matching the categories available in the game. Use MP4 files
encoded with H.264 video and AAC audio for broad phone-browser support.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
