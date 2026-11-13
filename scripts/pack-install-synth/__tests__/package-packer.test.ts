import { PackagePacker } from '../package-packer';
import { ProcessRunner } from '../process-runner';

/**
 * Pins how the packer drives yarn: the exact arguments and working folder, and that a failed pack
 * throws naming the workspace with the end of yarn's output. Swallowing a non-zero exit would let a
 * broken tarball reach the install step.
 */
describe('PackagePacker', () => {
  const repositoryRoot = '/repository/root';
  const outFile        = '/packed/mailbox.tgz';

  it('runs yarn workspace pack with the output file, in the repository root, with the inherited environment', async () => {
    const runSpy = jest.spyOn(ProcessRunner.prototype, 'run')
      .mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

    await new PackagePacker(new ProcessRunner(), repositoryRoot).pack('@serverlessinbox/mailbox', outFile);

    expect(runSpy).toHaveBeenCalledWith(
      'yarn',
      ['workspace', '@serverlessinbox/mailbox', 'pack', '--out', outFile],
      { cwd: repositoryRoot, env: process.env },
    );
  });

  it('throws, naming the workspace and keeping only the end of the output, when yarn exits non-zero', async () => {
    jest.spyOn(ProcessRunner.prototype, 'run').mockResolvedValue({
      exitCode: 1,
      stdout:   `start-marker${'x'.repeat(2500)}end-marker`,
      stderr:   '',
    });
    const failure = new PackagePacker(new ProcessRunner(), repositoryRoot).pack('@serverlessinbox/mailbox', outFile);

    await expect(failure).rejects.toThrow('Packing @serverlessinbox/mailbox failed');
    await expect(failure).rejects.toThrow('end-marker');
    await expect(failure).rejects.not.toThrow('start-marker');
  });
});
