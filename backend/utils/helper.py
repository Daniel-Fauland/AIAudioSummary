class Helper():
    def file_to_str(self, file_path):
        """
        Reads the contents of a .txt or .md file and returns it as a string.

        Args:
            file_path (str): The path to the .txt or .md file.

        Returns:
            str: Contents of the file as a string, or None if an error occurs.
        """
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            return content
        except FileNotFoundError:
            print(f"The file at {file_path} was not found.")
            return None
        except IOError:
            print(
                f"An I/O error occurred while reading the file at {file_path}.")
            return None


helper = Helper()
