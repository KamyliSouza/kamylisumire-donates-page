(() => {
    "use strict";

    const text = (
        key,
        label,
        options = {}
    ) => ({
        key,
        label,
        type: "text",
        ...options
    });

    const textarea = (
        key,
        label,
        options = {}
    ) => ({
        key,
        label,
        type: "textarea",
        wide: true,
        ...options
    });

    const url = (
        key,
        label,
        options = {}
    ) => ({
        key,
        label,
        type: "url",
        wide: true,
        ...options
    });

    const array = (
        key,
        label,
        itemFields,
        options = {}
    ) => ({
        key,
        label,
        type: "array",
        itemFields,
        ...options
    });

    window.KAMYLI_JSON_HELPER_SCHEMAS = {
        agenda: {
            title: "Agenda",
            targetPath: "data/agenda.json",
            filename: "agenda.json",
            description:
                "Edite os 7 dias da agenda sem escrever JSON manualmente.",
            defaults: {
                ultimaAtualizacao: "",
                observacao:
                    "A programação pode mudar. Quando houver alteração de última hora, aviso no Discord.",
                dias: [
                    ["domingo", "Domingo"],
                    ["segunda", "Segunda-feira"],
                    ["terca", "Terça-feira"],
                    ["quarta", "Quarta-feira"],
                    ["quinta", "Quinta-feira"],
                    ["sexta", "Sexta-feira"],
                    ["sabado", "Sábado"]
                ].map(([id, nome]) => ({
                    id,
                    nome,
                    data: "",
                    temLive: false,
                    horario: "",
                    titulo: "",
                    descricao: "",
                    plataformas: [
                        "YouTube",
                        "Twitch"
                    ]
                }))
            },
            sections: [
                {
                    title: "Informações gerais",
                    fields: [
                        text(
                            "ultimaAtualizacao",
                            "Última atualização",
                            {
                                required: true,
                                placeholder: "DD/MM/AAAA",
                                help:
                                    "Formato obrigatório: DD/MM/AAAA."
                            }
                        ),
                        textarea(
                            "observacao",
                            "Observação",
                            {
                                required: true
                            }
                        )
                    ]
                },
                {
                    title: "Dias",
                    help:
                        "A ordem e os IDs dos sete dias são fixos.",
                    fields: [
                        array(
                            "dias",
                            "Dias da semana",
                            [
                                text("id", "ID", {
                                    required: true,
                                    readonly: true
                                }),
                                text("nome", "Nome", {
                                    required: true
                                }),
                                text("data", "Data", {
                                    type: "date",
                                    required: true
                                }),
                                {
                                    key: "temLive",
                                    label: "Tem live",
                                    type: "checkbox"
                                },
                                text("horario", "Horário", {
                                    type: "time",
                                    help:
                                        "Pode ficar vazio mesmo quando houver live."
                                }),
                                text("titulo", "Título"),
                                textarea(
                                    "descricao",
                                    "Descrição"
                                ),
                                textarea(
                                    "plataformas",
                                    "Plataformas",
                                    {
                                        type: "lines",
                                        help:
                                            "Uma plataforma por linha."
                                    }
                                )
                            ],
                            {
                                fixed: true,
                                itemLabel:
                                    item =>
                                        item.nome ||
                                        item.id ||
                                        "Dia"
                            }
                        )
                    ]
                }
            ],
            validate(data, errors) {
                if (
                    !/^\d{2}\/\d{2}\/\d{4}$/.test(
                        data.ultimaAtualizacao
                    )
                ) {
                    errors.push(
                        "Última atualização deve usar DD/MM/AAAA."
                    );
                }

                const expected = [
                    "domingo",
                    "segunda",
                    "terca",
                    "quarta",
                    "quinta",
                    "sexta",
                    "sabado"
                ];

                if (
                    !Array.isArray(data.dias) ||
                    data.dias.length !== 7
                ) {
                    errors.push(
                        "A agenda deve conter exatamente 7 dias."
                    );
                    return;
                }

                data.dias.forEach(
                    (day, index) => {
                        if (
                            day.id !==
                            expected[index]
                        ) {
                            errors.push(
                                `Dia ${index + 1}: ID deve ser ${expected[index]}.`
                            );
                        }

                        if (
                            !Array.isArray(
                                day.plataformas
                            ) ||
                            day.plataformas.length === 0
                        ) {
                            errors.push(
                                `${day.nome || day.id}: informe ao menos uma plataforma.`
                            );
                        }

                        if (
                            day.temLive &&
                            !String(
                                day.titulo || ""
                            ).trim()
                        ) {
                            errors.push(
                                `${day.nome || day.id}: título é obrigatório quando tem live.`
                            );
                        }

                        if (
                            !day.temLive &&
                            [
                                day.horario,
                                day.titulo,
                                day.descricao
                            ].some(
                                value =>
                                    String(
                                        value || ""
                                    ).trim()
                            )
                        ) {
                            errors.push(
                                `${day.nome || day.id}: horário, título e descrição devem ficar vazios quando não há live.`
                            );
                        }
                    }
                );
            }
        },

        creditos: {
            title: "Créditos",
            targetPath:
                "data/content/creditos.json",
            filename: "creditos.json",
            description:
                "Edite cabeçalho e artistas creditados.",
            defaults: {
                eyebrow: "Arte",
                titulo: "Créditos",
                descricao: "",
                itens: []
            },
            sections: [
                {
                    title: "Seção",
                    fields: [
                        text("eyebrow", "Eyebrow"),
                        text("titulo", "Título"),
                        textarea(
                            "descricao",
                            "Descrição"
                        )
                    ]
                },
                {
                    title: "Itens",
                    fields: [
                        array(
                            "itens",
                            "Créditos",
                            [
                                text("id", "ID", {
                                    required: true
                                }),
                                text("nome", "Nome", {
                                    required: true
                                }),
                                textarea(
                                    "descricao",
                                    "Descrição"
                                ),
                                url("url", "URL", {
                                    required: true
                                })
                            ],
                            {
                                itemLabel:
                                    item =>
                                        item.nome ||
                                        item.id ||
                                        "Crédito"
                            }
                        )
                    ]
                }
            ]
        },

        doacoes: {
            title: "Doações",
            targetPath:
                "data/content/doacoes.json",
            filename: "doacoes.json",
            description:
                "Edite os textos da página de doações.",
            defaults: {
                eyebrow: "",
                titulo: "",
                subtitulo: "",
                livepix: {
                    titulo: "",
                    descricao: ""
                },
                pixie: {
                    titulo: "",
                    descricao: ""
                },
                aviso: {
                    rotulo: "",
                    texto: ""
                }
            },
            sections: [
                {
                    title: "Cabeçalho",
                    fields: [
                        text("eyebrow", "Eyebrow"),
                        text("titulo", "Título"),
                        textarea(
                            "subtitulo",
                            "Subtítulo"
                        )
                    ]
                },
                {
                    title: "LivePix",
                    fields: [
                        text(
                            "livepix.titulo",
                            "Título"
                        ),
                        textarea(
                            "livepix.descricao",
                            "Descrição"
                        )
                    ]
                },
                {
                    title: "Pixie",
                    fields: [
                        text(
                            "pixie.titulo",
                            "Título"
                        ),
                        textarea(
                            "pixie.descricao",
                            "Descrição"
                        )
                    ]
                },
                {
                    title: "Aviso",
                    fields: [
                        text(
                            "aviso.rotulo",
                            "Rótulo"
                        ),
                        textarea(
                            "aviso.texto",
                            "Texto"
                        )
                    ]
                }
            ]
        },

        footer: {
            title: "Footer",
            targetPath:
                "data/content/footer.json",
            filename: "footer.json",
            description:
                "Edite créditos, copyright e link do código.",
            defaults: {
                creditos: {
                    fundo: {
                        prefixo: "",
                        nome: "",
                        url: ""
                    },
                    avatar: {
                        prefixo: "",
                        nome: "",
                        url: ""
                    }
                },
                copyright: {
                    nome: "",
                    texto: ""
                },
                codigoFonte: {
                    texto: "",
                    url: ""
                }
            },
            sections: [
                {
                    title: "Crédito do fundo",
                    fields: [
                        text(
                            "creditos.fundo.prefixo",
                            "Prefixo"
                        ),
                        text(
                            "creditos.fundo.nome",
                            "Nome"
                        ),
                        url(
                            "creditos.fundo.url",
                            "URL"
                        )
                    ]
                },
                {
                    title: "Crédito do avatar",
                    fields: [
                        text(
                            "creditos.avatar.prefixo",
                            "Prefixo"
                        ),
                        text(
                            "creditos.avatar.nome",
                            "Nome"
                        ),
                        url(
                            "creditos.avatar.url",
                            "URL"
                        )
                    ]
                },
                {
                    title: "Copyright",
                    fields: [
                        text(
                            "copyright.nome",
                            "Nome"
                        ),
                        text(
                            "copyright.texto",
                            "Texto"
                        )
                    ]
                },
                {
                    title: "Código-fonte",
                    fields: [
                        text(
                            "codigoFonte.texto",
                            "Texto"
                        ),
                        url(
                            "codigoFonte.url",
                            "URL"
                        )
                    ]
                }
            ]
        },

        hero: {
            title: "Hero",
            targetPath:
                "data/content/hero.json",
            filename: "hero.json",
            description:
                "Edite a apresentação principal e textos dos botões.",
            defaults: {
                eyebrow: "",
                titulo: {
                    prefixo: "",
                    destaque: "",
                    sufixo: ""
                },
                descricao: "",
                botoes: {
                    apoio: "",
                    live: ""
                }
            },
            sections: [
                {
                    title: "Apresentação",
                    fields: [
                        text("eyebrow", "Eyebrow"),
                        text(
                            "titulo.prefixo",
                            "Título — prefixo"
                        ),
                        text(
                            "titulo.destaque",
                            "Título — destaque"
                        ),
                        text(
                            "titulo.sufixo",
                            "Título — sufixo"
                        ),
                        textarea(
                            "descricao",
                            "Descrição"
                        )
                    ]
                },
                {
                    title: "Botões",
                    fields: [
                        text(
                            "botoes.apoio",
                            "Apoio"
                        ),
                        text(
                            "botoes.live",
                            "Live"
                        )
                    ]
                }
            ]
        },

        "home-doacoes": {
            title: "CTA de doações da Home",
            targetPath:
                "data/content/home-doacoes.json",
            filename: "home-doacoes.json",
            description:
                "Edite o card de chamada para doações na Home.",
            defaults: {
                eyebrow: "",
                titulo: "",
                descricao: "",
                botao: ""
            },
            sections: [
                {
                    title: "Conteúdo",
                    fields: [
                        text("eyebrow", "Eyebrow"),
                        text("titulo", "Título"),
                        textarea(
                            "descricao",
                            "Descrição"
                        ),
                        text("botao", "Botão")
                    ]
                }
            ]
        },

        lives: {
            title: "Lives do YouTube",
            targetPath:
                "data/content/lives.json",
            filename: "lives.json",
            description:
                "Cadastre vídeos manualmente. Títulos podem ser colados exatamente como estão no YouTube.",
            defaults: {
                eyebrow: "YouTube",
                titulo: "Últimas lives",
                descricao:
                    "Confira algumas lives recentes e abra a escolhida no YouTube.",
                playlistId: "",
                canalUrl:
                    "https://youtube.com/kamyli",
                botaoCanal:
                    "Abrir no YouTube",
                mensagemCarregando:
                    "Carregando lives...",
                mensagemSemPlaylist:
                    "As lives serão adicionadas aqui em breve.",
                mensagemErro:
                    "Não foi possível carregar as lives agora.",
                modalTitulo: "",
                maxItems: 10,
                videos: []
            },
            sections: [
                {
                    title: "Seção",
                    fields: [
                        text("eyebrow", "Eyebrow"),
                        text("titulo", "Título"),
                        textarea(
                            "descricao",
                            "Descrição"
                        ),
                        url(
                            "canalUrl",
                            "URL do canal",
                            {
                                required: true,
                                help:
                                    "Deve usar HTTPS em youtube.com."
                            }
                        ),
                        text(
                            "botaoCanal",
                            "Texto do botão"
                        ),
                        {
                            key: "maxItems",
                            label: "Máximo de cards",
                            type: "number",
                            min: 1,
                            max: 20,
                            required: true
                        }
                    ]
                },
                {
                    title: "Vídeos",
                    help:
                        "Cole o título exatamente como publicado no YouTube. Aspas, barras, emojis e acentos serão escapados automaticamente.",
                    fields: [
                        array(
                            "videos",
                            "Lives",
                            [
                                text(
                                    "videoId",
                                    "Video ID",
                                    {
                                        required: true,
                                        placeholder:
                                            "11 caracteres",
                                        help:
                                            "Somente o ID, não a URL inteira."
                                    }
                                ),
                                textarea(
                                    "title",
                                    "Título exato",
                                    {
                                        required: true
                                    }
                                ),
                                text(
                                    "date",
                                    "Data",
                                    {
                                        type: "date",
                                        required: true
                                    }
                                )
                            ],
                            {
                                itemLabel:
                                    item =>
                                        item.title ||
                                        item.videoId ||
                                        "Live"
                            }
                        )
                    ]
                },
                {
                    title: "Compatibilidade histórica",
                    help:
                        "Campos mantidos para não perder dados de versões anteriores. A V43.6.1 não depende deles para montar os cards.",
                    fields: [
                        text(
                            "playlistId",
                            "Playlist ID"
                        ),
                        textarea(
                            "mensagemCarregando",
                            "Mensagem carregando"
                        ),
                        textarea(
                            "mensagemSemPlaylist",
                            "Mensagem sem playlist"
                        ),
                        textarea(
                            "mensagemErro",
                            "Mensagem de erro"
                        ),
                        text(
                            "modalTitulo",
                            "Título antigo do modal"
                        )
                    ]
                }
            ],
            validate(data, errors) {
                if (
                    !Number.isInteger(
                        data.maxItems
                    ) ||
                    data.maxItems < 1 ||
                    data.maxItems > 20
                ) {
                    errors.push(
                        "maxItems deve ser inteiro entre 1 e 20."
                    );
                }

                try {
                    const parsed =
                        new URL(data.canalUrl);

                    if (
                        parsed.protocol !==
                            "https:" ||
                        !(
                            parsed.hostname ===
                                "youtube.com" ||
                            parsed.hostname.endsWith(
                                ".youtube.com"
                            )
                        )
                    ) {
                        errors.push(
                            "canalUrl deve usar HTTPS em youtube.com."
                        );
                    }
                } catch {
                    errors.push(
                        "canalUrl inválida."
                    );
                }

                data.videos.forEach(
                    (video, index) => {
                        if (
                            !/^[A-Za-z0-9_-]{11}$/.test(
                                video.videoId
                            )
                        ) {
                            errors.push(
                                `Vídeo ${index + 1}: videoId deve ter 11 caracteres válidos.`
                            );
                        }

                        if (
                            !String(
                                video.title || ""
                            ).trim()
                        ) {
                            errors.push(
                                `Vídeo ${index + 1}: título não pode ficar vazio.`
                            );
                        }
                    }
                );
            }
        },

        ranking: {
            title: "Ranking",
            targetPath:
                "data/content/ranking.json",
            filename: "ranking.json",
            description:
                "Edite os textos do ranking de apoiadores.",
            defaults: {
                agradecimento: "",
                titulo: "",
                descricao: "",
                abas: {
                    mensal: "",
                    todosTempos: ""
                }
            },
            sections: [
                {
                    title: "Conteúdo",
                    fields: [
                        text(
                            "agradecimento",
                            "Agradecimento"
                        ),
                        text("titulo", "Título"),
                        textarea(
                            "descricao",
                            "Descrição"
                        )
                    ]
                },
                {
                    title: "Abas",
                    fields: [
                        text(
                            "abas.mensal",
                            "Mensal"
                        ),
                        text(
                            "abas.todosTempos",
                            "Todos os tempos"
                        )
                    ]
                }
            ]
        },

        regras: {
            title: "Regras",
            targetPath:
                "data/content/regras.json",
            filename: "regras.json",
            description:
                "Edite cabeçalho e regras da comunidade.",
            defaults: {
                eyebrow: "Comunidade",
                titulo: "Regras",
                descricao: "",
                itens: []
            },
            sections: [
                {
                    title: "Seção",
                    fields: [
                        text("eyebrow", "Eyebrow"),
                        text("titulo", "Título"),
                        textarea(
                            "descricao",
                            "Descrição"
                        )
                    ]
                },
                {
                    title: "Itens",
                    fields: [
                        array(
                            "itens",
                            "Regras",
                            [
                                text("id", "ID", {
                                    required: true
                                }),
                                text(
                                    "titulo",
                                    "Título",
                                    {
                                        required: true
                                    }
                                ),
                                textarea(
                                    "descricao",
                                    "Descrição",
                                    {
                                        required: true
                                    }
                                )
                            ],
                            {
                                itemLabel:
                                    item =>
                                        item.titulo ||
                                        item.id ||
                                        "Regra"
                            }
                        )
                    ]
                }
            ]
        }
    };
})();
