# Application interface

Back occupies the bottom left and Options the bottom right of the active screen or dialog. Task controls remain between them. Library has only Options; Options pages have only Back. Reader navigation stays in its hideable toolbar without reducing the score viewport. A focused navigation button owns Enter, keypad Enter and Space.

Scrolling hides stock scrollbars while retaining wheel, touch and keyboard scrolling. Options retains its thin position marker for overflowing settings panels.

App-wide Options → Notation owns the notation-system selector. ISO is available; Traditional remains visibly unavailable until regular sheet music is supported. The additive `notationSystem` preference controls this choice. Existing preference fields remain retained when settings are saved.

Keyboard shortcut hints use `<kbd>` with no text decoration, including decoration inherited from selected controls. The active practice Speed editor has one outer frame for focus/editing indication, retaining its caret, selection and field behavior.

The repository retains URW Gothic Book alongside the existing Demi font. `src/URWGothic-Book.otf` is 82,968 bytes, SHA-256 `04318316cee29950805110c9c8949eea189ef5575132881f4d4d7e03e5299903`, verified against [ArtifexSoftware/urw-base35-fonts](https://github.com/ArtifexSoftware/urw-base35-fonts/blob/c15105598aa7eb256b1ebfcecd3d078801521e73/fonts/URWGothic-Book.otf), tag `20200910`, commit `c15105598aa7eb256b1ebfcecd3d078801521e73`. The font asset remains unmodified and local. `licenses/URW-LICENSE`, `licenses/URW-COPYING` and `licenses/URW-base35-provenance.md` retain the full upstream notices, attribution and source pointers.
