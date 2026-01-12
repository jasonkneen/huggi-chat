<script lang="ts">
	import IconBrain from "~icons/lucide/brain";

	interface Props {
		level?: number;
		maxLevel?: number;
		disabled?: boolean;
		onchange?: (level: number) => void;
	}

	let { level = $bindable(1), maxLevel = 4, disabled = false, onchange }: Props = $props();

	const levelLabels = ["Off", "Low", "Medium", "High", "Max"];

	function cycleLevel() {
		if (disabled) return;
		const newLevel = (level + 1) % (maxLevel + 1);
		level = newLevel;
		onchange?.(newLevel);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			cycleLevel();
		}
	}

	const activeBars = $derived(level);
	const levelLabel = $derived(levelLabels[level] || `Level ${level}`);
</script>

<button
	type="button"
	class="thinking-chip"
	class:disabled
	onclick={cycleLevel}
	onkeydown={handleKeydown}
	title="Thinking level: {levelLabel} (tap to change)"
	aria-label="Thinking level: {levelLabel}"
>
	<IconBrain class="brain-icon" />
	<div class="signal-bars" aria-hidden="true">
		{#each Array(maxLevel) as _, i}
			<div
				class="bar"
				class:active={i < activeBars}
				style="height: {((i + 1) / maxLevel) * 100}%"
			></div>
		{/each}
	</div>
</button>

<style lang="postcss">
	.thinking-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		height: 1.75rem;
		padding: 0 0.5rem;
		border-radius: 9999px;
		border: 1px solid rgba(139, 92, 246, 0.15);
		background: rgba(139, 92, 246, 0.1);
		color: rgb(109, 40, 217);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		user-select: none;

		&:hover:not(.disabled) {
			background: rgba(139, 92, 246, 0.15);
			border-color: rgba(139, 92, 246, 0.25);
		}

		&:active:not(.disabled) {
			transform: scale(0.97);
		}

		&.disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	:global(.dark) .thinking-chip {
		background: rgba(139, 92, 246, 0.2);
		border-color: rgba(139, 92, 246, 0.25);
		color: rgb(196, 181, 253);

		&:hover:not(.disabled) {
			background: rgba(139, 92, 246, 0.25);
			border-color: rgba(139, 92, 246, 0.35);
		}
	}

	.brain-icon {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
	}

	.signal-bars {
		display: flex;
		align-items: flex-end;
		gap: 2px;
		height: 0.75rem;
		padding-bottom: 1px;
	}

	.bar {
		width: 3px;
		min-height: 3px;
		border-radius: 1px;
		background: currentColor;
		opacity: 0.25;
		transition: all 0.15s ease;

		&.active {
			opacity: 1;
		}
	}
</style>
