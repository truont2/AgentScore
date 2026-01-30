from setuptools import setup, find_packages

setup(
    name="agentscore",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "langchain",
        "langchain-google-genai",
        "python-dotenv",
    ],
)
