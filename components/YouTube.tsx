export default function YouTube({ videoId }: { videoId: string }) {
	return (
		<div style="width: 100%; min-width: 400px; max-width: 800px;">
			<div style="position: relative; width: 100%; overflow: hidden; padding-top: 56.25%;">
				<p>
					<iframe
						style="position: absolute; top: 0; left: 0; right: 0; width: 100%; height: 100%; border: none;"
						src="https://www.youtube.com/embed/${videoId}?enablejsapi=1" // TODO encode uri component
						width="560"
						height="315"
						allowfullscreen="allowfullscreen"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					></iframe>
				</p>
			</div>
		</div>
	);
}
