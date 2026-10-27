# 🌊 OceanVerse

A modern, responsive blog frontend built with pure HTML (`index.html`), CSS (`style.css`), and Vanilla JavaScript (`app.js`), powered by **Supabase**.

---

## 🚀 Features

- **Pure Vanilla Stack**: Zero framework dependencies, instant load times, and lightweight code.
- **Supabase v2 Integration**: Uses `@supabase/supabase-js@2` to fetch published articles.
- **Query & Filtering**:
  - Targets `public.posts` table with exact schema: `id, author_id, title, slug, summary, content, cover_image, is_published, created_at`.
  - Filters strictly by `.eq('is_published', true)`.
  - Orders by `created_at` descending.
- **Responsive Layout**: Fluid CSS Grid that seamlessly adapts from widescreen desktop monitors down to mobile viewports.
- **View Transition & State**:
  - Home view renders article cards with cover image, date, reading time estimate, title, and summary.
  - Clicking any card hides the grid and reveals the full article view.
  - "Back to Posts" button (top and bottom) switches back to the grid.
  - Supports deep linking and browser back/forward buttons via `# /post/:slug`.
- **Markdown & HTML Formatting**: Full GitHub Flavored Markdown (GFM) parsing powered by **Marked.js** and sanitized with **DOMPurify** (headings, fenced code blocks with language support, quotes, tables, lists, links, bold/italics, and images).
- **Admin Live Markdown Preview**: Side-by-side split view and write/preview tabs in the Admin Post Editor with real-time markdown rendering.
- **Oceanic Dark / Light Mode**: Beautiful ocean theme with system preference detection and manual toggle.
- **Interactive Search**: Real-time search filter across article titles and summaries.
- **Supabase Authentication & Role Detection**:
  - Email/Password Sign In and Sign Up modal with tab switching.
  - Automatically fetches the user's row from `public.profiles` upon authentication.
  - Displays user avatar, `display_name`, and distinct role badge (`👑 Admin` vs `Visitor`) in the navbar.
  - Keeps `currentUser` and `currentUserRole` in reactive application state and on `window`.

---

## 🗄️ Supabase Database Schemas

### 1. Posts Table (`public.posts`)

```sql
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users(id),
  title text not null,
  slug text unique,
  summary text,
  content text,
  cover_image text,
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.posts enable row level security;

-- Allow public read access to published posts
create policy "Allow public read access for published posts"
on public.posts
for select
using (is_published = true);
```

### 2. User Profiles Table (`public.profiles`)

```sql
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  display_name text,
  avatar_url text,
  role text default 'visitor' check (role in ('visitor', 'admin'))
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Allow users to read profiles
create policy "Allow read access to profiles"
on public.profiles
for select
using (true);

-- Allow authenticated users to manage their profile
create policy "Allow users to update own profile"
on public.profiles
for update
using (auth.uid() = id);

create policy "Allow users to insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);
```

### 3. Comments Table (`public.comments`)

```sql
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.comments enable row level security;

-- Allow anyone to read comments
create policy "Allow read access to comments"
on public.comments for select
using (true);

-- Allow authenticated users to add comments
create policy "Allow authenticated users to add comments"
on public.comments for insert
with check (auth.uid() = user_id);

-- Allow comment authors or admins to delete comments
create policy "Allow authors and admins to delete comments"
on public.comments for delete
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);
```

---

## ⚙️ Configuration

Supabase connection credentials are configured directly in [`app.js`](file:///home/oceanmallik/Desktop/blogWebsite/app.js):

```javascript
const SUPABASE_URL = 'https://juqrglgjjoxvdkhqquvz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_z9Hk9GwzczIGsJWZpHoh0w_grcfZbAX';
```

Row Level Security (RLS) policies on your Supabase tables safeguard all data, ensuring that public readers can only fetch published posts, while write/delete actions require proper authentication and role authorization.

---

## 💻 Running Locally

Serve the directory with any static server:

```bash
# Using Python 3
python3 -m http.server 8080

# Or using Node.js npx serve
npx serve .
```

Then visit `http://localhost:8080` in your web browser.

