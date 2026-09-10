/**
 * =========================================================
 * SCRIPT.JS — INVITATION ROMANTIQUE INTERACTIVE
 * ---------------------------------------------------------
 * Ce fichier gère :
 * - la personnalisation de l'invitation ;
 * - le lien du Google Forms ;
 * - le déplacement du bouton NON ;
 * - l'agrandissement progressif du bouton OUI ;
 * - le passage à l'écran final ;
 * - la génération des cœurs tombants ;
 * - la compatibilité souris, tactile et responsive.
 * =========================================================
 */


// =========================================================
// PERSONNALISATION
// =========================================================

/**
 * Lien vers ton Google Forms.
 *
 * Remplace uniquement la valeur entre les guillemets par le
 * lien de ton formulaire Google Forms.
 *
 * Exemple :
 * const GOOGLE_FORM_URL = "https://forms.gle/AbCdEfGh123456";
 */
const GOOGLE_FORM_URL = "COLLER_MON_LIEN_ICI";

/**
 * Chemin de l'image de fond.
 *
 * Ton image est placée dans :
 * img/cover.jpg
 *
 * Le CSS utilise déjà directement cette même image.
 * Cette constante reste utile si tu souhaites plus tard
 * changer le background depuis JavaScript.
 */
const BACKGROUND_IMAGE = "img/cover.jpg";

/**
 * Textes facilement personnalisables.
 *
 * Tu peux modifier ces valeurs sans toucher au HTML.
 */
const TEXTS = {
    question: "Veux-tu venir avec moi",
    event: "au Dimanche International ?",
    welcome: "Bienvenue !",
    confirmation: "Tu as donné ta parole pour être là. Alors maintenant, je compte sur toi !",
    confirmButton: "Confirmer ma présence"
};

/**
 * Configuration globale de l'expérience.
 *
 * maxYesScale :
 * Taille maximale du bouton OUI.
 * 1.35 signifie que le bouton ne dépassera jamais 135 %
 * de sa taille initiale.
 *
 * noButtonPadding :
 * Distance minimale, en pixels, entre le bouton NON et
 * les bords visibles de l'écran.
 *
 * heartCount :
 * Nombre de cœurs créés après le clic sur OUI.
 */
const CONFIG = {
    maxYesScale: 1.35,
    noButtonPadding: 20,
    heartCount: 30,

    /*
       Augmentation appliquée au bouton OUI à chaque tentative
       de clic ou de toucher sur NON.
    */
    yesScaleIncrement: 0.05,

    /*
       Durée de transition du bouton NON lorsqu'il se déplace.
       Cette valeur est utilisée dans moveNoButton().
    */
    noButtonTransitionDuration: 280,

    /*
       Nombre maximal de tentatives pour trouver une position
       éloignée de la position actuelle du bouton NON.
    */
    positionAttempts: 12,

    /*
       Couleurs des cœurs. Elles correspondent aux sélecteurs
       .heart[data-color="1"] à .heart[data-color="5"] du CSS.
    */
    heartColors: ["1", "2", "3", "4", "5"]
};


// =========================================================
// 1. RÉCUPÉRATION DES ÉLÉMENTS HTML
// =========================================================

/**
 * Références vers les éléments HTML utilisés par JavaScript.
 *
 * Les récupérer une seule fois évite de répéter les recherches
 * dans le DOM et rend le code plus lisible.
 */
const homeScreen = document.getElementById("homeScreen");
const confirmationScreen = document.getElementById("confirmationScreen");

const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");
const confirmBtn = document.getElementById("confirmBtn");

const heartsContainer = document.getElementById("heartsContainer");

const questionText = document.querySelector(".question-text");
const highlightText = document.querySelector(".question-text .highlight");
const confirmationTitle = document.querySelector(".confirmation-title");
const confirmationMessage = document.querySelector(".confirmation-message");


// =========================================================
// 2. ÉTAT DE L'APPLICATION
// =========================================================

/**
 * yesScale mémorise la taille actuelle du bouton OUI.
 *
 * Au lieu de lire la transformation CSS à chaque fois, on garde
 * la valeur dans une variable. Cela est plus fiable et évite les
 * problèmes liés aux matrices CSS transform.
 */
let yesScale = 1;

/**
 * isConfirmationVisible évite de lancer deux fois la transition
 * si l'utilisateur clique rapidement plusieurs fois sur OUI.
 */
let isConfirmationVisible = false;

