import React from "react";
import { useParams } from "react-router-dom";

export const DynamicPage: React.FC = () => {
	const { pageName } = useParams();
	const raw = localStorage.getItem("dynamicPageContent");
	const content = raw ? JSON.parse(raw) : { html: "<p>Loading...</p>" };

	return (
		<div className="p-6 max-w-4xl mx-auto bg-white shadow rounded">
			<h1 className="text-2xl font-bold mb-4">{pageName}</h1>
			<div dangerouslySetInnerHTML={{ __html: content.html }} />
		</div>
	);
};
