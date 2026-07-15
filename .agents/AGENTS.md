# Workspace Custom Rules — Wisdom of the Doctors

## Coding Session Wrap-up (`agy-off`)
*   **The Command:** When the user types or says `agy-off`, it is their signal to wrap up the coding session.
*   **The Action:** Upon receiving this command, you must:
    1.  Automatically update the [HANDOVER.md](file:///Users/prashanthmartin/Documents/agy/wisdom/HANDOVER.md) file in the root of the project with the latest updates, tech stack details, database schemas, completed milestones, and future work.
    2.  Also add a matching entry to `CHANGELOG_ENTRIES` in `wisdom-of-the-doctors.html` (the in-app changelog at the unlisted `#/changelog` route) for any user-facing feature completed this session — same title/blurb content as the `HANDOVER.md` entry, newest entry first, dated with today's date.
    3.  Stage and commit all changes (including the updated `HANDOVER.md`).
    4.  Push the commit to the remote Git repository (`master` branch).
    5.  Provide a clear final summary of the completed work to the user before signing off.
