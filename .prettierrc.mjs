/** @type {import("prettier").Config} */
export default {
	plugins: ['prettier-plugin-astro'],
	semi: true,
	singleQuote: true,
	useTabs: true,
	tabWidth: 8,
	printWidth: 160,
	bracketSameLine: true,
	bracketSpacing: true,
	htmlWhitespaceSensitivity: 'ignore',
	overrides: [
		{
			files: '*.astro',
			options: {
				parser: 'astro',
			},
		},
	],
};
