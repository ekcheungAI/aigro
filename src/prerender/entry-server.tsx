import { StaticRouter } from "react-router";
import { renderToReadableStream } from "react-dom/server";
import App from "@/App";
export {
  DEFAULT_DESC,
  DEFAULT_TITLE,
  formatPageTitle,
  getRouteMeta,
} from "@/lib/routeMeta";

export async function render(url: string): Promise<string> {
  const stream = await renderToReadableStream(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>
  );
  await stream.allReady;
  return new Response(stream).text();
}
