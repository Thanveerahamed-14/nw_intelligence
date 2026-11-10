"""Build clean, print-friendly HTML versions of the Markdown docs in docs/.

The Markdown sources are left untouched; each one gets a sibling ``.html`` file
with the same name, plus a ``docs/index.html`` that links them all together.

Usage:
    python scripts/build_docs.py
"""

from __future__ import annotations

import html
import re
import sys
from pathlib import Path
from string import Template

import markdown
from markdown.extensions import Extension
from markdown.postprocessors import Postprocessor
from markdown.preprocessors import Preprocessor
from pygments.formatters import HtmlFormatter

ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs"

MERMAID_OPEN_RE = re.compile(r"^\s*```+\s*mermaid\s*$")
FENCE_RE = re.compile(r"^\s*```")
PLACEHOLDER_RE = re.compile(r"<p>\s*@@MERMAID_(\d+)@@\s*</p>")
H1_RE = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)


class MermaidPreprocessor(Preprocessor):
    """Swap ```mermaid blocks for placeholders before code highlighting runs."""

    def run(self, lines: list[str]) -> list[str]:
        blocks = self.md.mermaid_blocks
        out: list[str] = []
        i, total = 0, len(lines)

        while i < total:
            if MERMAID_OPEN_RE.match(lines[i]):
                i += 1
                body: list[str] = []
                while i < total and not FENCE_RE.match(lines[i]):
                    body.append(lines[i])
                    i += 1
                i += 1  # closing fence
                blocks.append("\n".join(body))
                out.extend(["", f"@@MERMAID_{len(blocks) - 1}@@", ""])
            else:
                out.append(lines[i])
                i += 1

        return out


class MermaidPostprocessor(Postprocessor):
    """Turn mermaid placeholders into ``<pre class="mermaid">`` blocks."""

    def run(self, text: str) -> str:
        blocks = self.md.mermaid_blocks

        def render(match: re.Match[str]) -> str:
            source = html.escape(blocks[int(match.group(1))], quote=False)
            return f'<pre class="mermaid">\n{source}\n</pre>'

        return PLACEHOLDER_RE.sub(render, text)


class MermaidExtension(Extension):
    def extendMarkdown(self, md):
        md.mermaid_blocks = []
        md.preprocessors.register(MermaidPreprocessor(md), "mermaid", 26)
        md.postprocessors.register(MermaidPostprocessor(md), "mermaid", 5)


