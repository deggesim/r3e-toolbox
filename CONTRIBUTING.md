# Commit Convention for Automatic Versioning

This project uses [Conventional Commits](https://www.conventionalcommits.org/) with **semantic-release** for automatic versioning.

## Commit Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

## Commit Types and Versioning

### 🐛 fix: → PATCH version (0.0.x)

**Bug fix**

```bash
git commit -m "fix: resolved error in XML parsing of qualification times"
git commit -m "fix(ai-management): corrected linear regression calculation"
```

### ✨ feat: → MINOR version (0.x.0)

**New feature**

```bash
git commit -m "feat: added CSV export for standings"
git commit -m "feat(championship): support for custom points calculation"
```

### 💥 BREAKING CHANGE: → MAJOR version (x.0.0)

**Incompatible architectural change**

```bash
git commit -m "feat!: removed support for legacy XML format

BREAKING CHANGE: XML format prior to version 1.0 is no longer supported"
```

Or in footer:

```bash
git commit -m "refactor: restructured asset caching system

BREAKING CHANGE: localStorage cache now uses new structure.
Users must manually reload leaderboard assets."
```

## Other Types

### Patch release

- **docs**: Documentation changes → PATCH
- **style**: Code formatting (spaces, commas, etc.) → PATCH
- **refactor**: Refactoring without fix or feature → PATCH
- **perf**: Performance improvements → PATCH
- **chore**: General maintenance → PATCH

### No release

- **test**: Test addition/modification
- **build**: Build system changes
- **ci**: CI/CD workflow changes

## Real Examples

```bash
# Patch: 0.1.0 → 0.1.1
git commit -m "fix: correct handling of files without extension"

# Minor: 0.1.1 → 0.2.0
git commit -m "feat: added support for multi-class championships"

# Major: 0.2.0 → 1.0.0
git commit -m "feat!: new championship database format

BREAKING CHANGE: Format saved in localStorage is incompatible with previous versions"

# Multiple commits in a PR
git commit -m "fix: corrected bug in points calculation"
git commit -m "feat: added filter for track"
git commit -m "docs: updated README with examples"
# → Result: MINOR version bump (0.2.0 → 0.3.0)
```

## Suggested Scopes

- `ai-management`: AI Management feature
- `fix-qualy`: Fix Qualy Times
- `championship`: Build Results Database
- `parser`: XML/JSON parsing utilities
- `fitting`: Statistical fitting
- `assets`: Asset management and caching
- `ui`: UI components
- `electron`: Electron main/preload

## Automatic Workflow

1. **Push to `master`**: Triggers semantic-release
2. **Commit Analysis**: Determines version bump
3. **Update**: package.json + CHANGELOG.md
4. **Git Tag**: Creates tag v1.2.3
5. **GitHub Release**: Publishes release with notes
6. **Build Electron**: Compiles and attaches installer

## Useful Commands

```bash
# Verify commits before push
npm run lint

# Simulate release (dry-run)
npx semantic-release --dry-run

# Force patch manually (if needed)
npm version patch -m "chore(release): %s"
```

## QA Agents

Agent documentation lives in [agents/docs/](agents/docs/).

- [Quick reference](agents/docs/QA_AGENTS_QUICK_REFERENCE.md)
- [Implementation guide](agents/docs/AGENT_IMPLEMENTATION_GUIDE.md)
- [Setup & maintenance](agents/docs/AGENT_SETUP_MAINTENANCE.md)

## Important Notes

- ⚠️ Commit must be on `master` branch to trigger release
- 🚀 Release is fully automatic, no need to create tags manually
- 📝 CHANGELOG.md is generated automatically
- 🔖 Tags follow format `v1.2.3`
- ⏭️ Commits with `[skip ci]` do not trigger workflow

## Pull Request Guidelines

When merging PRs to `master`, **the PR title must follow Conventional Commits format**:

### ✅ Correct PR Titles

```
feat: add website export functionality
fix: correct parsing of qualification times
docs: update installation guide
```

### ❌ Incorrect PR Titles

```
Web site (#17)
Add new feature
Bugfix for AI fitting
Update docs
```

### Why This Matters

GitHub's squash/merge uses the **PR title as the commit message**. If the PR title doesn't follow Conventional Commits:

- semantic-release **won't recognize** the commit type
- Your `feat:` changes will trigger **patch** instead of **minor** version
- The release notes won't properly categorize the changes

### Workflow Protection

The repository has **two validation layers**:

1. **PR Title Validation** (`.github/workflows/pr-title-validation.yml`):
   - Runs on every PR open/edit/sync
   - **Blocks merge** if PR title doesn't follow Conventional Commits
   - Required status check enforced by branch protection

2. **Commit Validation** (`.github/workflows/semantic-release.yml`):
   - Runs after merge to master
   - Validates the actual commit message
   - Triggers semantic-release if valid

### Best Practice

1. **When opening PR**: Set PR title to follow Conventional Commits format immediately
   - GitHub will show a ❌ or ✅ status check
   - Edit the title if validation fails
2. **Choose the right type**:
   - `feat:` for new features (minor bump: 1.x.0)
   - `fix:` for bug fixes (patch bump: 1.5.x)
   - `feat!:` or add `BREAKING CHANGE:` in body for major bump (x.0.0)
3. **Squash merge**: Use "Squash and merge" with the validated PR title
   - The PR title becomes the commit message on master
4. **Verify**: Check the semantic-release job output to confirm correct version bump

### Branch Protection Setup (For Repository Admins)

To enforce PR title validation:

1. Go to **Settings** → **Branches** → **Branch protection rules**
2. Add/edit rule for `master`:
   - ✅ Require status checks to pass before merging
   - Select: **`validate-pr-title`**
3. Save changes

This prevents merging PRs with non-conventional titles.
