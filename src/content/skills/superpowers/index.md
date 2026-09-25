---
title: SuperPowers
name: superpowers
description: Superpowers is a complete software development methodology for your coding agents, built on top of a set of composable skills and some initial instructions that make sure your agent uses them.
type: claude-code
tags: [claude-code]
version: 6.4.1
license: MIT
repoUrl: https://github.com/obra/superpowers
installCmd: /plugin install superpowers@claude-plugins-official
draft: false
relatedPrompts:
  - macos-clone
skillCount: 15
installNote: "Install the plugin from Anthropic's official marketplace"
highlights:
  - "Test-Driven Development - Write tests first, always"
  - "Systematic over ad-hoc - Process over guessing"
  - "Complexity reduction - Simplicity as primary goal"
  - "Evidence over claims - Verify before declaring success"
triggers:
  - "brainstorming - Activates before writing code."
  - "using-git-worktrees - Activates after design approval."
  - "writing-plans - Activates with approved design."
  - "subagent-driven-development or executing-plans - Activates with plan."
  - "test-driven-development - Activates during implementation."
  - "requesting-code-review - Activates between tasks."
  - "finishing-a-development-branch - Activates when tasks complete."
changelog:
  - version: "6.4.1"
    date: 2026-09-18
    text: "The new diagnosing-superpowers skill figures out what went wrong in a session."
  - version: "6.3.0"
    date: 2026-08-12
    text: "Worktree removal no longer destroys untracked files."
  - version: "6.2.0"
    date: 2026-07-23
    text: "Two structural changes to how SDD tracks progress and closes out review findings, both developed against live eval campaigns."
