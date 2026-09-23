from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Motor Spares API is running"}