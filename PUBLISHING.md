# Publishing Guide

This guide will help you publish your VS Code extension to the Visual Studio Code Marketplace.

## Prerequisites

1. ✅ vsce installed globally (`npm install -g @vscode/vsce`)
2. ✅ Publisher account created at [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/)
3. ⚠️  Project needs your publisher name and repository URLs

## Step 1: Update package.json

Replace these fields in `package.json` with your actual information:

```json
{
  "publisher": "YOUR_PUBLISHER_NAME",        // Your publisher name from marketplace
  "repository": {
    "url": "https://github.com/YOUR_USERNAME/chart-vscode-ext"
  },
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/chart-vscode-ext/issues"
  },
  "homepage": "https://github.com/YOUR_USERNAME/chart-vscode-ext#readme"
}
```

### Finding Your Publisher Name:
1. Go to https://marketplace.visualstudio.com/manage
2. Sign in
3. Your publisher name is shown in the "Publishers" section
4. Example: If your publisher is "johndoe", use that (not "John Doe")

## Step 2: Build the Extension

```bash
# Compile the extension
npm run compile
```

## Step 3: Package the Extension

This creates a `.vsix` file that you can install and share:

```bash
# Create .vsix package
vsce package

# Output: chart-vscode-ext-0.0.1.vsix
```

## Step 4: Test Locally (Optional)

Before publishing, test your extension:

```bash
# Install from .vsix file
code --install-extension chart-vscode-ext-0.0.1.vsix

# Or from VS Code: Extensions → ... → Install from VSIX
```

## Step 5: Publish to Marketplace

### Option A: Publish Directly (Recommended)

```bash
# Publish to marketplace
vsce publish

# For a preview version (not promoted to public)
vsce publish --pre-release
```

### Option B: Publish Specific Version

```bash
# Bump version in package.json first, then:
vsce publish patch  # 0.0.1 → 0.0.2
vsce publish minor  # 0.0.1 → 0.1.0
vsce publish major  # 0.0.1 → 1.0.0
```

### Option C: Publish Pre-release

```bash
# Add pre-release tag
vsce publish --pre-release

# Or with specific pre-release identifier
npm version 0.1.0-beta.1
vsce publish
```

## Step 6: First-Time Setup

When you publish for the first time, vsce will ask for:

1. **Personal Access Token (PAT)**:
   - Go to https://dev.azure.com/{your-organization}
   - Click "User Settings" → "Personal Access Tokens"
   - Create new token with "Marketplace" scope
   - Paste the token when vsce asks

2. **Token is saved** at:
   - Mac/Linux: `~/.vsce`
   - Windows: `%USERPROFILE%\.vsce`

## Version Management

### Semantic Versioning
```json
{
  "version": "MAJOR.MINOR.PATCH"
}
```

- **MAJOR**: Breaking changes (1.0.0 → 2.0.0)
- **MINOR**: New features (1.0.0 → 1.1.0)
- **PATCH**: Bug fixes (1.0.0 → 1.0.1)

### Pre-release Versions
```json
{
  "version": "0.1.0-beta.1"
}
```

## Publishing Checklist

Before publishing, make sure:

- [ ] `publisher` field is set correctly
- [ ] Repository URLs are correct
- [ ] `description` is clear and concise
- [ ] `displayName` is user-friendly
- [ ] Icon exists at `res/icon.svg` (128x128px recommended)
- [ ] README.md is comprehensive
- [ ] LICENSE is included
- [ ] Version number is bumped (if updating)
- [ ] Extension compiles without errors
- [ ] Tested the `.vsix` file locally

## After Publishing

### View Your Extension
Go to: `https://marketplace.visualstudio.com/items?itemName=PUBLISHER.EXTENSION_NAME`

Example: `https://marketplace.visualstudio.com/items?itemName=johndoe.chart-vscode-ext`

### Manage Your Extension
- Go to: https://marketplace.visualstudio.com/manage
- View statistics, ratings, and reviews
- Update extension info
- Manage versions

### Update Extension
To update an already published extension:

```bash
# 1. Bump version in package.json
npm version patch  # or minor/major

# 2. Build
npm run compile

# 3. Publish
vsce publish
```

## Pre-release vs Regular Release

### Pre-release (Beta/Preview)
```bash
vsce publish --pre-release
```
- Not shown in search by default
- Users must opt-in to see pre-releases
- Good for testing new features
- Separate from stable releases

### Regular Release
```bash
vsce publish
```
- Visible in search
- Available to all users
- Recommended for stable versions

## Useful Commands

```bash
# View package contents
vsce ls

# Show extension info
vsce show

# Validate package.json
vsce validate-payload

# Publish without prompting
vsce publish --no-git-tag-version
```

## Troubleshooting

### "Invalid publisher name"
→ Use the publisher identifier (e.g., "johndoe"), not the display name (e.g., "John Doe")

### "Missing Personal Access Token"
→ Create a PAT at Azure DevOps with "Marketplace" scope

### "Version already exists"
→ Bump the version number in package.json

### "Package too large"
→ Check your dependencies, remove unnecessary files from `.vsixignore`

### "Icon not found"
→ Ensure `res/icon.svg` exists (128x128px recommended)

## Resources

- [VS Code Publishing Documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/)
- [vsce GitHub Repository](https://github.com/microsoft/vscode-vsce)

## Quick Start (Copy-Paste)

```bash
# 1. Update package.json with your publisher name
# 2. Build
npm run compile

# 3. Package (test locally first)
vsce package

# 4. Test locally
code --install-extension chart-vscode-ext-0.0.1.vsix

# 5. Publish (when ready)
vsce publish --pre-release  # For preview/beta
# or
vsce publish              # For official release
```
