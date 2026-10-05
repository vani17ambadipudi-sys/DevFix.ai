import {
  DocSearchResult,
  MCPToolDefinition,
  SearchDocumentationArgs,
  SearchDocumentationResult,
} from '../types';

export const searchDocumentationDefinition: MCPToolDefinition = {
  name: 'search_documentation',
  description:
    'Search approved programming and debugging documentation for language specifications, standard libraries, runtime exceptions, and best practices.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query or error description (e.g. "Python list indexing", "NullPointerException Java")',
      },
      technology: {
        type: 'string',
        description: 'Optional programming language or technology filter (e.g. "Python", "TypeScript")',
      },
    },
    required: ['query'],
  },
};

interface DocEntry {
  title: string;
  description: string;
  source: string;
  technology: string;
  keywords: string[];
  snippet?: string;
}

const DOCUMENTATION_DATABASE: DocEntry[] = [
  // Python
  {
    title: 'Python Sequence Types — Indexing & Slicing',
    description:
      'In Python, sequences (lists, tuples, strings) are 0-indexed. An IndexError is raised when an item is accessed outside the range [0, len(s) - 1]. Negative indices count from the end starting at -1.',
    source: 'Python 3.12 Official Documentation (docs.python.org/3/library/stdtypes.html)',
    technology: 'Python',
    keywords: ['python', 'index', 'indexerror', 'list', 'slice', 'out of range', 'len'],
    snippet: 'numbers = [10, 20, 30]\n# Valid indices: 0, 1, 2 or -3, -2, -1\nfirst = numbers[0]\nlast = numbers[-1]',
  },
  {
    title: 'Python TypeError — Unsupported Operand Types',
    description:
      'TypeError occurs when an operation or function is applied to an object of inappropriate type. Common with int + str concatenation without explicit str() casting or formatted string literals (f-strings).',
    source: 'Python Built-in Exceptions (docs.python.org/3/library/exceptions.html)',
    technology: 'Python',
    keywords: ['python', 'typeerror', 'concatenate', 'str', 'int', 'operand'],
    snippet: 'age = 25\n# Fix: use f-string or str(age)\nmessage = f"User age: {age}"',
  },
  {
    title: 'Python KeyError — Dictionary Key Access',
    description:
      'KeyError is raised when mapping key is not found in the dictionary. Avoid by using dict.get(key, default) or checking "if key in dict:".',
    source: 'Python Mapping Types — dict (docs.python.org/3/tutorial/datastructures.html)',
    technology: 'Python',
    keywords: ['python', 'keyerror', 'dict', 'dictionary', 'get', 'hashmap'],
    snippet: 'data = {"name": "Alice"}\nvalue = data.get("missing_key", "default_value")',
  },

  // JavaScript & TypeScript
  {
    title: 'JavaScript TypeError — Cannot read properties of undefined/null',
    description:
      'Occurs when attempting to access a property or call a method on null or undefined. Prevent by using optional chaining (?.) and nullish coalescing (??).',
    source: 'MDN Web Docs (developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError)',
    technology: 'JavaScript',
    keywords: ['javascript', 'typescript', 'undefined', 'null', 'optional chaining', 'typeerror'],
    snippet: 'const userName = user?.profile?.name ?? "Guest";',
  },
  {
    title: 'TypeScript Strict Null Checks and Type Guards',
    description:
      'With strictNullChecks enabled, null and undefined have their own distinct types. Use narrowing type guards (typeof, instanceof, in, or custom is predicates) before property access.',
    source: 'TypeScript Handbook (www.typescriptlang.org/docs/handbook/2/narrowing.html)',
    technology: 'TypeScript',
    keywords: ['typescript', 'type guard', 'strictnullchecks', 'narrowing', 'unknown'],
    snippet: 'function process(val: string | null) {\n  if (val !== null) {\n    console.log(val.toUpperCase());\n  }\n}',
  },
  {
    title: 'JavaScript Async/Await and Unhandled Promise Rejections',
    description:
      'Async functions return Promises. When an error is thrown inside an async function without a try/catch block, it triggers an UnhandledPromiseRejection.',
    source: 'MDN Web Docs — async function (developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function)',
    technology: 'JavaScript',
    keywords: ['javascript', 'async', 'await', 'promise', 'try', 'catch', 'rejection'],
    snippet: 'async function fetchData() {\n  try {\n    const res = await fetch(url);\n    return await res.json();\n  } catch (err) {\n    console.error("Fetch failed", err);\n  }\n}',
  },

  // Java
  {
    title: 'Java NullPointerException (NPE) Best Practices',
    description:
      'Thrown when an application attempts to use null in a case where an object is required. Employ java.util.Optional, Objects.requireNonNull(), and null checks prior to method invocation.',
    source: 'Oracle Java Documentation (docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/NullPointerException.html)',
    technology: 'Java',
    keywords: ['java', 'npe', 'nullpointerexception', 'null', 'optional'],
    snippet: 'Optional<String> opt = Optional.ofNullable(input);\nString name = opt.orElse("Default");',
  },
  {
    title: 'Java ArrayIndexOutOfBoundsException',
    description:
      'Thrown to indicate that an array has been accessed with an illegal index (less than zero or greater than or equal to the size of the array).',
    source: 'Oracle Java Standard Edition (docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ArrayIndexOutOfBoundsException.html)',
    technology: 'Java',
    keywords: ['java', 'arrayindexoutofboundsexception', 'array', 'index', 'length'],
    snippet: 'int[] arr = {1, 2, 3};\nif (idx >= 0 && idx < arr.length) {\n    int val = arr[idx];\n}',
  },

  // C and C++
  {
    title: 'C/C++ Segmentation Fault & Buffer Overflow',
    description:
      'Segmentation faults (SIGSEGV) occur when a program accesses memory outside its allotted virtual memory address space. Ensure null-pointer verification, bounds checking with std::vector::at(), and avoid buffer overflows with snprintf.',
    source: 'cppreference.com — std::vector::at & memory management',
    technology: 'C++',
    keywords: ['c', 'c++', 'segfault', 'segmentation fault', 'sigsegv', 'buffer overflow', 'pointer'],
    snippet: 'std::vector<int> vec = {10, 20, 30};\n// vec.at(idx) throws std::out_of_range safely\ntry {\n    int val = vec.at(5);\n} catch (const std::out_of_range& e) {\n    std::cerr << e.what() << std::endl;\n}',
  },

  // SQL
  {
    title: 'SQL Syntax and Literal Quoting Standards',
    description:
      'Standard SQL requires single quotes for string and date literals (e.g. \'admin\', \'2024-01-01\'). Unquoted text strings are parsed as column identifiers, causing syntax or undefined column errors. Always parameterize queries against SQL Injection.',
    source: 'PostgreSQL & ANSI SQL-92 Standard Documentation',
    technology: 'SQL',
    keywords: ['sql', 'quotes', 'string literal', 'syntax error', 'injection', 'parameter'],
    snippet: 'SELECT * FROM users WHERE email = \'alice@example.com\';\n-- Parameterized: SELECT * FROM users WHERE email = $1;',
  },

  // HTML & CSS
  {
    title: 'HTML Semantic Elements & Unclosed Tag Syntax',
    description:
      'Malformed HTML or unclosed tags disrupt document object model parsing and layout hierarchy. Always close non-void elements and validate nesting rules.',
    source: 'W3C HTML5 Specification & MDN Web Docs',
    technology: 'HTML',
    keywords: ['html', 'tags', 'unclosed', 'syntax', 'doctype', 'semantic'],
    snippet: '<div className="container">\n  <p>Properly closed text</p>\n</div>',
  },
];

