(() => {
    "use strict";

    const schemas =
        window.KAMYLI_JSON_HELPER_SCHEMAS;

    const helperId =
        document.body.dataset.helper;

    const schema =
        schemas?.[helperId];

    if (!schema) {
        throw new Error(
            `Helper desconhecido: ${helperId}`
        );
    }

    const formRoot =
        document.getElementById(
            "helperForm"
        );

    const preview =
        document.getElementById(
            "jsonPreview"
        );

    const status =
        document.getElementById(
            "helperStatus"
        );

    const fileInput =
        document.getElementById(
            "jsonFileInput"
        );

    const title =
        document.getElementById(
            "helperTitle"
        );

    const description =
        document.getElementById(
            "helperDescription"
        );

    const targetPath =
        document.getElementById(
            "helperTargetPath"
        );

    const controlMap =
        new Map();

    let currentData =
        clone(schema.defaults);

    function clone(value) {
        return JSON.parse(
            JSON.stringify(value)
        );
    }

    function getPath(
        object,
        path
    ) {
        return path
            .split(".")
            .reduce(
                (value, key) =>
                    value == null
                        ? undefined
                        : value[key],
                object
            );
    }

    function setPath(
        object,
        path,
        value
    ) {
        const keys =
            path.split(".");

        let target = object;

        keys
            .slice(0, -1)
            .forEach(key => {
                if (
                    !target[key] ||
                    typeof target[key] !==
                        "object" ||
                    Array.isArray(
                        target[key]
                    )
                ) {
                    target[key] = {};
                }

                target =
                    target[key];
            });

        target[
            keys[keys.length - 1]
        ] = value;
    }

    function showStatus(
        message,
        type = "success"
    ) {
        status.textContent =
            message;

        status.dataset.type =
            type;

        status.hidden = false;

        status.style.whiteSpace =
            "pre-wrap";
    }

    function hideStatus() {
        status.hidden = true;
        status.textContent = "";
        delete status.dataset.type;
    }

    function makeElement(
        tag,
        className,
        textContent
    ) {
        const element =
            document.createElement(tag);

        if (className) {
            element.className =
                className;
        }

        if (
            textContent !==
            undefined
        ) {
            element.textContent =
                textContent;
        }

        return element;
    }

    function valueFromControl(
        control,
        field
    ) {
        switch (field.type) {
            case "checkbox":
                return Boolean(
                    control.checked
                );

            case "number":
                return control.value === ""
                    ? 0
                    : Number(
                        control.value
                    );

            case "lines":
                return control.value
                    .split(/\r?\n/)
                    .map(
                        item =>
                            item.trim()
                    )
                    .filter(Boolean);

            default:
                return control.value;
        }
    }

    function valueForControl(
        value,
        field
    ) {
        if (
            field.type === "lines"
        ) {
            return Array.isArray(value)
                ? value.join("\n")
                : String(value ?? "");
        }

        if (
            field.type ===
            "checkbox"
        ) {
            return Boolean(value);
        }

        return String(
            value ?? ""
        );
    }

    function createControl(
        field,
        value
    ) {
        const wide =
            field.wide ||
            field.type ===
                "textarea" ||
            field.type ===
                "lines" ||
            field.type ===
                "url";

        const wrapper =
            makeElement(
                "div",
                "field" +
                (
                    wide
                        ? " is-wide"
                        : ""
                )
            );

        if (
            field.type ===
            "checkbox"
        ) {
            const row =
                makeElement(
                    "label",
                    "checkbox-row"
                );

            const control =
                document.createElement(
                    "input"
                );

            control.type =
                "checkbox";

            control.checked =
                Boolean(value);

            const span =
                document.createElement(
                    "span"
                );

            span.textContent =
                field.label;

            row.append(
                control,
                span
            );

            wrapper.append(row);

            if (field.help) {
                wrapper.append(
                    makeElement(
                        "p",
                        "field-help",
                        field.help
                    )
                );
            }

            return {
                wrapper,
                control
            };
        }

        const label =
            makeElement(
                "label",
                "field-label",
                field.label
            );

        let control;

        if (
            field.type ===
                "textarea" ||
            field.type ===
                "lines"
        ) {
            control =
                document.createElement(
                    "textarea"
                );
        } else {
            control =
                document.createElement(
                    "input"
                );

            control.type =
                field.type ||
                "text";
        }

        const id =
            "field-" +
            Math.random()
                .toString(36)
                .slice(2);

        control.id = id;
        label.htmlFor = id;

        control.value =
            valueForControl(
                value,
                field
            );

        if (field.placeholder) {
            control.placeholder =
                field.placeholder;
        }

        if (field.required) {
            control.required = true;
        }

        if (field.readonly) {
            control.readOnly = true;
        }

        if (
            field.min !==
            undefined
        ) {
            control.min =
                String(field.min);
        }

        if (
            field.max !==
            undefined
        ) {
            control.max =
                String(field.max);
        }

        if (
            field.type ===
            "number"
        ) {
            control.step = "1";
        }

        wrapper.append(
            label,
            control
        );

        if (field.help) {
            wrapper.append(
                makeElement(
                    "p",
                    "field-help",
                    field.help
                )
            );
        }

        return {
            wrapper,
            control
        };
    }

    function readArrayRow(
        row,
        field
    ) {
        const item = {};

        field.itemFields.forEach(
            itemField => {
                item[
                    itemField.key
                ] = valueFromControl(
                    row.controls.get(
                        itemField.key
                    ),
                    itemField
                );
            }
        );

        return item;
    }

    function createArrayField(
        field,
        value
    ) {
        const block =
            makeElement(
                "div",
                "array-block"
            );

        const toolbar =
            makeElement(
                "div",
                "array-toolbar"
            );

        toolbar.append(
            makeElement(
                "h3",
                "",
                field.label
            )
        );

        const addButton =
            makeElement(
                "button",
                "helper-button",
                "Adicionar"
            );

        addButton.type =
            "button";

        if (field.fixed) {
            addButton.hidden = true;
        }

        toolbar.append(
            addButton
        );

        const itemsRoot =
            makeElement(
                "div",
                "array-items"
            );

        block.append(
            toolbar,
            itemsRoot
        );

        const state = {
            rows: [],
            itemsRoot
        };

        function emptyItem() {
            const item = {};

            field.itemFields.forEach(
                itemField => {
                    if (
                        itemField.type ===
                        "checkbox"
                    ) {
                        item[
                            itemField.key
                        ] = false;
                    } else if (
                        itemField.type ===
                        "number"
                    ) {
                        item[
                            itemField.key
                        ] = 0;
                    } else if (
                        itemField.type ===
                        "lines"
                    ) {
                        item[
                            itemField.key
                        ] = [];
                    } else {
                        item[
                            itemField.key
                        ] = "";
                    }
                }
            );

            return item;
        }

        function refresh() {
            state.rows.forEach(
                (row, index) => {
                    const item =
                        readArrayRow(
                            row,
                            field
                        );

                    row.title.textContent =
                        typeof field.itemLabel ===
                            "function"
                            ? (
                                field.itemLabel(
                                    item
                                ) ||
                                `${field.label} ${index + 1}`
                            )
                            : `${field.label} ${index + 1}`;

                    row.up.disabled =
                        index === 0;

                    row.down.disabled =
                        index ===
                        state.rows.length -
                            1;
                }
            );
        }

        function addRow(item) {
            const element =
                makeElement(
                    "div",
                    "array-item"
                );

            const header =
                makeElement(
                    "div",
                    "array-item-header"
                );

            const rowTitle =
                makeElement(
                    "p",
                    "array-item-title"
                );

            const actions =
                makeElement(
                    "div",
                    "array-actions"
                );

            const up =
                makeElement(
                    "button",
                    "array-action",
                    "↑"
                );

            up.type = "button";
            up.title =
                "Mover para cima";

            const down =
                makeElement(
                    "button",
                    "array-action",
                    "↓"
                );

            down.type = "button";
            down.title =
                "Mover para baixo";

            const remove =
                makeElement(
                    "button",
                    "array-action",
                    "×"
                );

            remove.type =
                "button";
            remove.title =
                "Remover";

            if (field.fixed) {
                remove.hidden = true;
            }

            actions.append(
                up,
                down,
                remove
            );

            header.append(
                rowTitle,
                actions
            );

            const grid =
                makeElement(
                    "div",
                    "field-grid"
                );

            const controls =
                new Map();

            field.itemFields.forEach(
                itemField => {
                    const created =
                        createControl(
                            itemField,
                            item?.[
                                itemField.key
                            ]
                        );

                    grid.append(
                        created.wrapper
                    );

                    controls.set(
                        itemField.key,
                        created.control
                    );

                    created.control
                        .addEventListener(
                            "input",
                            () => {
                                refresh();
                                updatePreview();
                            }
                        );

                    created.control
                        .addEventListener(
                            "change",
                            () => {
                                refresh();
                                updatePreview();
                            }
                        );
                }
            );

            element.append(
                header,
                grid
            );

            const row = {
                element,
                title: rowTitle,
                controls,
                up,
                down,
                remove
            };

            state.rows.push(row);
            itemsRoot.append(element);

            up.addEventListener(
                "click",
                () => {
                    const index =
                        state.rows.indexOf(
                            row
                        );

                    if (index <= 0) {
                        return;
                    }

                    const previous =
                        state.rows[
                            index - 1
                        ];

                    state.rows.splice(
                        index,
                        1
                    );

                    state.rows.splice(
                        index - 1,
                        0,
                        row
                    );

                    itemsRoot.insertBefore(
                        row.element,
                        previous.element
                    );

                    refresh();
                    updatePreview();
                }
            );

            down.addEventListener(
                "click",
                () => {
                    const index =
                        state.rows.indexOf(
                            row
                        );

                    if (
                        index < 0 ||
                        index >=
                            state.rows.length -
                                1
                    ) {
                        return;
                    }

                    const next =
                        state.rows[
                            index + 1
                        ];

                    state.rows.splice(
                        index,
                        1
                    );

                    state.rows.splice(
                        index + 1,
                        0,
                        row
                    );

                    itemsRoot.insertBefore(
                        next.element,
                        row.element
                    );

                    refresh();
                    updatePreview();
                }
            );

            remove.addEventListener(
                "click",
                () => {
                    const index =
                        state.rows.indexOf(
                            row
                        );

                    if (index < 0) {
                        return;
                    }

                    state.rows.splice(
                        index,
                        1
                    );

                    row.element.remove();

                    refresh();
                    updatePreview();
                }
            );

            refresh();
        }

        addButton.addEventListener(
            "click",
            () => {
                addRow(
                    emptyItem()
                );

                updatePreview();
            }
        );

        (
            Array.isArray(value)
                ? value
                : []
        ).forEach(addRow);

        return {
            wrapper: block,
            state
        };
    }

    function buildForm() {
        formRoot.replaceChildren();
        controlMap.clear();

        schema.sections.forEach(
            section => {
                const sectionElement =
                    makeElement(
                        "section",
                        "form-section"
                    );

                sectionElement.append(
                    makeElement(
                        "h3",
                        "form-section-title",
                        section.title
                    )
                );

                if (section.help) {
                    sectionElement.append(
                        makeElement(
                            "p",
                            "form-section-help",
                            section.help
                        )
                    );
                }

                const grid =
                    makeElement(
                        "div",
                        "field-grid"
                    );

                section.fields.forEach(
                    field => {
                        const value =
                            getPath(
                                currentData,
                                field.key
                            );

                        if (
                            field.type ===
                            "array"
                        ) {
                            const created =
                                createArrayField(
                                    field,
                                    value
                                );

                            grid.append(
                                created.wrapper
                            );

                            controlMap.set(
                                field.key,
                                {
                                    field,
                                    arrayState:
                                        created.state
                                }
                            );

                            return;
                        }

                        const created =
                            createControl(
                                field,
                                value
                            );

                        grid.append(
                            created.wrapper
                        );

                        controlMap.set(
                            field.key,
                            {
                                field,
                                control:
                                    created.control
                            }
                        );

                        created.control
                            .addEventListener(
                                "input",
                                updatePreview
                            );

                        created.control
                            .addEventListener(
                                "change",
                                updatePreview
                            );
                    }
                );

                sectionElement.append(
                    grid
                );

                formRoot.append(
                    sectionElement
                );
            }
        );
    }

    function collectData() {
        const data = {};

        controlMap.forEach(
            (entry, path) => {
                const {
                    field,
                    control,
                    arrayState
                } = entry;

                const value =
                    field.type ===
                        "array"
                        ? arrayState.rows.map(
                            row =>
                                readArrayRow(
                                    row,
                                    field
                                )
                        )
                        : valueFromControl(
                            control,
                            field
                        );

                setPath(
                    data,
                    path,
                    value
                );
            }
        );

        return data;
    }

    function validateDate(value) {
        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(
                value
            )
        ) {
            return false;
        }

        const [
            year,
            month,
            day
        ] = value
            .split("-")
            .map(Number);

        const date =
            new Date(
                Date.UTC(
                    year,
                    month - 1,
                    day
                )
            );

        return (
            date.getUTCFullYear() ===
                year &&
            date.getUTCMonth() ===
                month - 1 &&
            date.getUTCDate() ===
                day
        );
    }

    function validateField(
        field,
        value,
        errors,
        label
    ) {
        if (
            field.required &&
            field.type !==
                "checkbox"
        ) {
            const empty =
                field.type ===
                    "number"
                    ? !Number.isFinite(
                        value
                    )
                    : !String(
                        value ?? ""
                    ).trim();

            if (empty) {
                errors.push(
                    `${label}: obrigatório.`
                );
            }
        }

        if (
            field.type === "date" &&
            value &&
            !validateDate(value)
        ) {
            errors.push(
                `${label}: data inválida.`
            );
        }

        if (
            field.type === "url" &&
            value
        ) {
            try {
                const parsed =
                    new URL(value);

                if (
                    ![
                        "http:",
                        "https:"
                    ].includes(
                        parsed.protocol
                    )
                ) {
                    throw new Error();
                }
            } catch {
                errors.push(
                    `${label}: URL inválida.`
                );
            }
        }

        if (
            field.type === "number"
        ) {
            if (
                !Number.isInteger(
                    value
                )
            ) {
                errors.push(
                    `${label}: use número inteiro.`
                );
            }

            if (
                field.min !==
                    undefined &&
                value < field.min
            ) {
                errors.push(
                    `${label}: mínimo ${field.min}.`
                );
            }

            if (
                field.max !==
                    undefined &&
                value > field.max
            ) {
                errors.push(
                    `${label}: máximo ${field.max}.`
                );
            }
        }
    }

    function validateCurrent() {
        const data =
            collectData();

        const errors = [];

        controlMap.forEach(
            entry => {
                const {
                    field,
                    control,
                    arrayState
                } = entry;

                if (
                    field.type ===
                    "array"
                ) {
                    arrayState.rows.forEach(
                        (row, rowIndex) => {
                            field.itemFields.forEach(
                                itemField => {
                                    validateField(
                                        itemField,
                                        valueFromControl(
                                            row.controls.get(
                                                itemField.key
                                            ),
                                            itemField
                                        ),
                                        errors,
                                        `${field.label} ${rowIndex + 1} — ${itemField.label}`
                                    );
                                }
                            );
                        }
                    );

                    return;
                }

                validateField(
                    field,
                    valueFromControl(
                        control,
                        field
                    ),
                    errors,
                    field.label
                );
            }
        );

        if (
            typeof schema.validate ===
            "function"
        ) {
            schema.validate(
                data,
                errors
            );
        }

        preview.value =
            JSON.stringify(
                data,
                null,
                2
            ) + "\n";

        if (errors.length) {
            showStatus(
                "Há ajustes necessários:\n• " +
                errors.join("\n• "),
                "error"
            );

            return false;
        }

        showStatus(
            "JSON válido pelo helper. Você pode copiar ou baixar.",
            "success"
        );

        return true;
    }

    function updatePreview() {
        hideStatus();

        preview.value =
            JSON.stringify(
                collectData(),
                null,
                2
            ) + "\n";
    }

    function loadData(
        data,
        message
    ) {
        if (
            !data ||
            typeof data !==
                "object" ||
            Array.isArray(data)
        ) {
            throw new Error(
                "O JSON raiz precisa ser um objeto."
            );
        }

        currentData = data;

        buildForm();
        updatePreview();

        if (message) {
            showStatus(
                message,
                "success"
            );
        }
    }

    fileInput.addEventListener(
        "change",
        async () => {
            const [file] =
                fileInput.files;

            if (!file) {
                return;
            }

            try {
                const raw =
                    await file.text();

                loadData(
                    JSON.parse(raw),
                    `Arquivo ${file.name} carregado.`
                );
            } catch (error) {
                showStatus(
                    "Não foi possível abrir o JSON: " +
                    error.message,
                    "error"
                );
            } finally {
                fileInput.value = "";
            }
        }
    );

    document
        .getElementById(
            "validateJsonButton"
        )
        .addEventListener(
            "click",
            validateCurrent
        );

    document
        .getElementById(
            "copyJsonButton"
        )
        .addEventListener(
            "click",
            async () => {
                validateCurrent();

                try {
                    await navigator
                        .clipboard
                        .writeText(
                            preview.value
                        );

                    showStatus(
                        "JSON copiado.",
                        "success"
                    );
                } catch {
                    preview.focus();
                    preview.select();

                    const copied =
                        document.execCommand(
                            "copy"
                        );

                    showStatus(
                        copied
                            ? "JSON copiado."
                            : "Cópia automática indisponível. O JSON ficou selecionado.",
                        copied
                            ? "success"
                            : "error"
                    );
                }
            }
        );

    document
        .getElementById(
            "downloadJsonButton"
        )
        .addEventListener(
            "click",
            () => {
                if (
                    !validateCurrent()
                ) {
                    return;
                }

                const blob =
                    new Blob(
                        [preview.value],
                        {
                            type:
                                "application/json;charset=utf-8"
                        }
                    );

                const objectUrl =
                    URL.createObjectURL(
                        blob
                    );

                const link =
                    document.createElement(
                        "a"
                    );

                link.href =
                    objectUrl;

                link.download =
                    schema.filename;

                document.body.append(
                    link
                );

                link.click();
                link.remove();

                setTimeout(
                    () =>
                        URL.revokeObjectURL(
                            objectUrl
                        ),
                    1000
                );
            }
        );

    document
        .getElementById(
            "resetJsonButton"
        )
        .addEventListener(
            "click",
            () => {
                if (
                    !window.confirm(
                        "Voltar ao modelo padrão deste helper?"
                    )
                ) {
                    return;
                }

                loadData(
                    clone(
                        schema.defaults
                    ),
                    "Modelo padrão restaurado."
                );
            }
        );

    title.textContent =
        schema.title;

    description.textContent =
        schema.description;

    targetPath.textContent =
        schema.targetPath;

    buildForm();
    updatePreview();
})();
