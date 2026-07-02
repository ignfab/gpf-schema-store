/**
 * Thrown when a type is not supported.
 */
export class UnexpectedTypeError extends Error {
    constructor(value: unknown, context?: string) {
        const message = context
            ? `Unexpected type: "${value}" ${context}`
            : `Unexpected type: "${value}"`;
        super(message);
        this.name = 'UnexpectedTypeError';
    }
}
