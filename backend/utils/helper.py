import asyncio
import os

import aiofiles

from utils.logging import logger

class Helper():
    async def list_files(self, directory_path: str) -> list[str]:
        """Reads the directory path and returns all files within this path as a list

        Args:
            directory_path (str): The directory path

        Returns:
            list[str]: List of file names in the directory.
        """
        try:
            def _list_files():
                return [
                    f for f in os.listdir(directory_path)
                    if os.path.isfile(os.path.join(directory_path, f))
                ]
            files = await asyncio.to_thread(_list_files)
            return files
        except FileNotFoundError:
            logger.error(f"The directory at {directory_path} was not found.")
            return []
        except Exception as e:
            logger.error(f"An error occurred while listing files in {directory_path}: {e}")
            return []


    async def file_to_str(self, file_path: str) -> str:
        """
        Reads the contents of a .txt or .md file and returns it as a string.

        Args:
            file_path (str): The path to the .txt or .md file.

        Returns:
            str: Contents of the file as a string, or None if an error occurs.
        """
        try:
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as file:
                content = await file.read()
            return content
        except FileNotFoundError:
            logger.error(f"The file at {file_path} was not found.")
            return None
        except IOError:
            logger.error(
                f"An I/O error occurred while reading the file at {file_path}.")
            return None


helper = Helper()
