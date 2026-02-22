# Portfolio

Hello, my name is Gabriel Silva Gouvêa and this is my portfolio.

Here are my contacts, feel free to reach out:

- Email: [gabrielsgouvea@hotmail.com](mailto:gabrielsgouvea@hotmail.com)
- GitHub: [github.com/gouveags/](https://www.github.com/gouveags/)
- LinkedIn: [linkedin.com/in/gouveags/](https://www.linkedin.com/in/gouveags/)
- Portfolio: [gouveagsportfolio.vercel.app](https://gouveagsportfolio.vercel.app/)


## Want to know more about this project?

Curious about the design decisions behind this project? Maybe you're wondering:

- **Why choose old tech like HTML + CSS + JavaScript over React?**
- **Why such a clean, minimal design without fancy animations?**
- **Where is the youtube video where you coppied this project from?** (spoiler: Nowhere! **it's all original code here!**)

[Here](./docs/DESIGN_CHOICES.md) I'll be docummenting a little about some of the design choices I've made for this project and why they matter (at least to me). Go check out and then let's talk about it!

## Run locally with uv

From the project root:

```bash
uv run dev
```

Then open `http://localhost:8000`.

Live reload is enabled by default only in local development mode.
It is automatically disabled when `APP_ENV=production` (or `ENV=production`),
or when binding to a non-local host.

Optional:

```bash
PORT=8080 uv run dev
```

Disable live reload:

```bash
uv run dev --no-live-reload
```

Production-like local check:

```bash
APP_ENV=production uv run dev
```
