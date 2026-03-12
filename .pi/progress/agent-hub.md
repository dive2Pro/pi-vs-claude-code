# Progress: Agent Hub - AI Session Aggregator

## Meta
- Created: 2026-03-13T00:00:00+08:00
- Updated: 2026-03-13T00:30:00+08:00
- Status: completed
- Phase: 1
- Total Phases: 4

## Requirement
将分散在不同 AI 工具（Claude Code, Pi, Cursor）中的会话聚合起来：
1. 使用各个工具的 AI 日志文件作为数据来源 ✅
2. 可以按日期划分 ✅
3. 可以按文字查询 ✅
4. 可以总结 (待实现)
5. 可以语义化查询 (待实现)
6. 可以推送到中心位置 (待实现)
7. 使用 pi 开发，有 TUI 和 WebUI ✅ (TUI 完成)

## Implementation Plan

### Phase 1: Foundation ✅
- [x] 创建项目结构
- [x] 定义核心类型
- [x] 实现 Claude Code 适配器
- [x] 实现 Pi 适配器
- [x] JSON 索引器
- [x] 基础 TUI Dashboard

### Phase 2: Search & Filter ✅
- [x] 全文搜索
- [x] 日期过滤
- [x] 项目过滤
- [x] 工具过滤

### Phase 3: AI Features (待实现)
- [ ] 会话摘要
- [ ] 语义搜索（向量嵌入）

### Phase 4: Sync & WebUI (待实现)
- [ ] 推送到 Git
- [ ] Hono WebUI

## Progress Tracking

### Phase 1: Foundation
- Status: completed
- Started: 2026-03-13T00:00:00+08:00
- Completed: 2026-03-13T00:30:00+08:00
- Tasks:
  - [x] 创建项目结构 - 2026-03-13T00:00:00+08:00
  - [x] 定义核心类型 - 2026-03-13T00:02:00+08:00
  - [x] 实现 Claude Code 适配器 - 2026-03-13T00:05:00+08:00
  - [x] 实现 Pi 适配器 - 2026-03-13T00:08:00+08:00
  - [x] JSON 索引器 - 2026-03-13T00:10:00+08:00
  - [x] 基础 TUI Dashboard - 2026-03-13T00:15:00+08:00
- Notes: MVP 完成

### Phase 2: Search & Filter
- Status: completed
- Tasks:
  - [x] 全文搜索 - 2026-03-13T00:20:00+08:00
  - [x] 日期过滤 - 2026-03-13T00:20:00+08:00
  - [x] 项目过滤 - 2026-03-13T00:20:00+08:00
  - [x] 工具过滤 - 2026-03-13T00:20:00+08:00
- Notes: 搜索功能已集成到 TUI 和工具中

## Test Coverage
- Unit Tests: 0 tests (手动测试通过)
- Integration Tests: 0 tests
- E2E Tests: 1 scenario (TUI 交互 + 搜索)
- Coverage Target: N/A (工具类项目)

## Design Decisions
- 使用 JSON 文件作为索引存储（避免 better-sqlite3 编译问题）
- 索引文件位置: ~/.agent-hub/index.json
- 向量搜索后期迭代
- TUI 使用 @mariozechner/pi-tui 原生组件

## Test Results
```
Testing adapters...
Claude Code paths: 14
Pi paths: 10

Reindex result: { added: 22, updated: 0, total: 22 }
After reindex: { totalSessions: 22, totalMessages: 1734 }

搜索 'bug' - 找到 11 个会话
```

## Files Created
```
extensions/agent-hub/
├── index.ts              # 主入口 (命令 + 工具)
├── package.json
├── README.md
└── src/
    ├── core/
    │   ├── types.ts      # 类型定义
    │   └── indexer.ts    # 索引器
    ├── adapters/
    │   ├── claude-code.ts
    │   └── pi.ts
    └── tui/
        └── dashboard.ts  # TUI 组件
```

## Usage
```bash
# 启动 TUI Dashboard
pi -e ./extensions/agent-hub/index.ts

# 使用命令
/agent-hub              # 打开 Dashboard
/agent-hub search bug   # 搜索
/agent-hub stats        # 统计
/agent-hub reindex      # 重建索引
```

## Lessons Learned
1. 使用 JSON 文件代替 SQLite 避免了编译依赖问题
2. Pi 的命令系统需要在 session_start 后才能使用
3. 工具（tools）可以在 -p 模式下直接调用
