# CLAUDE.md - Design System Portfolio

## Design Tokens

- Use CSS custom properties for all colors, spacing, and typography.
- Never use hardcoded hex values in component files.
- Always use `var(--token-name)` referencing `global.css` definitions.
- Use the pipe operator: `cat tokens.json | node scripts/gen.js` to regenerate tokens.

## Component Rules

- Use functional components for all new React islands.
- Always validate props with TypeScript interfaces.
- Include `aria-label` on interactive elements.

## References

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- [ADDENDUM.md](./ADDENDUM.md)
