# Context for the JavaScript to TypeScript migration of server/

Goal: migrate the Audiobookshelf server (server/, minus the out-of-scope list below) from JavaScript to TypeScript with meaningful types, type-only.
Done so far: server/finders/ and 11 more files (see git log for [PO-S01]). Use them as worked examples.
The spec and plan for the finders are in evidence/plans/ (reference only).

## Scope and order
- Out of scope: server/libs/ (vendored), server/migrations/ (MigrationManager copies and loads these by name), server/utils/htmlEntities.js (a data table), and server/models/ (every model's static init clashes with Sequelize's Model.init; undecided, do not convert unless the task says so).
- Work leaf-first: files with no relative require() first, preferring files that have tests; then files whose relative requires point only at files already converted.
- Leave the root files (Server.js, Database.js, Auth.js and the like) for last.

## Rules
1. Type-only: no change in runtime behaviour, no bug fixes. List any bug you find in the bug log named in the task.
2. Rename with `git mv x.js x.ts`.
3. Keep the CommonJS shape: `import x = require('...')` and `export = ...`. What a JavaScript caller gets from require() must stay identical. For types from a package use `import type { ... } from '...'` (erased when compiled).
4. Banned: any, @ts-ignore, @ts-nocheck, @ts-expect-error, as any, as unknown as.
5. Allowed, with a one-line comment each time: a non-null assertion (!) where a field starts as null and is set before it is read; a class index signature ([key: string]: unknown) where the code assigns by a dynamic key; a single-step `as` cast only at a boundary where an untyped module returns a wrong or too-vague type.
6. Do not edit test/, tsconfig.server.json, package.json, package-lock.json or server/libs/. Do not install packages. Do not push, merge, rebase, reset or clean.
7. Leave existing JSDoc comments unchanged. Use targeted edits, not whole-file rewrites.

## Checks (after every file or small group)
- npm run build:server must pass, and npm test must show 356 passing.
- Commit each passing step with the prefix given in the task.
- If a file cannot pass within these rules, restore it (git mv back, git restore that one file), say why, and do not commit it.

## Pitfalls found so far
- Class fields: declare them with `declare` (the target is ES2022; a plain field would compile to a real field that starts as undefined and changes behaviour).
- Comments: a comment directly above an interface or type disappears when compiled, and TypeScript drops comments placed above `export =`. Put new types above existing JSDoc blocks, and leave a blank line after a file-header comment.
- TypeScript 5.9.3 can crash ("Debug Failure. False expression") in an incremental build right after a bare rename, or with `declare global`. Add the imports and types in the same edit as the rename. A non-incremental, no-emit check shows the real errors (see evidence/test-results/SP-S01/tsconfig.redcheck.json). Never run `tsc --declaration` on the whole program.
- Globals set elsewhere: declare them in the file (`declare const global: typeof globalThis & { MetadataPath: string }`). Never use `declare global`.
- Untyped npm packages: describe only what is used in server/types/untypedModules.d.ts and pull it in with `/// <reference path="...">` (tsconfig excludes *.d.ts). Types for express, cookie-parser, express-session, passport and passport-jwt are installed (@types).
- Untyped helpers in server/utils return any. Annotate the destructured import once instead of casting at each call.
- `export =` moves `module.exports = ...` to the end of the compiled file. That is only safe when nothing but function declarations follow it.
- server/libs/fsExtra has an inferred type without writeFile and other methods, because they are added in a loop. One boundary cast per call site is allowed, with a comment.
