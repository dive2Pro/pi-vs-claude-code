# Agent Hub

AI 会话聚合器 - 统一查看所有 AI 工具的对话历史。

## 功能

- ✅ 聚合 Claude Code、Pi 等工具的会话
- ✅ 按日期、项目、来源过滤
- ✅ 全文搜索
- ✅ TUI Dashboard
- ✅ 统计信息

## 使用方法

```bash
# 启动 TUI Dashboard
pi -e ./extensions/agent-hub/index.ts

# 或在已有 session 中使用命令
/agent-hub              # 打开 Dashboard
/agent-hub search bug   # 搜索
/agent-hub stats        # 统计
/agent-hub reindex      # 重建索引
```

## TUI 快捷键

| 按键 | 功能 |
|------|------|
| `↑/k` `↓/j` | 导航 |
| `Enter` | 查看详情 |
| `/` 或 `s` | 搜索 |
| `1/2/3` | 过滤来源 |
| `t` | 时间过滤 |
| `S` | 统计 |
| `r` | 刷新索引 |
| `q` 或 `Esc` | 退出 |

## 数据存储

- 索引文件: `~/.agent-hub/index.json`
- Claude Code: `~/.claude/projects/`
- Pi: `~/.pi/agent/sessions/`
