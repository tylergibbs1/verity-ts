export { BackworkClient } from './client';
export {
  BackworkError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
} from './errors';
export type * from './types';

// Pre-rename names, re-exported so code written against the published
// `@backwork/verity-api` 1.0.2 keeps compiling after it upgrades to
// `@backwork/api`. Remove these in the first major release after the rename.
// `VerityConfig` is not listed here; `export type *` above already carries it.
export { BackworkClient as VerityClient } from './client';
export { VerityError } from './errors';
