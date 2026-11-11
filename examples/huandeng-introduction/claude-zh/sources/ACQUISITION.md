# claude-zh 素材采集记录（Claude Code，2026-11-11/12）

作者 2026-11-11 要求：三位作者的 slides 不得互相引用素材，素材库不共享，每个 agent 自己采集。本记录说明本版（claude-zh）当前页面上每一类素材的来源。共享素材包（`../assets`）、`MEDIA-INPUTS.json` 里预装的文件、其他作者的项目都只作为历史记录保留，没有删除，也不再被任何页面使用。

核查方法：对 `huandeng assets --filter used` 列出的全部 34 个在用素材计算 SHA-256，与 `examples/huandeng-introduction/` 下除本项目外的所有图片比较。

## 科学数据与图（`science/own/`、`science/slide-figure/`）

| 文件 | 来源与方法 |
| --- | --- |
| `own/1BNA.pdb` | 2026-11-11T11:54:30Z 由 Claude Code 从 https://files.rcsb.org/download/1BNA.pdb 下载，SHA-256 df42f150…a584670 |
| `own/paired-c1-distances-own.csv` | `own/structure.py` 从上面的坐标计算：链 A 残基 1–12 对应链 B 残基 24–13，C1′–C1′ 欧氏距离 |
| `own/dna-ladder-1bna(.png/-plain.png)` | `own/structure.py`，Matplotlib：主成分投影，C4′ 骨架曲线、12 条 C1′–C1′ 连线，标出最短（第 7 对）和最长（第 12 对） |
| `slide-figure/paired-c1-distances-slide-zh` | `slide-figure/plot.py`，Matplotlib，读 `own/paired-c1-distances-own.csv` |

数值与共享包里的 CSV 一致，这是因为两者都从同一份公开坐标算出，不是复制。

## 标志（`brand-own/`，详见 `brand-own/ACQUISITION.json`）

| 用途 | 官方来源 |
| --- | --- |
| HUANDENG | 本项目运行中的编辑器提供的 favicon SVG（http://127.0.0.1:63941/assets/favicon-BhytTYDU.svg），本地栅格化 |
| Claude Code | https://claude.ai/favicon.svg，本地栅格化 |
| OpenSlide | https://github.com/open-slide.png（组织头像） |
| Codex / ChatGPT | https://github.com/openai.png（组织头像） |
| DeepSeek Harness | https://github.com/deepseek-ai.png（组织头像） |
| OpenPPTD 仓库 | GitHub Primer Octicons `mark-github`（MIT），本地栅格化 |
| PptxGenJS | 文档站 favicon：https://raw.githubusercontent.com/gitbrent/PptxGenJS/gh-pages/img/favicon.png |

与其他项目字节相同的情况，如实列出：
- Claude、OpenSlide、OpenAI 三个标志与 claude-en 相同。claude-en 是同一作者（Claude）的英文版，两边都直接取官方文件。
- DeepSeek 头像、PptxGenJS favicon 与共享包相同。官方文件只有这一份，本版是独立从上面的网址重新下载的。

## 界面截图（`ui-own/`，详见 `ui-own/CAPTURES.json`）

全部由 Claude Code 在 2026-11-12 用 Playwright Chromium 拍摄：对象是正在运行、打开着本项目 `claude-zh/deck.pptd` 的 HUANDENG Editor 0.19，界面为中文、浅色主题，视口 1600×1000 CSS 像素、2 倍像素密度。拍摄脚本 `ui-own/capture.mjs` 拦截了所有非 GET 请求，拍摄过程不会修改项目。`ui-own/crop.py` 从 `raw/` 原图裁出页面用图。

截图展示的都是本项目自己的真实状态：1BNA 页（BRHY）的编辑、大纲、浏览、故事、历史、项目概览、组会简版中的位置、设计检查、导出和放映菜单。“一次修改：前后对照”和“每一次保存的修改都能回看”用的是本版真实做过的一次修改：操作 `a6a5da5c-80f0-4ef4-82c9-9826cb169a2b`，把 BRHY 的标题从“以数据保存”改为“十二个碱基对的 C1′–C1′ 距离”。

## 本项目页面缩略图（`renders/`）

`thumb-*.png` 是本项目页面经 `huandeng render` 渲染的结果，用于 3DUH、D26F、2723 三页的缩略图。FNHB 页上的 `claude-en-20261110-overview.png` 是同一作者（Claude Code）上一版介绍的概览，作为“上一版”的证据，属于本作者自己的历史作品。
