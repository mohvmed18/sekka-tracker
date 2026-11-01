# Sekka Tracker

Team project tracker for the Sekka Dispatch training project (1 to 26 November 2026).

Static web app. Data, logins and access rules live in Supabase. Hosted on Vercel.

## How it is deployed

`deploy/index.html` is the page Vercel serves at sekka-tracker.vercel.app. It loads `app.css` and `app.js` from this repo through jsDelivr, pinned to a commit. To ship a change: push, then redeploy `deploy/index.html` with the new commit id.
