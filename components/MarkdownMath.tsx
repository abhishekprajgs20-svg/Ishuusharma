'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Note: rehype-raw is intentionally NOT used here. Mixing it with
// remark-math/rehype-katex causes KaTeX output to be duplicated (the
// raw-HTML tree walk re-processes already-rendered math nodes). Since
// question/option/explanation content only ever needs markdown + GFM +
// LaTeX (never literal passthrough HTML), dropping rehype-raw removes
// the double-render bug entirely with no loss of supported features.
export default function MarkdownMath({ text, className = '' }: { text?: string; className?: string }) {
  if (!text) return null;
  return (
    <div className={`md-body ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
