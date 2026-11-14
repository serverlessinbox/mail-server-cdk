import type { JsonObject }      from '../utils/json-value';

import type { InstalledCopies } from './installed-copies';

/**
 * The outcome of synthesizing the consumer stack from the installed tarballs. Exactly one of `template`
 * and `failure` is set: a run that exits non-zero has no template and carries the end of its output.
 */
export interface PackedSynthesis {
  readonly directory:       string;
  readonly template:        JsonObject | undefined;
  readonly failure:         string | undefined;
  readonly installedCopies: InstalledCopies;
}
