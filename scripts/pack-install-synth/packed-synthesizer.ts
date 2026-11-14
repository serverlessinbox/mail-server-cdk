import { mkdtemp, readFile }      from 'node:fs/promises';
import { tmpdir }                 from 'node:os';
import { join }                   from 'node:path';

import { parseJsonObject }        from '../utils/json-value';
import type { JsonObject }        from '../utils/json-value';

import { ConsumerProject }        from './consumer-project';
import type { InstalledCopies }   from './installed-copies';
import { InstalledPackageFinder } from './installed-package-finder';
import { PackagePacker }          from './package-packer';
import type { PackageVersions }   from './package-versions';
import { PackedManifestReader }   from './packed-manifest-reader';
import type { PackedSynthesis }   from './packed-synthesis';
import type { PackedTarball }     from './packed-tarball';
import type { ProcessResult }     from './process-result';
import { ProcessRunner }          from './process-runner';
import { YarnLockVersionReader }  from './yarn-lock-version-reader';

/** Characters of the synthesis output kept in a failure: the runner reports the failure at the end. */
const OUTPUT_TAIL_LENGTH = 2000;

/** Prefix of the temporary folder that holds the tarballs, the clean project and the template. */
const TEMP_PREFIX = 'pack-install-synth-';

/**
 * Packs the workspaces, installs the tarballs into a clean project and synthesizes the consumer stack
 * there, so the packed side of the check is what a customer's install produces. Peers that are not
 * packed are pinned to the versions the repository's `yarn.lock` resolves.
 */
export class PackedSynthesizer {
  private readonly runner: ProcessRunner;
  private readonly repositoryRoot: string;
  private readonly workspaces: readonly string[];
  private readonly frozenTimeMillis: number;
  private readonly frozenRandom: number;
  private readonly packer: PackagePacker;
  private readonly manifestReader: PackedManifestReader;
  private readonly lockReader: YarnLockVersionReader;
  private readonly installedFinder: InstalledPackageFinder;

  constructor(
    runner: ProcessRunner,
    repositoryRoot: string,
    workspaces: readonly string[],
    lockText: string,
    frozenTimeMillis: number,
    frozenRandom: number,
  ) {
    this.runner           = runner;
    this.repositoryRoot   = repositoryRoot;
    this.workspaces       = workspaces;
    this.frozenTimeMillis = frozenTimeMillis;
    this.frozenRandom     = frozenRandom;
    this.packer           = new PackagePacker(runner, repositoryRoot);
    this.manifestReader   = new PackedManifestReader(runner);
    this.lockReader       = new YarnLockVersionReader(lockText);
    this.installedFinder  = new InstalledPackageFinder();
  }

  /** Packs, installs and synthesizes. Pack and install errors are thrown; a failed synthesis run is returned as `failure`. */
  public async synthesize(): Promise<PackedSynthesis> {
    const directory        = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
    const tarballs         = await this.packWorkspaces(directory);
    const peerPins         = await this.peerPins(tarballs);
    const projectDirectory = join(directory, 'project');
    await new ConsumerProject(this.runner, projectDirectory).create(tarballs, peerPins);
    const installedCopies = await this.installedCopies(projectDirectory);
    const outcome         = await this.runPackedSynthesis(projectDirectory, directory);
    return { directory, template: outcome.template, failure: outcome.failure, installedCopies };
  }

  private async packWorkspaces(directory: string): Promise<PackedTarball[]> {
    const tarballs: PackedTarball[] = [];
    for (const workspace of this.workspaces) {
      const file = join(directory, `${workspace.replace(/[@/]/g, '-')}.tgz`);
      await this.packer.pack(workspace, file);
      tarballs.push({ name: workspace, file });
    }
    return tarballs;
  }

  private async peerPins(tarballs: readonly PackedTarball[]): Promise<PackageVersions> {
    const pins: [string, string][] = [];
    for (const tarball of tarballs) {
      const peers = await this.manifestReader.peerDependencies(tarball.file);
      for (const [peerName, range] of Object.entries(peers)) {
        if (!this.workspaces.includes(peerName)) {
          pins.push([peerName, this.pinFor(peerName, range)]);
        }
      }
    }
    return Object.fromEntries(pins);
  }

  private pinFor(peerName: string, range: string): string {
    if (range.startsWith('workspace:')) {
      throw new Error(`Peer ${peerName} is declared as ${range} but is not one of the packed workspaces`);
    }
    return this.lockReader.read(peerName, range);
  }

  private async installedCopies(projectDirectory: string): Promise<InstalledCopies> {
    return {
      awsCdkLib:  await this.installedFinder.find(projectDirectory, 'aws-cdk-lib'),
      constructs: await this.installedFinder.find(projectDirectory, 'constructs'),
    };
  }

  private async runPackedSynthesis(
    projectDirectory: string,
    directory: string,
  ): Promise<Pick<PackedSynthesis, 'template' | 'failure'>> {
    const templateFile = join(directory, 'template.json');
    const result       = await this.runner.run('node', [
      'packed-runner.js',
      templateFile,
      String(this.frozenTimeMillis),
      String(this.frozenRandom),
    ], { cwd: projectDirectory, env: this.childEnvironment() });
    if (result.exitCode !== 0) {
      return { template: undefined, failure: this.outputTail(result) };
    }
    return { template: await this.readTemplate(templateFile), failure: undefined };
  }

  private async readTemplate(templateFile: string): Promise<JsonObject> {
    return parseJsonObject(await readFile(templateFile, 'utf8'), templateFile);
  }

  /** The inherited environment without NODE_OPTIONS, which carries the repository's PnP loader into a child. */
  private childEnvironment(): NodeJS.ProcessEnv {
    const environment: NodeJS.ProcessEnv = { ...process.env };
    delete environment.NODE_OPTIONS;
    return environment;
  }

  private outputTail(result: ProcessResult): string {
    return `${result.stdout}${result.stderr}`.slice(-OUTPUT_TAIL_LENGTH);
  }
}
