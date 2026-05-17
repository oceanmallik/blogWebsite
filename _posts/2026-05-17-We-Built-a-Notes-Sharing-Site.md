---
layout: post
title: "We Built a Notes-Sharing Site for Our University - Here's How It Went"
date: 2026-04-08
---

# We Built a Notes-Sharing Site for Our University - Here's How It Went

> No fancy pitch. Just a bunch of SE students tired of chasing notes in WhatsApp groups.

**By Axiom Vessel · Daffodil International University · May 2026**

---

Okay so let's be honest - every university student has been there. It's the night before a mid-term, you're desperately scrolling through a 500-message WhatsApp group trying to find that one PDF someone shared three weeks ago, and you just... can't. It's buried. It's gone. You're cooked.

That was basically us. Every semester. Without fail.

We're a small team of Software Engineering students at Daffodil International University (DIU), Bangladesh - and at some point we just got tired of it. Instead of complaining again, we figured, why not actually build something? So we did. We built **DIU Notes Buddy**.

---

![Photo of Site Banner](/assets/images/Site_Banner.png)

## So What Even Is It?

It's a pretty simple website. No login, no account, no subscription. You go to **[diunotesbuddy.live](https://diunotesbuddy.live/)**, you find your course, and you grab the notes. That's it.

We know it doesn't sound revolutionary. But that's kind of the point - sometimes the most useful thing isn't fancy, it's just *there when you need it*.

> *"Helping Daffodil International University students excel in their studies. A note sharing site at your service."*

Right now the focus is on the Software Engineering department, since, well, that's us. Notes are organized by subject so you're not just dumped into a wall of files. There's also a section for other resources - things that are useful but don't quite fit the "course notes" category.

---

## How We Built It

We kept the tech stack really simple, honestly on purpose. No React, no fancy framework, no over-engineering. Just the basics - the kind of stuff you can pick up and understand quickly even as a student:

| Tech | What it does |
|---|---|
| `HTML` | Page structure and content |
| `CSS` | Styling and layout |
| `JavaScript` | Interactivity |
| `Python` | Auto-generates the notes index |
| `GitHub Actions` | CI/CD and auto-deployment |

The Python part is actually pretty neat - we wrote a script that auto-generates the notes index so we don't have to manually update an HTML file every time someone adds a new PDF. It just runs and keeps things tidy. GitHub Actions handles the deployment side, so pushing to main means the site updates automatically. No manual fiddling.

Nothing groundbreaking in terms of tech, but honestly building and shipping something end-to-end - domain, deployment, the whole thing - as a student team? That part felt good.

---

## What We Actually Learned

Building for real users (our own classmates) hits differently than class assignments. You suddenly care a lot more about whether things actually work, whether the file structure makes sense, whether a junior student can find what they need without getting confused.

We also got a crash course in the boring-but-important stuff - setting up a custom domain, making GitHub Actions not break on you, writing a generator script that doesn't corrupt your index when someone adds a weirdly-named file. Real stuff.

> 💡 The most valuable lesson? **Ship it.** A working, simple site beats a perfect, non-existent one every time.

There's also something weirdly motivating about seeing your friends actually use what you built. Like, that's real. That's not a grade - that's someone finding a note they needed at 11pm before an exam. That matters.

---

## What's Next?

Honestly, we're still figuring that out. The site works, it's live, after launch, student may use it. For now that's enough. But there's definitely a lot of room to grow - better search, more departments, maybe a proper contribution flow so students can upload their own notes more easily.

The whole thing is open source on GitHub under the [AxiomVessel](https://github.com/AxiomVessel) org, so if you're a DIU student and want to contribute your notes or help improve the site, you're more than welcome. The more people share, the more useful it gets for everyone.

And if you're a student from another university reading this thinking *"we need something like this"* - go build it. It's not as hard as it sounds, and it's way more satisfying than you'd expect.

---

**Check it out, share your notes, or contribute to the project.**
[**🌐 Visit diunotesbuddy.live**](https://diunotesbuddy.live/)

