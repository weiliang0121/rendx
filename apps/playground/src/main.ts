import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import {demos} from './demos';

// ── Monaco worker setup ──
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  allowNonTsExtensions: true,
  checkJs: false,
  target: monaco.languages.typescript.ScriptTarget.ESNext,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
});

// ── DOM refs ──
const demoListEl = document.getElementById('demo-list')!;
const editorPaneEl = document.getElementById('editor-pane')!;
const canvasContainer = document.getElementById('canvas-container')!;
const consoleOutput = document.getElementById('console-output')!;
const btnRun = document.getElementById('btn-run')!;
const btnReset = document.getElementById('btn-reset')!;
const divider = document.getElementById('divider')!;

// ── State ──
let currentIndex = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentApp: any = null;

// ── Editor ──
const editor = monaco.editor.create(editorPaneEl, {
  value: demos[0].code,
  language: 'javascript',
  theme: 'vs-dark',
  minimap: {enabled: false},
  automaticLayout: true,
  fontSize: 13,
  lineNumbers: 'on',
  scrollBeyondLastLine: false,
  padding: {top: 12},
  tabSize: 2,
});

// Ctrl/Cmd+Enter to run
editor.addAction({
  id: 'run-code',
  label: 'Run Code',
  keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],
  run: () => runCode(),
});

// ── Demo list ──
function renderDemoList() {
  demoListEl.innerHTML = demos.map((d, i) => `<li data-index="${i}" class="${i === currentIndex ? 'active' : ''}">${d.name}</li>`).join('');
}

demoListEl.addEventListener('click', e => {
  const target = e.target as HTMLElement;
  if (target.tagName !== 'LI') return;
  const idx = Number(target.dataset.index);
  if (isNaN(idx)) return;
  selectDemo(idx);
});

function selectDemo(index: number) {
  currentIndex = index;
  editor.setValue(demos[index].code);
  renderDemoList();
  runCode();

  // Update URL
  const url = new URL(window.location.href);
  url.searchParams.set('demo', demos[index].name);
  history.pushState({}, '', url);
}

// ── Run engine ──
async function runCode() {
  // Cleanup previous
  if (currentApp) {
    try {
      currentApp.dispose();
    } catch {
      // ignore
    }
    currentApp = null;
  }
  canvasContainer.innerHTML = '';
  consoleOutput.textContent = '';

  const code = editor.getValue();

  // Intercept console
  const origLog = console.log;
  const origWarn = console.warn;
  const origError = console.error;

  const appendConsole = (msg: string, cls = '') => {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = msg;
    consoleOutput.appendChild(line);
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
  };

  console.log = (...args: unknown[]) => {
    origLog(...args);
    appendConsole(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
  };
  console.warn = (...args: unknown[]) => {
    origWarn(...args);
    appendConsole(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '), 'console-warn');
  };
  console.error = (...args: unknown[]) => {
    origError(...args);
    appendConsole(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '), 'console-error');
  };

  try {
    // Dynamic import the engine so user code can reference it
    const engine = await import('rendx-engine');
    const elementPlugin = await import('rendx-element-plugin');

    // Create a module blob with the user's code
    // Replace import statements to inject the engine module
    const wrappedCode = code
      .replace(/import\s*\{([^}]+)\}\s*from\s*['"]rendx-engine['"]\s*;?/g, 'const {$1} = __rendx_engine__;')
      .replace(/import\s+\*\s+as\s+(\w+)\s+from\s*['"]rendx-engine['"]\s*;?/g, 'const $1 = __rendx_engine__;')
      .replace(/import\s*\{([^}]+)\}\s*from\s*['"]rendx-element-plugin['"]\s*;?/g, 'const {$1} = __rendx_element_plugin__;')
      .replace(/import\s+\*\s+as\s+(\w+)\s+from\s*['"]rendx-element-plugin['"]\s*;?/g, 'const $1 = __rendx_element_plugin__;');

    // Provide container element
    const containerEl = document.createElement('div');
    containerEl.id = 'container';
    canvasContainer.appendChild(containerEl);

    // Execute using Function constructor (safer than eval, same origin)
    const fn = new Function(
      '__rendx_engine__',
      '__rendx_element_plugin__',
      'container',
      `"use strict";
      ${wrappedCode}
      `,
    );

    const result = fn(engine, elementPlugin, containerEl);

    // Try to capture the app instance for cleanup
    if (result && typeof result.dispose === 'function') {
      currentApp = result;
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      appendConsole(`Error: ${err.message}`, 'console-error');
      if (err.stack) {
        appendConsole(err.stack, 'console-error');
      }
    } else {
      appendConsole(`Error: ${String(err)}`, 'console-error');
    }
  } finally {
    console.log = origLog;
    console.warn = origWarn;
    console.error = origError;
  }
}

// ── Buttons ──
btnRun.addEventListener('click', () => runCode());
btnReset.addEventListener('click', () => {
  editor.setValue(demos[currentIndex].code);
  runCode();
});

// ── Resizable divider ──
let isDragging = false;

divider.addEventListener('mousedown', e => {
  isDragging = true;
  divider.classList.add('dragging');
  e.preventDefault();
});

document.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const workspace = document.getElementById('workspace')!;
  const rect = workspace.getBoundingClientRect();
  const offset = e.clientX - rect.left;
  const total = rect.width;
  const percent = Math.min(Math.max(offset / total, 0.2), 0.8);

  const editorPane = document.getElementById('editor-pane')!;
  const previewPane = document.getElementById('preview-pane')!;
  editorPane.style.flex = `0 0 ${percent * 100}%`;
  previewPane.style.flex = `0 0 ${(1 - percent) * 100 - 0.5}%`;
});

document.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    divider.classList.remove('dragging');
  }
});

// ── Init ──
function init() {
  renderDemoList();

  // Restore from URL
  const params = new URLSearchParams(window.location.search);
  const demoName = params.get('demo');
  if (demoName) {
    const idx = demos.findIndex(d => d.name === demoName);
    if (idx >= 0) {
      selectDemo(idx);
      return;
    }
  }

  runCode();
}

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const demoName = params.get('demo');
  if (demoName) {
    const idx = demos.findIndex(d => d.name === demoName);
    if (idx >= 0) selectDemo(idx);
  }
});

init();
