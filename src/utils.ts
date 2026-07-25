import path from "path";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";
import { URL, fileURLToPath } from "node:url";
import is_ip_private from "private-ip";
import { isValidRemoteValue } from "repomix";

export function expandHome(filepath: string): string {
  if (!filepath) return "";
  let cleaned = filepath.trim().replace(/^["']|["']$/g, "");

  if (cleaned.startsWith("file://")) {
    try {
      cleaned = fileURLToPath(cleaned);
    } catch {
      cleaned = cleaned.replace(/^file:\/\/\/?/, "");
      if (process.platform === "win32" && /^\/[a-zA-Z]:/.test(cleaned)) {
        cleaned = cleaned.slice(1);
      }
    }
  }

  if (cleaned.startsWith("~/") || cleaned === "~") {
    cleaned = path.join(os.homedir(), cleaned.slice(1));
  }

  const normalized = path.normalize(cleaned);

  if (fs.existsSync(normalized)) {
    return normalized;
  }

  if (!path.isAbsolute(normalized)) {
    const searchDirs = [
      process.cwd(),
      path.join(os.homedir(), "Downloads"),
      path.join(os.homedir(), "Desktop"),
      path.join(os.homedir(), "Documents"),
      os.homedir(),
    ];

    for (const dir of searchDirs) {
      const candidate = path.join(dir, normalized);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return normalized;
}

export function ensureVenvExists(projectRoot: string): string {
  if (process.env.MARKITDOWN_PATH) return process.env.MARKITDOWN_PATH;
  const isWin = process.platform === "win32";
  const venvBin = path.join(
    projectRoot,
    ".venv",
    isWin ? "Scripts" : "bin",
    `markitdown${isWin ? ".exe" : ""}`,
  );

  if (fs.existsSync(venvBin)) {
    return venvBin;
  }

  const hasSetupScript =
    fs.existsSync(path.join(projectRoot, "setup.bat")) ||
    fs.existsSync(path.join(projectRoot, "setup.sh")) ||
    fs.existsSync(path.join(projectRoot, "package.json"));

  if (hasSetupScript) {
    try {
      const patchScript = path.join(projectRoot, "scripts", "patch-markitdown.js");
      if (isWin) {
        const batScript = path.join(projectRoot, "setup.bat");
        if (fs.existsSync(batScript)) {
          execSync(`cmd.exe /c "${batScript}"`, { cwd: projectRoot, stdio: "pipe", timeout: 60000 });
        }
      } else {
        const shScript = path.join(projectRoot, "setup.sh");
        if (fs.existsSync(shScript)) {
          execSync(`bash "${shScript}"`, { cwd: projectRoot, stdio: "pipe", timeout: 60000 });
        }
      }

      if (fs.existsSync(patchScript)) {
        execSync(`node "${patchScript}"`, { cwd: projectRoot, stdio: "pipe", timeout: 15000 });
      }
    } catch {
      // Fallback
    }

    if (fs.existsSync(venvBin)) {
      return venvBin;
    }
  }

  return "markitdown";
}

export function resolveMarkitdownPath(projectRoot: string): string {
  return ensureVenvExists(projectRoot);
}

export function resolveRepomixPath(projectRoot: string): string {
  if (process.env.REPOMIX_PATH) return process.env.REPOMIX_PATH;
  const local = path.join(projectRoot, "node_modules", ".bin", "repomix");
  if (fs.existsSync(local)) return local;
  return "repomix";
}

export function getAllowedPaths(): string[] | null {
  const raw = process.env.MD_ALLOWED_PATHS ?? process.env.MD_SHARE_DIR;
  if (!raw) return null;
  const dirs = raw
    .split(path.delimiter)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => path.normalize(path.resolve(expandHome(p))));
  return dirs.length > 0 ? dirs : null;
}

export function isWithinDirectory(childPath: string, parentDir: string): boolean {
  const normPath = path.normalize(childPath);
  const normDir = path.normalize(parentDir);
  
  if (process.platform === "win32") {
    return normPath.toLowerCase().startsWith(normDir.toLowerCase());
  }
  return normPath.startsWith(normDir);
}

export function assertPathAllowed(filePath: string): void {
  const allowed = getAllowedPaths();
  if (!allowed) return;
  const resolved = path.normalize(path.resolve(expandHome(filePath)));
  if (!allowed.some((dir) => isWithinDirectory(resolved, dir))) {
    throw new Error(
      `Path "${filePath}" is outside the allowed directories. ` +
        `Set MD_ALLOWED_PATHS to a ${path.delimiter}-separated list that includes a parent directory ` +
        `(currently allowed: ${allowed.join(path.delimiter)}).`,
    );
  }
}

export function validateUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Only http: and https: schemes are allowed. Received: ${parsed.protocol}`,
    );
  }

  const hostname = parsed.hostname;
  if (is_ip_private(hostname) || hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    throw new Error(`Access to potentially dangerous IP address or localhost is forbidden: ${hostname}`);
  }
}

export function validateRepoUrl(repoUrl: string): void {
  if (!repoUrl || repoUrl.trim().length === 0) {
    throw new Error("Repository URL is required.");
  }
  if (repoUrl.startsWith("file://") || repoUrl.startsWith("ssh://")) {
    throw new Error("Only http: and https: repository URLs are allowed");
  }
  if (!isValidRemoteValue(repoUrl)) {
    throw new Error(
      `Invalid repository URL or shorthand: "${repoUrl}". Expected format like "owner/repo" or "https://github.com/owner/repo".`,
    );
  }
}

export function isUnconvertedHtml(content: string): boolean {
  const head = content.slice(0, 2000).toLowerCase();
  return (
    head.includes("<!doctype html>") ||
    head.includes("<html") ||
    head.includes("<head") ||
    head.includes("<body")
  );
}

export function inferExtensionFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).slice(1).toLowerCase();
    return ext || "html";
  } catch {
    return "html";
  }
}

export function isMarkdownFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".md" || ext === ".markdown";
}

export function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === "youtu.be" || host.endsWith(".youtu.be") || host.includes("youtube.com");
  } catch {
    return false;
  }
}

export function normalizeYouTubeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    let videoId: string | null = null;

    if (host === "youtu.be" || host.endsWith(".youtu.be")) {
      videoId = parsed.pathname.slice(1);
    } else if (host.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2];
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/")[2];
      } else if (parsed.pathname.startsWith("/v/")) {
        videoId = parsed.pathname.split("/")[2];
      } else {
        videoId = parsed.searchParams.get("v");
      }
    }

    if (videoId) {
      const cleanId = videoId.split("&")[0].split("?")[0];
      return `https://www.youtube.com/watch?v=${cleanId}`;
    }
  } catch {
    // Return original
  }
  return url;
}

