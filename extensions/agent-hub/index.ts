/**
 * Agent Hub - AI Session Aggregator
 * 
 * Pi Extension for aggregating AI conversations across different tools
 * 
 * Usage:
 *   pi -e ./extensions/agent-hub/index.ts
 *   
 * Commands:
 *   /agent-hub       - Open TUI Dashboard
 *   /agent-hub search <query> - Search sessions
 *   /agent-hub stats - Show statistics
 *   /agent-hub reindex - Rebuild index
 */

import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import { Type } from '@sinclair/typebox';
import * as path from 'node:path';
import * as os from 'node:os';
import { Indexer } from './src/core/indexer';
import { Dashboard } from './src/tui/dashboard';

// 扩展状态
let indexer: Indexer | null = null;

function getIndexer(): Indexer {
  if (!indexer) {
    const dbPath = path.join(os.homedir(), '.agent-hub', 'index.json');
    indexer = new Indexer(dbPath);
  }
  return indexer;
}

export default function (pi: ExtensionAPI) {
  // 注册主命令
  pi.registerCommand('agent-hub', {
    description: 'Open Agent Hub Dashboard',
    handler: async (args, ctx) => {
      // 如果有参数，处理子命令
      if (args) {
        const [subCmd, ...rest] = args.split(' ');
        
        if (subCmd === 'search') {
          const query = rest.join(' ');
          if (!query) {
            ctx.ui.notify('请提供搜索关键词', 'error');
            return;
          }
          const idx = getIndexer();
          const result = idx.search({ query, limit: 10 });
          ctx.ui.notify(`找到 ${result.total} 个会话`, 'info');
          // TODO: 显示搜索结果
          return;
        }
        
        if (subCmd === 'stats') {
          const idx = getIndexer();
          const status = idx.getStatus();
          const projects = idx.getProjects();
          ctx.ui.notify(
            `${status.totalSessions} 会话 • ${status.totalMessages} 消息 • ${projects.length} 项目`,
            'info'
          );
          return;
        }
        
        if (subCmd === 'reindex') {
          ctx.ui.notify('正在重建索引...', 'info');
          const idx = getIndexer();
          const result = await idx.reindex();
          ctx.ui.notify(
            `索引完成: 新增 ${result.added}, 更新 ${result.updated}, 总计 ${result.total}`,
            'success'
          );
          return;
        }
      }

      // 打开 TUI Dashboard
      const idx = getIndexer();
      const dashboard = new Dashboard(idx);
      
      await ctx.ui.custom((tui, theme, _keybindings, done) => {
        dashboard.requestRender = () => tui.requestRender();
        dashboard.onClose = () => done(undefined);
        
        return {
          render: (width: number) => dashboard.render(width),
          invalidate: () => dashboard.invalidate(),
          handleInput: (data: string) => dashboard.handleInput(data),
        };
      });
    },
  });

  // 注册工具 - 让 LLM 可以查询会话
  pi.registerTool({
    name: 'agent_hub_search',
    label: 'Search AI Sessions',
    description: 'Search through your AI conversation history across Claude Code, Pi, and other tools',
    parameters: Type.Object({
      query: Type.String({ description: 'Search query' }),
      source: Type.Optional(Type.String({ description: 'Filter by source: claude-code, pi, cursor' })),
      days: Type.Optional(Type.Number({ description: 'Limit to last N days' })),
      limit: Type.Optional(Type.Number({ description: 'Max results (default: 10)' })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const idx = getIndexer();
      
      const options: import('./src/core/types').SearchOptions = {
        query: params.query,
        limit: params.limit || 10,
      };

      if (params.source) {
        options.source = params.source as import('./src/core/types').SourceType;
      }

      if (params.days) {
        const now = Date.now();
        options.startDate = now - params.days * 86400000;
      }

      const result = idx.search(options);

      // 格式化结果
      let output = `找到 ${result.total} 个会话:\n\n`;
      
      for (const session of result.sessions.slice(0, params.limit || 10)) {
        const date = new Date(session.startTime).toLocaleDateString();
        output += `**${session.title || '(无标题)'}**\n`;
        output += `  来源: ${session.source} | 项目: ${session.project} | 日期: ${date}\n`;
        output += `  消息: ${session.messageCount}\n\n`;
      }

      if (result.hasMore) {
        output += `... 还有更多结果\n`;
      }

      return {
        content: [{ type: 'text', text: output }],
        details: { total: result.total },
      };
    },
  });

  // 注册工具 - 获取统计
  pi.registerTool({
    name: 'agent_hub_stats',
    label: 'Get AI Session Stats',
    description: 'Get statistics about your AI conversations',
    parameters: Type.Object({}),
    async execute() {
      const idx = getIndexer();
      const status = idx.getStatus();
      const projects = idx.getProjects();
      const today = idx.getDailyStats(new Date());

      let output = '# Agent Hub 统计\n\n';
      output += '## 总体\n';
      output += `- 总会话数: ${status.totalSessions}\n`;
      output += `- 总消息数: ${status.totalMessages}\n`;
      output += `- 项目数: ${projects.length}\n\n`;
      
      output += '## 按来源\n';
      output += `- Claude Code: ${status.sources['claude-code']} 会话\n`;
      output += `- Pi: ${status.sources['pi']} 会话\n`;
      output += `- Cursor: ${status.sources['cursor']} 会话\n\n`;
      
      output += '## 今日\n';
      output += `- 会话: ${today.sessions}\n`;
      output += `- 消息: ${today.messages}\n`;
      output += `- Token: ${today.tokens}\n`;

      return {
        content: [{ type: 'text', text: output }],
        details: status,
      };
    },
  });

  // 启动时提示
  pi.on('session_start', async (_event, ctx) => {
    ctx.ui.notify('Agent Hub 已加载。使用 /agent-hub 打开 Dashboard', 'info');
  });
}
