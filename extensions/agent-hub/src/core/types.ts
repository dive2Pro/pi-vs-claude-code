/**
 * Agent Hub - Core Types
 * 
 * 统一的会话和消息格式定义
 */

// 数据来源类型
export type SourceType = 'claude-code' | 'pi' | 'cursor' | 'other';

// 统一会话格式
export interface Session {
  id: string;              // 唯一 ID (UUID)
  source: SourceType;      // 数据来源
  project: string;         // 项目路径/名称
  title?: string;          // 会话标题（从第一条消息提取）
  startTime: number;       // 开始时间戳 (ms)
  endTime?: number;        // 结束时间戳 (ms)
  messageCount: number;    // 消息数
  tokenUsage?: TokenUsage; // Token 使用统计
  model?: string;          // 使用的模型
  tags: string[];          // 标签（自动提取）
  rawPath: string;         // 原始文件路径
}

// Token 使用统计
export interface TokenUsage {
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

// 统一消息格式
export interface Message {
  id: string;              // 消息 ID
  sessionId: string;       // 所属会话 ID
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;         // 文本内容
  timestamp: number;       // 时间戳 (ms)
  tokens?: number;         // Token 数
  toolName?: string;       // 工具名称（如果是工具调用）
  isError?: boolean;       // 是否错误
}

// 搜索选项
export interface SearchOptions {
  query?: string;          // 搜索关键词
  source?: SourceType;     // 按来源过滤
  project?: string;        // 按项目过滤
  startDate?: number;      // 开始日期
  endDate?: number;        // 结束日期
  limit?: number;          // 结果数量限制
  offset?: number;         // 偏移量（分页）
}

// 搜索结果
export interface SearchResult {
  sessions: Session[];
  messages: Message[];
  total: number;
  hasMore: boolean;
}

// 索引状态
export interface IndexStatus {
  lastIndexed: number;     // 最后索引时间
  totalSessions: number;   // 总会话数
  totalMessages: number;   // 总消息数
  sources: Record<SourceType, number>; // 各来源会话数
  version: string;         // 索引版本
}

// 适配器基类接口
export interface LogAdapter {
  name: SourceType;
  scan(): Promise<RawSession[]>;  // 扫描所有会话
  parse(path: string): Promise<RawSession | null>; // 解析单个文件
  getPaths(): string[];    // 获取所有日志文件路径
}

// 原始会话数据（适配器输出）
export interface RawSession {
  id: string;
  source: SourceType;
  project: string;
  rawPath: string;
  startTime: number;
  endTime?: number;
  messages: RawMessage[];
}

// 原始消息数据
export interface RawMessage {
  role: 'user' | 'assistant' | 'tool' | 'system';
  content: string;
  timestamp?: number;
  tokens?: number;
  toolName?: string;
  isError?: boolean;
}

// 配置
export interface AgentHubConfig {
  dbPath: string;          // SQLite 数据库路径
  sources: {
    'claude-code': {
      enabled: boolean;
      path: string;        // ~/.claude/projects/
    };
    'pi': {
      enabled: boolean;
      path: string;        // ~/.pi/agent/sessions/
    };
    'cursor': {
      enabled: boolean;
      path: string;        // ~/.cursor/ai-tracking/
    };
  };
  sync?: {
    enabled: boolean;
    remote?: string;       // Git remote URL
    interval?: number;     // 同步间隔 (ms)
  };
}

// 默认配置
export const DEFAULT_CONFIG: AgentHubConfig = {
  dbPath: '~/.agent-hub/index.db',
  sources: {
    'claude-code': {
      enabled: true,
      path: '~/.claude/projects/',
    },
    'pi': {
      enabled: true,
      path: '~/.pi/agent/sessions/',
    },
    'cursor': {
      enabled: true,
      path: '~/.cursor/ai-tracking/',
    },
  },
};
