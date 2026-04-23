from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import requests
from typing import Optional, Dict, Any
from functools import wraps

from app.utils.config import (
    CM_AZURE_AD_TENANT_ID,
    CM_AZURE_AD_CLIENT_ID,
    CM_AZURE_AD_AUDIENCE,
    CM_JWT_ALGORITHM,
    CM_JWT_ISSUER
)
from app.utils.helpers import raise_http_error
from app.repositories import UsuarioRepository

security = HTTPBearer()

_jwks_cache: Optional[Dict[str, Any]] = None

def get_jwks() -> Dict[str, Any]:
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache
    
    jwks_url = f"https://login.microsoftonline.com/{CM_AZURE_AD_TENANT_ID}/discovery/v2.0/keys"
    response = requests.get(jwks_url, timeout=10)
    response.raise_for_status()
    _jwks_cache = response.json()
    return _jwks_cache

def validate_token(token: str) -> Dict[str, Any]:
    try:
        jwks = get_jwks()
        
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        
        rsa_key = None
        for key in jwks.get("keys", []):
            if key.get("kid") == kid:
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break
        
        if not rsa_key:
            raise_http_error(401, "Token inválido: chave pública não encontrada")
        
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=[CM_JWT_ALGORITHM],
            audience=CM_AZURE_AD_AUDIENCE,
            issuer=CM_JWT_ISSUER
        )
        
        return payload
    
    except JWTError as e:
        raise_http_error(401, f"Token inválido: {str(e)}")
    except Exception as e:
        raise_http_error(401, f"Erro ao validar token: {str(e)}")

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    token = credentials.credentials
    payload = validate_token(token)
    
    user_email = payload.get("preferred_username") or payload.get("email")
    user_name = payload.get("name")
    azure_ad_id = payload.get("oid")
    roles = payload.get("roles", [])
    
    if not user_email or not azure_ad_id:
        raise_http_error(401, "Token inválido: email ou oid ausente")
    
    repo = UsuarioRepository()
    result = repo.get_by_azure_ad_id(azure_ad_id)
    
    if result.get("status") == "error":
        default_role = "engenheiro" if "engenheiro" in roles else "cliente"
        create_result = repo.create_usuario(
            nome=user_name or user_email.split("@")[0],
            email=user_email,
            role=default_role,
            azure_ad_id=azure_ad_id
        )
        if create_result.get("status") == "error":
            raise_http_error(500, f"Erro ao criar usuário: {create_result.get('error')}")
        usuario = create_result.get("data")
    else:
        usuario = result.get("data")
        repo.update_ultimo_login(usuario["RowKey"])
    
    return {
        "id": usuario["RowKey"],
        "email": user_email,
        "nome": usuario["nome"],
        "role": usuario["role"],
        "azure_ad_id": azure_ad_id,
        "roles_ad": roles
    }

def require_auth(func):
    @wraps(func)
    async def wrapper(*args, current_user: dict = Depends(get_current_user), **kwargs):
        return await func(*args, current_user=current_user, **kwargs)
    return wrapper

def require_role(required_role: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user: dict = Depends(get_current_user), **kwargs):
            user_role = current_user.get("role")
            if user_role != required_role and user_role != "admin":
                raise_http_error(403, f"Acesso negado. Role necessária: {required_role}")
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator
