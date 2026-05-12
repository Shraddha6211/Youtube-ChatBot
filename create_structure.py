from pathlib import Path

structure = {
    "frontend/components": ["chat.js", "video.js"],
    "frontend/assets": [],
    "backend/api/routes": ["chat.py", "video.py", "__init__.py"],
    "backend/services": ["rag_service.py", "transcript.py", "embeddings.py", "__init__.py"],
    "backend/core": ["config.py", "llm.py", "__init__.py"],
    "backend/chains": ["qa_chain.py", "__init__.py"],
    "backend/utils": ["chunker.py", "__init__.py"],
    "tests": ["test_rag.py", "__init__.py"],
}

files = {
    "frontend": ["index.html", "style.css", "app.js"],
    "backend": ["main.py"],
    ".": [".env.example", "README.md", "requirements.txt"]
}

# create folders + files
for folder, f_list in structure.items():
    Path(folder).mkdir(parents=True, exist_ok=True)
    for f in f_list:
        Path(folder, f).touch()

for folder, f_list in files.items():
    for f in f_list:
        Path(folder, f).touch()

print("Project structure created successfully")