/**
 * lastNoMoveTime limite les déplacements trop rapprochés du bouton
 * NON sur certains appareils tactiles ou lors d'événements multiples.
 */
let lastNoMoveTime = 0;


// =========================================================
// 3. INITIALISATION
// =========================================================

/**
 * Initialise la page après que le HTML soit disponible.
 *
 * Cette fonction :
 * 1. applique les textes configurables ;
 * 2. configure le lien Google Forms ;
 * 3. ajoute tous les événements ;
 * 4. prépare le bouton NON.
 */
function initializePage() {
    applyCustomTexts();
    setupGoogleFormsLink();
    setupEventListeners();

    /*
       La position initiale du bouton NON reste dans le flux normal.
       Il sera placé en fixed uniquement dès la première tentative
       de survol, clic ou toucher.
    */
}

/**
 * Applique les textes de l'objet TEXTS dans les éléments HTML.
 *
 * Cette fonction facilite la personnalisation de la page sans
 * modifier directement index.html.
 */
function applyCustomTexts() {
    questionText.firstChild.textContent = `${TEXTS.question} `;

    highlightText.textContent = TEXTS.event;
    confirmationTitle.textContent = TEXTS.welcome;
    confirmationMessage.innerHTML = TEXTS.confirmation.replace(". ", ".<br>");
    confirmBtn.textContent = TEXTS.confirmButton;
}

/**
 * Configure l'URL du bouton Google Forms.
 *
 * Le HTML possède déjà :
 * - target="_blank" : ouvre le formulaire dans un nouvel onglet ;
 * - rel="noopener noreferrer" : limite certains risques liés
 *   à l'ouverture d'un nouvel onglet.
 */
function setupGoogleFormsLink() {
    /*
       Si le lien n'a pas encore été remplacé, le bouton ne mènera
       vers aucune adresse réelle et un message sera visible dans
       la console du navigateur.
    */
    if (GOOGLE_FORM_URL === "COLLER_MON_LIEN_ICI") {
        console.warn(
            "Google Forms non configuré : remplace GOOGLE_FORM_URL dans script.js."
        );

        /*
           Empêche un lien "#" inutile tant que l'utilisateur n'a
           pas ajouté son propre lien Google Forms.
        */
        confirmBtn.addEventListener("click", preventUnconfiguredFormLink);
        return;
    }

    confirmBtn.href = GOOGLE_FORM_URL;
}

/**
 * Empêche l'ouverture du lien lorsque GOOGLE_FORM_URL n'a pas
 * encore été configuré.
 *
 * @param {MouseEvent} event - Événement de clic sur le lien.
 * @returns {void}
 */
function preventUnconfiguredFormLink(event) {
    event.preventDefault();

    alert(
        "Le lien Google Forms n'est pas encore configuré. " +
        "Modifie GOOGLE_FORM_URL dans le fichier script.js."
    );
}


// =========================================================
// 4. GESTION DU BOUTON NON
// =========================================================

/**
 * Déplace le bouton NON à une nouvelle position aléatoire.
 *
 * Le bouton est placé avec position: fixed. Il est donc calculé
 * par rapport à la fenêtre visible, et non par rapport à la carte.
 *
 * Cela permet :
 * - de garder le bouton entièrement à l'écran ;
 * - de ne pas créer de scroll ;
 * - de garantir une expérience identique sur PC et mobile.
 *
 * @param {boolean} animate - true pour un déplacement fluide ;
 * false pour un repositionnement instantané.
 * @returns {void}
 */
function moveNoButton(animate = true) {
    /*
       Évite les appels trop rapprochés. Certains navigateurs peuvent
       déclencher touchstart puis click pour une seule interaction.
    */
    const now = Date.now();

    if (now - lastNoMoveTime < 100) {
        return;
    }

    lastNoMoveTime = now;

    /*
       Récupère les dimensions de la fenêtre réellement visible.
       visualViewport est particulièrement utile sur mobile lorsque
       le clavier ou les barres du navigateur modifient la zone visible.
    */
    const viewportWidth = window.visualViewport
        ? window.visualViewport.width
        : window.innerWidth;

    const viewportHeight = window.visualViewport
        ? window.visualViewport.height
        : window.innerHeight;

    /*
       getBoundingClientRect donne la largeur et la hauteur réelles
       du bouton, incluant padding et bordures.
    */
    const buttonRect = noBtn.getBoundingClientRect();
    const buttonWidth = buttonRect.width;
    const buttonHeight = buttonRect.height;

    /*
       Calcule les limites maximales de position.
       Math.max protège contre les petits écrans : on évite une
       valeur négative qui pourrait sortir le bouton de l'écran.
    */
    const minX = CONFIG.noButtonPadding;
    const minY = CONFIG.noButtonPadding;

    const maxX = Math.max(
        minX,
        viewportWidth - buttonWidth - CONFIG.noButtonPadding
    );

    const maxY = Math.max(
        minY,
        viewportHeight - buttonHeight - CONFIG.noButtonPadding
    );

    /*
       Conserve la position actuelle pour éviter que le bouton se
       déplace seulement de quelques pixels, ce qui serait moins amusant.
    */
    const currentCenterX = buttonRect.left + buttonWidth / 2;
    const currentCenterY = buttonRect.top + buttonHeight / 2;

    let newX = minX;
    let newY = minY;

    /*
       Essaie plusieurs positions aléatoires pour chercher une position
       suffisamment éloignée de la position actuelle.
    */
    for (let attempt = 0; attempt < CONFIG.positionAttempts; attempt += 1) {
        const candidateX = randomBetween(minX, maxX);
        const candidateY = randomBetween(minY, maxY);

        const candidateCenterX = candidateX + buttonWidth / 2;
        const candidateCenterY = candidateY + buttonHeight / 2;

        const distance = getDistance(
            currentCenterX,
            currentCenterY,
            candidateCenterX,
            candidateCenterY
        );

        /*
           Une distance minimale de 120 pixels donne un déplacement
           suffisamment visible, sans être trop brutal.
        */
        if (distance > 120 || attempt === CONFIG.positionAttempts - 1) {
            newX = candidateX;
            newY = candidateY;
            break;
        }
    }

    /*
       Le bouton devient fixed. Sa position ne pousse donc aucun élément,
       ce qui évite tout scroll horizontal ou vertical.
    */
    noBtn.style.position = "fixed";
    noBtn.style.zIndex = "30";

    /*
       Active ou désactive la transition selon le contexte.
       prefersReducedMotion est vérifié pour respecter l'accessibilité.
    */
    if (animate && !prefersReducedMotion()) {
        noBtn.style.transition = [
            `left ${CONFIG.noButtonTransitionDuration}ms ease-out`,
            `top ${CONFIG.noButtonTransitionDuration}ms ease-out`,
            "background 180ms ease",
            "border-color 180ms ease"
        ].join(", ");
    } else {
        noBtn.style.transition = "none";
    }

    /*
       Application des coordonnées finales.
       Elles sont limitées par minX/maxX et minY/maxY : le bouton
       restera toujours entièrement visible dans la fenêtre.
    */
    noBtn.style.left = `${newX}px`;
    noBtn.style.top = `${newY}px`;
}

/**
 * Gère toute tentative d'interaction avec le bouton NON.
 *
 * Cette fonction est utilisée par :
 * - pointerenter : approche de la souris ;
 * - pointerdown : clic souris ou toucher ;
 * - click : sécurité supplémentaire.
 *
 * @param {Event} event - Événement déclenché sur le bouton NON.
 * @returns {void}
 */
function handleNoButtonInteraction(event) {
    /*
       preventDefault est utile pour pointerdown et click.
       Il évite qu'un clic normal soit traité comme une action
       après que le bouton a déjà changé de position.
    */
    event.preventDefault();

    /*
       stopPropagation empêche l'événement de remonter inutilement
       vers les éléments parents.
    */
    event.stopPropagation();

    moveNoButton(true);
    increaseYesButtonScale();
}

/**
 * Vérifie si le bouton NON est encore complètement visible.
 *
 * Cette fonction est appelée lors d'un redimensionnement pour
 * repositionner le bouton si la taille de l'écran a changé.
 *
 * @returns {boolean} true si le bouton est visible en entier.
 */
function isNoButtonInsideViewport() {
    const rect = noBtn.getBoundingClientRect();
    const padding = CONFIG.noButtonPadding;

    return (
        rect.left >= padding &&
        rect.top >= padding &&
        rect.right <= window.innerWidth - padding &&
        rect.bottom <= window.innerHeight - padding
    );
}

/**
 * Replace le bouton NON dans les limites visibles si nécessaire.
 *
 * @returns {void}
 */
function keepNoButtonVisibleOnResize() {
    /*
       Cette vérification est utile uniquement si le bouton NON
       a déjà été déplacé et donc placé en fixed.
    */
    if (noBtn.style.position !== "fixed") {
        return;
    }

    if (!isNoButtonInsideViewport()) {
        moveNoButton(false);
    }
}


