/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module 'markdown-it' {
  interface MarkdownItOptions {
    html?: boolean;
    xhtmlOut?: boolean;
    breaks?: boolean;
    langPrefix?: string;
    linkify?: boolean;
    typographer?: boolean;
  }

  class MarkdownIt {
    constructor(preset?: string, options?: MarkdownItOptions);
    constructor(options?: MarkdownItOptions);
    render(md: string, env?: any): string;
    renderInline(md: string, env?: any): string;
  }

  export default MarkdownIt;
}
