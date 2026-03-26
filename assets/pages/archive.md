---
layout: default
title: Archive
permalink: /archive/
---

# Archive

Browse all posts by year.

{% assign posts_by_year = site.posts | group_by_exp: "post", "post.date | date: '%Y'" | sort: "name" | reverse %}

{% for year_group in posts_by_year %}
## {{ year_group.name }}

<ul class="archive-list">
{% for post in year_group.items %}
  <li>
    <span class="archive-date">{{ post.date | date: "%b %d" }}</span>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
    {% if post.tags %}
      <span class="tags">
        {% for tag in post.tags %}
          <span class="tag">#{{ tag }}</span>
        {% endfor %}
      </span>
    {% endif %}
  </li>
{% endfor %}
</ul>
{% endfor %}
