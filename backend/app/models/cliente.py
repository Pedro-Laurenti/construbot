from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class ClienteCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=200)
    telefone: str = Field(..., min_length=10, max_length=20)
    email: EmailStr

class ClienteUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=200)
    telefone: Optional[str] = Field(None, min_length=10, max_length=20)
    email: Optional[EmailStr] = None

class ClienteResponse(BaseModel):
    id: str
    nome: str
    telefone: str
    email: str
    dataCadastro: str
    createdAt: str
    updatedAt: str
    createdBy: Optional[str] = None
    updatedBy: Optional[str] = None
