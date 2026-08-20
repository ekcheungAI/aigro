import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { inspectAttr } from 'plugin-inspect-react-code'
import {
  assertDeploymentContract,
  deploymentRobotsTags,
} from "./src/lib/deploymentEnvironment"

function betaNoindexPlugin(deployEnvironment?: string): Plugin {
  return {
    name: "aigro-beta-noindex",
    transformIndexHtml() {
      return deploymentRobotsTags(deployEnvironment)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  assertDeploymentContract({
    vercel: env.VERCEL,
    vercelProjectId: env.VERCEL_PROJECT_ID,
    vercelProjectName: env.VERCEL_PROJECT_NAME,
    deployEnvironment: env.VITE_DEPLOY_ENV,
    siteUrl: env.VITE_SITE_URL,
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
    turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY,
    chatRollout: env.VITE_EXPERT_CHAT_ROLLOUT,
  })

  return {
    base: '/',
    plugins: [betaNoindexPlugin(env.VITE_DEPLOY_ENV), inspectAttr(), react()],
    server: {
      port: 3000,
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("node_modules/@supabase")) return "supabase";
            if (id.includes("node_modules/lucide-react")) return "icons";
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
});
