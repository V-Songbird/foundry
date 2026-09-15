#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CATALOGS = {
  Claude: ".claude-plugin/marketplace.json",
  Codex: ".agents/plugins/marketplace.json",
};
const MANIFESTS = {
  Claude: ".claude-plugin/plugin.json",
  Codex: ".codex-plugin/plugin.json",
};

function git(root, args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
  return execFileSync("git", args, { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function readCatalog(root, file, staged = false) {
  return JSON.parse(staged ? git(root, ["show", `:${file}`]) : fs.readFileSync(path.join(root, file), "utf8"));
}

// A plugin whose Claude catalog entry installs from main ships one package for
// both hosts (ADR 0011). Every other plugin keeps its Claude and Codex editions.
function layoutOf(catalog, name) {
  const plugins = Array.isArray(catalog?.plugins) ? catalog.plugins : [];
  return plugins.find((entry) => entry?.name === name)?.source?.ref === "main" ? "package" : "editions";
}

function editionPlugins(root) {
  const catalog = readCatalog(root, CATALOGS.Claude);
  return catalog.plugins.map((entry) => entry.name).filter((name) => layoutOf(catalog, name) === "editions");
}

function branchRef(root, branch) {
  for (const ref of [`refs/heads/${branch}`, `refs/remotes/origin/${branch}`]) {
    try { git(root, ["rev-parse", "--verify", ref]); return ref; } catch {}
  }
  throw new Error(`missing ${branch} branch; fetch the plugin branches first`);
}

function verifyEntry(root, entry, platform, owner, branch = platform) {
  const errors = [];
  if (!/^[a-z][a-z0-9-]*$/.test(entry.name || "")) return ["invalid plugin name"];
  const source = entry.source || {};
  if (source.source !== "url" || source.url !== `https://github.com/V-Songbird/${entry.name}.git`) {
    errors.push(`${entry.name}: source must reference its plugin repository`);
  }
  if (source.ref !== branch) errors.push(`${entry.name}: expected ref ${branch}`);
  if (!/^[0-9a-f]{40}$/.test(source.sha || "")) errors.push(`${entry.name}: a full source.sha is required`);
  if (errors.length) return errors;
  const repo = path.join(root, entry.name);
  try {
    const ref = branchRef(repo, branch);
    git(repo, ["merge-base", "--is-ancestor", source.sha, ref]);
    const manifest = JSON.parse(git(repo, ["show", `${source.sha}:${MANIFESTS[platform]}`]));
    if (manifest.name !== entry.name) errors.push(`${entry.name}: pinned manifest name does not match`);
    if (owner && (manifest.author?.name !== owner.name || manifest.author?.email !== owner.email)) {
      errors.push(`${entry.name}: pinned author does not match the marketplace owner`);
    }
    if (platform === "Codex") {
      if (!manifest.version) errors.push(`${entry.name}: pinned Codex manifest needs a version`);
      if (!manifest.interface?.composerIcon) errors.push(`${entry.name}: pinned Codex manifest needs a composerIcon`);
      else {
        const icon = manifest.interface.composerIcon;
        if (!/^\.\/assets\/[A-Za-z0-9._-]+\.(?:svg|png)$/.test(icon)) errors.push(`${entry.name}: invalid composer icon path`);
        else git(repo, ["cat-file", "-e", `${source.sha}:${icon.slice(2)}`]);
      }
      if (!entry.policy?.installation || !entry.policy?.authentication || !entry.category) {
        errors.push(`${entry.name}: Codex catalog policy and category are required`);
      }
    }
  } catch (error) {
    errors.push(`${entry.name}: cannot validate ${platform} pin ${source.sha.slice(0, 12)} (${error.message.split("\n")[0]})`);
  }
  return errors;
}

// The pins a change replaces: HEAD's for a staged or edited checkout, and HEAD's
// first parent when the checkout is itself the commit under test, as in CI.
function previousCatalogs(root, staged) {
  let base = "HEAD";
  if (!staged) {
    try { git(root, ["diff", "--quiet", "HEAD", "--", ...Object.values(CATALOGS)]); base = "HEAD^"; } catch {}
  }
  const previous = {};
  for (const [platform, file] of Object.entries(CATALOGS)) {
    try { previous[platform] = JSON.parse(git(root, ["show", `${base}:${file}`])); } catch {}
  }
  return previous;
}

function manifestVersion(repo, sha, platform) {
  return JSON.parse(git(repo, ["show", `${sha}:${MANIFESTS[platform]}`])).version;
}

function hasManifest(repo, sha, platform) {
  try { git(repo, ["cat-file", "-e", `${sha}:${MANIFESTS[platform]}`]); return true; } catch { return false; }
}

// A package's manifests at one main commit own its version: both of them, or the
// Claude manifest alone when the package ships no Codex manifest and so has no
// Codex catalog entry (ADR 0012). Hosts key updates on the version, so a moved
// pin with an already released version would never reach users.
function verifyPackage(root, name, { Claude: claude, Codex: codex }, previous) {
  if (!claude) return [`${name}: a package plugin needs a Claude catalog entry`];
  const errors = "version" in claude ? [`${name}: a package plugin's version belongs in its manifests, not the Claude catalog`] : [];
  const sha = claude.source?.sha;
  if (codex && codex.source?.sha !== sha) return [...errors, `${name}: both catalogs must pin the same main commit`];
  if (!/^[0-9a-f]{40}$/.test(sha || "")) return errors;
  const repo = path.join(root, name);
  try {
    const version = manifestVersion(repo, sha, "Claude");
    if (!codex && hasManifest(repo, sha, "Codex")) {
      errors.push(`${name}: a package plugin needs an entry in both catalogs when it ships a Codex manifest`);
    } else if (!version || (codex && version !== manifestVersion(repo, sha, "Codex"))) {
      errors.push(codex
        ? `${name}: both manifests at ${sha.slice(0, 12)} need the same version`
        : `${name}: the Claude manifest at ${sha.slice(0, 12)} needs a version`);
    }
    const released = new Map();
    for (const [platform, catalog] of Object.entries(previous)) {
      const before = (Array.isArray(catalog?.plugins) ? catalog.plugins : []).find((entry) => entry?.name === name);
      const old = before?.source?.sha;
      if (old && old !== sha) released.set(before.version || manifestVersion(repo, old, platform), old);
    }
    if (version && released.has(version)) {
      errors.push(`${name}: version ${version} was already pinned at ${released.get(version).slice(0, 12)}; change the version with the pin`);
    }
  } catch (error) {
    errors.push(`${name}: cannot validate package versions at ${sha.slice(0, 12)} (${error.message.split("\n")[0]})`);
  }
  return errors;
}

function verifyCatalogs(root, staged = false) {
  const errors = [];
  let claude, owner;
  try { claude = readCatalog(root, CATALOGS.Claude, staged); owner = claude.owner; }
  catch (error) { return [`Cannot read Claude marketplace: ${error.message}`]; }
  if (!owner?.name || !owner?.email) errors.push("Claude marketplace owner name and email are required");
  const packages = new Map();
  for (const [platform, file] of Object.entries(CATALOGS)) {
    try {
      const catalog = readCatalog(root, file, staged);
      if (catalog.name !== "foundry") errors.push(`${file}: marketplace name must be foundry`);
      if (!Array.isArray(catalog.plugins) || !catalog.plugins.length) {
        errors.push(`${file}: a nonempty plugins array is required`);
        continue;
      }
      if (platform === "Codex" && catalog.interface?.displayName !== "Foundry") errors.push(`${file}: displayName must be Foundry`);
      const seen = new Set();
      for (const entry of catalog.plugins || []) {
        if (seen.has(entry.name)) errors.push(`${file}: duplicate plugin ${entry.name}`);
        seen.add(entry.name);
        const branch = layoutOf(claude, entry.name) === "package" ? "main" : platform;
        if (branch === "main") packages.set(entry.name, { ...packages.get(entry.name), [platform]: entry });
        errors.push(...verifyEntry(root, entry, platform, owner, branch));
      }
    } catch (error) { errors.push(`${file}: ${error.message}`); }
  }
  if (packages.size) {
    const previous = previousCatalogs(root, staged);
    for (const [name, entries] of packages) errors.push(...verifyPackage(root, name, entries, previous));
  }
  return errors;
}

function main(args = process.argv.slice(2)) {
  const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]);
  const errors = verifyCatalogs(root, args.includes("--staged"));
  if (errors.length) process.stderr.write(errors.join("\n") + "\n");
  else process.stdout.write("Both Foundry catalogs resolve validated pins on their declared branches.\n");
  return errors.length ? 1 : 0;
}

if (require.main === module) process.exit(main());
module.exports = { CATALOGS, git, readCatalog, layoutOf, editionPlugins, branchRef, verifyEntry, verifyCatalogs, main };
