from typing import Optional
from pydantic import BaseModel, Field

class OrcamentoCreate(BaseModel):
    nome: str = Field(..., min_length=2, max_length=200)
    uf: str = Field(..., min_length=2, max_length=2)
    itensJson: str = Field(..., min_length=2)

class OrcamentoUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=2, max_length=200)
    status: Optional[str] = None
    itensJson: Optional[str] = None
    totaisJson: Optional[str] = None
    parametrosJson: Optional[str] = None
    saidaJson: Optional[str] = None

class OrcamentoResponse(BaseModel):
    id: str
    clienteId: str
    nome: str
    status: str
    uf: str
    dataCriacao: str
    itensJson: str
    totaisJson: Optional[str] = None
    parametrosJson: Optional[str] = None
    saidaJson: Optional[str] = None
    createdAt: str
    updatedAt: str
    createdBy: Optional[str] = None
    updatedBy: Optional[str] = None
