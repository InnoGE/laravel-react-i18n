import type { ReactNode } from 'react';

import type OptionsInterface from './options.js';

/**
 *
 */
export default interface I18nProviderProps extends OptionsInterface {
  children: ReactNode;
  /** @deprecated Ignored: server rendering works without it. */
  ssr?: boolean;
}
