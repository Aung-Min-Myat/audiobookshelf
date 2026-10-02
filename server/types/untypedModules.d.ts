// Ambient types for npm packages that ship no type definitions (no @types package is installed).
// Only the parts the converted server files use are described. Type-only: emits no code.
// tsconfig.server.json excludes **/*.d.ts from its include list, so a .ts file that needs these pulls the file in with /// <reference path>.

declare module 'uuid' {
  export function v4(): string
}
