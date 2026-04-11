import os

CM_APP_CORS_ORIGINS = os.getenv(
    "CM_APP_CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,https://construbot-frontend.azurewebsites.net",
).split(",")
