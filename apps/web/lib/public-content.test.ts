import { describe, expect, it } from "vitest";
import { prefersMarkdown, publicHtmlToMarkdown } from "./public-content";

describe("public content negotiation", () => {
  it.each([
    "text/markdown",
    "text/markdown, text/html",
    "text/markdown, */*",
    "text/html;q=0.2, text/markdown;q=0.8",
    "TEXT/MARKDOWN; charset=utf-8",
  ])("offers Markdown for %s", (accept) => {
    expect(prefersMarkdown(accept)).toBe(true);
  });
  it.each([
    null,
    "*/*",
    "text/*",
    "text/html, text/markdown",
    "text/markdown;q=0",
    "text/markdown;q=0, text/*;q=1",
    "text/markdown;q=invalid",
    "text/markdown;q=0.1, text/html;q=0.9",
    "application/json",
    "text/markdown;q=2",
  ])("keeps HTML for %s", (accept) => {
    expect(prefersMarkdown(accept)).toBe(false);
  });
  it("extracts the same public main content and code without scripts, navigation or hidden payloads", () => {
    const html =
      '<html><head><title>Fixture</title></head><body><nav>Menu</nav><main><h1>Tasks &amp; agents</h1><p>A <strong>shared</strong> board.</p><a href="/en/docs">Read docs</a><pre><code>curl &quot;https://example.com&quot;\n# &lt;TOKEN&gt;</code></pre><script>privateLookingFixture()</script><ul><li>REST</li><li>MCP</li></ul></main><script>hydrationPayload()</script></body></html>';
    const markdown = publicHtmlToMarkdown(html, "https://example.com/en");
    expect(markdown).toContain("# Tasks & agents");
    expect(markdown).toContain("[Read docs](https://example.com/en/docs)");
    expect(markdown).toContain('```\ncurl "https://example.com"\n# <TOKEN>\n```');
    expect(markdown.match(/^- (REST|MCP)$/gm)).toEqual(["- REST", "- MCP"]);
    expect(markdown).not.toMatch(/Menu|privateLookingFixture|hydrationPayload|<script>/);
    expect(() => publicHtmlToMarkdown("<p>No public main</p>", "https://example.com")).toThrow();
  });
});
