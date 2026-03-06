import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Extension Test Suite', () => {
  it('extension activates', async () => {
    const ext = vscode.extensions.all.find(e => e.packageJSON && e.packageJSON.name === 'monisave');
    if (!ext) {
      assert.fail('Extension "monisave" not found in extensions.all');
      return;
    }
    await ext.activate();
    assert.ok(ext.isActive, 'Extension should be active after activation');
  }).timeout(10000);
});
