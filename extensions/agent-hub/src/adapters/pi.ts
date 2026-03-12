/**
 * Pi Log Adapter
 * 
 * 解析 ~/.pi/agent/sessions/ 下的 JSONL 会话文件
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { LogAdapter, RawSession, RawMessage, SourceType } from '../core/types';

// Pi 会话条目格式
interface PiEntry {
  id: string;
  parentId?: string | null;
  timestamp: number;
  type: string;
  message?: {
    role: string;
    content: string | Array<{ type: string; text?: string; name?: string; input?: unknown }>;
  };
  toolCall?: {
    name: string;
    input: unknown;
  };
  toolResult?: {
    content: string;
    isError?: boolean;
  };
  customType?: string;
  data?: unknown;
}

export class PiAdapter implements LogAdapter {
  name: SourceType = 'pi';
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || path.join(os.homedir(), '.pi', 'agent', 'sessions');
  }

  getPaths(): string[] {
    const paths: string[] = [];
    
    if (!fs.existsSync(this.basePath)) {
      return paths;
    }

    // 遍历会话目录
    const dirs = fs.readdirSync(this.basePath);
    for (const dir of dirs) {
      const dirPath = path.join(this.basePath, dir);
      if (!fs.statSync(dirPath).isDirectory()) continue;

      // 查找 JSONL 文件
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file.endsWith('.jsonl')) {
          paths.push(path.join(dirPath, file));
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

    // 从目录名提取项目信息
    const sessionDir = path.basename(path.dirname(filePath));
    const projectMatch = sessionDir.match(/^--(.+)--$/);
    const project = projectMatch ? projectMatch[1].replace(/--/g, '/') : sessionDir;

    // 解析所有条目
    const entries: PiEntry[] = [];
    let sessionId: string | undefined;
    const timestamps: number[] = [];
    const messages: RawMessage[] = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as PiEntry;
        entries.push(entry);

        // 第一个条目的 ID 作为会话 ID
        if (!sessionId) {
          sessionId = entry.id || path.basename(filePath, '.jsonl');
        }

        // 提取时间戳
        if (entry.timestamp) {
          timestamps.push(entry.timestamp);
        }

        // 提取消息
        const msg = this.extractMessage(entry);
        if (msg) {
          messages.push(msg);
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
      source: 'pi',
      project,
      rawPath: filePath,
      startTime,
      endTime,
      messages,
    };
  }

  private extractMessage(entry: PiEntry): RawMessage | null {
    // 跳过自定义条目（扩展状态等）
    if (entry.type === 'custom') {
      return null;
    }

    // 处理消息类型
    if (entry.message) {
      const role = entry.message.role as RawMessage['role'];
      if (!['user', 'assistant', 'system', 'tool'].includes(role)) {
        return null;
      }

      let content = '';
      if (typeof entry.message.content === 'string') {
        content = entry.message.content;
      } else if (Array.isArray(entry.message.content)) {
        for (const part of entry.message.content) {
          if (part.type === 'text' && part.text) {
            content += part.text + '\n';
          }
        }
      }

      return {
        role,
        content: content.trim(),
        timestamp: entry.timestamp,
      };
    }

    // 处理工具调用
    if (entry.toolCall) {
      return {
        role: 'tool',
        content: `[Tool Call: ${entry.toolCall.name}]\n${JSON.stringify(entry.toolCall.input, null, 2)}`,
        timestamp: entry.timestamp,
        toolName: entry.toolCall.name,
      };
    }

    // 处理工具结果
    if (entry.toolResult) {
      return {
        role: 'tool',
        content: entry.toolResult.content,
        timestamp: entry.timestamp,
        isError: entry.toolResult.isError,
      };
    }

    return null;
  }
}
