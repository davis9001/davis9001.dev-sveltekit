---
title: "*Space Sites: Personal Pages Powered by Discord and SvelteKit"
description: "How I’m building a Cloudflare-hosted SvelteKit app that lets *Space members create their own websites using Discord DMs."
publishedAt: 2025-04-09T18:00:00Z
summary: "A behind-the-scenes look at how I’m combining Cloudflare, SvelteKit, and Discord to help *Space members publish their thoughts to a public web page—just by messaging a bot."
tags: [sveltekit, cloudflare, discord, web-development, community]
---

For the past few weeks, I’ve been building something fun and a little magical
for [*Space](https://starspace.group/): A way for any member to create their own
personal website at `my.starspace.group/{slug}` where they can post updates
about their progress...

The idea is to make public self-expression as frictionless as possible for
*Space members, and to lean into tools we already love and use every day. No
separate login, no fiddling with HTML. Just open Discord, talk to the My *Space
bot, and your words show up on your public page.

## **How It Will Work**

At the core, it’s a SvelteKit app running on Cloudflare Pages, using Cloudflare
KV for fast, lightweight storage. When a *Space member sends a note to the My
*Space bot on Discord, the message will get parsed and saved in KV, associated
with their Discord ID and a personal slug (like `my.starspace.group/davis9001`).

Then, anyone will be able to visit that URL and see the notes that member has
chosen to share. It’s like a living notebook that updates in real time from the
place where our community is already hanging out and chatting.

Any member of *Space will be able to create their page at
`my.starspace.group/{slug}` by visiting the website
[https://my.starspace.group](https://my.starspace.group).

### **The Stack**

This project uses a few of my favorite things:

- **SvelteKit** for its speed, simplicity, and flexibility.
- **Cloudflare Workers + KV** for cost-effective serverless hosting and storage.
- **Discord OAuth** for login, ensuring that only verified *Space members can
  manage their pages.
- **The Discord API** to connect messages from the My *Space bot to published
  page.

It’s all serverless, which means it scales well without me having to worry about
ops. And it keeps the barrier low—something important when building tools for a
community where not everyone is technical.

### **Why This Matters**

*Space is about more than coworking. It’s a platform for mutual support, growth,
and creativity. Giving each member their own small corner of the web where they
can share their notes, ideas, or even a random thought they had during
lunch—it’s part of the vision. This app makes that easy.

We expect people will use it to:

- Post progress updates on projects
- Share reading lists
- Reflect on personal growth
- Share their goals and dreams for work and life

And it's only just beginning.

## **Coming Soon**

Eventually I want to allow user's to sign up directly using the bot, have
updates update the page in realtime, run a `/timebox` command that allows users
to set a time limit for a task or project, and more.
