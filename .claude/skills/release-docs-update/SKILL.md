---
name: release-docs-update
description: >-
  Use right after a new R3E Toolbox version is published — i.e. you approved/merged a PR and
  semantic-release auto-cut a release on master. It brings every user-facing release doc in sync
  with the just-published version in one pass: FORUM_POST_BBCODE.txt (version indicator + a
  synthetic one-line changelog entry), README.md, src/docs/USER_GUIDE.md, and CLAUDE.md (delegated
  to the claude-md-management:claude-md-improver skill). Trigger whenever the user says a release
  went out, mentions "nuova versione rilasciata", "aggiorna la documentazione dopo il rilascio",
  "aggiorna il post del forum / changelog forum", "ho approvato/mergiato la PR", or asks to align
  the docs with the latest version — even if they don't name every file. Prefer this skill over
  editing those files ad hoc, because it encodes two invariants that are easy to break: the forum
  post uses terse human one-liners (not the raw changelog), and the eventual commit must use
  `[skip ci]` so it doesn't trigger ANOTHER semantic-release.
---

# Release docs update

After a release, four docs drift out of sync with the new version. This skill updates all four from a
single source of truth, in a predictable order. Assume the user has already pulled `master`, so the
release commit (which semantic-release made with `[skip ci]`) is local.

## Why this is a skill and not a one-off edit

Two things go wrong when these files are edited by hand:

1. **The forum post is not the changelog.** `CHANGELOG.md` is raw conventional-commit output with hashes
   and issue links. The forum's Version History is a curated one-liner per version aimed at racers. Copying
   the changelog verbatim there reads as noise.
2. **`docs:` commits trigger a release.** `.releaserc.json` maps `docs` → patch. If these doc updates are
   committed without `[skip ci]`, semantic-release fires again and you get a runaway chain of patch releases.
   The repo convention (see CHANGELOG history) is to append `[skip ci]` to the commit subject.

## Step 0 — Get the new version and what changed

- **Version**: read `.version` from `package.json`. That's authoritative (semantic-release bumped it).
- **Changelog body**: read the top section of `CHANGELOG.md` — from the first `# [x.y.z]` / `## [x.y.z]`
  header down to the next version header. That section is the release notes for this exact version.
- **Sanity guard**: if `package.json` version already equals the version shown in `FORUM_POST_BBCODE.txt`
  ("Currently at [b]vX.Y.Z[/b]"), the docs are already synced or `master` wasn't pulled. Stop and tell the
  user to pull `master`, rather than guessing.
- **Empty-changelog fallback**: some releases have an empty body (all commits were chore/`[skip ci]`). If the
  top CHANGELOG section has no Features/Bug Fixes, summarize from `git log <prev-tag>..<new-tag> --oneline`
  or from the merged PR title/body instead.

## Step 1 — Classify the change

Read the changelog body and decide what kind of release this is — it drives how much you touch each file:

- **User-facing** (`feat`, user-visible `fix`, behavior/UI change): propagate into README, USER_GUIDE, and the
  forum post with a benefit-oriented description.
- **Internal-only** (`refactor`, `chore`, `build`, `ci`, internal `perf`): the forum post still gets a version
  entry (every release bumps the version), phrased as an "Internal …" line. README/USER_GUIDE usually need no
  prose change — say so instead of inventing one.

Do not invent features. If the changelog doesn't describe a user-facing change, don't manufacture documentation
for one.

## Step 2 — FORUM_POST_BBCODE.txt

Two edits, matching the file's existing terse BBCode style:

1. **Current version line**: update `Currently at [b]vOLD[/b].` → `Currently at [b]vNEW[/b].`
2. **Version History**: insert a new top entry directly under the `[b]Currently at …[/b]` paragraph, above the
   previous version's line:

   ```
   [b]vNEW[/b] — <one human sentence: what a racer gets, or "Internal …" for internal releases>
   ```

**Style reference** (existing entries — copy this register, one line, no commit hashes):

```
[b]v1.7.0[/b] — Server event file import in Results Database (supports JSON files exported by RaceRoom dedicated servers)
[b]v1.6.2[/b] — Internal migration to electron-vite with full TypeScript and shared IPC contracts for improved stability
```

If the release adds a genuinely headline feature, also reflect it in the "Key Features" body section. For small
or internal releases, the Version History line alone is enough — don't bloat the post.

## Step 3 — README.md

README has **no app-version string** to bump — don't add one. Only when the release is user-facing: update the
relevant feature description (the numbered features list, the per-feature section, or the "Points & Penalties"
style bullet) so it reflects the new behavior. Keep edits surgical and in the existing voice. If the release is
internal-only, leave README untouched and note that.

## Step 4 — src/docs/USER_GUIDE.md

Same principle as README: update the relevant numbered feature section (1. AI Management … 5. Settings) only for
user-facing changes, in the guide's instructional tone.

**Do not touch** the `{{VERSION}}` and `{{LAST_UPDATED}}` placeholders at the bottom — they're substituted at
build time. Leave them exactly as-is.

## Step 5 — CLAUDE.md

Delegate this one. Invoke the **`claude-md-management:claude-md-improver`** skill so CLAUDE.md is updated against
the latest implementation in the repo. Don't hand-edit CLAUDE.md here — that skill audits and updates it properly.

## Step 6 — Summarize, don't commit

Print a short summary: new version, the synthetic one-liner you wrote, and which of the four files you changed
(noting any you deliberately left alone and why).

**Do not commit.** The user commits manually. When you suggest a commit command, the subject MUST end with
`[skip ci]` so semantic-release doesn't cut another release, e.g.:

```
docs: sync release docs for vNEW [skip ci]
```

(`[skip ci]` is what stops the `docs:` → patch rule in `.releaserc.json` from chaining another release.)
