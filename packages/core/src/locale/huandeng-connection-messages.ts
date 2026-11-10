export const connectionChinese = {
  'Set up your assistant for this Project.': '为这个项目设置助手。',
  'Project for this configuration': '此配置对应的项目',
  'An existing Agent session stays bound to its configured Project when you switch editor tabs. To change Projects, update the client configuration and reconnect explicitly.':
    '切换编辑器标签不会切换已有 Agent 会话绑定的项目。要更换项目，请更新客户端配置并重新连接。',
  'Next steps': '接下来这样做',
  'Copy the configuration into Codex’s MCP settings, keeping your existing settings.':
    '将配置复制到 Codex 的 MCP 设置中，保留已有设置。',
  'Reload the MCP connection or start a new Codex session, then check that HUANDENG tools are available.':
    '重新加载 MCP 连接或新开 Codex 会话，确认已出现 HUANDENG 工具。',
  'Merge the configuration into Claude Code’s MCP settings, keeping your existing servers.':
    '将配置合并到 Claude Code 的 MCP 设置中，保留已有服务。',
  'Start a new Claude Code session and check that the HUANDENG MCP server is available.':
    '新开 Claude Code 会话，确认 HUANDENG MCP 服务可用。',
  'Save the configuration as a separate JSON patch. Keep your model and account settings.':
    '将配置保存为独立的 JSON patch 文件，保留模型和账户设置。',
  'Start DeepSeek Harness with dsh --patch and the saved file, then check that HUANDENG tools are available.':
    '使用 dsh --patch 加载刚保存的文件启动 DeepSeek Harness，确认已出现 HUANDENG 工具。',
  'In ChatGPT, select your existing DC-WALT workstation that can access this Project.':
    '在 ChatGPT 中选择能访问此项目的现有 DC-WALT 工作站。',
  'Send the configuration to ChatGPT and ask it to run the listed commands on that workstation.':
    '将配置发给 ChatGPT，让它在该工作站执行其中的命令。',
  'Send the first task below to confirm this Project and read its Story briefing.':
    '发送下面的首个任务，先核对项目，再读取故事简报。',
  'First task': '首个任务',
  'Copy first task': '复制首个任务',
  'First task copied': '首个任务已复制',
  'Advanced · configuration details': '高级 · 查看完整配置',
  'Instructions ready · connection not verified here': '配置已就绪 · 此处未验证客户端连接',
  'Keep this Project open. Copying does not change client settings or connect an Agent.':
    '请保持此项目打开。复制操作不会修改客户端设置，也不会自动连接 Agent。',
  'ChatGPT uses the existing workstation connection; this does not create a public endpoint or a new tunnel.':
    'ChatGPT 使用已有工作站连接；这里不会创建公网端点或新隧道。',
  'Use the HUANDENG tools to inspect this Project: {path}':
    '使用 HUANDENG 工具查看这个项目：{path}',
  'Expected Project ID: {id}': '预期项目 ID：{id}',
  'First confirm the connected Project matches this path and ID. If it differs, stop and tell me; do not switch or edit another Project.':
    '先确认已连接项目的路径和 ID 与这里一致。不一致时请停止并告诉我，不要切换或修改其他项目。',
  'Then read its Story briefing and summarize the title, slide count, and main story. Do not modify anything yet.':
    '然后读取故事简报，简述项目标题、页数和主要故事。暂不修改内容。',
} as const;