export function summarizeMarkdownContent(content: string): string {
  if (!content || content.trim().length === 0) {
    return content;
  }

  const summary = summarizeToMarkdownFormat(content);
  return `${summary}\n\n---\n\n# 📜 Full Transcript & Details\n\n${content}`;
}

export function summarizeShortly(content: string, title?: string): string {
  return summarizeToMarkdownFormat(content, title);
}

export function injectObsidianWikilinks(text: string): string {
  if (!text) return text;

  const universalConcepts = [
    // Programming & Software Engineering
    'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'SQL', 'HTML', 'CSS', 'Bash',
    'Variables', 'Data Types', 'Strings', 'Integers', 'Booleans', 'Floats', 'Arrays', 'Lists', 'Dictionaries', 'Tuples', 'Sets',
    'Functions', 'Methods', 'Loops', 'For Loops', 'While Loops', 'Conditional Logic', 'Recursion', 'Pointers', 'Memory Management',
    'OOPS', 'Object-Oriented Programming', 'Encapsulation', 'Abstraction', 'Inheritance', 'Polymorphism', 'Classes', 'Objects', 'Interfaces',
    'Data Structures', 'Algorithms', 'Binary Trees', 'Linked Lists', 'Stacks', 'Queues', 'Hash Tables', 'Graphs', 'Sorting', 'Searching',
    'Error Handling', 'Exceptions', 'Try Catch', 'Try Except', 'Debugging', 'Testing', 'Unit Tests',
    'PyCharm', 'VS Code', 'Git', 'GitHub', 'Repository', 'Terminal', 'CLI', 'Obsidian', 'Markdown', 'API', 'REST API', 'JSON', 'HTTP', 'YouTube', 'PDF',
    // Science, Technology & AI
    'Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'Neural Networks', 'Large Language Models', 'Data Science', 'Physics', 'Mathematics', 'Chemistry', 'Biology',
    // Business, Design & Architecture
    'Architecture', 'System Design', 'Project Management', 'Agile', 'Scrum', 'Database', 'Cloud Computing', 'Security', 'Authentication', 'DevOps', 'CI/CD',
    // General Topics & Research
    'Research', 'Lecture', 'Tutorial', 'Documentation', 'Study Guide', 'Executive Summary', 'Key Points', 'Notes', 'Overview'
  ];

  let result = text;
  const presentConcepts = new Set<string>();

  for (const concept of universalConcepts) {
    const escaped = concept.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`(?<!\\[\\[|\\w)${escaped}(?!\\]\\]|\\w)`, 'i');
    if (regex.test(result)) {
      result = result.replace(regex, `[[${concept}]]`);
      presentConcepts.add(concept);
    }
  }

  // Dynamic Capitalized Term Auto-Wikilinker for any domain (Science, History, Tech, Business, Personal)
  const capitalizedTermRegex = /(?<!\\[\\[|\\w|#|#\s)(?:\b[A-Z][a-z0-9]+(?:\s+[A-Z][a-z0-9]+)*\b)(?!\\]\\]|\\w)/g;
  const matches = Array.from(result.matchAll(capitalizedTermRegex));

  const excluded = new Set(['The', 'This', 'That', 'With', 'From', 'Have', 'Which', 'Your', 'About', 'There', 'Their', 'Would', 'Could', 'Should', 'Other', 'First', 'These', 'Where', 'After', 'Being', 'Under', 'Note', 'URL', 'Channel', 'Title', 'Keywords', 'Executive', 'Summary', 'Full', 'Transcript', 'Click', 'Answer', 'Explanation', 'Correct']);

  for (const match of matches) {
    const term = match[0].trim();
    if (term.length >= 4 && !excluded.has(term) && !presentConcepts.has(term)) {
      const escapedTerm = term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const termRegex = new RegExp(`(?<!\\[\\[|\\w)${escapedTerm}(?!\\]\\]|\\w)`, 'g');
      result = result.replace(termRegex, `[[${term}]]`);
      presentConcepts.add(term);
    }
  }

  if (!result.includes('Knowledge Graph Links') && presentConcepts.size > 0) {
    const topLinks = Array.from(presentConcepts).slice(0, 15).map((c) => `[[${c}]]`).join(' • ');
    const linksHeader = `\n\n## 🕸️ Knowledge Graph Links\n${topLinks}\n`;
    result += linksHeader;
  }

  return result;
}

export function generateTopicNoteMarkdown(topic: string, title?: string): string {
  const cleanTitle = title || `${topic} Study Notes`;
  const lowerTopic = topic.toLowerCase();

  if (lowerTopic.includes('oops') || lowerTopic.includes('object oriented')) {
    const oopsNote = [
      `# 📌 ${cleanTitle}`,
      ``,
      `> **Executive Summary**: Comprehensive study guide on Object-Oriented Programming (OOPS) concepts, fundamental pillars, design patterns, and code implementations across languages like Python and Java.`,
      ``,
      `### 🏛️ Core Pillars of OOPS`,
      `- **[[Encapsulation]]**: Bundling data (attributes) and methods that operate on the data into a single unit (class), hiding internal object state.`,
      `- **[[Abstraction]]**: Hiding complex implementation details and exposing only essential interface features to the user.`,
      `- **[[Inheritance]]**: Mechanism where a child class inherits properties and behaviors from a parent class for code reusability.`,
      `- **[[Polymorphism]]**: Ability of an object or method to take on multiple forms (Method Overriding & Method Overloading).`,
      ``,
      `### 📦 Key Concepts: Classes & Objects`,
      `- **[[Classes]]**: Blueprints or user-defined data types containing attribute fields and functions.`,
      `- **[[Objects]]**: Instantiated instances of a class with real values assigned to fields.`,
      ``,
      `### 💻 Code Implementation (Python & Java)`,
      `\`\`\`python`,
      `class Animal:`,
      `    def __init__(self, name):`,
      `        self.name = name`,
      `    def speak(self):`,
      `        pass`,
      ``,
      `class Dog(Animal): # Inheritance`,
      `    def speak(self): # Polymorphism`,
      `        return f"{self.name} says Woof!"`,
      `\`\`\``,
      ``,
      `### 🔑 Best Practices & Design Principles`,
      `- **SOLID Principles**: Maintain Single Responsibility (SRP) and Open-Closed Principle (OCP).`,
      `- **Composition Over Inheritance**: Prefer combining decoupled objects over deep class inheritance hierarchies.`,
      ``,
      `---`,
      `*Generated by OmniContext MCP Knowledge Engine*`,
    ].join('\n');

    return injectObsidianWikilinks(oopsNote);
  }

  const genericNote = [
    `# 📌 ${cleanTitle}`,
    ``,
    `> **Executive Summary**: Structured study guide and reference notes on ${topic}, key principles, and practical application.`,
    ``,
    `### 💡 Fundamentals of ${topic}`,
    `- Core concepts and foundational pillars defining ${topic}.`,
    `- Primary terminology, structures, and execution workflows.`,
    `- Practical use cases and real-world software architecture applications.`,
    ``,
    `### 🛠️ Key Takeaways & Best Practices`,
    `- Keep implementation modular, clean, and well-documented.`,
    `- Combine with related concepts like [[Variables]], [[Functions]], and [[Error Handling]].`,
    ``,
    `---`,
    `*Generated by OmniContext MCP Knowledge Engine*`,
  ].join('\n');

  return injectObsidianWikilinks(genericNote);
}

export function summarizeToMarkdownFormat(content: string, title?: string): string {
  if (!content || content.trim().length === 0) {
    return content;
  }

  const textWithoutHeaders = content
    .split('\n')
    .filter(
      (line) =>
        !line.trim().startsWith('#') &&
        !line.trim().startsWith('---') &&
        !line.trim().startsWith('Title:') &&
        !line.trim().startsWith('URL:') &&
        !line.trim().startsWith('Thumbnail:') &&
        !line.trim().startsWith('Keywords:') &&
        !line.trim().startsWith('- **Keywords:'),
    )
    .join(' ');

  const rawSentences = textWithoutHeaders
    .split(/(?<=[.?!])\s+|(?<=\b(?:so|next|then|finally|moving on|now|also)\b)\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const fillerRegex = /^(what is up guys|in this video|i'm going to be|let's get started|with that being said|have a wonderful day|i'll see you|check those out|so to create|and also a|let's go ahead|and you'll notice|next we have|okay next|moving on to|pretend we want|you're going to notice)/i;

  const cleanSentences: string[] = [];
  const seen = new Set<string>();

  for (const s of rawSentences) {
    let clean = s.replace(fillerRegex, '').trim();
    clean = clean.replace(/^(and|so|also|then|now|well)\s+/i, '');
    clean = clean.replace(/\s+(so|and|then|or|but|because)$/i, '').trim();
    if (clean.length > 0) {
      clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    if (clean.length > 18 && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      cleanSentences.push(clean);
    }
  }

  const topics: { [key: string]: string[] } = {
    '🛠️ Environment & Setup': [],
    '📦 Variables & Data Types': [],
    '🔢 Math & Operations': [],
    '🔀 Conditional Logic': [],
    '🔁 Loops & Control Flow': [],
    '⚡ Functions & Reusability': [],
    '🛡️ Exception & Error Handling': [],
    '📌 Key Highlights': [],
  };

  for (const sentence of cleanSentences) {
    const lower = sentence.toLowerCase();
    if (lower.includes('download') || lower.includes('pycharm') || lower.includes('python 3') || lower.includes('editor')) {
      topics['🛠️ Environment & Setup'].push(sentence);
    } else if (lower.includes('variable') || lower.includes('string') || lower.includes('integer') || lower.includes('boolean') || lower.includes('list') || lower.includes('convert') || lower.includes('type')) {
      topics['📦 Variables & Data Types'].push(sentence);
    } else if (lower.includes('math') || lower.includes('add') || lower.includes('multiply') || lower.includes('power') || lower.includes('calculate')) {
      topics['🔢 Math & Operations'].push(sentence);
    } else if (lower.includes('if') || lower.includes('else') || lower.includes('elif') || lower.includes('statement')) {
      topics['🔀 Conditional Logic'].push(sentence);
    } else if (lower.includes('loop') || lower.includes('range') || lower.includes('while') || lower.includes('for') || lower.includes('break')) {
      topics['🔁 Loops & Control Flow'].push(sentence);
    } else if (lower.includes('function') || lower.includes('def') || lower.includes('pass') || lower.includes('reuse')) {
      topics['⚡ Functions & Reusability'].push(sentence);
    } else if (lower.includes('try') || lower.includes('except') || lower.includes('error') || lower.includes('exception')) {
      topics['🛡️ Exception & Error Handling'].push(sentence);
    } else {
      if (topics['📌 Key Highlights'].length < 5) {
        topics['📌 Key Highlights'].push(sentence);
      }
    }
  }

  const cleanTitle = title || 'Structured Executive Summary';
  const markdownBlocks: string[] = [
    `# 📌 ${cleanTitle}`,
    ``,
    `> **Executive Summary**: A neat, structured breakdown of key takeaways and essential points extracted from the content.`,
    ``,
  ];

  let totalPoints = 0;
  for (const [category, points] of Object.entries(topics)) {
    if (points.length > 0) {
      const topPoints = points.slice(0, 4);
      markdownBlocks.push(`### ${category}`);
      for (const p of topPoints) {
        const shortPoint = p.length > 140 ? p.slice(0, 137) + '...' : p;
        markdownBlocks.push(`- ${shortPoint}`);
        totalPoints++;
      }
      markdownBlocks.push(``);
    }
  }

  if (totalPoints < 3) {
    markdownBlocks.push(`### 💡 Key Takeaways`);
    for (const s of cleanSentences.slice(0, 8)) {
      const shortPoint = s.length > 140 ? s.slice(0, 137) + '...' : s;
      markdownBlocks.push(`- ${shortPoint}`);
    }
    markdownBlocks.push(``);
  }

  markdownBlocks.push(`---`);
  markdownBlocks.push(`*Neat summary generated by OmniContext MCP*`);

  const rawMarkdown = markdownBlocks.join('\n');
  return injectObsidianWikilinks(rawMarkdown);
}