PAGE_CSS = """
    :root {
      --ink: #1f2933;
      --muted: #52606d;
      --faint: #7b8794;
      --border: #e1e6ec;
      --surface: #ffffff;
      --page: #f5f7fa;
      --accent: #1d4ed8;
      --accent-soft: #eff4ff;
      --code-bg: #f6f8fa;
    }
    * { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      margin: 0;
      background: var(--page);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      font-size: 16px;
      line-height: 1.65;
    }
    .site-header {
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .site-header .inner,
    .pager,
    .page {
      width: min(920px, 100% - 32px);
      margin: 0 auto;
    }
    .site-header .inner {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px 16px;
      padding: 14px 0;
    }
    .site-header .brand {
      font-weight: 700;
      font-size: 0.9rem;
      letter-spacing: 0.02em;
      color: var(--ink);
      text-decoration: none;
    }
    .site-header nav {
      margin-left: auto;
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      font-size: 0.85rem;
    }
    a { color: var(--accent); }
    a:hover { text-decoration-thickness: 2px; }
    .page {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06);
      margin-top: 28px;
      margin-bottom: 28px;
      padding: 52px 64px 64px;
    }
    .doc-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 14px;
      align-items: center;
      margin-bottom: 8px;
      color: var(--faint);
      font-size: 0.78rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-weight: 600;
    }
    .doc-meta a { text-transform: none; letter-spacing: 0; font-weight: 500; }
    h1, h2, h3, h4 {
      line-height: 1.25;
      color: #111827;
      font-weight: 700;
      margin: 1.8em 0 0.6em;
      scroll-margin-top: 20px;
    }
    h1 { font-size: 1.95rem; margin-top: 0.3em; letter-spacing: -0.02em; }
    h2 {
      font-size: 1.35rem;
      padding-bottom: 0.3em;
      border-bottom: 1px solid var(--border);
    }
    h3 { font-size: 1.1rem; }
    h4 { font-size: 1rem; color: var(--muted); }
    p, ul, ol, table, pre, blockquote { margin: 0 0 1.05em; }
    ul, ol { padding-left: 1.4em; }
    li { margin: 0.28em 0; }
    li > ul, li > ol { margin: 0.28em 0 0.28em; }
    strong { color: #111827; }
    hr {
      border: 0;
      border-top: 1px solid var(--border);
      margin: 2.4em 0;
    }
    blockquote {
      margin-left: 0;
      padding: 0.85em 1.1em;
      border-left: 3px solid var(--accent);
      background: var(--accent-soft);
      border-radius: 0 8px 8px 0;
      color: var(--muted);
    }
    blockquote p:last-child { margin-bottom: 0; }
    code {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.86em;
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 0.1em 0.35em;
    }
    pre {
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 16px 18px;
      overflow-x: auto;
      line-height: 1.5;
      font-size: 0.85rem;
    }
    pre code {
      background: none;
      border: 0;
      padding: 0;
      font-size: inherit;
      white-space: pre;
    }
    .highlight pre { margin: 0; }
    .table-wrap { overflow-x: auto; margin-bottom: 1.05em; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
      margin: 0;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
    }
    th { background: #f1f5f9; font-weight: 600; color: #111827; }
    tbody tr:nth-child(even) { background: #fafbfc; }
    .mermaid {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 18px;
      margin: 0 0 1.2em;
      overflow-x: auto;
      text-align: center;
      font-family: inherit;
      font-size: 0.9rem;
      white-space: pre;
    }
    .mermaid[data-processed="true"] { white-space: normal; }
    .mermaid svg { max-width: 100%; height: auto; }
    .toc {
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fbfcfe;
      padding: 14px 20px 16px;
      margin: 1.6em 0 2em;
    }
    .toc-title {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--faint);
      margin-bottom: 6px;
    }
    .toc ul { list-style: none; padding-left: 0; margin: 0; }
    .toc ul ul { padding-left: 1.1em; }
    .toc li { margin: 0.18em 0; font-size: 0.88rem; }
    .toc a { text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    .pager {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      padding-bottom: 40px;
      font-size: 0.9rem;
    }
    .pager a {
      display: block;
      flex: 1 1 0;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: var(--surface);
      padding: 12px 16px;
      text-decoration: none;
      color: var(--ink);
    }
    .pager a:hover { border-color: var(--accent); }
    .pager .label {
      display: block;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--faint);
      margin-bottom: 2px;
    }
    .pager .next { text-align: right; }
    .pager .spacer { flex: 1 1 0; }
    .cards {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
      margin-top: 1.5em;
    }
    .card {
      display: block;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px 20px;
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .card:hover {
      border-color: var(--accent);
      box-shadow: 0 2px 10px rgba(29, 78, 216, 0.08);
    }
    .card .num {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--accent);
      text-transform: uppercase;
    }
    .card h3 { margin: 2px 0 4px; font-size: 1.02rem; }
    .card p { margin: 0; color: var(--muted); font-size: 0.88rem; }

    @media (max-width: 720px) {
      .page { padding: 32px 22px 44px; border-radius: 0; border-left: 0; border-right: 0; }
      .site-header .inner, .pager, .page { width: 100%; }
      .site-header .inner { padding: 12px 16px; }
      .pager { padding: 0 16px 32px; }
      h1 { font-size: 1.55rem; }
    }

    @media print {
      body { background: #fff; color: #000; font-size: 11.5pt; }
      .site-header, .pager, .toc, .doc-meta a { display: none !important; }
      .page {
        width: 100%;
        margin: 0;
        padding: 0;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
      a { color: #000; text-decoration: none; }
      h1, h2, h3 { page-break-after: avoid; }
      h2 { border-bottom-color: #ccc; }
      pre, table, blockquote, .mermaid { page-break-inside: avoid; }
      pre { background: #f7f7f7; border-color: #ddd; }
      th { background: #f0f0f0; }
      .mermaid { border-color: #ddd; }
    }
"""

PAGE_TEMPLATE = Template(
    """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>$title</title>
<style>$css</style>
<style>$pygments_css</style>
</head>
<body>
<header class="site-header">
  <div class="inner">
    <a class="brand" href="index.html">Telecom Network Intelligence &middot; Documentation</a>
    <nav>
      <a href="index.html">All documents</a>
      <a href="$source_name">Markdown source</a>
    </nav>
  </div>
</header>
<main class="page">
  <div class="doc-meta">
    <span>Technical documentation</span>
    <span>&middot;</span>
    <a href="$source_name">$source_name</a>
  </div>
  $toc
  $content
</main>
<nav class="pager">
  $pager
</nav>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  if (document.querySelector(".mermaid")) {
    mermaid.initialize({
      startOnLoad: true,
      theme: "neutral",
      securityLevel: "loose",
      fontFamily: "inherit",
      flowchart: { useMaxWidth: true, htmlLabels: true },
    });
  }
</script>
</body>
</html>
"""
)

INDEX_TEMPLATE = Template(
    """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>$title</title>
<style>$css</style>
</head>
<body>
<header class="site-header">
  <div class="inner">
    <a class="brand" href="index.html">Telecom Network Intelligence &middot; Documentation</a>
    <nav><a href="../README.md">README (Markdown)</a></nav>
  </div>
</header>
<main class="page">
  <div class="doc-meta"><span>Documentation index</span></div>
  <h1>$title</h1>
  <p>$intro</p>
  <div class="cards">
    $cards
  </div>
</main>
</body>
</html>
"""
)


