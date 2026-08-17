<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";

  let count = $state(0);
</script>

<div class="flex flex-wrap items-center gap-3">
  <Button onclick={() => (count += 1)}>Svelte clicks: {count}</Button>
  <p class="text-sm text-muted-foreground" aria-live="polite">
    Rendered by shadcn-svelte and hydrated by Astro.
  </p>
</div>
