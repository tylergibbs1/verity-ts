export class BackworkError extends Error {
  public readonly code?: string;
  public readonly hint?: string;
  public readonly details?: Record<string, any>;
  public readonly statusCode?: number;

  constructor(
    message: string,
    code?: string,
    hint?: string,
    details?: Record<string, any>,
    statusCode?: number
  ) {
    super(message);
    this.name = 'BackworkError';
    this.code = code;
    this.hint = hint;
    this.details = details;
    this.statusCode = statusCode;
  }

  static fromResponse(statusCode: number, data: any): BackworkError {
    const error = data.error || {};
    const message = error.message || 'Unknown error';
    const code = error.code;
    const hint = error.hint;
    const details = error.details;

    switch (statusCode) {
      case 401:
        return new AuthenticationError(message, code, hint, details);
      case 404:
        return new NotFoundError(message, code, hint, details);
      case 429:
        return new RateLimitError(message, code, hint, details);
      case 400:
        return new ValidationError(message, code, hint, details);
      default:
        return new BackworkError(message, code, hint, details, statusCode);
    }
  }
}

export class AuthenticationError extends BackworkError {
  constructor(message: string, code?: string, hint?: string, details?: Record<string, any>) {
    super(message, code, hint, details, 401);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends BackworkError {
  constructor(message: string, code?: string, hint?: string, details?: Record<string, any>) {
    super(message, code, hint, details, 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends BackworkError {
  constructor(message: string, code?: string, hint?: string, details?: Record<string, any>) {
    super(message, code, hint, details, 404);
    this.name = 'NotFoundError';
  }
}

export class RateLimitError extends BackworkError {
  public readonly limit?: number;
  public readonly remaining?: number;
  public readonly reset?: number;

  constructor(
    message: string,
    code?: string,
    hint?: string,
    details?: Record<string, any>,
    limit?: number,
    remaining?: number,
    reset?: number
  ) {
    super(message, code, hint, details, 429);
    this.name = 'RateLimitError';
    this.limit = limit;
    this.remaining = remaining;
    this.reset = reset;
  }
}

// `@backwork/verity-api` 1.0.2 is live on npm and consumers import `VerityError`
// today, so the old name stays exported as an alias. Remove it in the first major
// release published after the `@backwork/api` rename ships.
/** @deprecated Renamed to `BackworkError`. */
export const VerityError = BackworkError;
/** @deprecated Renamed to `BackworkError`. */
export type VerityError = BackworkError;
