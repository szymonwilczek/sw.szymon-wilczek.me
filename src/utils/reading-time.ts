/**
 * Calculates reading time and word count statistics from text content.
 * AVG reading speed I pressumed for calculations: 200 words per minute.
 */
export function calculateReadingStats(content: string = '', wpm: number = 200) {
	if (!content) {
		return { words: 0, minutes: 1, text: '~1 min read · 0 words' };
	}

	// strip frontmatter, Org headers, comments, and blank lines
	const cleanText = content
		.replace(/^---[\s\S]*?---/m, '')
		.replace(/^#\+[a-zA-Z_]+:.*$/gm, '')
		.replace(/^#\s+.*$/gm, '')
		.trim();

	const words = cleanText.split(/\s+/).filter(Boolean).length;
	const minutes = Math.max(1, Math.ceil(words / wpm));

	return {
		words,
		minutes,
		text: `~${minutes} min read · ${words} words`,
	};
}
