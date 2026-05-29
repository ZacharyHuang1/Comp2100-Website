'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

type SyntaxHighlightedCodeProps = {
  code: string;
  language: string;
};

export function SyntaxHighlightedCode({
  code,
  language,
}: SyntaxHighlightedCodeProps) {
  return (
    <SyntaxHighlighter
      language={language}
      style={oneLight}
      customStyle={{
        margin: 0,
        padding: '1.5rem',
        background: '#faf8f3',
        fontSize: '0.9rem',
        lineHeight: 1.75,
      }}
      codeTagProps={{
        style: {
          fontFamily:
            'var(--font-mono), ui-monospace, SFMono-Regular, monospace',
        },
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
}
