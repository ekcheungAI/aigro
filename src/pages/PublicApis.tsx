import PublicApiDirectory from "@/components/directory/PublicApiDirectory";
import Reveal from "@/components/Reveal";

export default function PublicApis() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-band-border bg-band-bg">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 select-none"
        >
          <img
            src="/editorial/thumbnails/prompt-workflow.jpg"
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-30"
          />
          <span className="absolute inset-0 bg-band-bg/60" />
        </div>

        <div className="mx-auto max-w-container px-6 pb-10 pt-24 max-md:pt-16">
          <Reveal>
            <p className="flex items-center gap-3 text-overline font-sans uppercase text-band-text-muted">
              <span
                className="inline-block h-px w-6 bg-band-border-strong"
                aria-hidden="true"
              />
              AIGRO Directory
            </p>
            <h1 className="mt-3 max-w-[760px] font-display text-display text-band-text">
              Public APIs 公開 API 目錄
            </h1>
            <p className="mt-6 max-w-[680px] text-body-lg text-band-text-secondary">
              為香港 builder 精選公開 API — 睇清認證、CORS、使用場景同官方文件，再決定點樣接入。
            </p>
          </Reveal>
        </div>
      </section>

      <PublicApiDirectory />
    </>
  );
}
