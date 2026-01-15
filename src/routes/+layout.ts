import { UrlDependency } from "$lib/types/UrlDependency";
import type { ConvSidebar } from "$lib/types/ConvSidebar";
import { useAPIClient, handleResponse } from "$lib/APIClient";
import { getConfigManager } from "$lib/utils/PublicConfig.svelte";
import { base } from "$app/paths";
import type { ToolFront } from "$lib/types/Tool";

export const load = async ({ depends, fetch, url }: { depends: (dep: string) => void; fetch: typeof globalThis.fetch; url: URL }) => {
	depends(UrlDependency.ConversationList);

	const client = useAPIClient({ fetch, origin: url.origin });

	// Fetch tools separately from the v1 API endpoint
	const toolsPromise = fetch(`${url.origin}${base}/api/tools`)
		.then((res) => res.json())
		.then((data) => data.tools as ToolFront[])
		.catch(() => [] as ToolFront[]);

	const [settings, models, user, publicConfig, featureFlags, conversationsData, tools] = await Promise.all(
		[
			client.user.settings.get().then(handleResponse),
			client.models.get().then(handleResponse),
			client.user.get().then(handleResponse),
			client["public-config"].get().then(handleResponse),
			client["feature-flags"].get().then(handleResponse),
			client.conversations.get({ query: { p: 0 } }).then(handleResponse),
			toolsPromise,
		]
	);

	const defaultModel = models[0];

	const { conversations: rawConversations } = conversationsData;
	const conversations = rawConversations.map((conv) => {
		const trimmedTitle = conv.title.trim();

		conv.title = trimmedTitle;

		return {
			id: conv._id.toString(),
			title: conv.title,
			model: conv.model ?? defaultModel,
			updatedAt: new Date(conv.updatedAt),
		} satisfies ConvSidebar;
	});

	return {
		conversations,
		models,
		oldModels: [],
		user,
		settings: {
			...settings,
			welcomeModalSeenAt: settings.welcomeModalSeenAt
				? new Date(settings.welcomeModalSeenAt)
				: null,
		},
		publicConfig: getConfigManager(publicConfig),
		tools,
		...featureFlags,
	};
};