// =========================================================
// 5. AGRANDISSEMENT DU BOUTON OUI
// =========================================================

/**
 * Agrandit doucement le bouton OUI à chaque tentative sur NON.
 *
 * La taille est plafonnée par CONFIG.maxYesScale pour préserver
 * l'élégance de l'interface et éviter un bouton gigantesque.
 *
 * @returns {void}
 */
function increaseYesButtonScale() {
    /*
       Ajoute un petit incrément tout en respectant la limite maximale.
       Exemple avec la configuration actuelle :
       1.00 -> 1.05 -> 1.10 -> ... -> 1.35 maximum.
    */
    yesScale = Math.min(
        yesScale + CONFIG.yesScaleIncrement,
        CONFIG.maxYesScale
    );

    /*
       CSS assure la transition fluide grâce à transition: transform.
       La transformation n'affecte pas la mise en page ni le scroll.
    */
    yesBtn.style.transform = `scale(${yesScale})`;

    /*
       Assure que le bouton reste au premier plan si son échelle
       le rapproche visuellement du bouton NON.
    */
    yesBtn.style.zIndex = "25";
}


// =========================================================
// 6. GESTION DU CLIC SUR OUI
// =========================================================

/**
 * Affiche l'écran final après un clic sur OUI.
 *
 * Cette fonction :
 * 1. évite une double exécution ;
 * 2. cache l'écran d'accueil ;
 * 3. affiche l'écran de confirmation ;
 * 4. cache le bouton NON ;
 * 5. lance les cœurs après le début de la transition.
 *
 * @param {MouseEvent} event - Événement de clic sur OUI.
 * @returns {void}
 */
function handleYesButtonClick(event) {
    event.preventDefault();

    /*
       Évite qu'un double clic rapide relance les animations
       ou modifie l'état de la page plusieurs fois.
    */
    if (isConfirmationVisible) {
        return;
    }

    isConfirmationVisible = true;

    /*
       Le bouton NON devient invisible avant le changement d'écran.
       Cela évite qu'il reste affiché s'il était en position fixed.
    */
    noBtn.style.opacity = "0";
    noBtn.style.pointerEvents = "none";

    /*
       Transition CSS : l'écran accueil perd .active, l'écran final
       obtient .active et devient visible progressivement.
    */
    homeScreen.classList.remove("active");
    confirmationScreen.classList.add("active");

    /*
       Lance la célébration après un court délai, pour laisser
       la transition de l'écran commencer.
    */
    window.setTimeout(startHeartsAnimation, 250);
}


// =========================================================
// 7. ANIMATION DES CŒURS
// =========================================================

/**
 * Lance la génération des cœurs tombants.
 *
 * Les cœurs ne sont pas générés lorsque l'utilisateur demande
 * la réduction des animations dans les réglages de son système.
 *
 * @returns {void}
 */
function startHeartsAnimation() {
    if (prefersReducedMotion()) {
        return;
    }

    /*
       Supprime d'anciens cœurs éventuels avant d'en créer de nouveaux.
       Cette pratique évite l'accumulation inutile d'éléments dans le DOM.
    */
    heartsContainer.innerHTML = "";

    /*
       Crée le nombre de cœurs indiqué dans CONFIG.heartCount.
       Avec 30 cœurs, l'animation reste légère sur smartphone.
    */
    for (let index = 0; index < CONFIG.heartCount; index += 1) {
        createHeart(index);
    }
}

/**
 * Crée un cœur avec une position, une taille, une durée et une
 * couleur différentes afin d'obtenir une animation naturelle.
 *
 * @param {number} index - Index du cœur utilisé pour répartir
 * son délai de départ.
 * @returns {void}
 */