export async function executeSearchDocumentation(
  args: SearchDocumentationArgs
): Promise<SearchDocumentationResult> {
  const { query, technology } = args;

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Invalid arguments: "query" string is required.');
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const techFilter = technology ? technology.toLowerCase() : null;

  const matches: { entry: DocEntry; score: number }[] = [];

  for (const entry of DOCUMENTATION_DATABASE) {
    if (techFilter && entry.technology.toLowerCase() !== techFilter) {
      continue;
    }

    let score = 0;
    const combined = `${entry.title} ${entry.description} ${entry.technology} ${entry.keywords.join(' ')}`.toLowerCase();

    for (const term of queryTerms) {
      if (combined.includes(term)) {
        score += 2;
      }
      if (entry.title.toLowerCase().includes(term)) {
        score += 3;
      }
      if (entry.keywords.some((k) => k.includes(term))) {
        score += 2;
      }
    }

    if (score > 0) {
      matches.push({ entry, score });
    }
  }

  // Sort descending by relevance score
  matches.sort((a, b) => b.score - a.score);

  const results: DocSearchResult[] = matches.slice(0, 4).map((m) => ({
    title: m.entry.title,
    description: m.entry.description,
    source: m.entry.source,
    snippet: m.entry.snippet,
  }));

  // If no exact match found, provide helpful general fallback
  if (results.length === 0) {
    results.push({
      title: `${technology || 'Language'} Reference Guidance`,
      description: `No specific indexed entry for query "${query}". Consult official language specifications, ensure bounds checks, type safety, and error handling.`,
      source: 'Approved Official Documentation Registry',
    });
  }

  return {
    query,
    technology,
    results,
  };
}
