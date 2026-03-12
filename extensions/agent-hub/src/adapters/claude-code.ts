/**
 * Claude Code Log Adapter
 * 
 * 解析 ~/.claude/projects/ 下的 JSONL 会话文件
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { LogAdapter, RawSession, RawMessage, SourceType } from '../core/types';

// Claude Code 原始消息格式
interface ClaudeCodeEntry {
  uuid: string;
  parentUuid?: string | null;
  timestamp: string;
  type: string;
  message?: {
    role: string;
    content: string | Array<{ type: string; text?: string; name?: string; input?: unknown }>;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
  sessionId?: string;
  cwd?: string;
  version?: string;
  gitBranch?: string;
  isMeta?: boolean;
}

export class ClaudeCodeAdapter implements LogAdapter {
  name: SourceType = 'claude-code';
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || path.join(os.homedir(), '.claude', 'projects');
  }

  getPaths(): string[] {
    const paths: string[] = [];
    
    if (!fs.existsSync(this.basePath)) {
      return paths;
    }

    // 遍历项目目录
    const projects = fs.readdirSync(this.basePath);
    for (const project of projects) {
      const projectPath = path.join(this.basePath, project);
      if (!fs.statSync(projectPath).isDirectory()) continue;

      // 查找 JSONL 文件
      const files = fs.readdirSync(projectPath);
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          paths.push(path.join(projectPath, file));
        }
        
        // 也检查子目录（subagents）
        const subPath = path.join(projectPath, file);
        if (fs.statSync(subPath).isDirectory()) {
          const subFiles = fs.readdirSync(subPath);
          for (const subFile of subFiles) {
            if (subFile.endsWith('.jsonl')) {
              paths.push(path.join(subPath, subFile));
            }
          }
        }
      }
    }

    return paths;
  }

  async scan(): Promise<RawSession[]> {
    const paths = this.getPaths();
    const sessions: RawSession[] = [];

    for (const filePath of paths) {
      const session = await this.parse(filePath);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }

  async parse(filePath: string): Promise<RawSession | null> {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    if (lines.length === 0) {
      return null;
    }

    // 解析所有条目
    const entries: ClaudeCodeEntry[] = [];
    let sessionId: string | undefined;
    let cwd: string | undefined;
    const timestamps: number[] = [];
    const messages: RawMessage[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as ClaudeCodeEntry;
        entries.push(entry);

        // 提取会话信息
        if (entry.sessionId && !sessionId) {
          sessionId = entry.sessionId;
        }
        if (entry.cwd && !cwd) {
          cwd = entry.cwd;
        }

        // 提取时间戳
        if (entry.timestamp) {
          timestamps.push(new Date(entry.timestamp).getTime());
        }

        // 提取消息
        if (entry.message && !entry.isMeta) {
          const msg = this.extractMessage(entry);
          if (msg) {
            messages.push(msg);
          }
        }
      } catch {
        // 跳过解析失败的行
      }
    }

    if (!sessionId || messages.length === 0) {
      return null;
    }

    // 计算时间范围
    const validTimestamps = messages
      .map(m => m.timestamp)
      .filter((t): t is number => t !== undefined);
    
    const startTime = validTimestamps.length > 0 
      ? Math.min(...validTimestamps)
      : timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
    
    const endTime = validTimestamps.length > 0
      ? Math.max(...validTimestamps)
      : timestamps.length > 1 ? Math.max(...timestamps) : undefined;

    return {
      id: sessionId,
      source: 'claude-code',
      project: cwd || path.basename(path.dirname(filePath)),
      rawPath: filePath,
      startTime,
      endTime,
      messages,
    };
  }

  private extractMessage(entry: ClaudeCodeEntry): RawMessage | null {
    if (!entry.message) return null;

    const role = entry.message.role as RawMessage['role'];
    if (!['user', 'assistant', 'system', 'tool'].includes(role)) {
      return null;
    }

    // 提取文本内容
    let content = '';
    let toolName: string | undefined;
    let isError = false;
    let tokens: number | undefined;

    if (typeof entry.message.content === 'string') {
      content = entry.message.content;
    } else if (Array.isArray(entry.message.content)) {
      for (const part of entry.message.content) {
        if (part.type === 'text' && part.text) {
          content += part.text + '\n';
        } else if (part.type === 'tool_use') {
          toolName = part.name;
          content = `[Tool: ${part.name}]\n${JSON.stringify(part.input, null, 2)}`;
        } else if (part.type === 'tool_result') {
          // tool_result 在 Claude Code 中是用户消息的一部分
          if (typeof part === 'object' && 'content' in part) {
            content = String((part as { content: string }).content);
          }
        }
      }
    }

    // 检查错误
    if (content.includes('is_error":true') || content.includes('The user doesn\'t want to proceed')) {
      isError = true;
    }

    // 提取 token 使用
    if (entry.message.usage) {
      tokens = entry.message.usage.input_tokens + entry.message.usage.output_tokens;
    }

    return {
      role,
      content: content.trim(),
      timestamp: entry.timestamp ? new Date(entry.timestamp).getTime() : undefined,
      tokens,
      toolName,
      isError,
    };
  }
}
