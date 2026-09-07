(() => {
    const content = window.KamyliContent;

    const shell =
        document.getElementById("livesPlayerShell");

    const facade =
        document.getElementById("livesPlayerFacade");

    const loadButton =
        document.getElementById("livesLoadButton");

    const status =
        document.getElementById("livesFacadeStatus");

    const youtubeLink =
        document.getElementById("livesYoutubeLink");

    const youtubeLinkText =
        document.getElementById("livesYoutubeLinkText");

    if (
        !content ||
        !shell ||
        !facade ||
        !loadButton ||
        !status
    ) {
        return;
    }

    const PLAYLIST_ID_PATTERN =
        /^[A-Za-z0-9_-]{10,100}$/;

    let playlistId = "";
    let playerLoaded = false;

    function normalizeUrl(value) {
        const raw =
            String(value || "").trim();

        if (!raw) {
            return "";
        }

        try {
            const url =
                new URL(raw);

            if (url.protocol !== "https:") {
                return "";
            }

            const hostname =
                url.hostname.toLowerCase();

            if (
                hostname === "youtube.com" ||
                hostname.endsWith(".youtube.com")
            ) {
                return url.href;
            }
        } catch (error) {
            console.warn(
                "URL do YouTube inválida em lives.json.",
                error
            );
        }

        return "";
    }

    function normalizePlaylistId(value) {
        const candidate =
            String(value || "").trim();

        return PLAYLIST_ID_PATTERN.test(
            candidate
        )
            ? candidate
            : "";
    }

    function buildPlaylistUrl(id) {
        return (
            "https://www.youtube.com/" +
            "playlist?list=" +
            encodeURIComponent(id)
        );
    }

    function buildEmbedUrl(id) {
        const params =
            new URLSearchParams({
                list: id,
                rel: "0",
                playsinline: "1"
            });

        return (
            "https://www.youtube-nocookie.com/" +
            "embed/videoseries?" +
            params.toString()
        );
    }

    function setExternalLink(
        id,
        channelUrl,
        label
    ) {
        if (!youtubeLink) {
            return;
        }

        youtubeLink.href =
            id
                ? buildPlaylistUrl(id)
                : channelUrl ||
                    "https://youtube.com/kamyli";

        if (
            youtubeLinkText &&
            label
        ) {
            youtubeLinkText.textContent =
                label;
        }
    }

    function applyText(data) {
        content.setText(
            "livesEyebrow",
            data.eyebrow
        );

        content.setText(
            "livesTitle",
            data.titulo
        );

        content.setText(
            "livesDescription",
            data.descricao
        );

        content.setText(
            "livesPrivacyNote",
            data.notaPrivacidade
        );

        if (data.botaoCarregar) {
            loadButton.textContent =
                String(
                    data.botaoCarregar
                );
        }
    }

    function renderConfigured(data) {
        playlistId =
            normalizePlaylistId(
                data.playlistId
            );

        const channelUrl =
            normalizeUrl(
                data.canalUrl
            );

        setExternalLink(
            playlistId,
            channelUrl,
            data.botaoCanal
        );

        if (!playlistId) {
            loadButton.disabled = true;

            status.textContent =
                String(
                    data.mensagemSemPlaylist ||
                    "A playlist de lives será disponibilizada aqui em breve."
                );

            return;
        }

        loadButton.disabled = false;

        status.textContent =
            "Pronta para carregar. Use o player para navegar pelos vídeos da playlist.";
    }

    function createPlayer() {
        if (
            playerLoaded ||
            !playlistId
        ) {
            return;
        }

        playerLoaded = true;
        loadButton.disabled = true;
        loadButton.textContent =
            "Carregando...";

        status.textContent =
            "Carregando player do YouTube...";

        const iframe =
            document.createElement(
                "iframe"
            );

        iframe.src =
            buildEmbedUrl(
                playlistId
            );

        iframe.title =
            "Playlist de últimas lives da Kamyli Sumire";

        iframe.loading = "lazy";

        iframe.referrerPolicy =
            "strict-origin-when-cross-origin";

        iframe.allow =
            "accelerometer; autoplay; clipboard-write; " +
            "encrypted-media; gyroscope; picture-in-picture; " +
            "web-share";

        iframe.allowFullscreen = true;

        iframe.addEventListener(
            "load",
            () => {
                shell.classList.add(
                    "is-loaded"
                );
            },
            { once: true }
        );

        shell.replaceChildren(
            iframe
        );
    }

    async function init() {
        try {
            const data =
                await content.getJSON(
                    "/data/content/lives.json"
                );

            applyText(data);
            renderConfigured(data);
        } catch (error) {
            console.error(
                "Erro ao carregar configuração de lives:",
                error
            );

            loadButton.disabled = true;

            status.textContent =
                "Não foi possível preparar a playlist agora.";

            setExternalLink(
                "",
                "https://youtube.com/kamyli",
                "Abrir no YouTube"
            );
        }
    }

    loadButton.addEventListener(
        "click",
        createPlayer
    );

    init();
})();
