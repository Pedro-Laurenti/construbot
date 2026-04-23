from typing import Any, List, Optional
from pydantic import BaseModel

class SuccessResponse(BaseModel):
    status: str = "success"
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    status: str = "error"
    error: str

class PaginatedResponse(BaseModel):
    status: str = "success"
    data: List[Any]
    total: int
    skip: int
    limit: int
