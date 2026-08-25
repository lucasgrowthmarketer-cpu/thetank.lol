# The Tank (aquarium.lol or whatever domain you grab)

$1 buys a pixel-art fish with your logo. Feed it to grow. If your fish is heavier than a rival, you can eat it for (its weight + $1). Every dollar is public on the LED sign. Eaten fish burst into a pixel cloud.

## Stack
Next.js 15 (app router) + Canvas 2D + MongoDB + Stripe Checkout. No auth: the browser that pays gets an owner key in localStorage.

## Run locally
```
cp .env.example .env
npm install
npm run dev
```
Without `STRIPE_SECRET_KEY` the site runs in DEMO mode: every action is applied for free and the sign shows "DEMO". Use it to record the launch video before the Stripe account is live.

## Railway
1. New project -> Deploy from GitHub repo. Add the MongoDB plugin, copy its connection string into `MONGODB_URI`.
2. Env vars: `MONGODB_URI`, `NEXT_PUBLIC_SITE_URL` (https://yourdomain), `ADMIN_KEY`, then `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` once Stripe is ready.
3. Stripe dashboard -> Developers -> Webhooks -> endpoint `https://yourdomain/api/webhook`, event `checkout.session.completed`. Paste the signing secret in `STRIPE_WEBHOOK_SECRET`. Redeploy.
4. Test with card 4242 4242 4242 4242 in test mode, then switch keys to live.

## Rules encoded in the API
- spawn: min $1, name 32 chars, logo = Google favicon of the URL (no uploads, no moderation of images needed)
- feed: anyone can feed any fish, min $1
- eat: only the owner, only a strictly heavier fish, price = target weight + $1. The money always lands in the eater's weight; if the target grew before the payment cleared, it survives and your money becomes food.
- max $5000 per action

## Moderation
`curl -X DELETE "https://yourdomain/api/admin?key=ADMIN_KEY&fish=<id>"` removes a fish (shown as eaten by the moderator). Fish ids are visible in /api/state.

## Launch kit (copy and adapt)
Tweet 1 (build in public):
> built this in one evening: a public aquarium where every fish is a startup. $1 = your logo swimming. bigger fish eat smaller fish (you pay their weight + $1). biomass counter is public. let's see if strangers put $50 in the water. link below

Tweet 2 (reply, 2h later): screen recording of the first fish getting eaten.

Reddit: r/SideProject, r/InternetIsBeautiful, r/webdev (Show off Saturday). Lead with the eating mechanic, not the price.

Meta move: buy a $5 or $6 spot on outbid.lol in the "Leaderboards & Attention Markets" category. That is where the copycat traffic already lives.

## Ideas for v2 once it works
- email the owner when their fish is eaten (Brevo) with a one-click "come back bigger" link
- daily "apex predator" tweet from a bot account
- decay: fish lose $1/week unless fed (recurring revenue)
