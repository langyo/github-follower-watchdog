import { computed, defineComponent } from "vue";

import type { SeriesPoint } from "@/data/load";

let uid = 0;

/**
 * Sparkline — the follower-count trend as a pure SVG area/line chart.
 * X is proportional to time (so quiet weeks read as flat lines, not
 * cliffs), Y is min/max-normalized; the last point is always "now".
 */
export default defineComponent({
  name: "Sparkline",
  props: {
    points: { type: Array as () => SeriesPoint[], required: true },
  },
  setup(props) {
    const id = `spark-${++uid}`;

    const geom = computed(() => {
      const pts = props.points;
      const W = 100;
      const H = 30;
      if (pts.length === 0) return null;
      const t0 = new Date(pts[0].ts).getTime();
      const t1 = new Date(pts[pts.length - 1].ts).getTime();
      const counts = pts.map((p) => p.count);
      const min = Math.min(...counts);
      const max = Math.max(...counts);
      const span = t1 - t0;
      const range = max - min || 1;

      const xy = pts.map((p) => {
        const x = span > 0 ? ((new Date(p.ts).getTime() - t0) / span) * W : 0;
        const y = H - 2 - ((p.count - min) / range) * (H - 4);
        return { x, y };
      });

      const line = xy.map(({ x, y }) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
      const area = `0,${H} ${line} ${W},${H}`;
      return { line, area, last: xy[xy.length - 1], min, max };
    });

    return () => {
      const g = geom.value;
      if (!g) return null;
      return (
        <svg
          class="sparkline"
          viewBox="0 0 100 30"
          preserveAspectRatio="none"
          role="img"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="rgb(var(--color-primary) / 34%)" />
              <stop offset="100%" stop-color="rgb(var(--color-primary) / 0%)" />
            </linearGradient>
          </defs>
          <polygon points={g.area} fill={`url(#${id})`} />
          <polyline
            points={g.line}
            fill="none"
            stroke="rgb(var(--color-primary))"
            stroke-width="1.4"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />
          <circle
            cx={g.last.x}
            cy={g.last.y}
            r="1.6"
            fill="rgb(var(--color-primary))"
          />
        </svg>
      );
    };
  },
});
