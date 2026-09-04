import { computed, defineComponent } from "vue";

/**
 * LinkButton — an `<a>` styled with the site's own button recipe
 * (`btn btn--<variant> btn--<size>`, theme.scss). The hero and nav CTAs
 * are external links and must stay anchors; this keeps the exact button
 * look without rendering a real `<button>`.
 */
export default defineComponent({
  name: "LinkButton",
  props: {
    href: { type: String, required: true },
    variant: { type: String as () => "primary" | "secondary", default: "primary" },
    size: { type: String as () => "sm" | "md", default: "md" },
    external: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const cls = computed(() => [
      "btn",
      `btn--${props.variant}`,
      `btn--${props.size}`,
    ]);
    return () => (
      <a
        class={cls.value}
        href={props.href}
        target={props.external ? "_blank" : undefined}
        rel={props.external ? "noopener" : undefined}
      >
        {slots.default?.()}
      </a>
    );
  },
});
