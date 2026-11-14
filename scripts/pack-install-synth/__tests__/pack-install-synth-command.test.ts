import { Cli }                             from 'clipanion';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir }                          from 'node:os';
import * as path                           from 'node:path';
import { Writable }                        from 'node:stream';

import type { JsonObject }                 from '../../utils/json-value';
import { PackInstallSynthCommand }         from '../pack-install-synth-command';
import type { PackedSynthesis }            from '../packed-synthesis';
import { PackedSynthesizer }               from '../packed-synthesizer';
import { SourceSynthesizer }               from '../source-synthesizer';

/**
 * Pins what the packed-install gate reads: exit 0 with the packed folder removed when the packed
 * template matches the source one, exit 1 with the failing parts and the kept folder, and exit 2 when
 * the check itself throws. Both synthesizers are stubbed; what counts as a difference belongs to
 * `TemplateDiffer`, and how the packs and installs run belongs to their own suites.
 */
describe('PackInstallSynthCommand', () => {
  const sourceTemplate: JsonObject = {
    Resources: { Bucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: 'source-name' } } },
  };
  const packedTemplate: JsonObject = {
    Resources: { Bucket: { Type: 'AWS::S3::Bucket', Properties: { BucketName: 'packed-name' } } },
  };

  let packedDirectory: string;

  beforeEach(() => {
    packedDirectory = mkdtempSync(path.join(tmpdir(), 'pack-install-synth-test-'));
    jest.spyOn(SourceSynthesizer.prototype, 'synthesize').mockReturnValue(sourceTemplate);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(packedDirectory, { recursive: true, force: true });
  });

  /** A packed synthesis whose folder is the one this suite created; the defaults are one copy of each package. */
  function packedSynthesis(overrides: Partial<PackedSynthesis>): PackedSynthesis {
    return {
      directory:       packedDirectory,
      template:        undefined,
      failure:         undefined,
      installedCopies: { awsCdkLib: ['/project/node_modules/aws-cdk-lib'], constructs: ['/project/node_modules/constructs'] },
      ...overrides,
    };
  }

  function mockPacked(synthesis: PackedSynthesis): void {
    jest.spyOn(PackedSynthesizer.prototype, 'synthesize').mockResolvedValue(synthesis);
  }

  it('exits 0 and removes the packed folder when the packed template is identical', async () => {
    mockPacked(packedSynthesis({ template: sourceTemplate }));

    const run = await runCli([]);

    expect(run).toEqual({ exitCode: 0, stdout: '', stderr: '' });
    expect(existsSync(packedDirectory)).toBe(false);
  });

  it('exits 1 and prints the differing property path and the kept folder when the template differs', async () => {
    mockPacked(packedSynthesis({ template: packedTemplate }));

    const run = await runCli([]);

    expect(run.exitCode).toBe(1);
    expect(run.stdout).toContain('consumer-stack: DIFFERENT');
    expect(run.stdout).toContain('Resources/Bucket');
    expect(run.stdout).toContain('Properties.BucketName');
    expect(run.stdout).toContain(`Kept: ${packedDirectory}\n`);
    expect(existsSync(packedDirectory)).toBe(true);
  });

  it('exits 1 and prints the packed error output when the packed synthesis failed', async () => {
    mockPacked(packedSynthesis({ template: undefined, failure: 'Error: Peer is missing' }));

    const run = await runCli([]);

    expect(run.exitCode).toBe(1);
    expect(run.stdout).toContain('Packed synthesis failed:\nError: Peer is missing\n');
    expect(run.stdout).toContain(`Kept: ${packedDirectory}\n`);
  });

  it('exits 1 and lists both copies when two copies of aws-cdk-lib are installed', async () => {
    mockPacked(packedSynthesis({
      template:        sourceTemplate,
      installedCopies: { awsCdkLib: ['/project/node_modules/aws-cdk-lib', '/project/node_modules/x/node_modules/aws-cdk-lib'], constructs: ['/project/node_modules/constructs'] },
    }));

    const run = await runCli([]);

    expect(run.exitCode).toBe(1);
    expect(run.stdout).toContain('Expected one installed copy of aws-cdk-lib, found 2:\n  /project/node_modules/aws-cdk-lib\n  /project/node_modules/x/node_modules/aws-cdk-lib\n');
    expect(run.stdout).not.toContain('constructs');
  });

  it('exits 2 and writes the error on stderr when the check throws', async () => {
    jest.spyOn(PackedSynthesizer.prototype, 'synthesize').mockRejectedValue(new Error('pack failed'));

    const run = await runCli([]);

    expect(run).toEqual({ exitCode: 2, stdout: '', stderr: 'pack-install-synth failed: pack failed\n' });
  });
});

interface CliRun {
  readonly exitCode: number;
  readonly stdout:   string;
  readonly stderr:   string;
}

async function runCli(argv: string[]): Promise<CliRun> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const exitCode         = await Cli.from([PackInstallSynthCommand]).run(argv, {
    stdout: collectingStream(stdout),
    stderr: collectingStream(stderr),
  });
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') };
}

/** A writable stream that appends every chunk written to it to `chunks`. */
function collectingStream(chunks: string[]): Writable {
  return new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
}
