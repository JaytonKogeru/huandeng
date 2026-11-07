# HUANDING Story

Story is the human-facing name for the narrative intent and design decisions that an Agent maintains for each slide. It is not a rigid layout template.

Each page Story may include purpose, requested changes, constraints to preserve, and source/actor/time. External agents (ChatGPT, Claude Code, Codex) ordinarily record it first; the user can review and correct the summary.

For compatibility with existing PPTD documents, the implementation retains designIntent metadata, the frame service and huanding_frame_record MCP entry point. These are internal compatibility details, not UI names. A later version can add story API aliases without breaking old files.

Story is distinct from the layer panel (visual objects), page history (individual slide revisions) and Git (editor source releases).