filesSource: "6.4.1"
files:
  - path: .claude-plugin/plugin.json
    lines: 20
    excerpt: |-
      {
        "name": "superpowers",
        "description": "Core skills library for Claude Code: TDD, debugging, collaboration patterns, and proven techniques",
        "version": "6.4.1",
        "author": {
          "name": "Jesse Vincent",
  - path: hooks/hooks.json
    lines: 17
    excerpt: |-
      {
        "hooks": {
          "SessionStart": [
            {
              "matcher": "startup|clear|compact",
              "hooks": [
                {
                  "type": "command",
                  "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
                  "shell": "bash",
                  "async": false
                }
              ]
            }
          ]
        }
  - path: skills/using-superpowers/SKILL.md
    lines: 65
    excerpt: |-
      ---
      name: using-superpowers
      description: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions
      ---

      <SUBAGENT-STOP>
      If you were dispatched as a subagent to execute a specific task, ignore this skill.
      </SUBAGENT-STOP>

      <EXTREMELY-IMPORTANT>
      If you think there is even a 1% chance a skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.

      IF A SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.

      This is not negotiable. You cannot rationalize your way out of this.
      </EXTREMELY-IMPORTANT>
  - path: skills/brainstorming/SKILL.md
    lines: 285
    excerpt: |-
      ---
      name: brainstorming
      description: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
      ---

      # Brainstorming Ideas Into Designs

      Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

      Start by classifying how much process the request needs, then work
      through your path: understand the context, refine the idea, present a
      design, and get your human partner's approval.

      ## Establish Shared Understanding

      The outcome of brainstorming is an understanding your human partner can
  - path: skills/using-git-worktrees/SKILL.md
    lines: 167
    excerpt: |-
      ---
      name: using-git-worktrees
      description: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
      ---

      # Using Git Worktrees

      ## Overview

      Ensure work happens in an isolated workspace. Prefer your platform's native worktree tools. Fall back to manual git worktrees only when no native tool is available.

      **Core principle:** Detect existing isolation first. Then use native tools. Then fall back to git. Never fight the harness.

      **Announce at start:** "I'm using the using-git-worktrees skill to set up an isolated workspace."

      ## Step 0: Detect Existing Isolation
  - path: skills/writing-plans/SKILL.md
    lines: 192
    excerpt: |-
      ---
      name: writing-plans
      description: Use when you have a spec or requirements for a multi-step task, before touching code
      ---

      # Writing Plans

      ## Overview

      Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

      Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

      **Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

      **Context:** If working in an isolated worktree, it should have been created via the `superpowers:using-git-worktrees` skill at execution time.
  - path: skills/subagent-driven-development/SKILL.md
    lines: 568
    excerpt: |-
      ---
      name: subagent-driven-development
      description: Use when executing implementation plans with independent tasks in the current session
      ---

      # Subagent-Driven Development

      Execute plan by dispatching a fresh implementer subagent per task, a task review (spec compliance + code quality) after each, and a broad whole-branch review at the end.

      **Why subagents:** You delegate tasks to specialized agents with isolated context. By precisely crafting their instructions and context, you ensure they stay focused and succeed at their task. They should never inherit your session's context or history — you construct exactly what they need. This also preserves your own context for coordination work.

      **Core principle:** Fresh subagent per task + task review (spec + quality) + broad final review = high quality, fast iteration

      **Narration:** between tool calls, narrate at most one short line — the
      ledger and the tool results carry the record.
  - path: skills/executing-plans/SKILL.md
    lines: 373
    excerpt: |-
      ---
      name: executing-plans
      description: Use when executing an implementation plan in the current session as the implementer yourself — your human partner chose inline execution, or no subagent tool is available
      ---

      # Executing Plans

      Execute the plan yourself, task by task, in this session: no implementer
      subagent per task, no reviewer per task. One fresh-context review of the
      whole branch at the end.

      **Why inline:** Subagent-driven development pays for a fresh implementer
      and a fresh reviewer on every task, each re-reading the codebase from zero.
      Inline execution pays for one context (yours) plus one reviewer at the end.
      What it gives up is a fresh context per task and a second pair of eyes per
      task. This skill keeps what those two things bought, by other means: the
  - path: skills/test-driven-development/SKILL.md
    lines: 330
    excerpt: |-
      ---
      name: test-driven-development
      description: Use when implementing any feature or bugfix, before writing implementation code
      ---

      # Test-Driven Development (TDD)

      ## Overview

      Write the test first. Watch it fail. Write minimal code to pass.

      **Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

      **Violating the letter of the rules is violating the spirit of the rules.**

      ## When to Use
  - path: skills/requesting-code-review/SKILL.md
    lines: 95
    excerpt: |-
      ---
      name: requesting-code-review
      description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
      ---

      # Requesting Code Review

      Dispatch a code reviewer subagent to catch issues before they cascade. The reviewer gets precisely crafted context for evaluation — never your session's history.

      **Core principle:** Review early, review often.

      ## When to Request Review

      **Mandatory:**
      - After each task in subagent-driven development
      - After completing major feature
  - path: skills/finishing-a-development-branch/SKILL.md
    lines: 225
    excerpt: |-
      ---
      name: finishing-a-development-branch
      description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
      ---

      # Finishing a Development Branch

      ## Overview

      **Core principle:** Verify tests → Detect environment → Present options → Execute choice → Clean up.

      **Announce at start:** "I'm using the finishing-a-development-branch skill to complete this work."

      ## Step 1: Verify Tests

      Run the project's full test suite (`npm test` / `cargo test` / `pytest` / `go test ./...`).
---

SuperPowers est un plugin de Jesse Vincent et de l'équipe de Prime Radiant,
publié sous licence MIT. Il fonctionne avec Claude Code, parmi d'autres agents
de code, et s'installe depuis la marketplace officielle des plugins Claude.

## Comment il travaille

<blockquote lang="en">

It starts from the moment you fire up your coding agent. As soon as it sees that you're building something, it *doesn't* just jump into trying to write code. Instead, it steps back and asks you what you're really trying to do.

</blockquote>

<blockquote lang="en">

Once it's teased a spec out of the conversation, it shows it to you in chunks short enough to actually read and digest.

</blockquote>

<blockquote lang="en">

After you've signed off on the design, your agent puts together an implementation plan that's clear enough for an enthusiastic junior engineer with poor taste, no judgement, no project context, and an aversion to testing to follow. It emphasizes true red/green TDD, YAGNI (You Aren't Gonna Need It), and DRY.

</blockquote>

<blockquote lang="en">

Next up, once you say "go", it launches a *subagent-driven-development* process, having agents work through each engineering task, inspecting and reviewing their work, and continuing forward. It's not uncommon for your agent to work autonomously for a couple hours at a time without deviating from the plan you put together.

</blockquote>

<blockquote lang="en">

There's a bunch more to it, but that's the core of the system. And because the skills trigger automatically, you don't need to do anything special. Your coding agent just has Superpowers.

</blockquote>

## Ce qu'il contient

Le plugin embarque 15 skills, que le README regroupe en quatre familles :
Testing, Debugging, Collaboration et Meta.
