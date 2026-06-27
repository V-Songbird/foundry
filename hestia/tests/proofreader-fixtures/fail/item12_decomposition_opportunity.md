---
name: full-release
description: Runs the complete release pipeline for a project. Invoke when the user wants to cut a new release.
---

# Full Release

This skill runs security analysis, performance analysis, and changelog generation in sequence, then packages and publishes the release.

## Step 1 — Security analysis

Dispatch the security subagent to scan for vulnerabilities:

```
Agent({
  subagent_type: "security-scanner",
  name: "security-scanner",
  description: "Scan codebase for security vulnerabilities before release"
})
```

## Step 2 — Performance analysis

Dispatch the performance subagent to profile critical paths:

```
Agent({
  subagent_type: "perf-profiler",
  name: "perf-profiler",
  description: "Profile critical paths and flag regressions"
})
```

## Step 3 — Changelog generation

Dispatch the changelog subagent to summarize commits since the last tag:

```
Agent({
  subagent_type: "changelog-writer",
  name: "changelog-writer",
  description: "Summarize commits since last tag into a release changelog"
})
```

## Step 4 — Package

MUST invoke `Bash` to build the release artifact:

```
Bash({
  command: "npm run build:release",
  description: "Compile and bundle the release artifact"
})
```

## Step 5 — Version bump

MUST invoke `Edit` to update the version in `package.json`.

## Step 6 — Publish

MUST invoke `Bash` to publish to the registry:

```
Bash({
  command: "npm publish --access public",
  description: "Publish the release artifact to the npm registry"
})
```

## Step 7 — Tag

MUST invoke `Bash` to create and push the git tag:

```
Bash({
  command: "git tag v$(node -p \"require('./package.json').version\") && git push origin --tags",
  description: "Create a version tag and push it to the remote"
})
```

## Step 8 — Notify

Tell the user the release is complete, including the version number and a link to the published package.
