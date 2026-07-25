import fs from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';
import { expandHome } from '../../utils.js';

// Load environment variables from .env if present
dotenv.config();

export interface ObsidianFile {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
}

export class ObsidianService {
  private getApiKey(): string | null {
    return process.env.OBSIDIAN_API_KEY || null;
  }

  private getRestBaseUrl(): string {
    const protocol = (process.env.OBSIDIAN_PROTOCOL || 'https').toLowerCase();
    const host = process.env.OBSIDIAN_HOST || '127.0.0.1';
    const port = process.env.OBSIDIAN_PORT || '27124';
    return `${protocol}://${host}:${port}`;
  }

  public getVaultPath(): string {
    if (process.env.OBSIDIAN_VAULT_PATH) {
      return expandHome(process.env.OBSIDIAN_VAULT_PATH);
    }

    const candidatePaths = [
      path.join(os.homedir(), 'Documents', 'MarkItDown'),
      path.join(os.homedir(), 'Documents', 'Obsidian Vault'),
      path.join(os.homedir(), 'Documents', 'Vault'),
      path.join(os.homedir(), 'Obsidian'),
      path.join(os.homedir(), 'Vault'),
      process.cwd(),
    ];

    for (const cand of candidatePaths) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }

    return process.cwd();
  }

  private resolveNotePath(filename: string): string {
    let name = filename.trim();
    if (!name.endsWith('.md')) {
      name = `${name}.md`;
    }
    const vault = this.getVaultPath();
    if (path.isAbsolute(name)) {
      return name;
    }
    return path.join(vault, name);
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OBSIDIAN_API_KEY is not configured');
    }
    const url = `${this.getRestBaseUrl()}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'text/markdown',
      ...(options.headers || {}),
    };
    return fetch(url, { ...options, headers });
  }

  async listFiles(dirPath = ''): Promise<ObsidianFile[]> {
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/vault/${dirPath}`);
        if (res.ok) {
          const data = (await res.json()) as { files: string[] };
          const files: string[] = data.files || [];
          return files.map((f) => ({
            name: path.basename(f),
            path: f,
            isDir: f.endsWith('/'),
          }));
        }
      } catch {
        // Fallback
      }
    }

    const vault = this.getVaultPath();
    const targetDir = dirPath ? path.join(vault, dirPath) : vault;
    if (!fs.existsSync(targetDir)) {
      throw new Error(`Directory "${targetDir}" does not exist in Obsidian Vault`);
    }

    const entries = await fs.promises.readdir(targetDir, { withFileTypes: true });
    return entries.map((entry) => {
      const fullPath = path.join(targetDir, entry.name);
      const relPath = path.relative(vault, fullPath);
      return {
        name: entry.name,
        path: relPath,
        isDir: entry.isDirectory(),
        size: entry.isFile() ? fs.statSync(fullPath).size : undefined,
      };
    });
  }

  async getNote(filename: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/vault/${encodeURIComponent(filename)}`);
        if (res.ok) {
          return await res.text();
        }
      } catch {
        // Fallback
      }
    }

    const notePath = this.resolveNotePath(filename);
    if (!fs.existsSync(notePath)) {
      throw new Error(`Obsidian note "${filename}" does not exist (resolved path: "${notePath}")`);
    }
    return await fs.promises.readFile(notePath, 'utf-8');
  }

  async saveNote(filename: string, content: string, tags?: string[]): Promise<string> {
    let formattedContent = content;
    if (tags && tags.length > 0) {
      const tagHeader = tags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
      formattedContent = `${tagHeader}\n\n${content}`;
    }

    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/vault/${encodeURIComponent(filename)}`, {
          method: 'PUT',
          body: formattedContent,
        });
        if (res.ok) {
          return filename;
        }
      } catch {
        // Fallback
      }
    }

    const notePath = this.resolveNotePath(filename);
    const parentDir = path.dirname(notePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(notePath, formattedContent, 'utf-8');
    return notePath;
  }

  async appendNote(filename: string, contentToAppend: string): Promise<string> {
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/vault/${encodeURIComponent(filename)}`, {
          method: 'POST',
          body: `\n\n${contentToAppend}`,
        });
        if (res.ok) {
          return filename;
        }
      } catch {
        // Fallback
      }
    }

    const notePath = this.resolveNotePath(filename);
    if (fs.existsSync(notePath)) {
      await fs.promises.appendFile(notePath, `\n\n${contentToAppend}`, 'utf-8');
    } else {
      await this.saveNote(filename, contentToAppend);
    }
    return notePath;
  }

  async patchNote(filename: string, heading: string, contentToInsert: string): Promise<string> {
    const existing = await this.getNote(filename);
    const headingTarget = heading.trim().toLowerCase();
    const lines = existing.split('\n');

    let headingIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const cleanLine = lines[i].replace(/^#+\s*/, '').trim().toLowerCase();
      if (cleanLine === headingTarget || lines[i].trim().toLowerCase() === headingTarget) {
        headingIndex = i;
        break;
      }
    }

    if (headingIndex !== -1) {
      lines.splice(headingIndex + 1, 0, `\n${contentToInsert}`);
      const patched = lines.join('\n');
      return await this.saveNote(filename, patched);
    } else {
      return await this.appendNote(filename, `\n## ${heading}\n${contentToInsert}`);
    }
  }

  async searchNotes(query: string): Promise<ObsidianFile[]> {
    const q = query.toLowerCase().trim();
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/search/simple/?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const results = (await res.json()) as { filename: string }[];
          return results.map((r) => ({
            name: path.basename(r.filename),
            path: r.filename,
            isDir: false,
          }));
        }
      } catch {
        // Fallback
      }
    }

    const allFiles = await this.listFiles();
    const matches: ObsidianFile[] = [];

    for (const file of allFiles) {
      if (file.isDir || !file.name.endsWith('.md')) continue;
      try {
        const content = await this.getNote(file.path);
        if (content.toLowerCase().includes(q) || file.name.toLowerCase().includes(q)) {
          matches.push(file);
        }
      } catch {
        // Skip unreadable
      }
    }

    return matches;
  }

  async deleteNote(filename: string): Promise<void> {
    const apiKey = this.getApiKey();
    if (apiKey) {
      try {
        const res = await this.fetchApi(`/vault/${encodeURIComponent(filename)}`, {
          method: 'DELETE',
        });
        if (res.ok) return;
      } catch {
        // Fallback
      }
    }

    const notePath = this.resolveNotePath(filename);
    if (fs.existsSync(notePath)) {
      await fs.promises.unlink(notePath);
    }
  }
}
