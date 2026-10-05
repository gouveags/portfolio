---
title: "Let the agent see what broke"
summary: "The engineering loop I want from AI assistance: observable behaviour, real execution, narrow fixes and another check."
category: engineering
dateLabel: "5 October 2026"
order: 2
sourceNote: "AI-assisted writing approved for publication by Gabriel Gouvêa."
---

When I use AI to help with engineering, I want it to be able to see what the software actually did.

That means having a clear behaviour to check, a way to run it, and enough feedback to find the part that went wrong. A proposed change is much easier to judge when it comes with evidence.

The loop I keep coming back to is simple: describe the behaviour, make it observable, run the real path, inspect what happened, fix the broken part, and run it again.

## Give the work something concrete to prove

"Improve this integration" leaves a lot of room for an impressive-looking change that misses the problem.

"An incomplete stream must not be reported as a successful response" is more useful. There is a behaviour to reproduce, a result to expect and a boundary to test.

That was the problem behind one of my LangChain AWS contributions. A Bedrock response could end without its terminal message-stop event and still become a successful message. The fix needed to distinguish incomplete output from a response that had genuinely finished, while preserving cancellation and existing error behaviour.

The regression tests made those cases explicit. They also checked how an incomplete attempt reached retry, fallback and error callbacks.

There was no need to pretend a local test had proved every production condition. The evidence was specific, and so were its limits.

## Test the path people actually use

In my PostHog work, I helped build record-and-replay coverage for AI integrations. The tests pass recorded responses through the real provider SDK, the built PostHog wrapper and its event transport.

That reaches parts of the integration a mock of an internal function might skip. What does the SDK parse? What does the caller receive? Which usage values and tool identifiers end up in the analytics event?

The expected analytics need their own assertions. Recording an output and then accepting whatever the wrapper emits would leave an important question unanswered.

The OpenAI coverage included a useful check: deliberately adding one input token to the wrapper's output made the assertion fail. After restoring the original behaviour, the tests passed again. That showed the test was capable of noticing the error it was supposed to catch.

## Keep the claim as small as the evidence

A local provider fixture can reproduce malformed data reliably. A recording can preserve a real response for repeatable tests. A live request can confirm that the integration reaches the provider today.

Each answers a different question.

The replay work did not prove backend billing or guarantee that a provider would never change. The stream regression did not require claiming a live production outage. Those boundaries belong in the explanation, especially when AI has helped produce the implementation and the test report.

I use AI agents for research, code and review. I still want to know why a test should fail, whether it failed before the fix, and what remains untested.

That gives me something much more useful to work with: a change I can inspect, a result I can reproduce, and a clear next step if it still breaks.

Related work: [Bedrock stream completion](https://github.com/langchain-ai/langchain-aws/pull/1287), [OpenAI replay coverage](https://github.com/PostHog/posthog-js/pull/5032) and [Gemini replay coverage](https://github.com/PostHog/posthog-js/pull/5037).
