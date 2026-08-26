import { getCollection } from 'astro:content';

export async function getStaticPaths() {
	const writings = await getCollection('writings');
	return writings.map((post) => ({
		params: { slug: post.id.replace(/\.(org|md|mdx)$/, '') },
		props: { rawContent: post.body || '' },
	}));
}

export async function GET({ props }: { props: { rawContent: string } }) {
	return new Response(props.rawContent, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Content-Disposition': 'inline',
		},
	});
}
