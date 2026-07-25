import path from "path";
import os from "os";
import fs from "fs";
import { URL, fileURLToPath } from "node:url";
import is_ip_private from "private-ip";
import { isValidRemoteValue } from "repomix";

export function expandHome(filepath: string): string {
  if (!filepath) return "";
  let cleaned = filepath.trim().replace(/^["']|["']$/g, "");

  // Convert file:// URIs to local OS file paths (crucial for Windows file:///C:/... URIs)
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

  // If path exists as-is, return normalized path
  if (fs.existsSync(normalized)) {
    return normalized;
  }

  // If input is a relative path or bare filename (e.g. "gg.pdf" or "Downloads/gg.pdf"),
  // search in common user directories (Downloads, Desktop, Documents, Home)
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

export function resolveMarkitdownPath(projectRoot: string): string {
  if (process.env.MARKITDOWN_PATH) return process.env.MARKITDOWN_PATH;
  const isWin = process.platform === "win32";
  const venvBin = path.join(
    projectRoot,
    ".venv",
    isWin ? "Scripts" : "bin",
    `markitdown${isWin ? ".exe" : ""}`,
  );
  if (fs.existsSync(venvBin)) return venvBin;
  return "markitdown";
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

export function validateUrl(url: string): void {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http: and https: schemes are allowed.");
  }
  if (is_ip_private(parsed.hostname)) {
    throw new Error(
      `Fetching ${url} is potentially dangerous, aborting.`,
    );
  }
}

export function validateRepoUrl(repoUrl: string): void {
  if (!repoUrl || !repoUrl.trim()) {
    throw new Error("Repository URL is required");
  }
  if (!isValidRemoteValue(repoUrl)) {
    throw new Error(
      `Invalid repository URL or shorthand: ${repoUrl}. Use a GitHub URL (https://github.com/owner/repo) or shorthand (owner/repo).`,
    );
  }
  if (repoUrl.includes("://")) {
    const parsed = new URL(repoUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only http: and https: repository URLs are allowed.");
    }
  }
}

export function isUnconvertedHtml(output: string): boolean {
  const trimmed = output.trimStart();
  return trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html");
}

export function inferExtensionFromUrl(url: string): string {
  if (url.endsWith(".pdf")) {
    return "pdf";
  }
  return "html";
}

export function isMarkdownFile(filePath: string): boolean {
  const markdownExt = [".md", ".markdown"];
  return markdownExt.includes(path.extname(filePath));
}

export function isWithinDirectory(filePath: string, directory: string): boolean {
  const normPath = path.normalize(path.resolve(expandHome(filePath)));
  const normDir = path.normalize(path.resolve(expandHome(directory)));
  
  if (process.platform === "win32") {
    return normPath.toLowerCase().startsWith(normDir.toLowerCase());
  }
  return normPath.startsWith(normDir);
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
    // If URL parsing fails, return original
  }
  return url;
}
