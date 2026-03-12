/**
 * Agent Hub TUI Dashboard
 * 
 * 交互式终端界面
 */

import {
  Container,
  Text,
  Box,
  Spacer,
  Markdown,
  SelectList,
  type SelectItem,
  matchesKey,
  Key,
  truncateToWidth,
  visibleWidth,
} from '@mariozechner/pi-tui';
import type { Session, Message, SearchOptions, IndexStatus, SourceType } from '../core/types';
import { Indexer } from '../core/indexer';

// 日期格式化
function formatDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();
  
  if (isToday) {
    return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  if (isYesterday) {
    return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// 截断文本
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

// 视图模式
type ViewMode = 'list' | 'detail' | 'search' | 'stats';

// 搜索输入组件
class SearchInput {
  private text = '';
  private cursorPos = 0;
  focused = true;

  getText(): string {
    return this.text;
  }

  setText(text: string): void {
    this.text = text;
    this.cursorPos = text.length;
  }

  clear(): void {
    this.text = '';
    this.cursorPos = 0;
  }

  handleInput(data: string): boolean {
    if (matchesKey(data, Key.backspace) || matchesKey(data, Key.delete)) {
      if (this.cursorPos > 0) {
        this.text = this.text.slice(0, this.cursorPos - 1) + this.text.slice(this.cursorPos);
        this.cursorPos--;
      }
      return true;
    }
    if (matchesKey(data, Key.left)) {
      if (this.cursorPos > 0) this.cursorPos--;
      return true;
    }
    if (matchesKey(data, Key.right)) {
      if (this.cursorPos < this.text.length) this.cursorPos++;
      return true;
    }
    if (matchesKey(data, Key.enter)) {
      return false; // 让父组件处理
    }
    // 普通字符输入
    if (data.length === 1 && data.charCodeAt(0) >= 32) {
      this.text = this.text.slice(0, this.cursorPos) + data + this.text.slice(this.cursorPos);
      this.cursorPos++;
      return true;
    }
    return false;
  }

  render(width: number): string[] {
    const prompt = '> ';
    const availableWidth = width - prompt.length - 1;
    const displayText = truncateToWidth(this.text, availableWidth, '');
    const cursor = this.focused ? '\x1b[7m \x1b[27m' : '';
    return [prompt + displayText + cursor];
  }
}

// 主 Dashboard 组件
export class Dashboard {
  private indexer: Indexer;
  private mode: ViewMode = 'list';
  private sessions: Session[] = [];
  private selectedSession: Session | null = null;
  private messages: Message[] = [];
  private status: IndexStatus | null = null;
  private searchInput: SearchInput;
  private error: string | null = null;
  private loading = true;
  private filter: {
    source?: SourceType;
    project?: string;
    days?: number;
  } = {};

  // SelectList 状态
  private selectedIndex = 0;
  private scrollOffset = 0;
  private listHeight = 10;

  // 消息详情滚动
  private messageScrollOffset = 0;

  // 回调
  public onClose?: () => void;
  public requestRender?: () => void;

  constructor(indexer: Indexer) {
    this.indexer = indexer;
    this.searchInput = new SearchInput();
    this.loadSessions();
  }

  private async loadSessions(): Promise<void> {
    try {
      this.loading = true;
      this.status = this.indexer.getStatus();
      
      const options: SearchOptions = {
        limit: 100,
        ...this.filter,
      };

      // 按天过滤
      if (this.filter.days) {
        const now = Date.now();
        options.startDate = now - this.filter.days * 86400000;
      }

      const result = this.indexer.search(options);
      this.sessions = result.sessions;
      this.loading = false;
      this.error = null;
    } catch (err) {
      this.loading = false;
      this.error = err instanceof Error ? err.message : '加载失败';
    }
    this.requestRender?.();
  }

  handleInput(data: string): void {
    // 搜索模式
    if (this.mode === 'search') {
      if (matchesKey(data, Key.escape)) {
        this.mode = 'list';
        this.searchInput.clear();
        this.loadSessions();
        return;
      }
      if (matchesKey(data, Key.enter)) {
        this.performSearch();
        return;
      }
      if (this.searchInput.handleInput(data)) {
        this.requestRender?.();
      }
      return;
    }

    // 详情模式
    if (this.mode === 'detail') {
      if (matchesKey(data, Key.escape) || matchesKey(data, 'q')) {
        this.mode = 'list';
        this.selectedSession = null;
        this.messages = [];
        this.messageScrollOffset = 0;
        this.requestRender?.();
        return;
      }
      // 滚动消息
      if (matchesKey(data, Key.up) || matchesKey(data, 'k')) {
        if (this.messageScrollOffset > 0) {
          this.messageScrollOffset--;
          this.requestRender?.();
        }
        return;
      }
      if (matchesKey(data, Key.down) || matchesKey(data, 'j')) {
        this.messageScrollOffset++;
        this.requestRender?.();
        return;
      }
      return;
    }

    // 统计模式
    if (this.mode === 'stats') {
      if (matchesKey(data, Key.escape) || matchesKey(data, 'q')) {
        this.mode = 'list';
        this.requestRender?.();
        return;
      }
      return;
    }

    // 列表模式
    if (this.mode === 'list') {
      // 退出
      if (matchesKey(data, Key.escape) || matchesKey(data, 'q')) {
        this.onClose?.();
        return;
      }

      // 搜索
      if (matchesKey(data, '/') || matchesKey(data, 's')) {
        this.mode = 'search';
        this.searchInput.focused = true;
        this.requestRender?.();
        return;
      }

      // 统计
      if (matchesKey(data, 'S')) {
        this.mode = 'stats';
        this.requestRender?.();
        return;
      }

      // 刷新
      if (matchesKey(data, 'r')) {
        this.indexer.reindex().then(() => this.loadSessions());
        this.requestRender?.();
        return;
      }

      // 过滤来源
      if (matchesKey(data, '1')) {
        this.filter.source = undefined;
        this.loadSessions();
        return;
      }
      if (matchesKey(data, '2')) {
        this.filter.source = 'claude-code';
        this.loadSessions();
        return;
      }
      if (matchesKey(data, '3')) {
        this.filter.source = 'pi';
        this.loadSessions();
        return;
      }

      // 时间过滤
      if (matchesKey(data, 't')) {
        this.filter.days = this.filter.days === 1 ? 7 : this.filter.days === 7 ? 30 : 1;
        this.loadSessions();
        return;
      }

      // 导航
      if (matchesKey(data, Key.up) || matchesKey(data, 'k')) {
        if (this.selectedIndex > 0) {
          this.selectedIndex--;
          if (this.selectedIndex < this.scrollOffset) {
            this.scrollOffset = this.selectedIndex;
          }
          this.requestRender?.();
        }
        return;
      }

      if (matchesKey(data, Key.down) || matchesKey(data, 'j')) {
        if (this.selectedIndex < this.sessions.length - 1) {
          this.selectedIndex++;
          if (this.selectedIndex >= this.scrollOffset + this.listHeight) {
            this.scrollOffset = this.selectedIndex - this.listHeight + 1;
          }
          this.requestRender?.();
        }
        return;
      }

      // 选择
      if (matchesKey(data, Key.enter)) {
        if (this.sessions[this.selectedIndex]) {
          this.selectedSession = this.sessions[this.selectedIndex];
          this.messages = this.indexer.getSessionMessages(this.selectedSession.id);
          this.mode = 'detail';
          this.messageScrollOffset = 0;
          this.requestRender?.();
        }
        return;
      }
    }
  }

  private performSearch(): void {
    const query = this.searchInput.getText().trim();
    if (!query) {
      this.mode = 'list';
      this.loadSessions();
      return;
    }

    const result = this.indexer.search({
      query,
      limit: 100,
      ...this.filter,
    });
    this.sessions = result.sessions;
    this.selectedIndex = 0;
    this.scrollOffset = 0;
    this.mode = 'list';
    this.requestRender?.();
  }

  render(width: number): string[] {
    const lines: string[] = [];

    // 标题栏
    const title = this.mode === 'search' 
      ? '🔍 搜索'
      : this.mode === 'detail'
      ? '📄 会话详情'
      : this.mode === 'stats'
      ? '📊 统计'
      : '🤖 Agent Hub';
    lines.push(`\x1b[1;36m${title}\x1b[0m${' '.repeat(Math.max(0, width - visibleWidth(title) - 1))}`);
    lines.push('─'.repeat(width));

    if (this.loading) {
      lines.push('加载中...');
      return lines;
    }

    if (this.error) {
      lines.push(`\x1b[31m错误: ${this.error}\x1b[0m`);
      return lines;
    }

    // 根据模式渲染
    if (this.mode === 'search') {
      return this.renderSearch(width, lines);
    }
    if (this.mode === 'detail') {
      return this.renderDetail(width, lines);
    }
    if (this.mode === 'stats') {
      return this.renderStats(width, lines);
    }
    return this.renderList(width, lines);
  }

  private renderSearch(width: number, lines: string[]): string[] {
    lines.push('');
    lines.push(...this.searchInput.render(width));
    lines.push('');
    lines.push('\x1b[90m输入关键词后按 Enter 搜索，Esc 取消\x1b[0m');
    return lines;
  }

  private renderList(width: number, lines: string[]): string[] {
    // 状态栏
    if (this.status) {
      const statusParts = [
        `${this.status.totalSessions} 会话`,
        `${this.status.totalMessages} 消息`,
      ];
      if (this.filter.source) {
        statusParts.push(`[${this.filter.source}]`);
      }
      if (this.filter.days) {
        statusParts.push(`[最近 ${this.filter.days} 天]`);
      }
      lines.push(`\x1b[90m${statusParts.join(' • ')}\x1b[0m`);
      lines.push('');
    }

    // 会话列表
    if (this.sessions.length === 0) {
      lines.push('\x1b[90m没有找到会话\x1b[0m');
      lines.push('');
      lines.push('按 r 刷新索引');
    } else {
      const visibleSessions = this.sessions.slice(
        this.scrollOffset,
        this.scrollOffset + this.listHeight
      );

      for (let i = 0; i < visibleSessions.length; i++) {
        const session = visibleSessions[i];
        const isSelected = this.scrollOffset + i === this.selectedIndex;
        const prefix = isSelected ? '\x1b[1;32m▶\x1b[0m ' : '  ';
        
        // 来源图标
        const sourceIcon = session.source === 'claude-code' ? '🔶' 
          : session.source === 'pi' ? '🟣' 
          : '⚪';
        
        // 时间和标题
        const timeStr = formatDate(session.startTime);
        const title = truncate(session.title || '(无标题)', width - 25);
        
        const line = `${prefix}${sourceIcon} ${timeStr} ${title}`;
        lines.push(truncateToWidth(line, width, ''));

        // 选中行高亮
        if (isSelected) {
          lines[lines.length - 1] = `\x1b[7m${lines[lines.length - 1]}\x1b[27m`;
        }
      }

      // 更多指示
      if (this.sessions.length > this.scrollOffset + this.listHeight) {
        lines.push(`\x1b[90m... 还有 ${this.sessions.length - this.scrollOffset - this.listHeight} 个会话\x1b[0m`);
      }
    }

    // 帮助
    lines.push('');
    lines.push('─'.repeat(width));
    lines.push('\x1b[90m↑↓/jk 导航 • Enter 查看 • / 搜索 • 1/2/3 过滤来源 • t 时间 • S 统计 • r 刷新 • q 退出\x1b[0m');

    return lines;
  }

  private renderDetail(width: number, lines: string[]): string[] {
    if (!this.selectedSession) {
      lines.push('未选择会话');
      return lines;
    }

    // 会话信息
    const s = this.selectedSession;
    lines.push(`\x1b[1m${s.title || '(无标题)'}\x1b[0m`);
    lines.push(`\x1b[90m来源: ${s.source} • 项目: ${s.project}\x1b[0m`);
    lines.push(`\x1b[90m时间: ${formatDate(s.startTime)} • ${s.messageCount} 条消息\x1b[0m`);
    if (s.tokenUsage) {
      lines.push(`\x1b[90mToken: ${s.tokenUsage.input + s.tokenUsage.output}\x1b[0m`);
    }
    lines.push('─'.repeat(width));

    // 消息列表
    const visibleMessages = this.messages.slice(
      this.messageScrollOffset,
      this.messageScrollOffset + 15
    );

    for (const msg of visibleMessages) {
      const roleIcon = msg.role === 'user' ? '👤' 
        : msg.role === 'assistant' ? '🤖' 
        : msg.role === 'tool' ? '🔧' 
        : '📝';
      
      const roleColor = msg.role === 'user' ? '\x1b[36m' 
        : msg.role === 'assistant' ? '\x1b[35m' 
        : '\x1b[33m';

      // 截断内容
      const content = msg.content
        .split('\n')
        .slice(0, 5)
        .join('\n')
        .slice(0, 200);
      
      lines.push(`${roleIcon} ${roleColor}${msg.role}\x1b[0m`);
      
      // 内容行
      const contentLines = content.split('\n');
      for (const line of contentLines.slice(0, 3)) {
        lines.push(`  ${truncateToWidth(line, width - 4, '...')}`);
      }
      if (contentLines.length > 3 || msg.content.length > 200) {
        lines.push('  \x1b[90m...\x1b[0m');
      }
      lines.push('');
    }

    // 滚动指示
    if (this.messages.length > this.messageScrollOffset + 15) {
      lines.push(`\x1b[90m... 还有 ${this.messages.length - this.messageScrollOffset - 15} 条消息\x1b[0m`);
    }

    lines.push('─'.repeat(width));
    lines.push('\x1b[90m↑↓/jk 滚动 • Esc/q 返回\x1b[0m');

    return lines;
  }

  private renderStats(width: number, lines: string[]): string[] {
    if (!this.status) {
      lines.push('无统计数据');
      return lines;
    }

    const s = this.status;
    
    lines.push('\x1b[1m📊 总体统计\x1b[0m');
    lines.push('');
    lines.push(`总会话数: ${s.totalSessions}`);
    lines.push(`总消息数: ${s.totalMessages}`);
    lines.push('');
    
    lines.push('\x1b[1m📁 按来源分布\x1b[0m');
    lines.push(`  Claude Code: ${s.sources['claude-code']} 会话`);
    lines.push(`  Pi:          ${s.sources['pi']} 会话`);
    lines.push(`  Cursor:      ${s.sources['cursor']} 会话`);
    lines.push('');

    // 今日统计
    const today = this.indexer.getDailyStats(new Date());
    lines.push('\x1b[1m📅 今日\x1b[0m');
    lines.push(`  会话: ${today.sessions}`);
    lines.push(`  消息: ${today.messages}`);
    lines.push(`  Token: ${today.tokens}`);
    lines.push('');

    // 项目列表
    const projects = this.indexer.getProjects().slice(0, 10);
    lines.push('\x1b[1m🗂️ 项目 (前 10)\x1b[0m');
    for (const p of projects) {
      lines.push(`  • ${truncate(p, width - 6)}`);
    }
    if (this.indexer.getProjects().length > 10) {
      lines.push(`  ... 还有 ${this.indexer.getProjects().length - 10} 个项目`);
    }

    lines.push('');
    lines.push('─'.repeat(width));
    lines.push('\x1b[90m按 Esc 或 q 返回\x1b[0m');

    return lines;
  }

  invalidate(): void {
    // 清除缓存
  }
}
