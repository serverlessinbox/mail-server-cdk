import type { IArtifactResolver }         from '@serverlessinbox/artifact-registry-cdk';
import { ArtifactResolverFactory }        from '@serverlessinbox/mail-server-cdk-shared';
import type { Construct }                 from 'constructs';

import { loadMailServerArtifactVersions } from './mail-server-artifact-versions';
import { loadMailServerRegistryRecord }   from './mail-server-registry-record';

/**
 * Pins an artifact resolver from the registry record and artifact versions shipped with this
 * package, overridden by the CDK context of `scope`.
 */
export function createMailServerPinnedResolver(scope: Construct): IArtifactResolver {
  return ArtifactResolverFactory.fromContext(scope, loadMailServerRegistryRecord(), loadMailServerArtifactVersions());
}
