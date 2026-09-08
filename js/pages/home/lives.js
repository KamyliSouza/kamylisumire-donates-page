(() => {
    const content = window.KamyliContent;

    const section =
        document.getElementById("lives");

    const track =
        document.getElementById("livesTrack");

    const prev =
        document.getElementById("livesPrev");

    const next =
        document.getElementById("livesNext");

    const youtubeLink =
        document.getElementById("livesYoutubeLink");

    const youtubeLinkText =
        document.getElementById("livesYoutubeLinkText");

    if (
        !content ||
        !section ||
        !track
    ) {
        return;
    }

    const VIDEO_ID_PATTERN =
        /^[A-Za-z0-9_-]{11}$/;

    const ISO_DATE_PATTERN =
        /^\d{4}-\d{2}-\d{2}$/;

    const DEFAULT_STEP = 320;

    let carouselController = null;

    function normalizeVideoId(value) {
        const candidate =
            String(value || "").trim();

        return VIDEO_ID_PATTERN.test(
            candidate
        )
            ? candidate
            : "";
    }

    function normalizeDate(value) {
        const candidate =
            String(value || "").trim();

        if (
            !ISO_DATE_PATTERN.test(
                candidate
            )
        ) {
            return "";
        }

        const [year, month, day] =
            candidate
                .split("-")
                .map(Number);

        const date = new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );

        if (
            date.getUTCFullYear() !== year ||
            date.getUTCMonth() !== month - 1 ||
            date.getUTCDate() !== day
        ) {
            return "";
        }

        return candidate;
    }

    function normalizeVideo(item) {
        if (
            !item ||
            typeof item !== "object" ||
            Array.isArray(item)
        ) {
            return null;
        }

        const videoId =
            normalizeVideoId(
                item.videoId
            );

        const title =
            String(
                item.title || ""
            ).trim();

        const date =
            normalizeDate(
                item.date
            );

        if (
            !videoId ||
            !title ||
            !date
        ) {
            return null;
        }

        return {
            videoId,
            title,
            date
        };
    }

    function buildVideoUrl(videoId) {
        const url = new URL(
            "https://www.youtube.com/watch"
        );

        url.searchParams.set(
            "v",
            videoId
        );

        return url.toString();
    }

    function thumbnailUrl(videoId) {
        return (
            "https://i.ytimg.com/vi/" +
            encodeURIComponent(videoId) +
            "/mqdefault.jpg"
        );
    }

    function formatDate(value) {
        const [year, month, day] =
            value
                .split("-")
                .map(Number);

        const date = new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );

        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC"
            }
        ).format(date);
    }

    function setMessage(message) {
        const element =
            document.createElement(
                "p"
            );

        element.className =
            "lives-message";

        element.textContent =
            String(message);

        track.replaceChildren(
            element
        );

        if (prev) {
            prev.disabled = true;
        }

        if (next) {
            next.disabled = true;
        }
    }

    function createVideoCard(video) {
        const card =
            document.createElement(
                "a"
            );

        card.className =
            "live-card";

        card.href =
            buildVideoUrl(
                video.videoId
            );

        card.target = "_blank";
        card.rel = "noopener noreferrer";

        card.setAttribute(
            "aria-label",
            `Abrir ${video.title} no YouTube`
        );

        const imageWrap =
            document.createElement(
                "span"
            );

        imageWrap.className =
            "live-card-media";

        const image =
            document.createElement(
                "img"
            );

        image.className =
            "live-card-thumbnail";

        image.src =
            thumbnailUrl(
                video.videoId
            );

        /*
         * V43.6.1: thumbnails ficam disponíveis já no carregamento
         * da página. Nenhum player/iframe é criado por este módulo.
         */
        image.loading = "eager";
        image.decoding = "async";
        image.width = 320;
        image.height = 180;
        image.alt = "";

        imageWrap.appendChild(
            image
        );

        const body =
            document.createElement(
                "span"
            );

        body.className =
            "live-card-body";

        const title =
            document.createElement(
                "strong"
            );

        title.className =
            "live-card-title";

        title.textContent =
            video.title;

        const meta =
            document.createElement(
                "span"
            );

        meta.className =
            "live-card-meta";

        const date =
            document.createElement(
                "time"
            );

        date.dateTime =
            video.date;

        date.textContent =
            formatDate(
                video.date
            );

        const source =
            document.createElement(
                "span"
            );

        source.className =
            "live-card-source";

        source.textContent =
            "YouTube ↗";

        meta.append(
            date,
            source
        );

        body.append(
            title,
            meta
        );

        card.append(
            imageWrap,
            body
        );

        return card;
    }

    function renderCards(videos) {
        if (!videos.length) {
            setMessage(
                "As lives serão adicionadas aqui em breve."
            );

            return;
        }

        const fragment =
            document.createDocumentFragment();

        videos.forEach(video => {
            fragment.appendChild(
                createVideoCard(video)
            );
        });

        track.replaceChildren(
            fragment
        );

        carouselController?.refresh();
    }

    function setupCarousel() {
        const carousel =
            window.KamyliCarousel;

        if (!carousel?.create) {
            console.error(
                "KamyliCarousel não foi carregado antes das Lives."
            );
            return;
        }

        carouselController = carousel.create({
            track,
            prev,
            next,
            itemSelector: ".live-card",
            defaultStep: DEFAULT_STEP
        });
    }

    function applySectionContent(data) {
        content.setText(
            "livesEyebrow",
            data.eyebrow
        );

        content.setText(
            "livesTitle",
            data.titulo
        );

        const legacyDescription =
            "Escolha uma live da playlist para assistir sem sair do site.";

        const description =
            String(
                data.descricao || ""
            ).trim();

        content.setText(
            "livesDescription",
            !description ||
            description === legacyDescription
                ? "Confira algumas lives recentes e abra a escolhida no YouTube."
                : description
        );

        if (
            youtubeLink &&
            typeof data.canalUrl ===
                "string" &&
            data.canalUrl.trim()
        ) {
            youtubeLink.href =
                data.canalUrl.trim();
        }

        content.setText(
            youtubeLinkText,
            data.botaoCanal ||
            "Abrir no YouTube"
        );
    }

    async function init() {
        setupCarousel();

        try {
            const data =
                await content.getJSON(
                    "data/content/lives.json"
                );

            applySectionContent(
                data
            );

            const maxItems =
                Number.isInteger(
                    data.maxItems
                )
                    ? Math.max(
                        1,
                        Math.min(
                            20,
                            data.maxItems
                        )
                    )
                    : 10;

            const videos =
                Array.isArray(
                    data.videos
                )
                    ? data.videos
                        .map(
                            normalizeVideo
                        )
                        .filter(Boolean)
                        .slice(
                            0,
                            maxItems
                        )
                    : [];

            renderCards(
                videos
            );
        } catch (error) {
            console.error(
                "Erro ao carregar lives:",
                error
            );

            setMessage(
                "Não foi possível carregar as lives agora."
            );
        }
    }

    init();
})();
