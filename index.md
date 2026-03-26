---
layout: default
title: Home
---

# Welcome to my blog

I write about things I build, learn, and break while coding.

## Latest Posts

{% if site.posts.size > 0 %}
<div class="posts-feed">
{% for post in site.posts %}
	<article class="post-card">
		<h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
		<p class="date">{{ post.date | date: "%B %d, %Y" }}</p>
		{% if post.excerpt %}
		<p>{{ post.excerpt | strip_html | truncate: 180 }}</p>
		{% endif %}
	</article>
{% endfor %}
</div>
{% else %}
No posts yet. Add Markdown files to `_posts` using `YYYY-MM-DD-title.md`.
{% endif %}