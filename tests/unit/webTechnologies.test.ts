import assert from 'assert';
import { StaticAnalyzerFallback } from '../../server/services/staticAnalyzer';

export async function runWebTechnologiesTests() {
  console.log('  ▶ Running Web Technologies (HTML, CSS, JS) Unit Tests...');

  // ==========================================
  // 1. HTML TESTS
  // ==========================================
  // Test 1.1: Duplicate ID detection and resolution
  const htmlWithDuplicateId = `
    <div id="user-card">
      <button id="user-card">Submit</button>
    </div>
  `;
  const htmlRes1 = StaticAnalyzerFallback.analyze('HTML', htmlWithDuplicateId);
  assert.strictEqual(htmlRes1.status, 'error_found', 'Duplicate ID must be flagged as error');
  assert(htmlRes1.problems.some((p) => p.title.includes('Duplicate ID')), 'Must identify Duplicate ID');
  assert(htmlRes1.correctedCode.includes('id="user-card-btn"'), 'Corrected code must rename duplicate ID');

  // Test 1.2: Missing alt attribute on <img>
  const htmlMissingAlt = `<nav><img src="/logo.svg"><a href="/">Home</a></nav>`;
  const htmlRes2 = StaticAnalyzerFallback.analyze('HTML', htmlMissingAlt);
  assert(htmlRes2.problems.some((p) => p.title.includes('alt Attribute')), 'Must identify missing alt attribute');
  assert(htmlRes2.correctedCode.includes('alt='), 'Corrected code must append alt attribute');

  // Test 1.3: Dangerous inline eval() XSS security vulnerability
  const htmlEval = `<button onclick="eval(document.getElementById('input').value)">Run</button>`;
  const htmlRes3 = StaticAnalyzerFallback.analyze('HTML', htmlEval);
  assert(htmlRes3.problems.some((p) => p.title.includes('Inline eval()')), 'Must detect security issue with eval');
  assert(!htmlRes3.correctedCode.includes('eval('), 'Corrected code must eliminate eval()');

  // ==========================================
  // 2. CSS TESTS
  // ==========================================
  // Test 2.1: Missing semicolons between properties
  const cssMissingSemi = `.card {\n  display: flex\n  background-color: #1e293b\n}`;
  const cssRes1 = StaticAnalyzerFallback.analyze('CSS', cssMissingSemi);
  assert.strictEqual(cssRes1.status, 'error_found');
  assert(cssRes1.problems.some((p) => p.title.includes('Missing Semicolons')));
  assert(cssRes1.correctedCode.includes('display: flex;'), 'Corrected code must add semicolon');

  // Test 2.2: Misspelled CSS property 'colour'
  const cssColour = `.title { colour: #ffffff; }`;
  const cssRes2 = StaticAnalyzerFallback.analyze('CSS', cssColour);
  assert(cssRes2.problems.some((p) => p.title.includes('colour')));
  assert(cssRes2.correctedCode.includes('color: #ffffff;'), 'Corrected code must replace colour with color');

  // Test 2.3: Unitless dimensions
  const cssUnitless = `.box { margin: 20; }`;
  const cssRes3 = StaticAnalyzerFallback.analyze('CSS', cssUnitless);
  assert(cssRes3.problems.some((p) => p.title.includes('Unitless Dimension')));
  assert(cssRes3.correctedCode.includes('margin: 20px;'), 'Corrected code must append px unit');

  // ==========================================
  // 3. JAVASCRIPT TESTS
  // ==========================================
  // Test 3.1: Loop boundary off-by-one error
  const jsOffByOne = `for (let i = 0; i <= arr.length; i++) { sum += arr[i]; }`;
  const jsRes1 = StaticAnalyzerFallback.analyze('JavaScript', jsOffByOne);
  assert(jsRes1.problems.some((p) => p.title.includes('Off-by-one')));
  assert(jsRes1.correctedCode.includes('< arr.length'), 'Corrected code must replace <= with <');

  // Test 3.2: Nested undefined property dereference
  const jsUndefined = `function print(user) { console.log(user.profile.name); }`;
  const jsRes2 = StaticAnalyzerFallback.analyze('JavaScript', jsUndefined);
  assert(jsRes2.problems.some((p) => p.title.includes('TypeError')));
  assert(jsRes2.correctedCode.includes('user?.profile?.name'), 'Corrected code must use optional chaining');

  // Test 3.3: Missing await on fetch
  const jsAsync = `async function load() { const response = fetch('/api'); const data = response.json(); }`;
  const jsRes3 = StaticAnalyzerFallback.analyze('JavaScript', jsAsync);
  assert(jsRes3.problems.some((p) => p.title.includes('Missing await')));
  assert(jsRes3.correctedCode.includes('await fetch'), 'Corrected code must include await fetch');

  console.log('  ✔ Web Technologies (HTML, CSS, JS) Unit Tests passed.');
}
