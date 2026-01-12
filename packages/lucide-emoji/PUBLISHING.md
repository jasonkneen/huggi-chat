# Publishing Guide

## Setup (One-time)

1. **Update package.json** - Change `@yourusername` to your npm username:
   ```json
   "name": "@your-npm-username/lucide-emoji"
   ```

2. **Login to npm:**
   ```bash
   npm login
   ```

3. **Verify login:**
   ```bash
   npm whoami
   ```

## Publishing Steps

### 1. Build the Package

```bash
cd packages/lucide-emoji
npm run build
```

This creates the `dist/` folder with compiled JavaScript and type definitions.

### 2. Test Locally (Optional)

Test the package in another project:

```bash
# In this directory
npm pack

# This creates a .tgz file you can install elsewhere
# In another project:
npm install /path/to/lucide-emoji-1.0.0.tgz
```

### 3. Publish to npm

```bash
npm publish --access public
```

**Note:** Scoped packages (`@username/package`) are private by default. Use `--access public` to make it public.

### 4. Verify

Visit: `https://npmjs.com/package/@your-username/lucide-emoji`

## Version Updates

Update version in `package.json`, then:

```bash
npm version patch  # 1.0.0 → 1.0.1
npm version minor  # 1.0.0 → 1.1.0
npm version major  # 1.0.0 → 2.0.0

npm publish --access public
```

## Checklist Before Publishing

- [ ] Update version in `package.json`
- [ ] Run `npm run build` successfully
- [ ] README.md is up to date
- [ ] All tests pass (if you add tests)
- [ ] No TypeScript errors
- [ ] Update CHANGELOG (if you create one)

## Common Issues

**"You cannot publish over the previously published version"**
- Update the version number in `package.json`

**"Package name too similar to existing package"**
- Choose a different name or use a scoped package (`@username/package`)

**"403 Forbidden"**
- You need to be logged in: `npm login`
- Or you don't have publish rights for that package name

## Distribution Tags

```bash
# Publish as beta
npm publish --tag beta

# Users install with:
npm install @username/lucide-emoji@beta
```

## Unpublishing

**Only within 72 hours:**
```bash
npm unpublish @username/lucide-emoji@1.0.0
```

**After 72 hours**, you can only deprecate:
```bash
npm deprecate @username/lucide-emoji@1.0.0 "This version has issues, use 1.0.1+"
```
