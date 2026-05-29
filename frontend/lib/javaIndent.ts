import type { KeyboardEvent } from 'react';

const INDENT = '    ';

type SetValue = (value: string) => void;

function getLineStart(value: string, position: number) {
  return value.lastIndexOf('\n', Math.max(0, position - 1)) + 1;
}

function getLineEnd(value: string, position: number) {
  const nextBreak = value.indexOf('\n', position);
  return nextBreak === -1 ? value.length : nextBreak;
}

function getIndent(line: string) {
  return line.match(/^\s*/)?.[0] || '';
}

function removeOneIndent(value: string) {
  if (value.startsWith(INDENT)) {
    return value.slice(INDENT.length);
  }

  if (value.startsWith('\t')) {
    return value.slice(1);
  }

  return value.replace(/^ {1,4}/, '');
}

function replaceSelection(
  textarea: HTMLTextAreaElement,
  nextValue: string,
  nextSelectionStart: number,
  nextSelectionEnd: number,
  setValue: SetValue
) {
  setValue(nextValue);
  window.requestAnimationFrame(() => {
    textarea.selectionStart = nextSelectionStart;
    textarea.selectionEnd = nextSelectionEnd;
  });
}

function indentSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: SetValue
) {
  const { selectionStart, selectionEnd } = textarea;
  const lineStart = getLineStart(value, selectionStart);
  const lineEnd = getLineEnd(value, selectionEnd);
  const selectedBlock = value.slice(lineStart, lineEnd);
  const lines = selectedBlock.split('\n');
  const nextBlock = lines.map((line) => `${INDENT}${line}`).join('\n');
  const nextValue = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);
  const addedBeforeSelection = selectionStart === lineStart ? 0 : INDENT.length;
  const addedTotal = lines.length * INDENT.length;

  replaceSelection(
    textarea,
    nextValue,
    selectionStart + addedBeforeSelection,
    selectionEnd + addedTotal,
    setValue
  );
}

function unindentSelection(
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: SetValue
) {
  const { selectionStart, selectionEnd } = textarea;
  const lineStart = getLineStart(value, selectionStart);
  const lineEnd = getLineEnd(value, selectionEnd);
  const selectedBlock = value.slice(lineStart, lineEnd);
  const lines = selectedBlock.split('\n');
  let removedBeforeSelection = 0;
  let removedTotal = 0;

  const nextBlock = lines
    .map((line, index) => {
      const nextLine = removeOneIndent(line);
      const removed = line.length - nextLine.length;

      if (index === 0) {
        removedBeforeSelection = Math.min(
          removed,
          Math.max(0, selectionStart - lineStart)
        );
      }

      removedTotal += removed;
      return nextLine;
    })
    .join('\n');
  const nextValue = value.slice(0, lineStart) + nextBlock + value.slice(lineEnd);

  replaceSelection(
    textarea,
    nextValue,
    Math.max(lineStart, selectionStart - removedBeforeSelection),
    Math.max(lineStart, selectionEnd - removedTotal),
    setValue
  );
}

function insertNewlineWithIndent(
  textarea: HTMLTextAreaElement,
  value: string,
  setValue: SetValue
) {
  const { selectionStart, selectionEnd } = textarea;
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  const currentLine = before.slice(getLineStart(before, before.length));
  const currentIndent = getIndent(currentLine);
  const trimmedLine = currentLine.trimEnd();
  const trimmedCurrentLine = currentLine.trim();
  const afterTrimmed = after.trimStart();
  const shouldIndentInsideBlock = trimmedLine.endsWith('{');

  if (shouldIndentInsideBlock && afterTrimmed.startsWith('}')) {
    const insertion = `\n${currentIndent}${INDENT}\n${currentIndent}`;
    const nextValue = before + insertion + after;
    const nextPosition = before.length + currentIndent.length + INDENT.length + 1;

    replaceSelection(textarea, nextValue, nextPosition, nextPosition, setValue);
    return;
  }

  let nextIndent = currentIndent;

  if (shouldIndentInsideBlock) {
    nextIndent += INDENT;
  } else if (trimmedCurrentLine.startsWith('}')) {
    nextIndent = removeOneIndent(nextIndent);
  }

  const insertion = `\n${nextIndent}`;
  const nextValue = before + insertion + after;
  const nextPosition = before.length + insertion.length;

  replaceSelection(textarea, nextValue, nextPosition, nextPosition, setValue);
}

export function handleJavaEditorKeyDown(
  event: KeyboardEvent<HTMLTextAreaElement>,
  value: string,
  setValue: SetValue
) {
  const textarea = event.currentTarget;

  if (event.key === 'Tab') {
    event.preventDefault();

    if (event.shiftKey) {
      unindentSelection(textarea, value, setValue);
      return;
    }

    if (textarea.selectionStart !== textarea.selectionEnd) {
      indentSelection(textarea, value, setValue);
      return;
    }

    const { selectionStart, selectionEnd } = textarea;
    const nextValue =
      value.slice(0, selectionStart) + INDENT + value.slice(selectionEnd);
    const nextPosition = selectionStart + INDENT.length;

    replaceSelection(textarea, nextValue, nextPosition, nextPosition, setValue);
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    insertNewlineWithIndent(textarea, value, setValue);
  }
}

export function formatJavaIndentation(code: string) {
  let indentLevel = 0;

  return code
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return '';
      }

      if (/^(}|\)|\])/.test(trimmed)) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const isCaseLabel = /^(case\b.*:|default\s*:)/.test(trimmed);
      const lineIndentLevel = isCaseLabel
        ? Math.max(0, indentLevel - 1)
        : indentLevel;
      const formattedLine = `${INDENT.repeat(indentLevel)}${trimmed}`;

      if (isCaseLabel) {
        return `${INDENT.repeat(lineIndentLevel)}${trimmed}`;
      }

      if (/[{[(]\s*$/.test(trimmed) && !/^\s*\/\//.test(trimmed)) {
        indentLevel += 1;
      }

      return formattedLine;
    })
    .join('\n');
}
