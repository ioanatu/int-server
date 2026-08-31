import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants';

/**
 * Opts a route out of the global `X-SESSION` guard.
 * Only infrastructure endpoints (health, docs) should use this.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
