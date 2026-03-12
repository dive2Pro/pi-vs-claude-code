# Pi Skills 目录

这个目录包含 Pi 的技能包，用于增强 Pi 的能力。

## 可用技能

### 🎯 [requirement-analyzer](./requirement-analyzer.md)
**需求分析与落地规划**

根据用户需求，进行源码分析、文档查询、可行性评估，并制定可落地的实施计划。

**核心能力:**
- ✅ 源码分析与架构评估
- ✅ 文档研究与最佳实践
- ✅ 可行性评估与风险识别
- ✅ 交互式需求澄清
- ✅ 分阶段实施计划

**使用场景:**
- 新功能开发规划
- 第三方集成评估
- 性能优化方案
- 技术选型决策

**使用方法:**
直接向 Pi 描述您的需求，Pi 会自动激活此 skill 进行分析。

**示例:**
```
"我想添加一个实时协作功能"
"我想集成 GitHub API"
"我想优化系统性能"
```

[查看详细使用示例](./requirement-analyzer-examples.md)

---

### 🚀 [requirement-implementer](./requirement-implementer.md)
**需求落实与 TDD 开发**

将需求计划转化为生产级代码，通过进度跟踪、测试驱动开发和严格的质量标准确保卓越实现。

**核心能力:**
- ✅ 持久化进度跟踪（文件状态管理）
- ✅ 严格的 TDD 开发流程（单元/集成/E2E 测试）
- ✅ 全面的测试覆盖（80%+ 目标）
- ✅ 最大努力的设计与实现
- ✅ 原子提交与质量检查清单

**使用场景:**
- 执行已规划的需求
- TDD 方式开发新功能
- 确保代码质量和测试覆盖
- 复杂功能的分阶段实现

**使用方法:**
当需求分析完成后，Pi 会自动激活此 skill 进行实现。

**示例:**
```
"实现实时协作功能"
"用 TDD 开发 GitHub 集成"
"落实性能优化方案"
```

---

### 🌐 [bowser](./bowser.md)
**无头浏览器自动化**

使用 Playwright CLI 进行浏览器自动化、UI 测试、网页抓取等。

---

## 如何创建新 Skill

1. 在 `.pi/skills/` 目录创建 `.md` 文件
2. 添加 frontmatter 元数据:
   ```yaml
   ---
   name: skill-name
   description: 简短描述（用于自动激活）
   allowed-tools: Tool1, Tool2
   ---
   ```
3. 编写详细的使用说明、工作流程、示例
4. Pi 会根据 description 中的关键词自动激活相关 skill

## Skill 文件结构

```markdown
---
name: skill-name
description: 描述和关键词
allowed-tools: Read, Bash, Grep
---

# Skill 标题

## Purpose
技能的目的和用途

## Workflow
详细的工作流程

## Examples
使用示例

## Best Practices
最佳实践建议
```

## 贡献

欢迎创建新的 skill 来扩展 Pi 的能力！
