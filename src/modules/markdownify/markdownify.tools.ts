import { ToolDecorator as Tool, Widget, ExecutionContext, z } from '@nitrostack/core';
import { Markdownify } from '../../Markdownify.js';

export class MarkdownifyTools {
  @Tool({
    name: 'youtube-to-markdown',
    title: 'YouTube to Markdown',
    description: 'Convert a YouTube video to markdown, including transcript if available',
    inputSchema: z.object({
      url: z.string().describe('URL of the YouTube video'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @Widget('markdownify-result')
  async youtubeToMarkdown(input: { url: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting YouTube video to markdown', { url: input.url });
    const result = await Markdownify.toMarkdown({ url: input.url });
    return {
      text: result.text,
      title: 'YouTube Video Markdown',
      type: 'youtube',
      url: input.url,
    };
  }

  @Tool({
    name: 'pdf-to-markdown',
    title: 'PDF to Markdown',
    description: 'Convert a PDF file to markdown',
    inputSchema: z.object({
      filepath: z.string().describe('Absolute path of the PDF file to convert'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async pdfToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting PDF file to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'PDF Document Markdown',
      type: 'pdf',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'bing-search-to-markdown',
    title: 'Bing Search to Markdown',
    description: 'Convert a Bing search results page to markdown',
    inputSchema: z.object({
      url: z.string().describe('URL of the Bing search results page'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @Widget('markdownify-result')
  async bingSearchToMarkdown(input: { url: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting Bing search to markdown', { url: input.url });
    const result = await Markdownify.toMarkdown({ url: input.url });
    return {
      text: result.text,
      title: 'Bing Search Markdown',
      type: 'bing-search',
      url: input.url,
    };
  }

  @Tool({
    name: 'webpage-to-markdown',
    title: 'Webpage to Markdown',
    description: 'Convert a webpage to markdown',
    inputSchema: z.object({
      url: z.string().describe('URL of the webpage to convert'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @Widget('markdownify-result')
  async webpageToMarkdown(input: { url: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting webpage to markdown', { url: input.url });
    const result = await Markdownify.toMarkdown({ url: input.url });
    return {
      text: result.text,
      title: 'Webpage Markdown',
      type: 'webpage',
      url: input.url,
    };
  }

  @Tool({
    name: 'image-to-markdown',
    title: 'Image to Markdown',
    description: 'Convert an image to markdown, including metadata and description',
    inputSchema: z.object({
      filepath: z.string().describe('Absolute path of the image file to convert'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async imageToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting image to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'Image Markdown',
      type: 'image',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'audio-to-markdown',
    title: 'Audio to Markdown',
    description: 'Convert an audio file to markdown, including transcription if possible',
    inputSchema: z.object({
      filepath: z.string().describe('Absolute path of the audio file to convert'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async audioToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting audio file to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'Audio Transcript Markdown',
      type: 'audio',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'docx-to-markdown',
    title: 'DOCX to Markdown',
    description: 'Convert a DOCX file to markdown',
    inputSchema: z.object({
      filepath: z.string().describe('Absolute path of the DOCX file to convert'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async docxToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting DOCX file to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'DOCX Document Markdown',
      type: 'docx',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'xlsx-to-markdown',
    title: 'XLSX to Markdown',
    description: 'Convert an XLSX file to markdown',
    inputSchema: z.object({
      filepath: z.string().describe('Absolute path of the XLSX file to convert'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async xlsxToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting XLSX file to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'XLSX Spreadsheet Markdown',
      type: 'xlsx',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'pptx-to-markdown',
    title: 'PPTX to Markdown',
    description: 'Convert a PPTX file to markdown',
    inputSchema: z.object({
      filepath: z.string().describe('Absolute path of the PPTX file to convert'),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async pptxToMarkdown(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Converting PPTX file to markdown', { filepath: input.filepath });
    const result = await Markdownify.toMarkdown({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'PPTX Presentation Markdown',
      type: 'pptx',
      filepath: input.filepath,
    };
  }

  @Tool({
    name: 'git-repo-to-markdown',
    title: 'Git Repo to Markdown',
    description: 'Convert a git repository into a single markdown document containing the file tree and source code. Supports GitHub URLs and shorthand (e.g. \'owner/repo\').',
    inputSchema: z.object({
      url: z.string().describe("Git repository URL or GitHub shorthand (e.g. 'https://github.com/owner/repo' or 'owner/repo')"),
      branch: z.string().optional().describe('Branch, tag, or commit to use (default: repo default branch)'),
      compress: z.boolean().optional().describe('Use Tree-sitter compression to reduce output size (~70% reduction). Default: false'),
    }),
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  })
  @Widget('markdownify-result')
  async gitRepoToMarkdown(
    input: { url: string; branch?: string; compress?: boolean },
    ctx: ExecutionContext
  ) {
    ctx.logger.info('Converting Git repository to markdown', { url: input.url });
    const result = await Markdownify.fromRepo({
      repoUrl: input.url,
      branch: input.branch,
      compress: input.compress,
    });
    return {
      text: result.text,
      title: 'Git Repository Markdown',
      type: 'git-repo',
      url: input.url,
      branch: input.branch,
      compress: input.compress,
    };
  }

  @Tool({
    name: 'get-markdown-file',
    title: 'Get Markdown File',
    description: 'Get a markdown file by absolute file path',
    inputSchema: z.object({
      filepath: z.string().describe("Absolute path to file of markdown'd text"),
    }),
    annotations: {
      readOnlyHint: true,
    },
  })
  @Widget('markdownify-result')
  async getMarkdownFile(input: { filepath: string }, ctx: ExecutionContext) {
    ctx.logger.info('Reading markdown file', { filepath: input.filepath });
    const result = await Markdownify.get({ filePath: input.filepath });
    return {
      text: result.text,
      title: 'Markdown File',
      type: 'get-markdown-file',
      filepath: input.filepath,
      path: result.path,
    };
  }
}
