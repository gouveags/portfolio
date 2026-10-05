export const projects = [
  {
    name: "Copa Ace",
    description: "Tournament software for a CS2 community.",
    detail:
      "I contribute to the site behind Ace Produtora’s Counter-Strike tournaments. My work has covered frontend performance, registration rules, admin request protection and automatic FACEIT championship updates, connecting the public tournament pages with the less visible work of running an event.",
    links: [
      { label: "Visit website", href: "https://aceprodutora.com.br/" },
      { label: "View code", href: "https://github.com/cespedesdan/ace-prod" },
    ],
  },
  {
    name: "Mutuals",
    description: "Connecting an AI character to a live stream.",
    detail:
      "At Mutuals, I’ve been working with João on the connection between Twitch chat, streamer voice, OBS and the character experience. My part is the stream integration, bringing those pieces together so Juniper can participate in the broadcast.",
    links: [
      { label: "Explore Mutuals", href: "https://mutuals.inc/juniperpi/" },
      {
        label: "Integration demo",
        href: "https://x.com/john_bortotti/status/2106078691583217862",
      },
      {
        label: "João’s engine demo",
        href: "https://x.com/john_bortotti/status/2101019513676345555",
      },
    ],
  },
  {
    name: "OrchestrAI",
    description: "An agent runtime experiment in Rust and Python.",
    detail:
      "OrchestrAI explores a compact API for agents that call models, use tools and stream results. The core is written in Rust, with Python bindings and work around model routing, run state, usage limits and observability. It’s a personal project where I can work directly on the runtime and API choices that interest me.",
    links: [
      { label: "View code", href: "https://github.com/gouveags/orchestrai" },
    ],
  },
  {
    name: "Bend SDKs",
    description: "OpenAI and Anthropic, from Bend.",
    detail:
      "Two unofficial SDK experiments for calling OpenAI and Anthropic from Bend. I worked on typed requests, streaming, tool-use helpers and a local bridge to the official provider SDKs, then followed through with packaging, compatibility fixes and examples. Their supported features and limits are documented in the repositories.",
    links: [
      { label: "openai-bend", href: "https://github.com/gouveags/openai-bend" },
      {
        label: "anthropic-bend",
        href: "https://github.com/gouveags/anthropic-bend",
      },
    ],
  },
];
