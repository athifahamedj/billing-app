from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"message": "Billing App API is running"}