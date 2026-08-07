# Project Rules & Instructions for AI Agents

## 1. Mandatory Change Proposal Requirement

Before performing any code modification or file edit in this project, the AI agent MUST output a detailed Change Proposal to the user containing the following 5 points:

1. **What is changing**: Describe the exact code, file, component, or config being added or modified.
2. **Why it is required**: Explain the reason and rationale behind the change.
3. **Where it will change**: Provide exact file paths and line ranges affected.
4. **Which impact it reflects**: Explain potential side effects, dependent components, or functionality impacted.
5. **What is its use**: Detail the specific feature, utility, or benefit provided by this change.

> **CRITICAL RULE**: The agent MUST present this proposal and wait for the user's explicit command or confirmation before making the code changes.

---

## 2. Git Push Control Rule

> **STRICT RULE**: The AI agent MUST NEVER execute any `git push` command or push code to remote repositories UNTIL AND UNLESS the user explicitly instructs or asks to push the code.
