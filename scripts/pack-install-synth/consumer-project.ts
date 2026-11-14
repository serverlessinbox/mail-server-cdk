import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join }                       from 'node:path';

import type { PackageVersions }       from './package-versions';
import type { PackedTarball }         from './packed-tarball';
import type { ProcessResult }         from './process-result';
import { ProcessRunner }              from './process-runner';

/** Characters of the install output kept in an error message: yarn reports the failure at the end. */
const OUTPUT_TAIL_LENGTH = 2000;

/** Fixture files copied beside the installed packages; the packed runner requires the consumer stack. */
const FIXTURE_FILES = ['consumer-stack.js', 'packed-runner.js'];

/**
 * Builds an empty consumer project that depends only on the packed tarballs and their pinned peers, then
 * installs it. Scripts are off, so the install runs the way a customer's project would, without the
 * repository's PnP loader.
 */
export class ConsumerProject {
  private readonly runner: ProcessRunner;
  private readonly directory: string;

  constructor(runner: ProcessRunner, directory: string) {
    this.runner    = runner;
    this.directory = directory;
  }

  /** Writes the manifest and config, copies the fixtures and installs. Throws, with the end of yarn's output, when the install fails. */
  public async create(tarballs: readonly PackedTarball[], peerPins: PackageVersions): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    await this.writePackageJson(tarballs, peerPins);
    await this.writeYarnConfig();
    await writeFile(join(this.directory, 'yarn.lock'), '');
    await this.copyFixtures();
    await this.install();
  }

  private async writePackageJson(tarballs: readonly PackedTarball[], peerPins: PackageVersions): Promise<void> {
    const dependencies: PackageVersions = {
      ...Object.fromEntries(tarballs.map(tarball => [tarball.name, `file:${tarball.file}`])),
      ...peerPins,
    };
    await writeFile(
      join(this.directory, 'package.json'),
      JSON.stringify({ name: 'consumer', private: true, dependencies }, null, 2),
    );
  }

  private async writeYarnConfig(): Promise<void> {
    const config = [
      'nodeLinker: node-modules',
      'enableScripts: false',
      'enableImmutableInstalls: false',
      'enableTelemetry: false',
      '',
    ].join('\n');
    await writeFile(join(this.directory, '.yarnrc.yml'), config);
  }

  private async copyFixtures(): Promise<void> {
    const fixtureDirectory = join(__dirname, 'fixtures');
    for (const fixtureFile of FIXTURE_FILES) {
      await copyFile(join(fixtureDirectory, fixtureFile), join(this.directory, fixtureFile));
    }
  }

  private async install(): Promise<void> {
    const result = await this.runner.run('yarn', ['install'], {
      cwd: this.directory,
      env: this.childEnvironment(),
    });
    if (result.exitCode !== 0) {
      throw new Error(`Installing the consumer project failed with exit code ${result.exitCode}: ${this.outputTail(result)}`);
    }
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
