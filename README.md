# Ocean Mallik Blog

Personal blog powered by Jekyll and hosted on GitHub Pages.

- Live site: https://blog.oceanmallik.com/
- Author: Ocean Mallik
- Timezone: Asia/Dhaka

## Overview

This repository contains the full source for a content-first personal blog, including:

- Post publishing with date-based permalinks
- A homepage with a featured latest post and post cards
- Archive page grouped by year
- About, Support, and custom 404 pages
- Multiple UI themes (Sepia, Cyberpunk, White, Black)

## Tech Stack

- Jekyll
- GitHub Pages
- Liquid templates
- Markdown (Kramdown)
- Plain CSS and vanilla JavaScript

## Project Structure

```text
.
├── _config.yml            # Jekyll configuration
├── _layouts/              # HTML layouts
│   ├── default.html       # Global site shell, nav, footer, theme switcher
│   └── post.html          # Blog post template + reading-time script
├── _posts/                # Blog posts (YYYY-MM-DD-title.md)
├── assets/
│   ├── css/style.css      # Site styles
│   ├── images/            # Post/site images
│   └── pages/             # Standalone pages (about, archive, support, 404)
├── index.md               # Homepage
├── robots.txt             # Search engine crawl rules
├── CNAME                  # Custom domain for GitHub Pages
└── README.md
```

## Local Development

### 1. Install prerequisites

You need Ruby and Bundler/Jekyll.

```bash
gem install bundler jekyll
```

### 2. Run locally

From the project root:

```bash
jekyll serve
```

Then open:

- http://127.0.0.1:4000

If you add a `Gemfile` later, prefer:

```bash
bundle install
bundle exec jekyll serve
```

## Writing a New Post

Create a file in `_posts` using this format:

```text
YYYY-MM-DD-your-post-title.md
```

Example front matter:

```yaml
---
layout: post
title: "Your Post Title"
date: 2026-04-01
tags: [dev, notes]
---
```

Then write content in Markdown below the front matter.

## Existing Pages

- `/` Home
- `/archive/` Archive by year
- `/about/` About page
- `/support/` Support options
- `/404.html` Custom not found page

## Configuration Notes

Key settings live in `_config.yml`:

- `title`, `description`, `author`, `email`
- `url` and `baseurl`
- `permalink: /:year/:month/:day/:title/`
- Default layout assignment for posts and pages

## Deployment

This site is designed for GitHub Pages.

Typical flow:

1. Commit your changes.
2. Push to the branch configured in GitHub Pages.
3. GitHub Pages rebuilds and publishes automatically.

The `CNAME` file keeps the custom domain (`blog.oceanmallik.com`) attached.

## Maintenance

- Keep post filenames and `date` values consistent.
- Optimize images in `assets/images` for faster load times.
- Update `robots.txt` and metadata when adding major sections.
- Periodically review old posts/pages for broken links.

## License

No license file is currently defined in this repository. Add a `LICENSE` file if you want to clarify usage permissions.
