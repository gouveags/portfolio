export const apps = [
  {
    path: "/",
    title: "Home",
    icon: "house",
    excerpt: "A few things I build, write, and enjoy learning about.",
  },
  {
    path: "/about/",
    title: "Career",
    icon: "info",
    excerpt: "From race-car telemetry to AI products and agent infrastructure.",
  },
  {
    path: "/open-source/",
    title: "Open source",
    icon: "code",
    excerpt: "Contributions to tools I use, and experiments I wanted to exist.",
  },
  {
    path: "/projects/",
    title: "Projects",
    icon: "folder",
    excerpt: "Selected work, with the code or public product attached.",
  },
  {
    path: "/blog/",
    title: "Blog",
    icon: "file-text",
    excerpt: "Ideas, experiments, and the occasional detour.",
  },
  {
    path: "/contact/",
    title: "Contact",
    icon: "envelope",
    excerpt: "You can find me around the web.",
  },
  {
    path: "/guide/",
    title: "This site",
    icon: "key",
    excerpt: "A few ways around this little desktop.",
  },
];

// Child pages remain in search while the primary navigation follows the career story.
export const primaryApps = apps.filter((app) => app.path !== "/open-source/");
