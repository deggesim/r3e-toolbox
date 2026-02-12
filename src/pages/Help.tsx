import { useMemo } from "react";
import { Container } from "react-bootstrap";
import ReactMarkdown from "react-markdown";
import { useElectronAPI } from "../hooks/useElectronAPI";
import "../pages/Help.css";

// Import the USER_GUIDE markdown as raw text
import helpContent from "../docs/USER_GUIDE.md?raw";

const Help = () => {
  const { isElectron, openExternal } = useElectronAPI();

  const handleLinkClick = async (
    e: React.MouseEvent<HTMLAnchorElement>,
    href?: string,
  ) => {
    if (!href) return;

    // Check if it's an external URL
    if (href.startsWith("http://") || href.startsWith("https://")) {
      e.preventDefault();

      if (isElectron && openExternal) {
        // In Electron, open in system browser
        try {
          await openExternal(href);
        } catch (error) {
          console.error("Failed to open external link:", error);
          // Fallback to window.open
          window.open(href, "_blank");
        }
      } else {
        // In web mode, open in new tab
        window.open(href, "_blank");
      }
    }
  };

  const components = useMemo(
    () => ({
      h1: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1 className="help-h1" {...props} />
      ),
      h2: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2 className="help-h2" {...props} />
      ),
      h3: ({ ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3 className="help-h3" {...props} />
      ),
      p: ({ ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p className="help-p" {...props} />
      ),
      ul: ({ ...props }: React.HTMLAttributes<HTMLUListElement>) => (
        <ul className="help-ul" {...props} />
      ),
      ol: ({ ...props }: React.HTMLAttributes<HTMLOListElement>) => (
        <ol className="help-ol" {...props} />
      ),
      li: ({ ...props }: React.HTMLAttributes<HTMLLIElement>) => (
        <li className="help-li" {...props} />
      ),
      code: ({ ...props }: React.HTMLAttributes<HTMLElement>) => (
        <code className="help-code" {...props} />
      ),
      pre: ({ ...props }: React.HTMLAttributes<HTMLPreElement>) => (
        <pre className="help-pre" {...props} />
      ),
      blockquote: ({ ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
        <blockquote className="help-blockquote" {...props} />
      ),
      a: ({
        href,
        ...props
      }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a
          href={href}
          onClick={(e) => handleLinkClick(e, href)}
          style={{ cursor: "pointer" }}
          {...props}
        />
      ),
    }),
    [isElectron, openExternal],
  );

  return (
    <Container className="help-container py-4">
      <div className="help-content">
        <ReactMarkdown components={components}>{helpContent}</ReactMarkdown>
      </div>
    </Container>
  );
};

export default Help;
