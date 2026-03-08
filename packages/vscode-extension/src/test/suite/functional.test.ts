import * as assert from 'assert';
import * as vscode from 'vscode';

import { createStatusBar, disposeStatusBar, getSessionStats, updateSessionSavings, refreshStatusBar, setCalibrating } from '../../statusBar.js';
import { setFullEffortOnce, getAndClearFullEffortOnce } from '../../fullEffortOnce.js';
import { MonisaveChatProvider } from '../../provider.js';

describe('Functional Tests', () => {
  it('status bar default and updates', () => {
    // Ensure test uses post-calibration behavior for accumulation assertions.
    setCalibrating(null);
    const item = createStatusBar();
    // default should show 'MoniSave'
    assert.ok(item.text.includes('MoniSave'));
    const stats0 = getSessionStats();
    assert.strictEqual(stats0.saved_tokens, 0);
    assert.strictEqual(stats0.saved_usd, 0);

    updateSessionSavings(42, 0.1234, 'medium');
    refreshStatusBar();
    const stats1 = getSessionStats();
    assert.strictEqual(stats1.saved_tokens, 42);
    // money formatting uses usd by default
    assert.ok(item.text.includes('Saved') || item.text.includes('省'));

    disposeStatusBar();
  });

  it('fullEffortOnce flag toggles and clears', () => {
    // ensure clear
    assert.strictEqual(getAndClearFullEffortOnce(), false);
    setFullEffortOnce();
    assert.strictEqual(getAndClearFullEffortOnce(), true);
    // second read should be cleared
    assert.strictEqual(getAndClearFullEffortOnce(), false);
  });

  it('provider token counting', async () => {
    const provider = new MonisaveChatProvider();
    const token = new vscode.CancellationTokenSource().token;
    const count = await provider.provideTokenCount({} as any, 'hello world', token);
    assert.ok(Number.isFinite(count) && count > 0);
    const objCount = await provider.provideTokenCount({} as any, { foo: 'bar' } as any, token);
    assert.ok(Number.isFinite(objCount) && objCount > 0);
  });
});
