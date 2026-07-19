// Register mocks for next/headers and next/server before any test imports.
// Usage: node --import ./test/helpers/loader.ts --test test/unit/auth.test.ts

import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
  export function resolve(specifier, context, next) {
    if (specifier === 'next/headers') {
      return {
        shortCircuit: true,
        url: 'data:text/javascript,' + encodeURIComponent(
          'export function cookies() { return { get() { return undefined; }, getAll() { return []; }, set() {}, delete() {} }; }'
        ),
      };
    }
    if (specifier === 'next/server') {
      return {
        shortCircuit: true,
        url: 'data:text/javascript,' + encodeURIComponent(
          'export class NextRequest {} export class NextResponse {}'
        ),
      };
    }
    return next(specifier, context);
  }
`),
  import.meta.url,
);
