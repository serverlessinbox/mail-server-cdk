import * as t                   from 'typanion';

import { parseJsonObject }      from '../utils/json-value';
import type { JsonObject }      from '../utils/json-value';

import type { PackageVersions } from './package-versions';
import { ProcessRunner }        from './process-runner';

/** Validates the one field of a packed `package.json` this reader reads. */
const isPeerManifest = t.isPartial({ peerDependencies: t.isOptional(t.isRecord(t.isString())) });

/**
 * Reads the peer dependency ranges a packed tarball declares. The manifest is extracted in memory with
 * `tar`; nothing is unpacked to disk.
 */
export class PackedManifestReader {
  private readonly runner: ProcessRunner;

  constructor(runner: ProcessRunner) {
    this.runner = runner;
  }

  /** Returns the peer ranges by package name, `{}` when the manifest declares none. Throws when the tarball cannot be read. */
  public async peerDependencies(tarball: string): Promise<PackageVersions> {
    const manifest: unknown = await this.readPackageJson(tarball);
    const errors: string[]  = [];
    if (!isPeerManifest(manifest, { errors })) {
      throw new Error(`${tarball} package/package.json has an invalid peerDependencies field: ${errors.join('; ')}`);
    }
    return manifest.peerDependencies ?? {};
  }

  /** Extracts `package/package.json` from the tarball and parses it into a JSON object. */
  private async readPackageJson(tarball: string): Promise<JsonObject> {
    const result = await this.runner.run('tar', ['-xzOf', tarball, 'package/package.json'], {
      cwd: process.cwd(),
      env: process.env,
    });
    if (result.exitCode !== 0) {
      throw new Error(`Cannot read package/package.json from ${tarball}: ${result.stderr}`);
    }
    return parseJsonObject(result.stdout, `${tarball} package/package.json`);
  }
}
