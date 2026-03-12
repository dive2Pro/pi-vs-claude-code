/**
 * SQLite Indexer
 * 
 * 管理会话和消息的索引存储
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Session, Message, SearchOptions, SearchResult, IndexStatus, SourceType, TokenUsage } from './types';
import { ClaudeCodeAdapter } from '../adapters/claude-code';
import { PiAdapter } from '../adapters/pi';

// 简单的 SQLite 包装（不依赖 better-sqlite3，使用更轻量的方案）
// 由于 Pi 扩展环境可能没有编译好的 better-sqlite3，我们使用 JSON 文件作为后备
// 但优先尝试 SQLite

interface Database {
  sessions: Map<string, Session>;
  messages: Map<string, Message>;
  metadata: {
    lastIndexed: number;
    version: string;
  };
}

export class Indexer {
  private dbPath: string;
  private db: Database;
  private adapters: Array<{ name: SourceType; scan: () => Promise<import('./types').RawSession[]> }>;
  
  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(os.homedir(), '.agent-hub', 'index.json');
    this.db = this.loadDatabase();
    this.adapters = [
      new ClaudeCodeAdapter(),
      new PiAdapter(),
    ];
  }

  private loadDatabase(): Database {
    // 确保目录存在
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 加载现有数据库
    if (fs.existsSync(this.dbPath)) {
      try {
        const content = fs.readFileSync(this.dbPath, 'utf-8');
        const data = JSON.parse(content);
        return {
          sessions: new Map(Object.entries(data.sessions || {})),
          messages: new Map(Object.entries(data.messages || {})),
          metadata: data.metadata || { lastIndexed: 0, version: '1.0' },
        };
      } catch {
        // 加载失败，创建新数据库
      }
    }

    return {
      sessions: new Map(),
      messages: new Map(),
      metadata: { lastIndexed: 0, version: '1.0' },
    };
  }

  private saveDatabase(): void {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = {
      sessions: Object.fromEntries(this.db.sessions),
      messages: Object.fromEntries(this.db.messages),
      metadata: this.db.metadata,
    };

    fs.writeFileSync(this.dbPath, JSON.stringify(data, null, 2));
  }

  /**
   * 重建索引
   */
  async reindex(): Promise<{ added: number; updated: number; total: number }> {
    let added = 0;
    let updated = 0;

    for (const adapter of this.adapters) {
      console.log(`Scanning ${adapter.name}...`);
      const rawSessions = await adapter.scan();
      console.log(`Found ${rawSessions.length} sessions from ${adapter.name}`);

      for (const raw of rawSessions) {
        const existing = this.db.sessions.get(raw.id);
        
        // 构建会话对象
        const session: Session = {
          id: raw.id,
          source: raw.source,
          project: raw.project,
          title: this.extractTitle(raw.messages),
          startTime: raw.startTime,
          endTime: raw.endTime,
          messageCount: raw.messages.length,
          tags: this.extractTags(raw.messages),
          rawPath: raw.rawPath,
        };

        // 计算 token 使用
        const tokenUsage = this.calculateTokenUsage(raw.messages);
        if (tokenUsage) {
          session.tokenUsage = tokenUsage;
        }

        // 存储会话
        if (existing) {
          updated++;
        } else {
          added++;
        }
        this.db.sessions.set(raw.id, session);

        // 存储消息
        for (let i = 0; i < raw.messages.length; i++) {
          const msg = raw.messages[i];
          const msgId = `${raw.id}-${i}`;
          const message: Message = {
            id: msgId,
            sessionId: raw.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || raw.startTime,
            tokens: msg.tokens,
            toolName: msg.toolName,
            isError: msg.isError,
          };
          this.db.messages.set(msgId, message);
        }
      }
    }

    // 更新元数据
    this.db.metadata.lastIndexed = Date.now();
    this.saveDatabase();

    return {
      added,
      updated,
      total: this.db.sessions.size,
    };
  }

  /**
   * 搜索会话和消息
   */
  search(options: SearchOptions): SearchResult {
    let sessions = Array.from(this.db.sessions.values());
    let messages = Array.from(this.db.messages.values());

    // 按来源过滤
    if (options.source) {
      sessions = sessions.filter(s => s.source === options.source);
      const sessionIds = new Set(sessions.map(s => s.id));
      messages = messages.filter(m => sessionIds.has(m.sessionId));
    }

    // 按项目过滤
    if (options.project) {
      const projectLower = options.project.toLowerCase();
      sessions = sessions.filter(s => 
        s.project.toLowerCase().includes(projectLower)
      );
      const sessionIds = new Set(sessions.map(s => s.id));
      messages = messages.filter(m => sessionIds.has(m.sessionId));
    }

    // 按日期过滤
    if (options.startDate) {
      sessions = sessions.filter(s => s.startTime >= options.startDate!);
      const sessionIds = new Set(sessions.map(s => s.id));
      messages = messages.filter(m => sessionIds.has(m.sessionId));
    }
    if (options.endDate) {
      sessions = sessions.filter(s => s.startTime <= options.endDate!);
      const sessionIds = new Set(sessions.map(s => s.id));
      messages = messages.filter(m => sessionIds.has(m.sessionId));
    }

    // 全文搜索
    if (options.query) {
      const queryLower = options.query.toLowerCase();
      const matchingSessionIds = new Set<string>();

      // 在消息中搜索
      for (const msg of messages) {
        if (msg.content.toLowerCase().includes(queryLower)) {
          matchingSessionIds.add(msg.sessionId);
        }
      }

      // 在会话标题中搜索
      for (const session of sessions) {
        if (session.title?.toLowerCase().includes(queryLower)) {
          matchingSessionIds.add(session.id);
        }
      }

      sessions = sessions.filter(s => matchingSessionIds.has(s.id));
      messages = messages.filter(m => matchingSessionIds.has(m.sessionId));
    }

    // 按时间排序（最新的在前）
    sessions.sort((a, b) => b.startTime - a.startTime);
    messages.sort((a, b) => b.timestamp - a.timestamp);

    // 分页
    const total = sessions.length;
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    const hasMore = offset + limit < total;

    sessions = sessions.slice(offset, offset + limit);

    return {
      sessions,
      messages: messages.slice(0, limit * 5), // 每个会话最多 5 条消息
      total,
      hasMore,
    };
  }

  /**
   * 获取单个会话
   */
  getSession(sessionId: string): Session | undefined {
    return this.db.sessions.get(sessionId);
  }

  /**
   * 获取会话的所有消息
   */
  getSessionMessages(sessionId: string): Message[] {
    return Array.from(this.db.messages.values())
      .filter(m => m.sessionId === sessionId)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取索引状态
   */
  getStatus(): IndexStatus {
    const sources: Record<SourceType, number> = {
      'claude-code': 0,
      'pi': 0,
      'cursor': 0,
      'other': 0,
    };

    for (const session of this.db.sessions.values()) {
      sources[session.source]++;
    }

    return {
      lastIndexed: this.db.metadata.lastIndexed,
      totalSessions: this.db.sessions.size,
      totalMessages: this.db.messages.size,
      sources,
      version: this.db.metadata.version,
    };
  }

  /**
   * 获取所有项目列表
   */
  getProjects(): string[] {
    const projects = new Set<string>();
    for (const session of this.db.sessions.values()) {
      projects.add(session.project);
    }
    return Array.from(projects).sort();
  }

  /**
   * 获取指定日期的统计
   */
  getDailyStats(date: Date): { sessions: number; messages: number; tokens: number } {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let sessions = 0;
    let messages = 0;
    let tokens = 0;

    for (const session of this.db.sessions.values()) {
      if (session.startTime >= startOfDay.getTime() && session.startTime <= endOfDay.getTime()) {
        sessions++;
        messages += session.messageCount;
        if (session.tokenUsage) {
          tokens += session.tokenUsage.input + session.tokenUsage.output;
        }
      }
    }

    return { sessions, messages, tokens };
  }

  // 辅助方法

  private extractTitle(messages: Array<{ role: string; content: string }>): string | undefined {
    // 从第一条用户消息提取标题（取前 80 个字符）
    for (const msg of messages) {
      if (msg.role === 'user' && msg.content) {
        const title = msg.content
          .replace(/<[^>]+>/g, '') // 移除 XML 标签
          .replace(/\n/g, ' ')
          .trim()
          .slice(0, 80);
        return title.length < msg.content.replace(/<[^>]+>/g, '').trim().length 
          ? title + '...'
          : title;
      }
    }
    return undefined;
  }

  private extractTags(messages: Array<{ role: string; content: string }>): string[] {
    const tags = new Set<string>();
    
    // 从内容中提取关键词作为标签
    for (const msg of messages) {
      const content = msg.content.toLowerCase();
      
      // 检测常见主题
      if (content.includes('bug') || content.includes('fix')) tags.add('bugfix');
      if (content.includes('feature') || content.includes('implement')) tags.add('feature');
      if (content.includes('refactor')) tags.add('refactor');
      if (content.includes('test')) tags.add('testing');
      if (content.includes('deploy') || content.includes('release')) tags.add('deployment');
      if (content.includes('review')) tags.add('review');
      if (content.includes('debug')) tags.add('debugging');
      if (content.includes('document')) tags.add('documentation');
    }

    return Array.from(tags);
  }

  private calculateTokenUsage(messages: Array<{ tokens?: number }>): TokenUsage | undefined {
    let total = 0;
    for (const msg of messages) {
      if (msg.tokens) {
        total += msg.tokens;
      }
    }
    return total > 0 ? { input: 0, output: total } : undefined;
  }
}
