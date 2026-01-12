# AGENTS.md

This file provides guidance for AI coding assistants working on the Chat UI project.

## Project Overview

Chat UI is a SvelteKit-based chat interface for LLMs that powers [HuggingChat](https://huggingface.co/chat). The project supports OpenAI-compatible APIs and includes features like multi-model support, MCP tool integration, Electron desktop app, and Docker deployment.

**Key Technologies:**
- **Framework**: SvelteKit 2.x with Svelte 5
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom theme
- **Testing**: Vitest (client, SSR, and server workspaces)
- **Package Manager**: npm (version 9.5.0)

---

## Dev Environment

### Getting Started

```bash
# Clone and install dependencies
git clone https://github.com/huggingface/chat-ui
cd chat-ui
npm install

# Create environment file (copy from template)
cp .env .env.local
# Edit .env.local with your API keys
```

### Essential Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 5173 |
| `npm run dev -- --open` | Start dev server and open browser |
| `npm run build` | Build production version (SvelteKit adapter-node) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run Prettier and ESLint checks |
| `npm run format` | Auto-format code with Prettier |
| `npm run check` | Run SvelteKit sync and svelte-check for type errors |
| `npm run check:watch` | Watch mode for type checking |
| `npm run test` | Run all test suites (client, SSR, server) |

### Environment Configuration

**Required for local development:**
```env
OPENAI_BASE_URL=https://router.huggingface.co/v1
OPENAI_API_KEY=hf_************************
```

**Optional database:**
- When `MONGODB_URL` is not set, Chat UI uses an embedded MongoDB that persists to `./db`
- For production, set `MONGODB_URL` to your MongoDB connection string

**Key environment variables:**
| Variable | Description |
|----------|-------------|
| `PUBLIC_APP_NAME` | Application title (default: "ChatUI") |
| `PUBLIC_APP_ASSETS` | Asset folder in `static/` (default: "chatui") |
| `OPENAI_BASE_URL` | OpenAI-compatible API endpoint |
| `OPENAI_API_KEY` | API authentication token |

### Electron Development

```bash
npm run electron:dev    # Run dev server + Electron concurrently
npm run electron:build  # Build Electron app for distribution
npm run electron:start  # Run packaged Electron app
```

### Docker

```bash
# Development build
docker build --build-arg INCLUDE_DB=true -t chat-ui-test:latest .

# Run with environment
docker run -p 3000:3000 -e OPENAI_BASE_URL=... -e OPENAI_API_KEY=... chat-ui-test:latest
```

---

## Testing

### Running Tests

```bash
# Run all test workspaces
npm run test

# Run specific test types
npm run test -- --workspace=client    # Browser tests (Playwright)
npm run test -- --workspace=ssr       # SSR tests
npm run test -- --workspace=server    # Node.js utility tests
```

### Test Structure

| Workspace | Environment | Pattern | Location |
|-----------|-------------|---------|----------|
| client | browser (Playwright) | `*.svelte.{test,spec}.{js,ts}` | `src/**/*.svelte.{test,spec}.{js,ts}` |
| ssr | node | `*.ssr.{test,spec}.{js,ts}` | `src/**/*.ssr.{test,spec}.{js,ts}` |
| server | node | `*.{test,spec}.{js,ts}` | `src/**/*.{test,spec}.{js,ts}` (excluding svelte tests) |

### Test Setup Files

- Client tests: `./scripts/setups/vitest-setup-client.ts`
- Server tests: `./scripts/setups/vitest-setup-server.ts`

### CI Testing Pipeline

The lint-and-test workflow runs on every PR and push to main:
1. **Lint job**: Prettier + ESLint checks
2. **Type check job**: `npm run check` (svelte-check + TypeScript)
3. **Test job**: Vitest with Playwright (installs browser binaries)
4. **Build check job**: Docker build verification

---

## Pull Requests

### Branch Naming Convention

```
feature/<short-description>    # New features
fix/<short-description>        # Bug fixes
chore/<short-description>      # Maintenance tasks
docs/<short-description>       # Documentation updates
refactor/<short-description>   # Code refactoring
```

### Commit Message Format

The project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

- type: feat, fix, docs, style, refactor, test, chore
- scope: optional component area (e.g., chat, nav, api)
```

**Examples:**
```
feat(chat): add streaming response indicator
fix(api): resolve authentication token expiry
docs(readme): update installation instructions
test(server): add user model validation tests
```

### PR Requirements

Before submitting a PR:

1. **Run linting**: `npm run lint`
2. **Run type checking**: `npm run check`
3. **Run tests**: `npm run test`
4. **Build verification**: `npm run build` succeeds

### PR CI Checks

All PRs must pass:
- Linting (Prettier + ESLint)
- Type checking (svelte-check)
- Tests (Vitest)
- Docker build verification

---

## Project Conventions

### Code Style

**Formatting**: Prettier with Svelte and Tailwind plugins
- Configured in `prettier.config.js` (implicit via package.json)
- Run `npm run format` to auto-format

**Linting**: ESLint with TypeScript and Svelte support
- ESLint config extends `eslint-config-prettier`
- Plugins: `@typescript-eslint/eslint-plugin`, `eslint-plugin-svelte`

**TypeScript Configuration**:
- Extends SvelteKit tsconfig
- Strict mode enabled
- Target: ES2018

### Svelte 5 Patterns

This project uses Svelte 5 with runes (`$state`, `$props`, `$derived`):

```svelte
<script lang="ts">
  let { count = $bindable(0) }: { count?: number } = $props();
  
  const double = $derived(count * 2);
</script>

<button onclick={() => count++}>
  Count: {count} (double: {double})
</button>
```

**Key patterns:**
- Use `$props()` for component props
- Use `$state()` for reactive state
- Use `$derived()` for computed values
- Use `$effect()` for side effects
- Use `$bindable()` for two-way binding

### Tailwind CSS

**Custom theme** (`tailwind.config.cjs`):
- Custom gray palette: `gray-600` through `gray-950`
- Custom font sizes: `xxs` (0.625rem), `smd` (0.94rem)
- Plugins: `tailwind-scrollbar`, `@tailwindcss/typography`

**Styling approach:**
- Dark mode support via `darkMode: "class"`
- Custom gray colors for dark theme design
- Use `scrollbar-thin` and `scrollbar-thumb` for custom scrollbars

### Project Structure

```
chat-ui/
├── src/
│   ├── lib/
│   │   ├── components/     # Reusable Svelte components
│   │   │   ├── chat/       # Chat-specific components
│   │   │   ├── icons/      # Icon components
│   │   │   ├── mcp/        # MCP-related components
│   │   │   └── ...         # Other component categories
│   │   ├── server/         # Server-only code (API, DB, etc.)
│   │   ├── stores/         # Svelte stores
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   ├── actions/        # Svelte actions
│   │   ├── jobs/           # Background job handlers
│   │   ├── migrations/     # Database migrations
│   │   └── workers/        # Web workers
│   ├── routes/             # SvelteKit routes
│   │   ├── api/            # API endpoints
│   │   ├── (auth)/         # Auth-related routes
│   │   └── ...             # Page routes
│   ├── styles/             # Global styles
│   └── hooks.*.ts          # SvelteKit hooks (server, client)
├── static/                 # Static assets
├── scripts/                # Build and utility scripts
├── models/                 # AI model configurations
├── prompts/                # System prompt templates
├── chart/                  # Helm chart for Kubernetes
├── db/                     # Embedded MongoDB data (if used)
└── docs/                   # Documentation
```

### Component Naming

- **Svelte components**: PascalCase (e.g., `NavMenu.svelte`, `ChatInput.svelte`)
- **Utility files**: camelCase (e.g., `buildPrompt.ts`, `createShareLink.ts`)
- **Test files**: `{filename}.{test,spec}.{js,ts}` or `{filename}.ssr.{test,spec}.{js,ts}`

### Icon Usage

Icons are imported via `unplugin-icons` using Iconify:
```svelte
<script>
  import IconArrowLeft from '~icons/lucide/arrow-left';
</script>

<IconArrowLeft />
```

Available icon sets: `lucide`, `carbon`, `eos-icons`, `bi` (configured in package.json)

### Server-Client Separation

**Server-only** (`src/lib/server/`):
- Database operations (MongoDB)
- API clients (OpenAI, HuggingFace)
- Authentication logic
- Workers and background jobs

**Shared** (`src/lib/`):
- Types and interfaces
- Components
- Utility functions
- Svelte stores

**Never import from `$lib/server` in client code** — this will cause build errors.

### Database

- **Primary database**: MongoDB (version 6/7)
- **ORM/ODM**: Native MongoDB driver (`mongodb` package)
- **Session storage**: In-memory or MongoDB-based
- **Migrations**: Located in `src/lib/migrations/`

### API Layer

- **Framework**: Elysia (for some API routes) + SvelteKit API endpoints
- **OpenAI compatibility**: All LLM calls use OpenAI API format
- **MCP tools**: Model Context Protocol support for function calling

---

## Build Configuration

### Vite Config (`vite.config.ts`)

- **Dev server**: Port 5173 (configurable via PORT env var)
- **Allowed hosts**: Supports ngrok-free.app subdomains for tunnel testing
- **Optimized deps**: Includes `uuid`, `sharp`, `clsx`
- **Test workspaces**: Three separate workspaces (client, ssr, server)

### SvelteKit Config (`svelte.config.js`)

- **Adapter**: `@sveltejs/adapter-node` for production deployment
- **CSP**: Content Security Policy configured (iframe disabled by default)
- **CSRF**: Disabled (handled in `hooks.server.ts` for multiple origins)
- **Base path**: Configurable via `APP_BASE` env var

### TypeScript Config (`tsconfig.json`)

- Strict mode enabled
- Extends SvelteKit generated tsconfig
- Target: ES2018
- `allowJs` and `checkJs` enabled for incremental migration

---

## Additional Resources

- **Main README**: [README.md](./README.md) - Setup and feature documentation
- **Appearance Settings**: [APPEARANCE_SETTINGS.md](./APPEARANCE_SETTINGS.md) - Theming customization
- **Electron App**: [ELECTRON_README.md](./ELECTRON_README.md) - Desktop app development
- **Tabbed Windows**: [TABBED_WINDOWS.md](./TABBED_WINDOWS.md) - Multi-window feature docs
