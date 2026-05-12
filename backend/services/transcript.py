# backend/services/transcript.py

import json
import urllib.request
import yt_dlp

def get_transcript(video_id: str, lang: str = "en") -> str:
    """
    Fetches the transcript for a YouTube video.

    Args:
        video_id: The YouTube video ID (e.g. "Gfr50f6ZBvo")
                  OR a full URL — we handle both
        lang: Language code. Defaults to English.

    Returns:
        A single string of the full transcript.

    Raises:
        ValueError: If no transcript is available in that language.
    """
    # Handle both full URLs and bare video IDs
    if "youtube.com" in video_id or "youtu.be" in video_id:
        url = video_id
    else:
        url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts = {
        "writesubtitles": True,
        "writeautomaticsub": True,
        "subtitleslangs": [lang],
        "subtitlesformat": "json3",
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

        # Try real subtitles first, fall back to auto-generated captions
        subs = info.get("subtitles", {}) or {}
        auto_caps = info.get("automatic_captions", {}) or {}

        # Prefer manual subtitles, fall back to auto-captions
        transcript_source = subs if lang in subs else auto_caps

        if lang not in transcript_source:
            available = list({**subs, **auto_caps}.keys())
            raise ValueError(
                f"No '{lang}' transcript found. "
                f"Available languages: {available}"
            )

        # Find the json3 format URL
        sub_url = next(
            (s["url"] for s in transcript_source[lang]
             if s.get("ext") == "json3"),
            None
        )

        if not sub_url:
            raise ValueError(
                "json3 subtitle format not available for this video."
            )

    # Fetch and parse the subtitle JSON
    with urllib.request.urlopen(sub_url) as response:
        data = json.loads(response.read())

    # Extract text from subtitle events, skip empty lines and newlines
    lines = []
    for event in data.get("events", []):
        for seg in event.get("segs", []):
            text = seg.get("utf8", "").strip()
            if text and text != "\n":
                lines.append(text)

    if not lines:
        raise ValueError("Transcript was empty after parsing.")

    return " ".join(lines)


def extract_video_id(url_or_id: str) -> str:
    """
    Extracts the video ID from a YouTube URL or returns the ID as-is.

    Examples:
        "https://www.youtube.com/watch?v=Gfr50f6ZBvo" → "Gfr50f6ZBvo"
        "https://youtu.be/Gfr50f6ZBvo" → "Gfr50f6ZBvo"
        "Gfr50f6ZBvo" → "Gfr50f6ZBvo"
    """
    if "v=" in url_or_id:
        return url_or_id.split("v=")[1].split("&")[0]
    elif "youtu.be/" in url_or_id:
        return url_or_id.split("youtu.be/")[1].split("?")[0]
    return url_or_id  # assume it's already a bare video ID