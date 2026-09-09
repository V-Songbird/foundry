# Approved Ember art direction

Approved by the user on 2026-09-09 after Hush revision 05, with all corner shine removed. The shared production guide and both copies of tinta-y-oficio and coordinate-readmes carry the rules.

- Hush: blue #2C75A5 / #79B6DE.
- Foreman: green #21553B / #9EC8AC.
- Razor: red #BF4935 / #EB8D79.

The mascot remains soft, round and orange. Supporting shapes use uneven ink contours, flat fills and no decorative shine. Keep text readable and unchanged.

Run node docs/shared/launch/assets/ember-approved/build.cjs from Foundry to regenerate the three SVGs from the retained source. This only generates these review assets; it does not copy to plugin worktrees. source/ keeps the original scenes and approved Hush drawing.

Applied locally to each plugin's existing Claude, Codex and branding/followup-main working copies. Only mascot.svg and the brand accent colors in hero.svg/demo.svg changed in those copies. Existing banners and README text were retained. The chosen C prose layout is still a separate editorial draft. Nothing committed or published.

Validation: Claude/Codex README parity and navigation passed for all three plugins; main common content matches both editions; mascot, hero and demo match across all three worktrees per plugin. Both skill pairs match. Original benchmark chart/replay text nodes were unchanged by recoloring. Closing text is extracted from retained originals; all SVGs parse as XML. The family preview was visually reviewed in the in-app browser.
