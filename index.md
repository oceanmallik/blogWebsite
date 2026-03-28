---
layout: default
title: Home
---

# Welcome to my blog

I write about things I build, learn, and break while coding.

## Latest Posts

{% if site.posts.size > 0 %}
{% assign latest_post = site.posts.first %}
<div class="home-layout">
	<aside class="latest-feature" aria-label="Latest full post">
		{% if latest_post %}
		<article class="latest-post-full">
			<h3><a href="{{ latest_post.url | relative_url }}">{{ latest_post.title }}</a></h3>
			<p class="date">{{ latest_post.date | date: "%B %d, %Y" }}</p>
			<div class="latest-post-content">
				{{ latest_post.content }}
			</div>
		</article>
		{% endif %}
	</aside>

	<section class="home-feed" aria-label="Post previews">
		<div class="posts-feed">
		{% for post in site.posts %}
			{% assign card_image = post.image %}
			{% if card_image == nil or card_image == '' %}
				{% assign img_split = post.content | split: '<img' %}
				{% if img_split.size > 1 %}
					{% assign src_split = img_split[1] | split: 'src="' %}
					{% if src_split.size > 1 %}
						{% assign card_image = src_split[1] | split: '"' | first %}
					{% endif %}
				{% endif %}
			{% endif %}
			<article class="post-card{% if card_image == nil or card_image == '' %} post-card--no-media{% endif %}">
				<div class="post-card-copy">
					<h3><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h3>
					<p class="date">{{ post.date | date: "%B %d, %Y" }}</p>
					{% if post.excerpt %}
					<p>{{ post.excerpt | strip_html | truncate: 180 }}</p>
					{% endif %}
				</div>
				{% if card_image and card_image != '' %}
				<a class="post-card-media" href="{{ post.url | relative_url }}" aria-label="Read {{ post.title | escape }}">
					<img src="{{ card_image | relative_url }}" alt="{{ post.title | escape }}" loading="lazy" decoding="async">
				</a>
				{% endif %}
			</article>
		{% endfor %}
		</div>
	</section>
</div>
{% else %}
No posts yet. Add Markdown files to `_posts` using `YYYY-MM-DD-title.md`.
{% endif %}