def plain_text(fragment: str) -> str:
    """Crude Markdown-to-text helper for summaries."""
    text = re.sub(r"!\[[^\]]*]\([^)]*\)", "", fragment)
    text = re.sub(r"\[([^\]]+)]\([^)]*\)", r"\1", text)
    text = re.sub(r"`([^`]*)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*>\s*", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def summary_of(source: str) -> str:
    """Return the first real paragraph of the document, trimmed for a card."""
    without_code = re.sub(r"```.*?```", "", source, flags=re.DOTALL)
    blocks = [b.strip() for b in re.split(r"\n\s*\n", without_code) if b.strip()]
    for block in blocks:
        if block.startswith("#") or block.startswith("|") or block.startswith("---"):
            continue
        text = plain_text(block)
        if len(text) > 40:
            if len(text) > 200:
                text = text[:197].rsplit(" ", 1)[0] + "..."
            return text
    return ""


def title_of(source: str, fallback: str) -> str:
    match = H1_RE.search(source)
    return plain_text(match.group(1)) if match else fallback


def convert(source_path: Path) -> tuple[str, str, str]:
    source = source_path.read_text(encoding="utf-8")
    md = markdown.Markdown(
        extensions=[
            "extra",
            "toc",
            "codehilite",
            "sane_lists",
            MermaidExtension(),
        ],
        extension_configs={
            "toc": {"toc_depth": "2-3", "permalink": False},
            "codehilite": {"guess_lang": False, "cssclass": "highlight"},
        },
    )
    content = md.convert(source)
    content = re.sub(
        r"(<table>.*?</table>)",
        r'<div class="table-wrap">\1</div>',
        content,
        flags=re.DOTALL,
    )
    toc = md.toc
    if toc.strip():
        toc = f'<nav class="toc"><div class="toc-title">On this page</div>{toc}</nav>'
    return title_of(source, source_path.stem), content, toc


def pager_html(prev_doc: tuple[str, str] | None, next_doc: tuple[str, str] | None) -> str:
    parts: list[str] = []
    if prev_doc:
        href, title = prev_doc
        parts.append(
            f'<a class="prev" href="{href}"><span class="label">&larr; Previous</span>{title}</a>'
        )
    else:
        parts.append('<span class="spacer"></span>')
    if next_doc:
        href, title = next_doc
        parts.append(
            f'<a class="next" href="{href}"><span class="label">Next &rarr;</span>{title}</a>'
        )
    else:
        parts.append('<span class="spacer"></span>')
    return "\n  ".join(parts)


def build() -> int:
    sources = sorted(DOCS_DIR.glob("*.md"))
    if not sources:
        print(f"No Markdown files found in {DOCS_DIR}", file=sys.stderr)
        return 1

    pygments_css = HtmlFormatter(style="friendly").get_style_defs(".highlight")
    converted: list[tuple[Path, str, str, str]] = []
    for source_path in sources:
        title, content, toc = convert(source_path)
        converted.append((source_path, title, content, toc))

    for index, (source_path, title, content, toc) in enumerate(converted):
        prev_doc = None
        next_doc = None
        if index > 0:
            prev_doc = (converted[index - 1][0].with_suffix(".html").name, converted[index - 1][1])
        if index < len(converted) - 1:
            next_doc = (converted[index + 1][0].with_suffix(".html").name, converted[index + 1][1])

        page = PAGE_TEMPLATE.safe_substitute(
            title=f"{title} | Telecom Network Intelligence",
            css=PAGE_CSS,
            pygments_css=pygments_css,
            source_name=source_path.name,
            toc=toc,
            content=content,
            pager=pager_html(prev_doc, next_doc),
        )
        html_path = source_path.with_suffix(".html")
        html_path.write_text(page, encoding="utf-8", newline="\n")
        print(f"  {source_path.name} -> {html_path.relative_to(ROOT)}")

    cards: list[str] = []
    for source_path, title, _content, _toc in converted:
        number = source_path.name.split("_", 1)[0]
        summary = summary_of(source_path.read_text(encoding="utf-8"))
        cards.append(
            f'<a class="card" href="{source_path.with_suffix(".html").name}">'
            f'<span class="num">Document {number}</span>'
            f"<h3>{title}</h3><p>{html.escape(summary)}</p></a>"
        )

    index_page = INDEX_TEMPLATE.safe_substitute(
        title="Telecom Network Intelligence &middot; Documentation",
        css=PAGE_CSS,
        intro=(
            "Printable HTML editions of the platform design documentation. "
            "The Markdown sources remain alongside these pages as the canonical text."
        ),
        cards="\n    ".join(cards),
    )
    (DOCS_DIR / "index.html").write_text(index_page, encoding="utf-8", newline="\n")
    print(f"  docs/index.html ({len(converted)} documents)")

    return 0


if __name__ == "__main__":
    raise SystemExit(build())
