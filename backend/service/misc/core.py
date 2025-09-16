import re
from utils.logging import logger


class MiscService:
    async def get_speakers(self, transcript: str) -> list[str]:
        """Identify all speakers in the transcript and return them as a list of strings

        Args:
            transcript (str): The transcript to identify the speakers from

        Returns:
            list[str]: A list of identified speakers
        """
        try:
            # Use regex to find all speaker patterns like "Speaker A:", "Speaker B:", etc.
            # Pattern matches "Speaker" followed by a space and one or more letters/numbers, then a colon
            speaker_pattern = r'Speaker\s+[A-Za-z0-9]+:'
            speaker_matches = re.findall(speaker_pattern, transcript)
            
            # Remove the colon from each match and get unique speakers
            speakers = list(set([match.rstrip(':') for match in speaker_matches]))
            
            # Sort the speakers for consistent ordering
            speakers.sort()
            return speakers
        except Exception as e:
            logger.error(f"Error identifying speakers: {str(e)}")
            raise RuntimeError(f"Failed to identify speakers: {str(e)}")
