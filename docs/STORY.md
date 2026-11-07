# HUANDENG Story

Story 是逐页叙事目的、修改要求和需要保留的设计判断。由外部 ChatGPT、Claude Code、Codex 等 Agent 维护，用户在编辑器里查看或纠正；不要求用户先填表，也不是排版模板。

规范入口：`huandeng story`、`POST /__pptd/story`、`huandeng_story_record`，源码为 `pptd/story.ts`。

既有 `designIntent` 数据继续使用，避免改名破坏旧文档和页面历史。旧 frame 命令/路由和旧拼写工具调用是兼容入口，MCP tools/list 和界面只展示新名。浏览器的 animation frame、mainFrame、几何 frame 不是本系统名称，不改。

目前只实现逐页意图摘要，并未声称已经集成完整的叙事事件图、分支或全局 Story 编排。
