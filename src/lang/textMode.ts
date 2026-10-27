import type { Program, Statement } from './ast';
import { MAX_LOOP_ITERATIONS, MAX_NESTING_DEPTH } from './limits';

export class TextSyntaxError extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(`${line}번째 줄: ${message}`);
    this.name = 'TextSyntaxError';
    this.line = line;
  }
}

type TokenType = 'word' | 'number' | 'brace' | 'newline' | 'eof';

interface Token {
  type: TokenType;
  value: string;
  line: number;
}

const KEYWORDS = {
  move: ['move', '앞으로'],
  left: ['left', '왼쪽'],
  right: ['right', '오른쪽'],
  repeat: ['repeat', '반복'],
  if: ['if', '만약'],
  wall: ['wall', '벽'],
  goal: ['goal', '목표'],
  else: ['else', '아니면']
} as const;

function isKeyword(token: Token, key: keyof typeof KEYWORDS): boolean {
  return (KEYWORDS[key] as readonly string[]).includes(token.value.toLowerCase());
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;

  while (index < source.length) {
    const char = source[index] as string;

    if (char === '\n') {
      tokens.push({ type: 'newline', value: '\n', line });
      line += 1;
      index += 1;
      continue;
    }

    if (char === '\r' || char === ' ' || char === '\t') {
      index += 1;
      continue;
    }

    if (char === '#') {
      while (index < source.length && source[index] !== '\n') index += 1;
      continue;
    }

    if (char === '{' || char === '}') {
      tokens.push({ type: 'brace', value: char, line });
      index += 1;
      continue;
    }

    if (/\d/.test(char)) {
      let number = '';
      while (index < source.length && /\d/.test(source[index] as string)) {
        number += source[index];
        index += 1;
      }
      tokens.push({ type: 'number', value: number, line });
      continue;
    }

    if (/[\p{L}_]/u.test(char)) {
      let word = '';
      while (index < source.length && /[\p{L}\p{N}_]/u.test(source[index] as string)) {
        word += source[index];
        index += 1;
      }
      tokens.push({ type: 'word', value: word, line });
      continue;
    }

    throw new TextSyntaxError(`알 수 없는 글자 '${char}'가 있어요.`, line);
  }

  tokens.push({ type: 'eof', value: '', line });
  return tokens;
}

class Parser {
  private readonly tokens: Token[];
  private cursor = 0;
  private statementIndex = 0;

  constructor(source: string) {
    this.tokens = tokenize(source);
  }

  parse(): Program {
    const program = this.parseProgram(1);
    this.skipNewlines();
    const token = this.peek();
    if (token.type !== 'eof') {
      throw new TextSyntaxError(`예상하지 못한 '${token.value}'가 있어요.`, token.line);
    }
    return program;
  }

  private parseProgram(depth: number): Program {
    if (depth > MAX_NESTING_DEPTH) {
      throw new TextSyntaxError(
        `블록이 너무 깊게 겹쳐 있어요. ${MAX_NESTING_DEPTH}단계까지만 쓸 수 있어요.`,
        this.peek().line
      );
    }

    const program: Program = [];
    while (true) {
      this.skipNewlines();
      const token = this.peek();
      if (token.type === 'eof' || (token.type === 'brace' && token.value === '}')) break;

      if (token.type !== 'word') {
        throw new TextSyntaxError(`'${token.value}' 대신 동작이 필요해요.`, token.line);
      }

      program.push(this.parseStatement(depth));
    }
    return program;
  }

  private parseStatement(depth: number): Statement {
    const token = this.next();
    const id = `text-${token.line}-${(this.statementIndex += 1)}`;

    if (isKeyword(token, 'move')) return { type: 'move', id };
    if (isKeyword(token, 'left')) return { type: 'turn', dir: 'left', id };
    if (isKeyword(token, 'right')) return { type: 'turn', dir: 'right', id };

    if (isKeyword(token, 'repeat')) {
      const count = this.expectNumber();
      if (count > MAX_LOOP_ITERATIONS) {
        throw new TextSyntaxError(
          `반복은 한 번에 ${MAX_LOOP_ITERATIONS}번까지 가능해요.`,
          token.line
        );
      }
      this.expectBrace('{');
      const body = this.parseProgram(depth + 1);
      this.expectBrace('}');
      return { type: 'repeat', times: count, body, id };
    }

    if (isKeyword(token, 'if')) {
      const condition = this.next();
      if (condition.type !== 'word') {
        throw new TextSyntaxError("'if' 뒤에 wall 또는 goal이 필요해요.", condition.line);
      }
      let type: 'ifWall' | 'ifGoal';
      if (isKeyword(condition, 'wall')) type = 'ifWall';
      else if (isKeyword(condition, 'goal')) type = 'ifGoal';
      else {
        throw new TextSyntaxError(
          `'${condition.value}' 대신 wall 또는 goal을 써 주세요.`,
          condition.line
        );
      }

      this.expectBrace('{');
      const thenBranch = this.parseProgram(depth + 1);
      this.expectBrace('}');

      let elseBranch: Program | undefined;
      this.skipNewlines();
      const maybeElse = this.peek();
      if (maybeElse.type === 'word' && isKeyword(maybeElse, 'else')) {
        this.next();
        this.expectBrace('{');
        elseBranch = this.parseProgram(depth + 1);
        this.expectBrace('}');
      }

      return { type, then: thenBranch, else: elseBranch, id };
    }

    if (isKeyword(token, 'else')) {
      throw new TextSyntaxError("'else'는 if 블록 뒤에만 쓸 수 있어요.", token.line);
    }

    throw new TextSyntaxError(`'${token.value}'는 알 수 없는 동작이에요.`, token.line);
  }

  private expectNumber(): number {
    const token = this.next();
    if (token.type !== 'number') {
      throw new TextSyntaxError('반복 횟수로 숫자가 필요해요.', token.line);
    }
    return Number.parseInt(token.value, 10);
  }

  private expectBrace(value: '{' | '}'): void {
    this.skipNewlines();
    const token = this.next();
    if (token.type !== 'brace' || token.value !== value) {
      throw new TextSyntaxError(`'${value}'가 필요해요.`, token.line);
    }
  }

  private skipNewlines(): void {
    while (this.peek().type === 'newline') this.cursor += 1;
  }

  private peek(): Token {
    return this.tokens[this.cursor] as Token;
  }

  private next(): Token {
    const token = this.peek();
    if (token.type !== 'eof') this.cursor += 1;
    return token;
  }
}

export function parseTextProgram(source: string): Program {
  return new Parser(source).parse();
}

export function formatProgram(program: Program, indent = 0): string {
  const pad = '  '.repeat(indent);
  return program
    .map((statement) => {
      switch (statement.type) {
        case 'move':
          return `${pad}move`;
        case 'turn':
          return `${pad}${statement.dir === 'left' ? 'left' : 'right'}`;
        case 'repeat': {
          const body = formatProgram(statement.body, indent + 1);
          return `${pad}repeat ${statement.times} {\n${body}\n${pad}}`;
        }
        case 'ifWall':
        case 'ifGoal': {
          const keyword = statement.type === 'ifWall' ? 'wall' : 'goal';
          const thenBody = formatProgram(statement.then, indent + 1);
          const elseBody = statement.else
            ? ` else {\n${formatProgram(statement.else, indent + 1)}\n${pad}}`
            : '';
          return `${pad}if ${keyword} {\n${thenBody}\n${pad}}${elseBody}`;
        }
      }
    })
    .join('\n');
}
