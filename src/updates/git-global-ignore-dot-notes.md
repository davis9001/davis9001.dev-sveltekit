---
title: A Simple Notes File in Every Project, Ignored by Git Globally
description: How I added a global ignore for a standard notes file I can create in any project.
publishedAt: 2025-02-17T14:00:00Z
summary: Learn how to set up a global ignore environment notes file for your project.
tags: [git, environment, notes]
---

# A Simple Notes File in Every Project, Ignored by Git Globally

When working on code projects it's common and important to have a place where
you can keep track of important information or notes. Whether it's for personal
projects, team collaboration, or just to remember something specific, having a
centralized location for these notes is invaluable.

I have used several centralized notes applications, up to this point my basic
routine was to use Asana for larger projects and Google Docs for smaller one off
notes. This is not an impressive solution for a modern software engineer by any
means. My hip friends are using custom emacs and vim setups or at least some
central text based tool like Obsidian. I never ended up on Obsidian because I
was happy enough with what I had and always avoid paying over time for things if
I can.

I've known that I needed a better solution and randomly this idea came to me. I
haven't yet researched it (I imagine this is far from a new idea) but... What I
ended up doing recently I feel is worth sharing in case you haven't considered
it.

## Setting Up a Git Global Ignore with a Standard Notes File Name

Some may not know this (even though I did know I never used it): You can set up
a global `.gitignore` file that applies to all repositories on that machine.

I created a file `~/.gitignore` with the following content:

```ignore filename="~/.gitignore"
**/.notes.md
```

I then followed <a href="https://stackoverflow.com/a/7335487/2446026">this Stack
Overflow post with commands to config git to use this global `.gitignore`</a>.

For me on Windows PowerShell it was:

```
git config --global core.excludesFile "$Env:USERPROFILE\.gitignore"
```

I created the .gitignore in the right place by using the following command in
Windows PowerShell:

```
code $Env:USERPROFILE\.gitignore
```

Note that this works by opening the new file in VS Code and from there you'll
need to add the `*/.notes.md` entry and save the file.

Now when I create a note file called .env.notes.md in any project, Git will
ignore it by default!

### Screenshot(s)

<img src="/.notes.md.screenshot.jpg" alt="Screenshot of todos file in VS Code" width="528" height="400" height="450" class="img-responsive mx-auto" />
