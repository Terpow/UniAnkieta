from fastapi import FastAPI

app = FastAPI(title="Survey System")

@app.get("/healthcheck")
def health_check():
    return {"status": "OK", "message": "пулемет работает!"}