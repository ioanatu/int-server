/** Name of the shared-secret header every client request must carry. */
export const SESSION_HEADER = 'x-session';

/** Security scheme id used to wire the header into the generated OpenAPI document. */
export const SESSION_SECURITY_SCHEME = 'X-SESSION';

/** Metadata key marking a route as reachable without the session header. */
export const IS_PUBLIC_KEY = 'integritynext:isPublic';

export const API_PREFIX = 'api';
export const SWAGGER_PATH = 'api-docs';
