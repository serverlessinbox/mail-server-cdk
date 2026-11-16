import { loadEmbeddedArtifactVersions }  from '@serverlessinbox/mail-server-cdk-shared';
import type { EmbeddedArtifactVersions } from '@serverlessinbox/mail-server-cdk-shared';
import * as path                         from 'node:path';

/** `artifact-versions.json` sits at the package root, one directory above both `src/` and `lib/`. */
const MAIL_SERVER_ARTIFACT_VERSIONS_PATH = path.join(__dirname, '..', 'artifact-versions.json');

/** Loads the artifact versions committed with the `mailbox` package. */
export function loadMailServerArtifactVersions(): EmbeddedArtifactVersions {
  return loadEmbeddedArtifactVersions(MAIL_SERVER_ARTIFACT_VERSIONS_PATH);
}
