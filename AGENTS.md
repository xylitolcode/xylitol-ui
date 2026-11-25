# Repository Guidelines

## Project Structure & Module Organization

This repository publishes `@xylitol0520/ui`, a React text- and motion-effects library, plus a GitHub Pages showcase.

- `src/index.ts` is the package entry point and public export surface.
- `src/components/<ComponentName>/` contains each component, its props, helpers, and colocated CSS.
- `src/lib/` contains shared hooks and utilities.
- `showcase/` is the standalone documentation/demo site; it imports components directly from `../src`.
- `scripts/postbuild.mjs` handles final build output adjustments.
- `dist/` and `dist-site/` are generated artifacts and should not be edited manually.

## Build, Test, and Development Commands

Use pnpm as the package manager.

- `pnpm dev`: start the showcase at `http://127.0.0.1:5173`.
- `pnpm typecheck`: run TypeScript checks without emitting files.
- `pnpm build`: build the ES module, CSS, and declaration files.
- `pnpm build:site`: build the showcase into `dist-site/`.
- `pnpm check`: run typechecking and the full package build; use this before opening a PR.

There is currently no dedicated unit-test runner or coverage configuration.

## Coding Style & Naming Conventions

Use TypeScript with modern ES module syntax and 2-space indentation. Component folders and exported components use PascalCase, for example `src/components/HollowFlowText/`. Hooks and helpers use camelCase. Keep component CSS colocated with its component and import it from the component module.

Prefer small, reusable components with typed props interfaces named `<Component>Props`. Preserve the public API by exporting new values and types from `src/index.ts`. Avoid unused variables and parameters; the TypeScript configuration enforces this.

## Testing Guidelines

Validate changes with `pnpm check` and exercise affected components in the showcase. For visual or interactive effects, confirm normal, keyboard, `prefers-reduced-motion`, and responsive behavior where applicable. If a test framework is added, place tests beside components and name them `<Component>.test.tsx`.

## Commit & Pull Request Guidelines

History follows Conventional Commits, such as `feat: ...`, `fix: ...`, `docs: ...`, and `chore: ...`. Use a concise imperative subject, for example `feat: add ScanText`.

PRs should include a short description, the user-visible change, and evidence such as screenshots or recordings for visual effects. Link related issues, run `pnpm check`, and note any API, CSS, or export changes.

## Security & Configuration Tips

Do not commit generated build output or secrets. CI expects a frozen pnpm install; npm publishing requires the repository's configured `NPM_TOKEN`.
