import type en from '../messages/en.json';

declare global {
  interface IntlMessages extends typeof en {}
}
