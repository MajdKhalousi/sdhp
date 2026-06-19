import { ApiError } from './api';

export function getFriendlyApiErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiError && error.code === 'SUBSCRIPTION_WRITE_BLOCKED') {
    return t('subscription.errors.writeBlocked');
  }
  return error instanceof Error ? error.message : t('common.states.error');
}
