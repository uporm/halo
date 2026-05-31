import { defineConfig } from "umi";

const isDev = process.env.NODE_ENV === "development";

export default defineConfig({
  publicPath: isDev ? "/" : "./",
  hash: true,
  history: { type: "hash" },
  routes: [
    {
      path: "/",
      component: "@/layouts/index",
      routes: [
        { path: "/", redirect: "/chat" },
        { path: "/chat", component: "@/pages/chat" },
        { path: "/new-task", component: "@/pages/new-task" },
        { path: "/history", component: "@/pages/history" },
        { path: "/skills", component: "@/pages/skills" },
      ],
    },
  ],
  npmClient: "yarn",
  utoopack: {},
});
