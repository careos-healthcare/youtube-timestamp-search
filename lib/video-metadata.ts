export type VideoOEmbedMetadata = {
  title?: string;
  channelName?: string;
};

export async function fetchVideoOEmbedMetadata(videoId: string): Promise<VideoOEmbedMetadata> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`
      )}&format=json`,
      { next: { revalidate: 86_400 } }
    );

    if (!response.ok) {
      return {};
    }

    const data = (await response.json()) as { title?: string; author_name?: string };
    return {
      title: data.title,
      channelName: data.author_name,
    };
  } catch {
    return {};
  }
}
