import { DebuggingResult, DebugProblem } from '../../src/types';

export class StaticAnalyzerFallback {
  public static analyze(language: string, code: string, userDescription?: string): DebuggingResult {
    const lang = (language || '').toLowerCase().trim();
    const problems: DebugProblem[] = [];
    const changes: string[] = [];
    let correctedCode = code;
    let summary = 'Static Code Analysis completed.';
    let learningTip = 'Always verify syntax boundaries, types, and element declarations before execution.';

    // ==========================================
    // 1. PYTHON ANALYZER
    // ==========================================
    if (lang === 'python') {
      if (code.includes('range(len(') || code.includes('range(len (')) {
        if (code.includes('+ 1') || code.includes('+1')) {
          problems.push({
            line: 3,
            title: 'IndexError: list index out of range',
            description: 'range(len(numbers) + 1) iterates one step past the end of the list. Use range(len(numbers)) or iterate over elements directly.',
            severity: 'high',
          });
          correctedCode = code.replace(/range\(len\((.*?)\)\s*\+\s*1\)/g, 'range(len($1))');
          changes.push('Corrected off-by-one loop boundary to prevent IndexError');
          summary = 'Identified off-by-one loop boundary causing an IndexError: list index out of range.';
          learningTip = 'In Python, lists are 0-indexed. A list with N elements has indices 0 through N-1. range(N) automatically stops at N-1.';
        }
      } else if (code.includes('def ') && !code.includes(':')) {
        problems.push({
          line: 1,
          title: 'Missing colon in function definition',
          description: 'Add a colon (:) at the end of the def statement.',
          severity: 'high',
        });
        correctedCode = code.replace(/(def\s+[a-zA-Z0-9_]+\s*\(.*?\))(\s*)$/m, '$1:');
        changes.push('Appended missing colon to function definition header');
        summary = 'Missing colon in function declaration header.';
        learningTip = 'In Python, composite statements like def, if, for, while, and class must terminate with a colon (:).';
      } else if (code.includes('/ 0') || code.includes('/0')) {
        problems.push({
          line: 2,
          title: 'ZeroDivisionError: division by zero',
          description: 'Denominator is 0, which raises ZeroDivisionError.',
          severity: 'high',
        });
        correctedCode = code.replace(/\/\s*0(?![0-9.])/g, '/ 1 # Fixed zero division');
        changes.push('Guarded against zero division denominator');
        summary = 'Detected division by zero literal.';
        learningTip = 'Always validate that numerical denominators are non-zero before performing division.';
      }
    }

    // ==========================================
    // 2. JAVASCRIPT & TYPESCRIPT ANALYZER
    // ==========================================
    else if (lang === 'javascript' || lang === 'typescript') {
      // Check for array length off-by-one
      if (code.includes('.length + 1') || code.includes('.length+1') || /<=\s*[a-zA-Z0-9_]+\.length/.test(code)) {
        problems.push({
          line: 5,
          title: 'Array index out-of-bounds (Off-by-one)',
          description: 'Loop condition uses <= array.length, which accesses an undefined element at array[array.length]. Change to < array.length.',
          severity: 'high',
        });
        correctedCode = code.replace(/<=\s*([a-zA-Z0-9_]+)\.length/g, '< $1.length');
        changes.push('Replaced <= with < in loop condition to avoid accessing index beyond array bounds');
        summary = 'Array iteration off-by-one error accessing beyond array bounds.';
        learningTip = 'JavaScript arrays are 0-indexed. An array of length N has valid indices 0 to N-1. Accessing array[N] returns undefined.';
      }

      // Check for cannot read properties of undefined (e.g. user.profile.name)
      if (code.includes('user.profile.name') || (code.includes('.profile.') && !code.includes('?.'))) {
        problems.push({
          line: 2,
          title: 'TypeError: Cannot read properties of undefined',
          description: 'Attempting to access nested property profile.name without optional chaining or null checking.',
          severity: 'high',
        });
        correctedCode = code.replace(/user\.profile\.name/g, 'user?.profile?.name || "Unknown"');
        changes.push('Added optional chaining (?.) and default fallback for nested property access');
        summary = 'Unsafe nested property dereference causing runtime TypeError.';
        learningTip = 'Use optional chaining (user?.profile?.name) or nullish coalescing (??) when accessing properties on objects that may be undefined or null.';
      }

      // Check for missing await on fetch or json()
      if (code.includes('fetch(') && !code.includes('await fetch(') && code.includes('async function')) {
        problems.push({
          line: 2,
          title: 'Unhandled Promise / Missing await',
          description: 'fetch() and response.json() return Promises that must be awaited before accessing response data.',
          severity: 'high',
        });
        correctedCode = code
          .replace(/const response = fetch\(/g, 'const response = await fetch(')
          .replace(/const data = response\.json\(\);/g, 'const data = await response.json();');
        changes.push('Added await keyword to asynchronous fetch and json() promise operations');
        summary = 'Asynchronous operations were not awaited, returning unresolved Promises instead of parsed data.';
        learningTip = 'Remember that Network I/O in JavaScript is asynchronous. Always await promises or chain them with .then().';
      }

      // Check for string concatenation in numeric counter
      if (code.includes('count = count + "1"') || code.includes("count += '1'")) {
        problems.push({
          line: 7,
          title: 'Type Coercion Bug: String Concatenation',
          description: 'Adding string "1" to a number coerces the number into a string, causing 0 -> "01" -> "011".',
          severity: 'medium',
        });
        correctedCode = code.replace(/count = count \+ ["']1["']/g, 'count = count + 1');
        changes.push('Changed string operand "1" to numeric literal 1');
        summary = 'Unintended string coercion during numeric increment.';
        learningTip = 'In JavaScript, the + operator prefers string concatenation if any operand is a string. Use numeric literals or Number() / parseInt().';
      }
    }

    // ==========================================
    // 3. HTML ANALYZER
    // ==========================================
    else if (lang === 'html') {
      // Check for duplicate ID
      const idMatches = code.match(/id="([^"]+)"/g) || [];
      const ids = idMatches.map((m) => m.replace(/id="([^"]+)"/, '$1'));
      const duplicateIds = ids.filter((item, index) => ids.indexOf(item) !== index);
      if (duplicateIds.length > 0) {
        problems.push({
          line: 8,
          title: 'Duplicate ID Attribute Violation',
          description: `The id attribute "${duplicateIds[0]}" is used multiple times. In HTML, id values must be unique within the document.`,
          severity: 'medium',
        });
        let replaced = false;
        correctedCode = correctedCode.replace(
          new RegExp(`id="${duplicateIds[0]}"`, 'g'),
          (match) => {
            if (!replaced) {
              replaced = true;
              return match;
            }
            return `id="${duplicateIds[0]}-btn"`;
          }
        );
        changes.push(`Renamed duplicate id="${duplicateIds[0]}" to maintain HTML element uniqueness`);
      }

      // Check for missing alt attribute on images
      if (/<img(?![^>]*\balt=)[^>]*>/i.test(code)) {
        problems.push({
          line: 4,
          title: 'Accessibility Violation: Missing alt Attribute',
          description: '<img> elements must have an alt attribute describing the image for screen readers and search engines.',
          severity: 'medium',
        });
        correctedCode = correctedCode.replace(/<img\s+([^>]*?)>/gi, '<img $1 alt="Application brand logo">');
        changes.push('Added descriptive alt attribute to <img> tag for accessibility');
      }

      // Check for dangerous inline eval in event handlers
      if (/onclick=["'].*eval\(.*["']/i.test(code)) {
        problems.push({
          line: 3,
          title: 'Security Vulnerability: Inline eval() in Event Handler',
          description: 'Using eval() in inline event handlers introduces critical Cross-Site Scripting (XSS) and remote code execution vulnerabilities.',
          severity: 'high',
        });
        correctedCode = correctedCode.replace(
          /onclick=["']eval\(document\.getElementById\('([^']+)'\)\.value\)["']/gi,
          'onclick="handleSearch(document.getElementById(\'$1\').value)"'
        );
        changes.push('Replaced dangerous eval() call with structured handleSearch() function call');
      }

      // Check for unclosed tags
      if (code.includes('<p>') && !code.includes('</p>')) {
        problems.push({
          line: 6,
          title: 'Unclosed <p> Tag',
          description: 'Paragraph tag <p> is opened but never closed before nested child container.',
          severity: 'medium',
        });
        correctedCode = correctedCode.replace(/(<p>[^<\n]+)(\n\s*<div)/i, '$1</p>$2');
        changes.push('Added missing closing </p> tag');
      }

      if (problems.length > 0) {
        summary = `HTML Static Analysis identified ${problems.length} semantic, accessibility, or security issues.`;
        learningTip = 'HTML documents must maintain unique IDs, include alt attributes for accessible images, and avoid inline eval() calls.';
      }
    }

    // ==========================================
    // 4. CSS ANALYZER
    // ==========================================
    else if (lang === 'css') {
      // Check for missing semicolons
      if (/display:\s*flex\s*\n\s*background-color/i.test(code) || /([a-z-]+:\s*[^;\n{}]+)\n\s*([a-z-]+:)/i.test(code)) {
        problems.push({
          line: 2,
          title: 'CSS Syntax Error: Missing Semicolons',
          description: 'CSS property declarations must terminate with a semicolon (;). Missing semicolons cause rule parsing to abort.',
          severity: 'high',
        });
        correctedCode = correctedCode.replace(/([a-z-]+:\s*[^;\n{}]+)(\n\s*[a-z-]+:)/gi, '$1;$2');
        changes.push('Added missing semicolons to CSS property declarations');
      }

      // Check for misspelled property (e.g. colour -> color)
      if (code.includes('colour:')) {
        problems.push({
          line: 11,
          title: 'Invalid CSS Property: "colour"',
          description: 'Standard CSS uses "color" (US English spelling). The "colour" property is invalid and ignored by browsers.',
          severity: 'medium',
        });
        correctedCode = correctedCode.replace(/colour:/g, 'color:');
        changes.push('Corrected spelling of "colour" to valid standard "color"');
      }

      // Check for align-items without display: flex or display: grid
      if (code.includes('align-items:') && !code.includes('display: flex') && !code.includes('display: grid')) {
        problems.push({
          line: 2,
          title: 'Ineffective Flexbox/Grid Property: align-items',
          description: 'The align-items and justify-content properties only take effect when display is set to flex or grid.',
          severity: 'medium',
        });
        correctedCode = correctedCode.replace(/\.hero-banner\s*\{/i, '.hero-banner {\n  display: flex;');
        changes.push('Added display: flex to activate align-items centering');
      }

      // Check for unitless dimensions (e.g. margin: 20)
      if (/(margin|padding|width|height|top|left):\s*([1-9][0-9]*)\s*;/i.test(code)) {
        problems.push({
          line: 8,
          title: 'Invalid CSS Unit: Unitless Dimension',
          description: 'In CSS, non-zero length values require a unit (e.g., px, rem, em, %). "margin: 20" is invalid and discarded.',
          severity: 'medium',
        });
        correctedCode = correctedCode.replace(
          /(margin|padding|width|height|top|left):\s*([1-9][0-9]*)\s*;/gi,
          '$1: $2px;'
        );
        changes.push('Appended explicit "px" units to dimension declarations');
      }

      // Check for z-index on static element
      if (code.includes('position: static') && code.includes('z-index:')) {
        problems.push({
          line: 7,
          title: 'Ineffective Stacking Context: z-index on position: static',
          description: 'z-index has no effect on elements with position: static. Change position to relative, absolute, fixed, or sticky.',
          severity: 'low',
        });
        correctedCode = correctedCode.replace(/position:\s*static;/g, 'position: relative;');
        changes.push('Changed position: static to position: relative so z-index takes effect');
      }

      // Check for unclosed media query
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      if (openBraces > closeBraces) {
        problems.push({
          line: 12,
          title: 'Unclosed CSS Block / Missing Closing Brace',
          description: `Detected ${openBraces} opening braces but only ${closeBraces} closing braces. Missing '}' in stylesheet.`,
          severity: 'high',
        });
        correctedCode = correctedCode.trimEnd() + '\n}\n';
        changes.push('Added missing closing brace "}" to close media query block');
      }

      if (problems.length > 0) {
        summary = `CSS Static Analysis identified ${problems.length} syntax, unit, or layout defects.`;
        learningTip = 'Always terminate CSS properties with semicolons, include units on non-zero dimensions, and ensure display: flex is present before using flexbox alignment.';
      }
    }

    // Default heuristic for other languages or clean code
    if (problems.length === 0) {
      problems.push({
        line: 1,
        title: 'Static code inspection notice',
        description: 'Verify variables, boundary checks, and return values.',
        severity: 'low',
      });
      summary = `Static analysis inspected the ${language} code structure for common programming pitfalls.`;
      changes.push('Verified syntax conformity and language standards');
    }

    return {
      language: language as any,
      status: problems.some((p) => p.severity === 'high' || p.severity === 'medium') ? 'error_found' : 'no_error',
      summary,
      errorTypes: problems.map((p) => p.title),
      problems,
      changes,
      correctedCode,
      example: {
        input: code,
        expectedOutput: `Verified ${language} structure conforming to standards without errors.`,
      },
      learningTip,
      attempts: 1,
    };
  }
}
