import { loadEmbeddedRegistryRecord } from '@serverlessinbox/mail-server-cdk-shared';
import type { RegistryRecord }        from '@serverlessinbox/mail-server-cdk-shared';
import * as path                      from 'node:path';

/** `registry-record.json` sits at the package root, one directory above both `src/` and `lib/`. */
const MAIL_SERVER_REGISTRY_RECORD_PATH = path.join(__dirname, '..', 'registry-record.json');

/** Loads the registry record committed with the `mailbox` package. */
export function loadMailServerRegistryRecord(): RegistryRecord {
  return loadEmbeddedRegistryRecord(MAIL_SERVER_REGISTRY_RECORD_PATH);
}
