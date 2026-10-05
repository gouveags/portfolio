---
title: "The field I almost threw away"
summary: "A tool-result limit looked sensible until I looked at what it removed. An engineering trade-off, and the product question behind it."
category: engineering
dateLabel: "5 October 2026"
order: 3
sourceNote: "AI-assisted writing approved for publication by Gabriel Gouvêa."
---

I was working on how PostHog captures tool results from Gemini when I chose a fairly conservative limit: keep a small result structured, but turn an oversized result into a shortened text preview.

There was a clear reason for it. Tool results can be large, and an analytics event needs some protection from whatever an application happens to return.

Then I compared it with the approach already used for Claude Agent, and a small example made the cost of my decision much easier to see.

## The useful part can come last

Imagine a tool returns an object with two fields. The first is a very long body. The second is a short summary saying that 42 rows matched.

If I serialize the whole object and cut it off during the body, the summary disappears. The result is smaller, but the field someone might actually need has gone.

Claude Agent's formatter took another approach. It shortened individual strings while preserving the surrounding object. In that example, the long body got shorter and the summary survived.

Both approaches limit captured content. They preserve different things. Separate fields can only survive this way while the input is still structured; an already-serialized JSON string is shortened as text.

That difference matters in an analytics tool. A developer may be looking at a trace because an agent made an unexpected decision or returned a bad answer. The field at the end of the object might explain what happened.

## Why I wanted to change direction

The Claude implementation had already been through review and corrections, including safeguards around UTF-8 truncation, traversal and privacy. I looked through that history and searched for related reports. I didn't find a reported regression caused by its per-string policy.

That helped, but it wasn't a guarantee. The stronger reason was the product itself: I wanted to preserve more of the evidence people would use to understand their agents.

So I proposed aligning the major provider adapters around that structure-preserving approach. Gemini, OpenAI and direct Anthropic should apply the same underlying policy while retaining the message shapes and identifiers their integrations need.

This is a change to captured analytics. It should leave the application's provider requests, results and execution behaviour alone.

## The risk stays in the discussion

A per-string limit is not a whole-event limit. An object can contain many short strings. A conversation can contain many results. Put enough of them together and the event can still become too large.

I was willing to accept some of that remaining risk for more useful analytics, with the existing safeguards in place. I also wanted the limitation written down plainly. A future conversation-wide budget needs its own retention policy, including how to preserve the relationship between tool calls and their results.

Simply cutting off whatever comes after a threshold would make a different product decision for us.

Privacy also takes precedence over capturing a more complete result. Preserving structure doesn't mean collecting everything regardless of the user's settings.

## The decision I wanted to make explicit

The original implementation was more conservative about total result size. After looking at the effect on the data, I preferred the approach that retained more useful information.

I think that is worth explaining as part of the engineering work. A limit can be internally consistent and still remove something important to the person using the product.

In this case, the question was very concrete: when someone opens a trace to understand their agent, will the clue still be there?

The [proposal and discussion](https://github.com/PostHog/posthog-js/issues/5154) include the example and detailed boundaries. As of publication on 5 October 2026, the [implementation](https://github.com/PostHog/posthog-js/pull/5155) remains open for review.
