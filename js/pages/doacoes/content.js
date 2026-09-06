(() => {
    const content = window.KamyliContent;

    if (!content) {
        console.error(
            "KamyliContent não foi carregado."
        );
        return;
    }

    function renderDonation(data) {
        content.setText(
            "donationEyebrow",
            data.eyebrow
        );

        content.setText(
            "donationTitle",
            data.titulo
        );

        content.setText(
            "donationSubtitle",
            data.subtitulo
        );

        content.setText(
            "livepixTitle",
            data.livepix?.titulo
        );

        content.setText(
            "livepixDescription",
            data.livepix?.descricao
        );

        content.setText(
            "pixieTitle",
            data.pixie?.titulo
        );

        content.setText(
            "pixieDescription",
            data.pixie?.descricao
        );

        content.setText(
            "donationNoticeLabel",
            data.aviso?.rotulo
        );

        content.setText(
            "donationNoticeText",
            data.aviso?.texto
        );
    }

    function renderRanking(data) {
        content.setText(
            "rankingThanksText",
            data.agradecimento
        );

        content.setText(
            "rankingTitle",
            data.titulo
        );

        content.setText(
            "rankingDescription",
            data.descricao
        );

        content.setText(
            "rankingMonthlyTab",
            data.abas?.mensal
        );

        content.setText(
            "rankingAllTimeTab",
            data.abas?.todosTempos
        );
    }

    async function loadDonationContent() {
        const [
            donationResult,
            rankingResult
        ] = await Promise.allSettled([
            content.getJSON(
                "/data/content/doacoes.json"
            ),
            content.getJSON(
                "/data/content/ranking.json"
            )
        ]);

        if (
            donationResult.status ===
            "fulfilled"
        ) {
            renderDonation(
                donationResult.value
            );
        } else {
            console.error(
                "Erro ao carregar textos de doações:",
                donationResult.reason
            );
        }

        if (
            rankingResult.status ===
            "fulfilled"
        ) {
            renderRanking(
                rankingResult.value
            );
        } else {
            console.error(
                "Erro ao carregar textos do ranking:",
                rankingResult.reason
            );
        }
    }

    loadDonationContent();
})();
