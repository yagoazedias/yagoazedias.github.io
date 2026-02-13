# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog for Yago Azedias built with Jekyll 4.4.1 using the **minimal-mistakes-jekyll** theme (v4.27.1). Hosted on GitHub Pages at `blog.yagoazedias.com`.

## Build & Development Commands

```bash
# Install dependencies
bundle install

# Run local development server
make run
# or directly: bundle exec jekyll serve

# Production build (used by CI)
JEKYLL_ENV=production bundle exec jekyll build
```

## Deployment

Automated via GitHub Actions (`.github/workflows/jekyll.yml`). Pushing to `main` triggers a build and deploy to GitHub Pages. No manual deployment needed.

## Content Structure

- `_posts/` — Blog posts in Markdown, named `YYYY-MM-DD-title.markdown`
- `about.markdown` — About page (`/about/`)
- `index.markdown` — Home page, uses theme's `home` layout
- `404.html` — Custom 404 page
- `CNAME` — Custom domain configuration

## Configuration

- `_config.yml` — Jekyll site config (theme, plugins, metadata)
- Plugins: `jekyll-feed` (RSS), `jekyll-seo-tag` (SEO meta tags)
- Posts use YAML front matter with `layout`, `title`, `date`, and `categories`
