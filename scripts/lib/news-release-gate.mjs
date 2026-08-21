import { assessNewsQuality } from "./news-quality.mjs";

function percentage(value) {
  return `${Math.round(value * 100)}%`;
}

export function evaluateNewsRelease(rows, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const minItems = Number.isFinite(options.minItems)
    ? Math.max(1, options.minItems)
    : 10;
  const maxAgeMinutes = Number.isFinite(options.maxAgeMinutes)
    ? Math.max(1, options.maxAgeMinutes)
    : 180;
  const maxSourceShare = Number.isFinite(options.maxSourceShare)
    ? Math.min(1, Math.max(0, options.maxSourceShare))
    : 0.6;
  const sample = Array.isArray(rows) ? rows : [];
  const failures = [];

  if (sample.length < minItems) {
    failures.push(`volume:${sample.length}/${minItems}`);
  }

  const latestPublishedAt = sample[0]?.published_at;
  const latestMs = Date.parse(latestPublishedAt ?? "");
  const ageMinutes = Number.isNaN(latestMs)
    ? null
    : Math.round((now - latestMs) / 60_000);
  if (
    ageMinutes === null ||
    ageMinutes > maxAgeMinutes ||
    ageMinutes < -360
  ) {
    failures.push(
      `freshness:${ageMinutes === null ? "unknown" : `${ageMinutes}m`}/${maxAgeMinutes}m`,
    );
  }

  for (const row of sample) {
    const quality = assessNewsQuality(row, { now, maxAgeHours: 48 });
    for (const blocker of quality.blockers) {
      failures.push(`row:${row?.id ?? "unknown"}:${blocker}`);
    }
  }

  const sourceCounts = new Map();
  for (const row of sample) {
    const source = row?.source_id ?? row?.source_name ?? "unknown";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }
  const [dominantSource, dominantCount = 0] = [...sourceCounts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0] ?? ["none", 0];
  const dominantShare = sample.length > 0 ? dominantCount / sample.length : 0;
  if (sample.length > 1 && dominantShare > maxSourceShare) {
    failures.push(`source_diversity:${dominantSource}:${percentage(dominantShare)}`);
  }

  return {
    ok: failures.length === 0,
    failures,
    metrics: {
      sampleSize: sample.length,
      latestPublishedAt: latestPublishedAt ?? null,
      ageMinutes,
      language: sample.every((row) => row?.lang === "zh-HK") ? "zh-HK" : "mixed",
      sourceCount: sourceCounts.size,
      dominantSource,
      dominantShare,
    },
  };
}
