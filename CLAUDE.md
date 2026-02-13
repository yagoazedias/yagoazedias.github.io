# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal blog and portfolio for Yago Azedias built with Jekyll using the **academicpages** theme (forked from minimal-mistakes). Hosted on GitHub Pages at `blog.yagoazedias.com`. Uses the `github-pages` gem which pins Jekyll to ~3.10.x.

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
- `_pages/` — Static pages (about, cv, 404, archive pages)
- `_publications/` — Publication entries
- `_talks/` — Talk entries
- `_teaching/` — Teaching entries
- `_portfolio/` — Portfolio entries
- `_data/navigation.yml` — Header navigation links
- `_layouts/`, `_includes/`, `_sass/` — Theme infrastructure (from academicpages)
- `assets/` — CSS, JS, and static assets
- `images/` — Site images
- `CNAME` — Custom domain configuration

## Configuration

- `_config.yml` — Jekyll site config (theme, plugins, metadata, collections, author profile)
- Plugins: `jekyll-feed`, `jekyll-sitemap`, `jekyll-redirect-from`, `jemoji`
- Posts use YAML front matter with `title`, `date`, `tags`, and `permalink`
- Collections (publications, talks, teaching, portfolio) are defined in `_config.yml` with default layouts
