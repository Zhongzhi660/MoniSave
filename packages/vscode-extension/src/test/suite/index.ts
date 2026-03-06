import * as path from 'path';
import Mocha = require('mocha');
import glob = require('glob');

export function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'bdd', color: true });
  const testsRoot = path.resolve(__dirname);

  return new Promise((resolve, reject) => {
    try {
      const files: string[] = glob.sync('**/*.test.js', { cwd: testsRoot });
      files.forEach((f: string) => mocha.addFile(path.join(testsRoot, f)));
      mocha.run((failures: number) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      reject(err as Error);
    }
  });
}
