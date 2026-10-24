# Design

## Context

See proposal.md for motivation. Existing device and piano panels mount asynchronously; numeric fields already own Enter/edit/cancel, and binding capture/Test have their own guarded key routing. The practice selector supplies the accepted visual reference and the shared arrow-first footer.

## Goals / Non-Goals

Goals: keep one moderate dialog with explicit section/settings focus, retain mounted controllers while their panels are hidden, and make all key ownership observable through real sequences. Non-goals: rewriting settings storage, changing music assessment/preparation, or claiming native/physical acceptance from browser checks.

## Decisions

- Render the applicable section list and all panels once; hide inactive panels. This preserves asynchronous panel work and drafts without duplicating controller ownership. A flat scrolling page was rejected; separate modal pages would complicate focus and controller lifetime.
- Extend the existing picker/navigation controller with explicit section boundaries and controlled select popups. Browsing never changes a dropdown or numeric value; Enter makes that ownership change. Keyboard routes respect existing draft/capture/Test handlers before general navigation.
- Use ordered setting rows and centered row/section focus rather than geometric nearest-neighbor guessing. Keep Tab as a standard alternative and make mouse-only chevrons non-tabbable.
- Keep the existing binding schema and shared inheritance. Display only context-applicable rows; hidden assignments remain unchanged.
- Audit ordinary dialogs and the toolbar using the same ownership principle, preserving musical shortcuts on the score surface. Any fixes remain scoped to observed navigation/focus failures.

## Risks / Trade-offs

- A late panel render could steal focus → never refocus after user interaction; preserve the selected section and active control where connected.
- Hidden fields could receive keys → exclude hidden panels and collapsed details from navigation, and leave draft handlers ahead of navigation.
- A popup or binding capture could leak actions → test cancellation and repeated key edges with actual production handlers.
- Rotation/narrow display could clip settings → size the dialog from the logical viewport, allow panel scrolling and inspect representative captures.

## Migration Plan

Ordinary reviewed source PR with no settings migration. Parent coordinates any later combined paired build and activation; this change alone does not publish or replace an installed app. No automatic OpenSpec archive.
