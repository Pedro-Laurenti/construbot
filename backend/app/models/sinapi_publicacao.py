from typing import Optional, Dict, Any

class SINAPIPublicacao:
    def __init__(
        self,
        sinapi_ref: str,
        status: str,
        data_deteccao: str,
        data_publicacao: Optional[str] = None,
        data_ingestao: Optional[str] = None,
        url_ise: Optional[str] = None,
        url_composicoes: Optional[str] = None,
        checksum_ise: Optional[str] = None,
        checksum_composicoes: Optional[str] = None,
        log: Optional[Dict[str, Any]] = None
    ):
        self.sinapi_ref = sinapi_ref
        self.status = status
        self.data_publicacao = data_publicacao
        self.data_deteccao = data_deteccao
        self.data_ingestao = data_ingestao
        self.url_ise = url_ise
        self.url_composicoes = url_composicoes
        self.checksum_ise = checksum_ise
        self.checksum_composicoes = checksum_composicoes
        self.log = log or {}