function createHeart(index) {
    /*
       Création d'un span : c'est un élément léger adapté à
       l'affichage du caractère Unicode du cœur.
    */
    const heart = document.createElement("span");

    heart.className = "heart";
    heart.textContent = "♥";

    /*
       Position horizontale :
       entre 3 % et 94 % pour minimiser le risque qu'un gros cœur
       soit visuellement coupé par les bords.
    */
    const leftPosition = randomBetween(3, 94);

    /*
       Taille comprise entre 1rem et 2.4rem.
       Les différentes tailles ajoutent de la profondeur.
    */
    const heartSize = randomBetween(1, 2.4);

    /*
       Durée comprise entre 4 et 7 secondes.
       Les cœurs tombent donc à des vitesses différentes.
    */
    const animationDuration = randomBetween(4, 7);

    /*
       Les départs sont répartis sur environ 2 secondes.
       Aucun effet brutal où tous les cœurs apparaissent d'un coup.
    */
    const animationDelay = (index / CONFIG.heartCount) * 2;

    /*
       Choisit au hasard une des couleurs disponibles.
    */
    const colorIndex = Math.floor(
        Math.random() * CONFIG.heartColors.length
    );

    const selectedColor = CONFIG.heartColors[colorIndex];

    /*
       Applique les valeurs au cœur créé.
    */
    heart.style.left = `${leftPosition}%`;
    heart.style.fontSize = `${heartSize}rem`;
    heart.style.animationDuration = `${animationDuration}s`;
    heart.style.animationDelay = `${animationDelay}s`;
    heart.dataset.color = selectedColor;

    /*
       Ajoute le cœur dans le conteneur plein écran.
    */
    heartsContainer.appendChild(heart);

    /*
       Nettoyage : le cœur est supprimé quand son animation est terminée.
       Cela préserve les performances de la page.
    */
    window.setTimeout(() => {
        heart.remove();
    }, (animationDuration + animationDelay) * 1000);
}


// =========================================================
// 8. ÉVÉNEMENTS
// =========================================================

/**
 * Enregistre les écouteurs d'événements de la page.
 *
 * Pointer Events fonctionne avec :
 * - souris ;
 * - écran tactile ;
 * - stylet.
 *
 * Cela évite de gérer séparément mouseover et touchstart.
 *
 * @returns {void}
 */
function setupEventListeners() {
    /*
       pointerenter est très pratique sur ordinateur :
       dès que la souris approche du bouton NON, il se déplace.
    */
    noBtn.addEventListener("pointerenter", handleNoButtonInteraction);

    /*
       pointerdown capture le toucher ou le clic dès le début,
       avant qu'un clic complet ne soit déclenché.
    */
    noBtn.addEventListener("pointerdown", handleNoButtonInteraction);

    /*
       click reste une sécurité complémentaire, notamment pour
       certains modes de navigation au clavier ou navigateurs.
    */
    noBtn.addEventListener("click", handleNoButtonInteraction);

    /*
       Clic sur OUI : affiche l'écran de confirmation.
    */
    yesBtn.addEventListener("click", handleYesButtonClick);

    /*
       Si la fenêtre change de taille, le bouton NON est replacé
       uniquement s'il est devenu partiellement hors écran.
    */
    window.addEventListener("resize", keepNoButtonVisibleOnResize);

    /*
       visualViewport est utile sur mobile lors de changements
       de taille liés aux barres du navigateur.
    */
    if (window.visualViewport) {
        window.visualViewport.addEventListener(
            "resize",
            keepNoButtonVisibleOnResize
        );
    }
}


// =========================================================
// 9. FONCTIONS UTILITAIRES
// =========================================================

/**
 * Retourne un nombre aléatoire entre min et max.
 *
 * @param {number} min - Valeur minimale.
 * @param {number} max - Valeur maximale.
 * @returns {number} Nombre aléatoire compris entre min et max.
 */
function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * Calcule la distance entre deux points.
 *
 * La formule utilisée est la distance euclidienne :
 * √((x2 - x1)² + (y2 - y1)²)
 *
 * @param {number} x1 - Coordonnée X du premier point.
 * @param {number} y1 - Coordonnée Y du premier point.
 * @param {number} x2 - Coordonnée X du second point.
 * @param {number} y2 - Coordonnée Y du second point.
 * @returns {number} Distance entre les deux points.
 */
function getDistance(x1, y1, x2, y2) {
    const horizontalDistance = x2 - x1;
    const verticalDistance = y2 - y1;

    return Math.sqrt(
        horizontalDistance ** 2 + verticalDistance ** 2
    );
}

/**
 * Vérifie la préférence système de réduction des animations.
 *
 * @returns {boolean} true si l'utilisateur souhaite limiter
 * les animations.
 */
function prefersReducedMotion() {
    return window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;
}


// =========================================================
// 10. DÉMARRAGE DE L'APPLICATION
// =========================================================

/**
 * Démarre l'application au moment où le HTML est prêt.
 *
 * @returns {void}
 */
function startApplication() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializePage);
        return;
    }

    initializePage();
}

/* Lance l'invitation interactive. */
startApplication();