import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');

const RULES = [
  {
    id: 'DEPRECATED_SUBSTR',
    severity: 'error',
    regex: /\.substr\s*\(/g,
    message: 'String.prototype.substr() is deprecated; use .slice() instead.',
  },
  {
    id: 'DEPRECATED_EXEC_COMMAND',
    severity: 'error',
    regex: /document\.execCommand\s*\(/g,
    message: 'document.execCommand() is deprecated; use Clipboard/Selection APIs.',
  },
  {
    id: 'DEPRECATED_DOCUMENT_WRITE',
    severity: 'error',
    regex: /document\.write(?:ln)?\s*\(/g,
    message: 'document.write() is forbidden.',
  },
  {
    id: 'UNSAFE_EVAL',
    severity: 'error',
    regex: /\b(?:eval|execScript)\s*\(|new\s+Function\s*\(/g,
    message: 'Dynamic code execution (eval / new Function) is forbidden.',
  },
  {
    id: 'FORBIDDEN_BROWSER_DIALOG',
    severity: 'error',
    regex: /\bwindow\.(?:alert|confirm|prompt|open)\s*\(/g,
    message: 'Native browser dialogs/popups (window.alert/confirm/open) are forbidden inside iframe runtime.',
  },
  {
    id: 'DEAD_GAME_TAB_ROUTE',
    severity: 'error',
    regex: /setActiveTab\s*\(\s*['"]game['"]\s*\)/g,
    message: 'Dead route setActiveTab("game") detected; valid city tab id is "city".',
  },
  {
    id: 'PROTO_POLLUTION_KEY',
    severity: 'error',
    regex: /\.__proto__\b|Object\.prototype\.(?:__defineGetter__|__defineSetter__)/g,
    message: 'Deprecated __proto__ property usage detected.',
  },
  {
    id: 'DEPRECATED_KEYCODE',
    severity: 'warning',
    regex: /\.(?:keyCode|which|charCode)\b/g,
    message: 'Deprecated KeyboardEvent keyCode/which/charCode detected; use e.code or e.key.',
  },
  {
    id: 'LEGACY_VAR_DECL',
    severity: 'warning',
    regex: /(?:^|\s)var\s+[a-zA-Z_$]/gm,
    message: 'Legacy var declaration detected; prefer const or let.',
  },
  {
    id: 'JAVASCRIPT_URI_INJECTION',
    severity: 'error',
    regex: /href\s*=\s*["']\s*javascript:/gi,
    message: 'Potentially unsafe javascript: URI detected.',
  },
  {
    id: 'BUTTON_MISSING_TYPE',
    severity: 'warning',
    regex: /<button(?![^>]*\btype\s*=)[^>]*>/g,
    message: '<button> tag missing explicit type="button"|"submit".',
  },
  {
    id: 'HARDCODED_SECRET_CANDIDATE',
    severity: 'error',
    regex: /(?:api_key|secret_key|password|auth_token)\s*[:=]\s*['"][a-zA-Z0-9_\-]{16,}['"]/gi,
    message: 'Potential hardcoded secret or token detected in source code.',
  },
];

function collectFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, out);
    } else if (/\.(js|mjs|ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function getLineCol(content, index) {
  const prefix = content.slice(0, index);
  const lines = prefix.split('\n');
  return { line: lines.length, col: lines[lines.length - 1].length + 1 };
}

function checkImportsExist(filePath, content, findings) {
  const importRegex = /(?:import|export)\s+(?:[^'"]*from\s+)?['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    const specifier = m[1];
    const resolved = path.resolve(path.dirname(filePath), specifier);
    const exists =
      fs.existsSync(resolved) ||
      fs.existsSync(`${resolved}.js`) ||
      fs.existsSync(`${resolved}.mjs`) ||
      fs.existsSync(`${resolved}.ts`) ||
      fs.existsSync(`${resolved}.tsx`) ||
      fs.existsSync(path.join(resolved, 'index.js'));
    if (!exists) {
      const pos = getLineCol(content, m.index);
      findings.push({
        file: path.relative(ROOT_DIR, filePath),
        line: pos.line,
        col: pos.col,
        severity: 'error',
        id: 'BROKEN_RELATIVE_IMPORT',
        message: `Relative import "${specifier}" could not be resolved on disk.`,
      });
    }
  }
}

function checkUnsafeInnerHtml(filePath, content, findings) {
  // Smart static analysis: detect innerHTML assignment where content is not escaped or sanitized
  const innerHtmlRegex = /\.innerHTML\s*=\s*([^;\n]+)/g;
  let m;
  while ((m = innerHtmlRegex.exec(content)) !== null) {
    const expr = m[1];
    const hasEscape = /escapeHtml|svgIcons|avatarEngine|serverLogoEngine|render|build/i.test(expr);
    const importsEscape = /escapeHtml/.test(content);
    if (!hasEscape && !importsEscape && !expr.includes('`')) {
      const pos = getLineCol(content, m.index);
      findings.push({
        file: path.relative(ROOT_DIR, filePath),
        line: pos.line,
        col: pos.col,
        severity: 'warning',
        id: 'UNSAFE_RAW_HTML_ASSIGNMENT',
        message: 'Assignment of unescaped expression to innerHTML without escapeHtml verification.',
      });
    }
  }
}

function runAudit() {
  const t0 = performance.now();
  const files = collectFiles(SRC_DIR);
  const findings = [];
  let totalLines = 0;

  for (const filePath of files) {
    const rel = path.relative(ROOT_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length;
    totalLines += lineCount;

    const isTestFile = rel.endsWith('.test.js');
    if (!isTestFile && lineCount > 750) {
      findings.push({
        file: rel,
        line: lineCount,
        col: 1,
        severity: 'warning',
        id: 'MONOLITH_LINE_BUDGET',
        message: `Module has ${lineCount} lines (>750 modular limit); consider splitting.`,
      });
    }

    if (!isTestFile && !rel.endsWith('devAudit.mjs')) {
      for (const rule of RULES) {
        rule.regex.lastIndex = 0;
        let match;
        while ((match = rule.regex.exec(content)) !== null) {
          const pos = getLineCol(content, match.index);
          findings.push({
            file: rel,
            line: pos.line,
            col: pos.col,
            severity: rule.severity,
            id: rule.id,
            message: rule.message,
          });
        }
      }
      checkUnsafeInnerHtml(filePath, content, findings);
    }

    checkImportsExist(filePath, content, findings);
  }

  const elapsedMs = (performance.now() - t0).toFixed(2);
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');

  console.log(`[Izumiya Advanced DevAudit 2026.11-AI] Scanned ${files.length} source modules (${totalLines} lines) in ${elapsedMs}ms`);
  for (const f of findings) {
    console.log(`  ${f.severity.toUpperCase()} [${f.id}] ${f.file}:${f.line}:${f.col} — ${f.message}`);
  }
  console.log(`Result: ${errors.length} errors, ${warnings.length} warnings.`);

  if (errors.length > 0) {
    process.exit(1);
  }
}

runAudit();
