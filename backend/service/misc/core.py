import re
import pytz
from datetime import datetime
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

    async def get_day_of_week(self, date_input, country_code, date_format="%Y-%m-%d"):
        """
        Get the day of the week for a given date in a specific country.
        
        Args:
            date_input: Date as string (e.g., "2024-01-15") or datetime.date object
            country_code: Country code (e.g., "US", "GB", "JP")
            date_format: Format of the input date string (only used if date_input is string)
        """
        # Handle both string and date objects
        if isinstance(date_input, str):
            date_obj = datetime.strptime(date_input, date_format)
        elif hasattr(date_input, 'year'):  # datetime.date or datetime.datetime object
            date_obj = datetime.combine(date_input, datetime.min.time())
        else:
            raise ValueError(f"Unsupported date type: {type(date_input)}")
        
        # Get timezone for the country
        country_timezones = {
            "US": "America/New_York",  # Eastern Time
            "GB": "Europe/London",     # UK
            "JP": "Asia/Tokyo",        # Japan
            "DE": "Europe/Berlin",     # Germany
            "FR": "Europe/Paris",      # France
            "AU": "Australia/Sydney",  # Australia
            "CA": "America/Toronto",   # Canada
            "IN": "Asia/Kolkata",      # India
            "CN": "Asia/Shanghai",     # China
            "BR": "America/Sao_Paulo", # Brazil
        }
        
        if country_code not in country_timezones:
            raise ValueError(f"Country code {country_code} not supported")
        
        timezone = pytz.timezone(country_timezones[country_code])
        localized_date = timezone.localize(date_obj)
        
        return localized_date.strftime("%A")

