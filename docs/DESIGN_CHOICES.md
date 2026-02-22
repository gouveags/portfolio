# Design Choices & Technical Philosophy

This document explains the main design and engineering decisions behind this portfolio.

## Project Goal

The core goal is simple: make it easy for someone to understand who I'm, what I've built, and how to contact me, all in under a minute.

That means:
- strong first impression
- clear information hierarchy
- low friction to take action (resume download, contact links)

## Why Vanilla HTML/CSS/JS

This project intentionally uses plain HTML, CSS, and JavaScript.

Reasons:
- no framework overhead for a mostly static site
- very small mental model and fast load
- long-term maintainability without dependency churn
- easier hosting and fewer build/runtime surprises

This also keeps the portfolio focused on content and execution quality, not tool complexity.

## Information Architecture

The page follows a direct narrative:
1. `Home`: identity, value proposition, and immediate CTAs.
2. `About`: background, strengths, and technical focus.
3. `Experience`: chronological evidence of impact.
4. `Projects`: concrete examples of applied work.
5. `Contact`: direct next step with multiple channels.

Navigation mirrors this flow and keeps anchors predictable.

## Visual Direction

The visual language is "technical editorial":
- bold, modern typography (`Space Grotesk`) for personality
- monospaced accents (`IBM Plex Mono`) for technical cues
- dark atmospheric background with subtle grid texture
- warm/cool contrast (orange + cyan) for energy and focus

The intention is to feel engineered and distinctive, not template-like.

## Design System Choices

A tokenized CSS approach is used in `styles/style.css` via `:root` variables:
- color tokens (`--accent`, `--cool`, `--text`, `--line`)
- radius, spacing, and shadow conventions
- one motion curve (`--easing`) reused across components

Benefits:
- consistent styling decisions
- quick global theme changes
- lower risk of visual drift over time

## Interaction Design

Interactions prioritize clarity over novelty:
- sticky top navigation for orientation
- active section highlighting during scroll
- mobile menu with explicit state (`aria-expanded`)
- reveal animations for pacing, but not required for readability
- icon-supported links for higher click affordance (resume/social/contact)

Animations are intentionally restrained and only support comprehension.

## Accessibility Decisions

Accessibility is treated as a baseline requirement, not a post-processing step:
- semantic sections with clear heading structure
- skip link for keyboard users
- visible focus and high-contrast interactive elements
- `aria-live` status for contact form feedback
- reduced-motion support
- no-JavaScript fallback for section visibility

A recent fix ensures content is visible even when JavaScript is disabled.

## Contact Form Strategy

The contact form uses `mailto:` instead of a backend.

Tradeoff:
- pros: zero infra, no API spam surface, simple deployment
- cons: depends on user's local email client

For a personal portfolio, this is a practical default. If inbound volume grows, this can move to an API endpoint with validation and anti-abuse controls.

## Local Development Workflow

The project includes a lightweight `uv` workflow:
- `uv run dev` starts a local static server
- local live reload helps iteration speed
- live reload is disabled in production-like environments

This keeps local DX fast while avoiding production overhead.

## Performance and Simplicity

The site keeps runtime complexity low:
- static assets only
- no client framework hydration
- small JavaScript footprint
- no heavy animation libraries

This improves reliability and keeps the portfolio responsive across devices.

## What Can Improve Next

Planned improvements worth considering:
1. Add a small "case study" detail view for top projects.
2. Add lightweight analytics (privacy-friendly) to track CTA usage.
3. Add basic end-to-end checks for key UX paths (nav, contact, resume download).
4. Add multilingual copy toggle (EN/PT-BR) if audience split justifies it.

## Final Thoughts

The main philosophy of this portfolio is pragmatic quality:
- thoughtful visual identity
- strong readability and accessibility
- simple architecture that is easy to evolve

The implementation should communicate the same thing as the content: disciplined engineering with clear intent.
