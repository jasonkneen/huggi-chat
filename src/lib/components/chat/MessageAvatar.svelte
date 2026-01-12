<script lang="ts">
	let { animating = false, classNames = "" } = $props();
</script>

<img
	src="/chatui/robot-avatar.png"
	alt="AI Assistant"
	class="{classNames} {animating ? 'animate-pulse' : ''}"
/>
