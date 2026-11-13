import { readdir, readFile } from 'node:fs/promises';
import type { Dirent }       from 'node:fs';
import { join }              from 'node:path';
import * as t                from 'typanion';

import { parseJsonObject }   from '../utils/json-value';

/** Validates the one field of an installed `package.json` this finder reads. */
const isPackageNameManifest = t.isPartial({ name: t.isString() });

/**
 * Finds the installed copies of one npm package under a project's `node_modules`: top-level folders,
 * scoped folders and nested `node_modules` folders. It reads folder layout and manifests only; it does
 * not decide which copy a runtime would load.
 */
export class InstalledPackageFinder {
  /** Returns the sorted absolute folders whose `package.json` `name` is `packageName`; empty when none is installed. */
  public async find(projectDirectory: string, packageName: string): Promise<string[]> {
    const packageDirectories = await this.collectPackageDirectories(join(projectDirectory, 'node_modules'));
    const named              = await Promise.all(packageDirectories.map(async directory => ({
      directory,
      matches: (await this.readPackageName(directory)) === packageName,
    })));
    return named.filter(entry => entry.matches).map(entry => entry.directory).sort();
  }

  private async collectPackageDirectories(modulesDirectory: string): Promise<string[]> {
    const found: string[] = [];
    for (const entryName of await this.listSubdirectories(modulesDirectory)) {
      const entryPath = join(modulesDirectory, entryName);
      const packages  = entryName.startsWith('@')
        ? await this.collectScopePackages(entryPath)
        : await this.collectPackage(entryPath);
      found.push(...packages);
    }
    return found;
  }

  private async collectScopePackages(scopeDirectory: string): Promise<string[]> {
    const found: string[] = [];
    for (const packageName of await this.listSubdirectories(scopeDirectory)) {
      found.push(...await this.collectPackage(join(scopeDirectory, packageName)));
    }
    return found;
  }

  private async collectPackage(packageDirectory: string): Promise<string[]> {
    return [
      packageDirectory,
      ...await this.collectPackageDirectories(join(packageDirectory, 'node_modules')),
    ];
  }

  private async listSubdirectories(directory: string): Promise<string[]> {
    const entries = await this.readDirectoryEntries(directory);
    return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
  }

  private async readDirectoryEntries(directory: string): Promise<Dirent[]> {
    try {
      return await readdir(directory, { withFileTypes: true });
    } catch (error: unknown) {
      return this.valueIfMissing(error, []);
    }
  }

  private async readPackageName(packageDirectory: string): Promise<string | undefined> {
    const manifestPath = join(packageDirectory, 'package.json');
    const manifestText = await this.readOptionalText(manifestPath);
    if (manifestText === undefined) {
      return undefined;
    }
    const manifest = parseJsonObject(manifestText, manifestPath);
    if (!isPackageNameManifest(manifest)) {
      return undefined;
    }
    return manifest.name;
  }

  private async readOptionalText(filePath: string): Promise<string | undefined> {
    try {
      return await readFile(filePath, 'utf8');
    } catch (error: unknown) {
      return this.valueIfMissing(error, undefined);
    }
  }

  /** A missing entry is the fallback value; any other file system error is rethrown. */
  private valueIfMissing<T>(error: unknown, fallback: T): T {
    if (this.isMissingEntry(error)) {
      return fallback;
    }
    throw error;
  }

  /** Checks the error code rather than `instanceof Error`, which fails for errors created in another realm (Jest). */
  private isMissingEntry(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
  }
}
