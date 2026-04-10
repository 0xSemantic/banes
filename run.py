"""
Credex Bank - Application Runner
Run with: python run.py
or: uvicorn backend.main:app --reload --port 8000
"""
import uvicorn
from dotenv import load_dotenv
load_dotenv()

if __name__ == "__main__":
    print("""
╔═══════════════════════════════════════════╗
║          CREDEX BANK - STARTING           ║
║                                           ║
║  Admin:    admin@credexbank.com           ║
║  Password: Admin@Credex2024               ║
║                                           ║
║  API Docs: http://localhost:8000/docs     ║
║  App:      http://localhost:8000          ║
╚═══════════════════════════════════════════╝
    """)
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )
