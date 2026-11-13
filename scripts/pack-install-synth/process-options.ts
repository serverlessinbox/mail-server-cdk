/** The working folder and complete environment a child process runs with. */
export interface ProcessOptions {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
}
