from fastapi import APIRouter

router = APIRouter()

MUNICIPIOS: dict[str, list[str]] = {
    "AC": ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira", "Tarauacá"],
    "AL": ["Maceió", "Arapiraca", "Rio Largo", "Palmeira dos Índios", "Penedo"],
    "AM": ["Manaus", "Parintins", "Itacoatiara", "Manacapuru", "Coari"],
    "AP": ["Macapá", "Santana", "Laranjal do Jari", "Oiapoque"],
    "BA": ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Itabuna", "Lauro de Freitas", "Ilhéus"],
    "CE": ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanaú", "Sobral", "Crato"],
    "DF": ["Brasília", "Ceilândia", "Taguatinga", "Samambaia", "Plano Piloto"],
    "ES": ["Vitória", "Vila Velha", "Serra", "Cariacica", "Cachoeiro de Itapemirim", "Linhares"],
    "GO": ["Goiânia", "Aparecida de Goiânia", "Anápolis", "Rio Verde", "Luziânia", "Águas Lindas de Goiás"],
    "MA": ["São Luís", "Imperatriz", "Timon", "Caxias", "Codó", "Paço do Lumiar"],
    "MG": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim", "Montes Claros", "Ribeirão das Neves", "Uberaba"],
    "MS": ["Campo Grande", "Dourados", "Três Lagoas", "Corumbá", "Ponta Porã"],
    "MT": ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop", "Tangará da Serra"],
    "PA": ["Belém", "Ananindeua", "Santarém", "Marabá", "Castanhal", "Parauapebas"],
    "PB": ["João Pessoa", "Campina Grande", "Santa Rita", "Patos", "Bayeux"],
    "PE": ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru", "Petrolina", "Paulista"],
    "PI": ["Teresina", "Parnaíba", "Picos", "Piripiri", "Floriano"],
    "PR": ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "São José dos Pinhais", "Foz do Iguaçu"],
    "RJ": ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu", "Niterói", "Belford Roxo", "Campos dos Goytacazes", "Petrópolis"],
    "RN": ["Natal", "Mossoró", "Parnamirim", "São Gonçalo do Amarante", "Macaíba"],
    "RO": ["Porto Velho", "Ji-Paraná", "Ariquemes", "Vilhena", "Cacoal"],
    "RR": ["Boa Vista", "Rorainópolis", "Caracaraí", "Pacaraima"],
    "RS": ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas", "Santa Maria", "Gravataí", "Viamão", "Novo Hamburgo"],
    "SC": ["Florianópolis", "Joinville", "Blumenau", "Chapecó", "São José", "Criciúma", "Itajaí", "Balneário Camboriú"],
    "SE": ["Aracaju", "Nossa Senhora do Socorro", "Lagarto", "Itabaiana", "Estância"],
    "SP": ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Santo André", "Osasco", "São José dos Campos", "Ribeirão Preto", "Sorocaba", "Santos"],
    "TO": ["Palmas", "Araguaína", "Gurupi", "Porto Nacional", "Paraíso do Tocantins"],
}


@router.get("/localidades/ufs")
async def get_ufs() -> dict:
    return {"ufs": sorted(MUNICIPIOS.keys())}


@router.get("/localidades/municipios/{uf}")
async def get_municipios(uf: str) -> dict:
    uf_upper = uf.upper()
    if uf_upper not in MUNICIPIOS:
        return {"uf": uf_upper, "municipios": []}
    return {"uf": uf_upper, "municipios": MUNICIPIOS[uf_upper]}
