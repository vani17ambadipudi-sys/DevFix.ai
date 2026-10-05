import assert from 'assert';
import { ModelRouter } from '../../server/services/modelRouter';

export async function runModelRouterTests() {
  console.log('  ▶ Running ModelRouter tests...');

  // Test 1: User override to localTransformer
  const dec1 = ModelRouter.selectModel('print("hello")', 'Python', 'localTransformer');
  assert.strictEqual(dec1.target, 'localTransformer', 'Explicit localTransformer selection must be honored');

  // Test 2: User override to staticAnalysis
  const dec2 = ModelRouter.selectModel('x = 1', 'Python', 'staticAnalysis');
  assert.strictEqual(dec2.target, 'staticAnalysis', 'Explicit staticAnalysis selection must be honored');

  // Test 3: Language routing logic
  const dec3 = ModelRouter.selectModel('def foo(): pass', 'Python');
  assert.strictEqual(['gemini', 'localTransformer', 'staticAnalysis'].includes(dec3.target), true);

  console.log('  ✔ ModelRouter tests passed.');
}
