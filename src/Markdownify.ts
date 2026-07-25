import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";
import {
  expandHome,
  validateUrl,
  validateRepoUrl,
  isUnconvertedHtml,
  inferExtensionFromUrl,
  isMarkdownFile,
  resolveMarkitdownPath,
  resolveRepomixPath,
  assertPathAllowed,
  isYouTubeUrl,
  normalizeYouTubeUrl,
} from "./utils.js";
const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type MarkdownResult = {
  path?: string;
  text: string;
};

export class Markdownify {
  private static async _markitdown(
    filePathOrUrl: string,
    projectRoot: string,
  ): Promise<string> {
    const markitdownPath = resolveMarkitdownPath(projectRoot);

    let stdout: string;
    try {
      ({ stdout } = await execFileAsync(markitdownPath, [filePathOrUrl], {
        maxBuffer: 50 * 1024 * 1024, // 50 MB
      }));
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException;
      if (err?.code === "ENOENT") {
        throw new Error(
          `markitdown executable not found (looked up "${markitdownPath}"). ` +
            `Set MARKITDOWN_PATH to its absolute location, install it on PATH (e.g. \`pipx install "markitdown[pdf]"\`), ` +
            `or run setup in the project root (${projectRoot}): ` +
            `python3 -m venv .venv && .venv/bin/pip install "markitdown[pdf]>=0.1.5".`,
        );
      }
      throw e;
    }

    if (isUnconvertedHtml(stdout)) {
      throw new Error(
        "Conversion failed: the page returned raw HTML that could not be converted to Markdown. " +
          "This typically happens with JavaScript-rendered pages (SPAs) that require a browser to load content.",
      );
    }

    return stdout;
  }

  private static async saveToTempFile(
    content: string | Buffer,
    suggestedExtension?: string | null,
  ): Promise<string> {
    let outputExtension = "md";
    if (suggestedExtension != null) {
      outputExtension = suggestedExtension;
    }

    const tempOutputPath = path.join(
      os.tmpdir(),
      `markdown_output_${Date.now()}.${outputExtension}`,
    );
    fs.writeFileSync(tempOutputPath, content);
    return tempOutputPath;
  }

  private static async safeFetch(
    url: string,
    maxRedirects = 10,
  ): Promise<Response> {
    let currentUrl = url;
    for (let i = 0; i < maxRedirects; i++) {
      validateUrl(currentUrl);
      const response = await fetch(currentUrl, {
        redirect: "manual",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Upgrade-Insecure-Requests": "1",
        },
      });
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get("location")
      ) {
        currentUrl = new URL(
          response.headers.get("location")!,
          currentUrl,
        ).toString();
        continue;
      }
      return response;
    }
    throw new Error("Too many redirects");
  }

  static async toMarkdown({
    filePath,
    url,
    projectRoot = path.resolve(__dirname, ".."),
  }: {
    filePath?: string;
    url?: string;
    projectRoot?: string;
  }): Promise<MarkdownResult> {
    try {
      if (url) {
        validateUrl(url);

        // Dedicated YouTube handling: normalize YouTube URL to standard watch link
        if (isYouTubeUrl(url)) {
          const youtubeUrl = normalizeYouTubeUrl(url);
          const youtubeText = await this._markitdown(youtubeUrl, projectRoot);

          const isUselessFooter =
            youtubeText.includes("Google LLC") ||
            (youtubeText.includes("[About]") && !youtubeText.includes("### Video Metadata") && !youtubeText.includes("### Transcript"));

          if (isUselessFooter) {
            throw new Error(
              "Could not extract transcript for YouTube video. The video may not have captions/transcripts enabled or is restricted."
            );
          }

          return { text: youtubeText };
        }

        // Generic URL handling
        try {
          const directText = await this._markitdown(url, projectRoot);
          if (directText && directText.trim()) {
            return { text: directText };
          }
        } catch {
          // Fallback to safeFetch if direct URL conversion was blocked
        }

        // Fallback: Fetch page content using safeFetch with browser headers and convert temp file
        const response = await this.safeFetch(url);
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status} ${response.statusText} when fetching ${url}`);
        }
        const extension = inferExtensionFromUrl(url);
        const arrayBuffer = await response.arrayBuffer();
        const content = Buffer.from(arrayBuffer);

        const inputPath = await this.saveToTempFile(content, extension);
        try {
          const text = await this._markitdown(inputPath, projectRoot);
          return { text };
        } finally {
          fs.unlinkSync(inputPath);
        }
      } else if (filePath) {
        const expanded = expandHome(filePath);
        assertPathAllowed(expanded);
        if (!fs.existsSync(expanded)) {
          throw new Error(`File does not exist: "${filePath}" (resolved path: "${expanded}")`);
        }
        const text = await this._markitdown(expanded, projectRoot);
        return { text };
      } else {
        throw new Error("Either filePath or url must be provided");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw new Error(`Error processing to Markdown: ${e.message}`);
      } else {
        throw new Error("Error processing to Markdown: Unknown error occurred");
      }
    }
  }

  static async fromRepo({
    repoUrl,
    branch,
    compress,
  }: {
    repoUrl: string;
    branch?: string;
    compress?: boolean;
  }): Promise<MarkdownResult> {
    validateRepoUrl(repoUrl);

    const projectRoot = path.resolve(__dirname, "..");
    const repomixPath = resolveRepomixPath(projectRoot);

    const args = [
      "--remote",
      repoUrl,
      "--style",
      "markdown",
      "--stdout",
      "--quiet",
    ];

    if (branch) {
      args.push("--remote-branch", branch);
    }

    if (compress) {
      args.push("--compress");
    }

    let stdout: string;
    let stderr: string;
    try {
      ({ stdout, stderr } = await execFileAsync(repomixPath, args, {
        maxBuffer: 100 * 1024 * 1024, // 100 MB
      }));
    } catch (e: unknown) {
      const err = e as NodeJS.ErrnoException;
      if (err?.code === "ENOENT") {
        throw new Error(
          `repomix executable not found (looked up "${repomixPath}"). ` +
            `Set REPOMIX_PATH or install it on PATH (\`bun add -g repomix\`).`,
        );
      }
      throw e;
    }

    if (!stdout) {
      throw new Error(
        `repomix produced no output${stderr ? `: ${stderr}` : ""}`,
      );
    }

    return { text: stdout };
  }

  static async get({
    filePath,
  }: {
    filePath: string;
  }): Promise<MarkdownResult> {
    const expanded = expandHome(filePath);
    const resolvedPath = path.resolve(expanded);
    if (!isMarkdownFile(resolvedPath)) {
      throw new Error("Required file is not a Markdown file.");
    }

    assertPathAllowed(resolvedPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File does not exist: "${filePath}" (resolved path: "${resolvedPath}")`);
    }

    const text = await fs.promises.readFile(resolvedPath, "utf-8");

    return {
      path: resolvedPath,
      text: text,
    };
  }
}
