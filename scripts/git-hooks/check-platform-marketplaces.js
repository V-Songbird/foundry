#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CATALOGS = {
  Claude: ".claude-plugin/marketplace.json",
  Codex: ".agents/plugins/marketplace.json",
};

function git(root, args) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
  return execFileSync("git", args, { cwd: root, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function readCatalog(root, file, staged = false) {
  return JSON.parse(staged ? git(root, ["show", `:${file}`]) : fs.readFileSync(path.join(root, file), "utf8"));
}

function branchRef(root, platform) {
  for (const ref of [`refs/heads/${platform}`, `refs/remotes/origin/${platform}`]) {
    try { git(root, ["rev-parse", "--verify", ref]); return ref; } catch {}
  }
  throw new Error(`missing ${platform} branch; fetch the platform branches first`);
}

function verifyEntry(root, entry, platform, owner) {
  const errors = [];
  if (!/^[a-z][a-z0-9-]*$/.test(entry.name || "")) return ["invalid plugin name"];
  const source = entry.source || {};
  if (source.source !== "url" || source.url !== `https://github.com/V-Songbird/${entry.name}.git`) {
    errors.push(`${entry.name}: source must reference its plugin repository`);
  }
  if (source.ref !== platform) errors.push(`${entry.name}: expected ref ${platform}`);
  if (!/^[0-9a-f]{40}$/.test(source.sha || "")) errors.push(`${entry.name}: a full source.sha is required`);
  if (errors.length) return errors;
  const repo = path.join(root, entry.name);
  try {
    const ref = branchRef(repo, platform);
    git(repo, ["merge-base", "--is-ancestor", source.sha, ref]);
    const manifestPath = platform === "Codex" ? ".codex-plugin/plugin.json" : ".claude-plugin/plugin.json";
    const manifest = JSON.parse(git(repo, ["show", `${source.sha}:${manifestPath}`]));
    if (manifest.name !== entry.name) errors.push(`${entry.name}: pinned manifest name does not match`);
    if (owner && (manifest.author?.name !== owner.name || manifest.author?.email !== owner.email)) {
      errors.push(`${entry.name}: pinned author does not match the marketplace owner`);
    }
    if (platform === "Codex") {
      if (!manifest.version) errors.push(`${entry.name}: pinned Codex manifest needs a version`);
      if (!manifest.interface?.composerIcon) errors.push(`${entry.name}: pinned Codex manifest needs a composerIcon`);
      else {
        const icon = manifest.interface.composerIcon;
        if (!/^\.\/assets\/[A-Za-z0-9._-]+\.svg$/.test(icon)) errors.push(`${entry.name}: invalid composer icon path`);
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

function verifyCatalogs(root, staged = false) {
  const errors = [];
  let owner;
  try { owner = readCatalog(root, CATALOGS.Claude, staged).owner; }
  catch (error) { return [`Cannot read Claude marketplace: ${error.message}`]; }
  if (!owner?.name || !owner?.email) errors.push("Claude marketplace owner name and email are required");
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
        errors.push(...verifyEntry(root, entry, platform, owner));
      }
    } catch (error) { errors.push(`${file}: ${error.message}`); }
  }
  return errors;
}

function main(args = process.argv.slice(2)) {
  const root = git(process.cwd(), ["rev-parse", "--show-toplevel"]);
  const errors = verifyCatalogs(root, args.includes("--staged"));
  if (errors.length) process.stderr.write(errors.join("\n") + "\n");
  else process.stdout.write("Both Foundry catalogs resolve validated pins on their platform branches.\n");
  return errors.length ? 1 : 0;
}

if (require.main === module) process.exit(main());
module.exports = { CATALOGS, git, readCatalog, branchRef, verifyEntry, verifyCatalogs, main };
