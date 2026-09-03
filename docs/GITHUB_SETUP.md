# GitHub Setup Checklist

Do this once after the repository exists.

## 1. Repository features

GitHub repository → **Settings → General / Features**:

- Enable Issues.
- Enable Projects only if you plan to use a GitHub Project board.
- Keep Discussions optional.

## 2. Actions

**Settings → Actions → General**:

- Allow GitHub Actions for the repository.
- Keep the workflow `GITHUB_TOKEN` permissions minimal; individual workflows declare what they need.
- Do not enable broad write access only because coding agents need it. Coding agents authenticate separately.

## 3. Protect `main`

Create a repository Ruleset for the default branch:

- Target: `main` / default branch.
- Require a pull request before merging.
- Require status checks before merging.
- Required check: `validate` from `.github/workflows/ci.yml` after the first CI run exists.
- Block force pushes.
- Block branch deletion.
- Do **not** require a human approval initially if autonomous agent merging is desired.
- Do not give bots bypass permission unless there is a proven need.

This allows autonomous AI development while keeping `main` behind CI.

## 4. Create the AI GitHub token

GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.

Create a dedicated token:

- Resource owner: repository owner.
- Repository access: **Only select repositories** → Monster Girl Delivery.
- Permissions: use `docs/GITHUB_AI_ACCESS.md`.
- Give it an expiration date and rotate it periodically.

Do not commit the token.

## 5. Add it to Codespaces

GitHub → **Settings → Codespaces → Secrets → New secret**:

- Name: `GH_TOKEN`
- Value: the fine-grained PAT
- Repository access: Monster Girl Delivery only

Create a **new Codespace** or reload it after adding the secret.

Then run:

```bash
gh auth status
bash tools/github/check-access.sh
```

## 6. Jules

1. Open Jules and connect GitHub.
2. Authorize only this repository initially.
3. Jules automatically reads root `AGENTS.md`.
4. Use Jules for scoped Issues, reviews, fixes, refactors, and PRs.

Jules has its own GitHub authorization. It does not use `GH_TOKEN` from your Codespace.

## 7. Renovate

Install/enable the Renovate GitHub App for this repository.

The repository already contains `renovate.json`.

Recommended initial policy:

- dependency PRs enabled;
- CI required;
- no automatic major-version merges;
- review Renovate behavior before enabling any automerge.

## 8. Codespaces

Create Codespaces from this repository after `.devcontainer/devcontainer.json` is committed.

The container installs/uses:

- Bun;
- GitHub CLI;
- forwarded Phaser/Vite dev-server port `8080`;
- Biome VS Code extension.

For normal local-network development use Vite `--host`. In Codespaces, use the forwarded port URL supplied by GitHub rather than a private LAN IP.

## 9. Hosting

Current recommendation:

- Development: Codespaces forwarded Vite port.
- Public web builds: GitHub Pages when needed.
- Cloudflare: **not required now**.

Consider Cloudflare Pages/Workers later only if the project gains a concrete need such as custom edge logic, APIs, R2/KV/D1, advanced preview infrastructure, or a Cloudflare-managed domain stack.
