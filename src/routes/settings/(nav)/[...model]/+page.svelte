<script lang="ts">
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { base } from "$app/paths";
	import { onMount } from "svelte";

	// Redirect to main settings page - model settings are now in the Models tab
	onMount(() => {
		if (browser) {
			goto(`${base}/settings`, { replaceState: true });
		}
	});
</script>

<!-- Redirecting to settings... -->
