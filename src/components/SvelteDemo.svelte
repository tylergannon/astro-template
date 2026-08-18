<script lang="ts">
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card/index.js";
  import { Toaster } from "$lib/components/ui/sonner/index.js";

  let count = $state(0);
</script>

<Card class="max-w-md" data-testid="svelte-shadcn-demo">
  <CardHeader>
    <Badge variant="secondary">Svelte island</Badge>
    <CardTitle>Astro + shadcn-svelte</CardTitle>
    <CardDescription
      >Rendered by shadcn-svelte and hydrated by Astro.</CardDescription
    >
  </CardHeader>
  <CardContent class="flex flex-wrap items-center gap-3">
    <Button data-testid="svelte-counter" onclick={() => (count += 1)}>
      Svelte clicks: {count}
    </Button>
    <p
      class="text-sm text-muted-foreground"
      aria-live="polite"
      data-testid="svelte-count"
    >
      Interactive count: {count}
    </p>
  </CardContent>
</Card>

<Toaster />
