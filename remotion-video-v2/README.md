# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

The Contextly hero demo. One composition, `HeroDemo` (1920x1080, 30fps),
assembled in `src/HeroDemo.tsx` from five scenes with 12-frame fades:

| Scene | Frames | What it shows |
| --- | --- | --- |
| `CreateProject` | 230 | The Projects page — cursor clicks **New Project**, fills the Create New Project modal (name + allowed origin), and the new project card appears |
| `DashboardIngest` | 220 | The Knowledge Base tab — cursor types a URL, clicks **Ingest**, the source processes to `completed` |
| `EmbedCode` | 150 | Split screen: `index.html` being edited on the left, the live site on the right; the widget appears the moment the script tag is saved |
| `ChatConversation` | 180 | The widget answering, with sources |
| `OutroCTA` | 120 | Logo, tagline, URL |

The order follows what a real user does on the site: create a project, ingest
content, paste the embed snippet, then chat.

Three scenes mirror real product UI — keep them in sync if the app changes:

- `CreateProject` ← `frontend/app/projects/page.tsx` (header copy, empty state,
  the Create New Project modal fields, and the project card).
- `DashboardIngest` ← `frontend/app/projects/[projectId]/tabs/KnowledgeBaseTab.tsx`
  (copy, table columns, status badges) and the `GlobalNavbar` breadcrumb.
  Its layout is absolute because `CURSOR_KEYS` are canvas pixel coordinates
  derived from the same constants — move a card, the cursor follows.
- `EmbedCode` ← the embed snippet from `frontend/app/projects/[projectId]/page.tsx`.

Shared pieces live in `src/shared/`: `AppWindow` (browser chrome + GlobalNavbar
breadcrumb, and the geometry both dashboard scenes lay out against), `CodeEditor` (syntax-highlighted, types
lines marked `typed`), `Cursor` (keyframed pointer with click rings), and
`Caption` (bottom-center, plain zinc type — deliberately not a coloured pill,
to match the landing page).

`src/shared/ChunkParticles.tsx` is unused — left in place, not wired to anything.

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run dev
```

**Render video**

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
