export const handleDynamicPage = async (pageName: string, navigate: any) => {
	// TODO: show a loading spinner or skeleton

	// API call to LLM to generate content
	const response = await fetch("/api/generatePage", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ pageName })
	});

	const data = await response.json();

	// save content to localStorage or a global state (Redux, Zustand, etc.)
	localStorage.setItem("dynamicPageContent", JSON.stringify(data));

	navigate(`/dynamic/${encodeURIComponent(pageName)}`);
};
