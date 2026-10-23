# SANATORY Gym

Workout tracker and Telegram Mini App: https://raychichpoe.github.io/sanatory-gym/

## Account storage

Inside Telegram, programs, split, workouts, active session and body weight use Telegram CloudStorage. Telegram isolates storage per bot and user. The same Telegram account can restore its records on another supported device. No bot token is included in the website. The client user ID only namespaces the local recovery cache, never authorizes cloud access.

Outside Telegram, the original browser localStorage is used. Browser records do not automatically sync with Telegram. On first launch with empty cloud storage, local records can be imported explicitly; the original copy is retained.

Wait for **Saved to your Telegram account** before closing or switching devices. Use one device at a time. Stale revisions are rejected, but CloudStorage has no compare-and-swap primitive: truly simultaneous writes cannot be transactionally merged. Unsynced changes remain in a local pending copy. Reopening offers backup download and upload retry when the cloud has not changed. Choosing the cloud copy archives pending data locally under the account recovery key.

Snapshots use items of at most 3500 characters. The index is published after all items are confirmed; the previous snapshot is retained. A 700,000-character current-payload limit leaves room within Telegram's 1024-item quota for current, previous and in-flight copies. Errors are displayed rather than reported as successful sync. Unsupported Telegram versions must update before account editing.

CloudStorage is user-controlled storage, not a trusted server database for payments or protected entitlements. Any future server API must validate Telegram initData server-side.

## Verification

No build or npm install required. Run `node test-history.cjs` and `node test-cloud.cjs`, plus `node --check` for app.js, cloud-store.js and storage-boot.js.

Live-device check: import records on the phone, wait for saved status, close, open on desktop using the same Telegram account and compare history/split/weight. Another Telegram account should not see those records. Test offline save, reconnect and retry. Actual Telegram bridge behavior requires this live acceptance check.
