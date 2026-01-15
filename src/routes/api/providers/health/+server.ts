import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { url, timeout = 5000 } = await request.json();

		if (!url || typeof url !== "string") {
			return new Response(JSON.stringify({ error: "URL is required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Only allow local URLs for security (localhost and private network ranges)
		const urlObj = new URL(url);
		const hostname = urlObj.hostname;
		const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
		const isPrivateNetwork =
			hostname.startsWith("192.168.") ||
			hostname.startsWith("10.") ||
			/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);

		if (!isLocalhost && !isPrivateNetwork) {
			return new Response(JSON.stringify({ error: "Only local network URLs are allowed" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const res = await fetch(url, {
				method: "GET",
				signal: controller.signal,
			});
			clearTimeout(timeoutId);

			return new Response(
				JSON.stringify({
					status: res.ok ? "online" : "offline",
					statusCode: res.status,
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		} catch (fetchError) {
			clearTimeout(timeoutId);
			return new Response(
				JSON.stringify({
					status: "offline",
					error: fetchError instanceof Error ? fetchError.message : "Connection failed",
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				}
			);
		}
	} catch (error) {
		return new Response(
			JSON.stringify({
				status: "offline",
				error: error instanceof Error ? error.message : "Unknown error",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};
