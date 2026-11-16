import { ArtifactZone }      from '@serverlessinbox/artifact-registry-cdk';
import * as path             from 'node:path';

import type { BakedPackage } from './baked-package';

/** The publishable packages of this repo, each with the `artifact-versions.json` it ships and the packages it pins. */
export class BakedPackages {
  /**
   * The files to bake for the repository at `root`. `mail-server-cdk` and `mail-server-cdk-edge` are both
   * published from the `mail-server` package folder, so they take its version.
   */
  public static forRepository(root: string, mailServerPinsFile: string): BakedPackage[] {
    const mailServerDirectory = path.join(root, 'packages', 'mail-server');
    const cognitoDirectory    = path.join(root, 'packages', 'mail-server-cognito');
    const sharedDirectory     = path.join(root, 'packages', 'mail-server-cdk-shared');
    return [
      {
        outputFile:       path.join(mailServerDirectory, 'artifact-versions.json'),
        externalPinsFile: mailServerPinsFile,
        ownArtifacts:     [
          { key: 'mail-server-cdk', zone: ArtifactZone.REGIONAL, manifestDirectory: mailServerDirectory },
          { key: 'mail-server-cdk-edge', zone: ArtifactZone.EDGE, manifestDirectory: mailServerDirectory },
          { key: 'mail-server-cdk-shared', zone: ArtifactZone.REGIONAL, manifestDirectory: sharedDirectory },
        ],
      },
      {
        outputFile:   path.join(cognitoDirectory, 'artifact-versions.json'),
        ownArtifacts: [
          { key: 'mail-server-cognito', zone: ArtifactZone.REGIONAL, manifestDirectory: cognitoDirectory },
          { key: 'mail-server-cdk-shared', zone: ArtifactZone.REGIONAL, manifestDirectory: sharedDirectory },
        ],
      },
    ];
  }
}
