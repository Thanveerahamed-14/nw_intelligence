import React from 'react';

/**
 * Lightweight, dependency-free Markdown renderer for LLM output.
 *
 * Deliberately does not inject generated HTML: every token is turned into a
 * React element, so model text can never introduce markup. Supports the subset
 * the Gemini prompts ask for: headings, bold/italic, inline code, bullet and
 * numbered lists, and paragraph breaks.
 */

const PREAMBLE = /^(?:Here is (?:the|a)\s+[^:\n]+:?\s*(?:---\s*)?)/i;

export function formatInlineMarkdown(text) {
  if (!text) return null;
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|(?<!\*)\*[^*]+\*(?!\*))/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-[11px] font-semibold">
          {token.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts;
}

/** Inline-only variant for short single-line fields and list items. */
export function InlineMarkdown({ text, className = '' }) {
  if (!text) return null;
  return <span className={`inline-ai ${className}`}>{formatInlineMarkdown(text)}</span>;
}

function toBlocks(rawText) {
  const text = String(rawText)
    .replace(PREAMBLE, '')
    .replace(/^---\s*/g, '')
    .replace(/\r\n?/g, '\n')
    .trim();

  const blocks = [];
  let paragraph = [];
  let list = [];
  let listType = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: listType, items: list });
    list = [];
    listType = null;
  };

  text.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '---') {
      flushParagraph();
      flushList();
      return;
    }

    const heading = trimmed.match(/^#{1,4}\s*(.*)/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', text: heading[1] });
      return;
    }

    // Models often emit "**RISK ANALYSIS**" instead of a real heading.
    const boldHeading = trimmed.match(/^\*\*([^*]+?)\*\*:?\s*$/);
    if (boldHeading) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'heading', text: boldHeading[1] });
      return;
    }

    const bullet = trimmed.match(/^[*\-•]\s+(.*)/);
    const numbered = trimmed.match(/^\d+[.)]\s+(.*)/);
    if (bullet || numbered) {
      flushParagraph();
      const nextType = numbered ? 'ordered' : 'unordered';
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      list.push((bullet || numbered)[1]);
      return;
    }

    flushList();
    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return blocks;
}

export default function MarkdownText({ text, className = '' }) {
  if (!text) return null;
  const blocks = toBlocks(text);

  return (
    <div className={`ai-prose ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          return <h4 key={idx}>{formatInlineMarkdown(block.text)}</h4>;
        }
        if (block.type === 'ordered' || block.type === 'unordered') {
          const List = block.type === 'ordered' ? 'ol' : 'ul';
          return (
            <List key={idx}>
              {block.items.map((item, itemIdx) => <li key={itemIdx}>{formatInlineMarkdown(item)}</li>)}
            </List>
          );
        }
        return <p key={idx}>{formatInlineMarkdown(block.text)}</p>;
      })}
    </div>
  );
}
