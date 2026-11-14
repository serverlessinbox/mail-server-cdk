import { runExit }                 from 'clipanion';

import { PackInstallSynthCommand } from './pack-install-synth-command';

void runExit({ binaryName: 'yarn pack-install-synth' }, [PackInstallSynthCommand]);
