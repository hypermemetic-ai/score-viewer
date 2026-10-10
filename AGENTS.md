# Working agreements

This repository owns the score viewer application. Preserve the user's scores, edited fingerings, library, practice progress, settings and native application identity during development and installation.

Use scoped branches and the ordinary reviewed pull-request path. At task start and before completion run `node /home/qqp/projects/qq-workflows/scripts/git-status.mjs` from the checkout. Preserve unrelated changes and worktrees; never reset, clean, stash or forcibly synchronize them. Stop temporary processes started for the task before finishing.

Read README.md, docs/migration.md and docs/practice-repair-handoff.md before proposing work. This repository contains the accepted application extraction and a pinned transitional notation dependency. The migration does not fix the reported practice defects or certify/activate a native build. Preserve the source provenance and shared dependency ownership; develop application repairs here rather than performing a competing extraction. Do not modify authentication, provider or workflow configuration.

Make pianist-facing controls and musical behavior understandable. Preserve musical meaning and use shared engraving rules. Tests and artifact hashes are evidence, not a substitute for observing the viewer. Distinguish source, built package, installed package and human musical acceptance. Report visual impact and inspection limits.

Keyboard shortcut hints use `<kbd>` and never carry text decoration, including underlines inherited from selected controls. Keep this guarantee in the shared `kbd` styling; selected command words may retain their underline.

The active practice Speed editor uses one outer frame. Indicate editing and focus on that frame rather than drawing an inner input outline; preserve the caret, text selection, field behavior and Options numeric styling.
