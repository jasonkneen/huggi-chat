<script lang="ts">
	import { RadioGroup } from "bits-ui";
	import CarbonCheckmark from "~icons/carbon/checkmark";
	import CarbonRadioButton from "~icons/carbon/radio-button";

	export interface QuestionOption {
		label: string;
		description: string;
	}

	export interface Question {
		question: string;
		header: string;
		options: QuestionOption[];
		multiSelect: boolean;
	}

	interface Props {
		questions: Question[];
		onsubmit: (answers: Record<string, string | string[]>) => void;
	}

	let { questions, onsubmit }: Props = $props();

	// Track answers: questionIndex → selected option label(s)
	let answers = $state<Record<number, string | string[]>>({});

	// Initialize answers
	$effect(() => {
		const initial: Record<number, string | string[]> = {};
		questions.forEach((q, i) => {
			initial[i] = q.multiSelect ? [] : "";
		});
		answers = initial;
	});

	function toggleMultiSelect(questionIndex: number, optionLabel: string) {
		const current = answers[questionIndex] as string[];
		if (current.includes(optionLabel)) {
			answers[questionIndex] = current.filter((l) => l !== optionLabel);
		} else {
			answers[questionIndex] = [...current, optionLabel];
		}
	}

	function handleSubmit() {
		// Convert numeric keys to question headers
		const result: Record<string, string | string[]> = {};
		questions.forEach((q, i) => {
			result[q.header] = answers[i];
		});
		onsubmit(result);
	}

	const allAnswered = $derived(
		questions.every((q, i) => {
			const answer = answers[i];
			if (q.multiSelect) {
				return Array.isArray(answer) && answer.length > 0;
			}
			return typeof answer === "string" && answer.length > 0;
		})
	);
</script>

<div
	class="my-4 w-full space-y-6 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50 p-6 shadow-lg backdrop-blur-sm dark:border-purple-500/30 dark:from-purple-900/10 dark:to-blue-900/10"
>
	<!-- Header -->
	<div class="border-b border-purple-200/50 pb-3 dark:border-purple-500/20">
		<h3 class="text-base font-semibold text-gray-800 dark:text-gray-100">
			{questions.length === 1 ? "Question" : "Questions"}
		</h3>
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
			Please select your preferences below
		</p>
	</div>

	<!-- Questions -->
	<div class="space-y-6">
		{#each questions as question, qIndex}
			<div class="space-y-3">
				<!-- Question header chip -->
				<div class="flex items-center gap-2">
					<span
						class="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/20 dark:text-purple-300"
					>
						{question.header}
					</span>
					{#if question.multiSelect}
						<span class="text-[10px] text-gray-400 dark:text-gray-500"
							>Select all that apply</span
						>
					{/if}
				</div>

				<!-- Question text -->
				<p class="text-sm font-medium text-gray-700 dark:text-gray-200">
					{question.question}
				</p>

				<!-- Options -->
				{#if question.multiSelect}
					<!-- Multi-select checkboxes -->
					<div class="space-y-2">
						{#each question.options as option}
							{@const isSelected = (answers[qIndex] as string[])?.includes(option.label)}
							<button
								type="button"
								class="group relative w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-purple-500/50 {isSelected
									? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200 dark:border-purple-500 dark:bg-purple-900/20 dark:ring-purple-500/30'
									: ''}"
								onclick={() => toggleMultiSelect(qIndex, option.label)}
							>
								<!-- Checkbox indicator -->
								<div class="mb-2 flex items-start justify-between">
									<div
										class="flex size-5 items-center justify-center rounded border-2 transition-all {isSelected
											? 'border-purple-500 bg-purple-500 dark:border-purple-400 dark:bg-purple-400'
											: 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'}"
									>
										{#if isSelected}
											<CarbonCheckmark class="size-4 text-white" />
										{/if}
									</div>
								</div>

								<!-- Option content -->
								<div class="space-y-1">
									<div class="font-medium text-gray-900 dark:text-gray-100">
										{option.label}
									</div>
									<div class="text-sm text-gray-500 dark:text-gray-400">
										{option.description}
									</div>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<!-- Single-select radio buttons -->
					<RadioGroup.Root
						value={answers[qIndex] as string}
						onValueChange={(value) => {
							answers[qIndex] = value;
						}}
						class="space-y-2"
					>
						{#each question.options as option}
							<RadioGroup.Item value={option.label} class="w-full" let:checked>
								<div
									class="group relative w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-purple-500/50 {checked
										? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200 dark:border-purple-500 dark:bg-purple-900/20 dark:ring-purple-500/30'
										: ''}"
								>
									<!-- Radio indicator -->
									<div class="mb-2 flex items-start justify-between">
										<div
											class="flex size-5 items-center justify-center rounded-full border-2 transition-all {checked
												? 'border-purple-500 dark:border-purple-400'
												: 'border-gray-300 dark:border-gray-600'}"
										>
											{#if checked}
												<div
													class="size-2.5 rounded-full bg-purple-500 dark:bg-purple-400"
												></div>
											{/if}
										</div>
									</div>

									<!-- Option content -->
									<div class="space-y-1">
										<div class="font-medium text-gray-900 dark:text-gray-100">
											{option.label}
										</div>
										<div class="text-sm text-gray-500 dark:text-gray-400">
											{option.description}
										</div>
									</div>
								</div>
							</RadioGroup.Item>
						{/each}
					</RadioGroup.Root>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Submit button -->
	<div class="flex justify-end border-t border-purple-200/50 pt-4 dark:border-purple-500/20">
		<button
			type="button"
			disabled={!allAnswered}
			onclick={handleSubmit}
			class="group relative overflow-hidden rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg dark:from-purple-500 dark:to-blue-500"
		>
			<span class="relative z-10">Submit Answers</span>
			{#if allAnswered}
				<div
					class="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 transition-opacity group-hover:opacity-100"
				></div>
			{/if}
		</button>
	</div>
</div>
