## Why

The report form has six steps. For someone who has just seen a harmful post while scrolling, that is often enough friction to give up. We want reporting to take the same effort as sharing a post with a friend, without giving up the anonymity and device safety the app is built around.

We also considered letting people send posts to Laaha's Instagram account by direct message. It is a natural gesture and suits women who are not at risk from someone checking their phone, such as activists, journalists, or people reporting posts about women in general. It cannot be the default, because the message stays in the sender's Instagram inbox where someone checking her phone can see it, and Laaha would see her Instagram handle. It also needs Meta app review before Laaha can receive messages. So the share menu is the default route, because it gives the same one-tap gesture without those risks, and Instagram DMs are kept as a later, optional channel.

## What Changes

- **Laaha in the share menu**: the installed app registers as a share target, so on Android a user can tap Share on a post in Instagram, TikTok, X or any other app and choose Laaha.
- **Quick report screen**: one screen showing the shared link or text, an optional screenshot, the research-use notice, and two buttons: **Send now** and **Add details** (opens the existing form, pre-filled).
- **Quick report button in the app**: the same screen is reachable from the home screen, so iPhone users (where web share targets are not supported) and anyone else can paste a link or add a screenshot and send.
- **Automatic sorting on the server**: quick reports arrive with only the evidence. The server fills in the platform from the link, sets mode to online and the target to "I'd rather not say", and asks Claude to suggest a category. The report is tagged "auto-filled" so moderators know the fields are guesses.
- **Moderator confirmation**: auto-filled reports are counted in the anonymised export only after a moderator confirms or corrects the category and verifies the report.
- **Aftercare kept**: the screen shown after a quick send keeps the emergency number and helpline links.

### Out of scope

- Receiving reports by Instagram DM. Planned as a later, optional channel for people not at risk, clearly labelled as less private than the app, with DMs going into the same moderation queue. It needs Meta app review first
- Receiving reports through WhatsApp or other messaging accounts
- Sharing screenshots directly from the share menu (the first version takes links and text; screenshots are added on the quick report screen)
- Guessing who was targeted or whether the person is in danger

## Capabilities

### New Capabilities
- `quick-report`: one-tap reporting from the phone's share menu or a home screen button, with automatic filling of platform, mode and a suggested category, and a clear path to the full form

### Modified Capabilities
- `report-moderation-dashboard`: moderators can see which reports were auto-filled and must confirm the category before an auto-filled report counts as verified or appears in the export

Note: the base specs for these capabilities are still in the unarchived `add-nooha-app-foundation` change. Archive that change first so the delta applies cleanly.

## Safety, Privacy and Ethics

- **Anonymity is unchanged**: quick reports go through the same endpoint and offline queue, with no account, no IP logging and no contact details unless the user adds them in the full form.
- **Research consent**: sending is still conditional on the research-use notice, which is shown on the quick report screen above the Send button. Partner sharing stays off unless chosen in the full form.
- **Data sent to Claude**: the link, text and screenshot of a quick report are sent to the Claude API for category suggestion, the same as the fact-check assistant already does. This must be covered in the privacy notice.
- **Discreet mode**: the share menu always shows the installed app's name, which cannot follow the in-app discreet-mode setting. Users who rely on discreet mode should be told this.
- **Research quality**: guessed categories never reach research exports without a human check.

## Impact

- `vite.config.ts`: `share_target` entry in the PWA manifest
- `src/pages/`: new quick report page and route; home screen button; the existing form accepts the pre-fill from a quick report
- `src/shared.ts`: new report origin `quick`; the report input allows victim and category to be missing for quick reports
- `server/index.ts`: accepts quick reports, fills in defaults, tags them "auto-filled"; verification rule for auto-filled reports
- `server/`: category suggestion using the existing Claude client, with a fallback to "Other" when no API key is set
- `src/pages/Staff.tsx`: "auto-filled" badge and category confirmation
