import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { ObsidianService } from './obsidian.service.js';
import { Markdownify } from '../../Markdownify.js';

export class ObsidianTools {
  private obsidianService = new ObsidianService();

  @Tool({
    name: 'obsidian-convert-and-save',
    title: 'Convert & Save Directly to Obsidian Vault',
    description: 'DIRECTLY convert any PDF, YouTube video, Audio transcript, Webpage, or Office file into Markdown AND save it straight into your Obsidian Vault as a new note in 1 single step! Call this tool whenever the user asks to save converted content to Obsidian.',
    inputSchema: z.object({
      title: z.string().describe('Name of the note to create in Obsidian (e.g. "Rick Astley Transcript" or "Project Specs")'),
      filepath: z.string().optional().describe('Filename or path of any local file to convert/transcribe (e.g. sample_audio.mp3, gg.pdf, document.docx)'),
      url: z.string().optional().describe('URL of any YouTube video or webpage to convert'),
      tags: z.array(z.string()).optional().describe('Optional tags for Obsidian (e.g. ["youtube", "transcript"])'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  @Widget('markdownify-result')
  async convertAndSave(
    input: { title: string; filepath?: string; url?: string; tags?: string[] },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Converting and saving directly to Obsidian Vault', {
      title: input.title,
      filepath: input.filepath,
      url: input.url,
    });

    const conversion = await Markdownify.toMarkdown({
      filePath: input.filepath,
      url: input.url,
    });

    const savedPath = await this.obsidianService.saveNote(
      input.title,
      conversion.text,
      input.tags,
    );

    return {
      text: `✅ Successfully converted and saved to Obsidian Vault!\n\nNote Path: ${savedPath}\n\n---\n\n${conversion.text}`,
      title: `Saved to Obsidian: ${input.title}`,
      type: 'obsidian-saved',
      filepath: savedPath,
    };
  }

  @Tool({
    name: 'obsidian-save-note',
    title: 'Save Note to Obsidian Vault',
    description: 'Save or create a Markdown note directly in your Obsidian Vault with optional tags.',
    inputSchema: z.object({
      filename: z.string().describe('Name of the note (e.g. "Meeting Notes.md" or "Project Ideas")'),
      content: z.string().describe('Markdown text content of the note'),
      tags: z.array(z.string()).optional().describe('Optional tags to prepend (e.g. ["ideas", "hackathon"])'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  @Widget('markdownify-result')
  async saveNote(
    input: { filename: string; content: string; tags?: string[] },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Saving note to Obsidian Vault', { filename: input.filename });
    const savedPath = await this.obsidianService.saveNote(
      input.filename,
      input.content,
      input.tags,
    );
    return {
      text: `✅ Saved note to Obsidian Vault: "${savedPath}"`,
      title: `Obsidian: ${input.filename}`,
      type: 'obsidian-note',
      filepath: savedPath,
    };
  }

  @Tool({
    name: 'obsidian-list-notes',
    title: 'List Notes in Obsidian Vault',
    description: 'List all Markdown notes and folders in your Obsidian Vault.',
    inputSchema: z.object({
      directory: z.string().optional().describe('Subdirectory inside Obsidian Vault (optional, defaults to vault root)'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  async listNotes(input: { directory?: string }, ctx: ExecutionContext) {
    ctx.logger.info('Listing notes in Obsidian Vault', { directory: input.directory });
    const files = await this.obsidianService.listFiles(input.directory);
    const listText = files
      .map((f) => `${f.isDir ? '📁' : '📄'} ${f.path}`)
      .join('\n');
    return {
      text: `# Obsidian Vault Notes (${files.length} items)\n\n${listText}`,
      files,
    };
  }

  @Tool({
    name: 'obsidian-get-note',
    title: 'Get Note from Obsidian Vault',
    description: 'Read and return the text content of a note from your Obsidian Vault.',
    inputSchema: z.object({
      filename: z.string().describe('Name or relative path of the note in Obsidian Vault'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async getNote(input: { filename: string }, ctx: ExecutionContext) {
    ctx.logger.info('Reading note from Obsidian Vault', { filename: input.filename });
    const text = await this.obsidianService.getNote(input.filename);
    return {
      text,
      title: `Obsidian Note: ${input.filename}`,
      type: 'obsidian-note',
      filepath: input.filename,
    };
  }

  @Tool({
    name: 'obsidian-append-note',
    title: 'Append Content to Obsidian Note',
    description: 'Append new markdown text or summary to an existing or new note in your Obsidian Vault.',
    inputSchema: z.object({
      filename: z.string().describe('Name of the note in Obsidian Vault'),
      content: z.string().describe('Markdown text content to append'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  async appendNote(input: { filename: string; content: string }, ctx: ExecutionContext) {
    ctx.logger.info('Appending to Obsidian note', { filename: input.filename });
    const notePath = await this.obsidianService.appendNote(input.filename, input.content);
    return {
      text: `✅ Appended content to Obsidian note: "${notePath}"`,
    };
  }

  @Tool({
    name: 'obsidian-patch-note',
    title: 'Patch Content Under Heading in Obsidian Note',
    description: 'Insert markdown content under a specific heading (e.g. "## Action Items") in an Obsidian note.',
    inputSchema: z.object({
      filename: z.string().describe('Name of the note in Obsidian Vault'),
      heading: z.string().describe('Target heading inside note (e.g. "Summary" or "Action Items")'),
      content: z.string().describe('Markdown content to insert under the heading'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  async patchNote(
    input: { filename: string; heading: string; content: string },
    ctx: ExecutionContext,
  ) {
    ctx.logger.info('Patching Obsidian note heading', { filename: input.filename, heading: input.heading });
    const notePath = await this.obsidianService.patchNote(
      input.filename,
      input.heading,
      input.content,
    );
    return {
      text: `✅ Inserted content under heading "${input.heading}" in Obsidian note "${notePath}"`,
    };
  }

  @Tool({
    name: 'obsidian-search-notes',
    title: 'Search Notes in Obsidian Vault',
    description: 'Search for text query or topic across all notes in your Obsidian Vault.',
    inputSchema: z.object({
      query: z.string().describe('Search query text'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  async searchNotes(input: { query: string }, ctx: ExecutionContext) {
    ctx.logger.info('Searching Obsidian Vault notes', { query: input.query });
    const matches = await this.obsidianService.searchNotes(input.query);
    const resultText = matches.map((m) => `- 📄 ${m.path}`).join('\n');
    return {
      text: `# Obsidian Search Results for "${input.query}" (${matches.length} matches)\n\n${resultText || 'No matching notes found.'}`,
      matches,
    };
  }

  @Tool({
    name: 'obsidian-delete-note',
    title: 'Delete Note from Obsidian Vault',
    description: 'Delete a note file from your Obsidian Vault.',
    inputSchema: z.object({
      filename: z.string().describe('Name or path of the note to delete'),
    }),
    annotations: {
      readOnlyHint: false,
    },
  })
  async deleteNote(input: { filename: string }, ctx: ExecutionContext) {
    ctx.logger.info('Deleting note from Obsidian Vault', { filename: input.filename });
    await this.obsidianService.deleteNote(input.filename);
    return {
      text: `🗑️ Deleted note "${input.filename}" from Obsidian Vault.`,
    };
  }
}
