/**
 * The single wiring point between screens and their data sources. Every entry is an interface;
 * today the implementations are DEV FIXTURES (src/dev-fixtures). When F0-API's typed contracts
 * client lands, swap each fixture for the API-backed implementation here — screens don't change.
 */
import { createDevSessionSource } from '../dev-fixtures/session';
import type { SessionSource } from './session/types';

export interface AppServices {
  session: SessionSource;
}

export const services: AppServices = {
  session: createDevSessionSource(),
};
