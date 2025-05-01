// Variables globales
let map;
let markers = L.markerClusterGroup({
    showCoverageOnHover: false // Désactiver l'affichage du polygone au survol
});
let allMarkers = {};
let categoryFilters = {};
let rivieresLayer; // Couche pour les rivières
let speechSynthesis = window.speechSynthesis; // API de synthèse vocale
let isSpeaking = false; // État de la lecture vocale

// Initialisation de la carte
function initMap() {
    // Création de la carte
    map = L.map('map', {
        center: [48.81826349423801, 1.6032443265782088],
        zoom: 11,
        zoomControl: false,
        maxZoom: 20,
        scrollWheelZoom: true // Activer le zoom par molette
    });

    // Ajout du fond de carte OpenStreetMap
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: 'Cartographie : <a href="https://informatique-m2i.fr/">M2i informatique </a>,Cartographie : <a href="https://www.linkedin.com/in/alexandreponchon/">Alexandre PONCHON </a> , <a href="https://www.openstreetmap.fr/">OSM</a>, iconographie : <a href="https://www.flaticon.com/fr/">Flaticon</a>'
    }).addTo(map);

    // Ajout des contrôles de zoom
    L.control.zoom({
        position: 'topright'
    }).addTo(map);

    // Ajout de l'échelle
    L.control.scale({
        position: 'bottomright',
        imperial: false
    }).addTo(map);

    // Ajout du périmètre (fond)
    if (typeof afond !== 'undefined') {
        const fondStyle = {
            weight: 2,
            opacity: 1,
            color: '#9f5cc0',
            fillColor: '#9f5cc0',
            fillOpacity: 0.2,
            interactive: false
        };

        L.geoJSON(afond, {
            style: fondStyle
        }).addTo(map);
    }

    // Ajout des sentiers/rivières
    if (typeof rivieres_opth !== 'undefined') {
        const sentierStyle = {
            weight: 4,
            opacity: 1,
            color: '#3388ff',
            fillOpacity: 0
        };

        rivieresLayer = L.geoJSON(rivieres_opth, {
            style: sentierStyle,
            onEachFeature: function(feature, layer) {
                if (feature.properties && feature.properties.nom) {
                    let popupContent = `<h3>${feature.properties.nom}</h3>`;
                    
                    // Conteneur pour la mise en page à deux colonnes
                    popupContent += `<div class="popup-container">`;
                    
                    // Colonne de gauche pour le descriptif
                    popupContent += `<div class="popup-text">`;
                    if (feature.properties.descriptif) {
                        popupContent += `<p>${feature.properties.descriptif}</p>`;
                    }
                    popupContent += `</div>`;
                    
                    // Colonne de droite pour l'image
                    if (feature.properties.photo) {
                        popupContent += `
                            <div class="popup-image">
                                <img src="${feature.properties.photo}" alt="${feature.properties.nom}" class="popup-thumbnail" data-full-img="${feature.properties.photo}">
                            </div>
                        `;
                    } else {
                        // Si pas d'image, ajuster l'espace pour le texte
                        popupContent = popupContent.replace('<div class="popup-text">', '<div class="popup-text" style="width:100%">');
                    }
                    
                    popupContent += `</div>`; // Fin du conteneur à deux colonnes
                    
                    // Section pour les liens
                    popupContent += `<div class="popup-links">`;
                    if (feature.properties.site_web) {
                        popupContent += `<p><a href="${feature.properties.site_web}" target="_blank">Plus d'informations</a></p>`;
                    }
                    if (feature.properties.accessibilité) {
                        popupContent += `<p><strong>Accessible :</strong> ${feature.properties.accessibilité}</p>`;
                    }
                    popupContent += `</div>`;
                    
                    layer.bindPopup(popupContent);
                }
            }
        }).addTo(map);
        
        // Initialiser le filtre pour les rivières
        if (!categoryFilters['geographie']) {
            categoryFilters['geographie'] = {};
        }
        categoryFilters['geographie']['rivieres'] = true;
    }

    // Chargement des points d'intérêt
    loadPOIs();
}

// Fonction pour charger les points d'intérêt
function loadPOIs() {
    if (typeof poi === 'undefined') {
        console.error("Les données POI ne sont pas disponibles");
        return;
    }

    // Parcourir tous les POIs
    poi.features.forEach(feature => {
        // Création de l'icône personnalisée
        const icon = createCustomIcon(feature.properties.sous_cat);
        
        // Création du marqueur
        const marker = L.marker(
            [feature.geometry.coordinates[1], feature.geometry.coordinates[0]], 
            { icon: icon }
        );
        
        // Création du contenu de la popup
        let popupContent = `<h3>${feature.properties.nom}</h3>`;
        
        // Conteneur pour la mise en page à deux colonnes
        popupContent += `<div class="popup-container">`;
        
        // Colonne de gauche pour le descriptif
        popupContent += `<div class="popup-text">`;
        if (feature.properties.descriptif) {
            popupContent += `<p>${feature.properties.descriptif}</p>`;
        }
        popupContent += `</div>`;
        
        // Colonne de droite pour l'image
        if (feature.properties.photo) {
            popupContent += `
                <div class="popup-image">
                    <img src="${feature.properties.photo}" alt="${feature.properties.nom}" class="popup-thumbnail" data-full-img="${feature.properties.photo}">
                </div>
            `;
        } else {
            // Si pas d'image, ajuster l'espace pour le texte
            popupContent = popupContent.replace('<div class="popup-text">', '<div class="popup-text" style="width:100%">');
        }
        
        popupContent += `</div>`; // Fin du conteneur à deux colonnes
        
        // Section pour les liens et informations supplémentaires
        popupContent += `<div class="popup-links">`;
        
        if (feature.properties.tel) {
            popupContent += `<p><strong>Tél :</strong> ${feature.properties.tel}</p>`;
        }
        
        if (feature.properties.mail) {
            popupContent += `<p><strong>Email :</strong> ${feature.properties.mail}</p>`;
        }
        
        if (feature.properties.site_web) {
            popupContent += `<p><a href="${feature.properties.site_web}" target="_blank">Plus d'informations</a></p>`;
        }
        
        if (feature.properties.accessibilité) {
            popupContent += `<p><strong>Accessible :</strong> ${feature.properties.accessibilité}</p>`;
        }
        
        if (feature.properties.Latitude && feature.properties.Longitude) {
            popupContent += `<p><a href="https://www.google.com/maps/dir//${feature.properties.Latitude},${feature.properties.Longitude}" target="_blank">Itinéraire</a></p>`;
        }
        
        popupContent += `</div>`; // Fin de la section des liens
        
        // Liaison de la popup au marqueur
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            minWidth: 200
        });
        
        // Stockage du marqueur avec ses catégories pour le filtrage
        const category = mapToFilterCategory(feature.properties.categorie);
        const subcategory = mapToFilterSubcategory(feature.properties.sous_cat);
        
        if (!allMarkers[category]) {
            allMarkers[category] = {};
        }
        
        if (!allMarkers[category][subcategory]) {
            allMarkers[category][subcategory] = [];
        }
        
        allMarkers[category][subcategory].push(marker);
        
        // Ajout du marqueur au cluster
        markers.addLayer(marker);
    });
    
    // Ajout du cluster à la carte
    map.addLayer(markers);
    
    // Initialisation des filtres
    initFilters();
}

// Fonction pour créer une icône personnalisée
function createCustomIcon(category) {
    // Normalisation du nom de catégorie pour correspondre au nom de fichier
    const iconName = normalizeString(category);
    
    return L.icon({
        iconUrl: `image/${iconName}.png`,
        iconSize: [25, 25],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

// Fonction pour normaliser une chaîne (pour les noms de fichiers d'icônes)
function normalizeString(str) {
    if (!str) return 'default';
    
    return str.toLowerCase()
        .replace(/ /g, '_')
        .replace(/[àáâãäå]/g, 'a')
        .replace(/æ/g, 'ae')
        .replace(/ç/g, 'c')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/ñ/g, 'n')
        .replace(/[òóôõö]/g, 'o')
        .replace(/œ/g, 'oe')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ýÿ]/g, 'y')
        .replace(/'/g, '');
}

// Fonction pour mapper les catégories du jeu de données aux catégories de filtres
function mapToFilterCategory(category) {
    const categoryMap = {
        'Patrimoine Architectural': 'activites',
        'Patrimoine Naturel': 'activites',
        // Ajoutez d'autres mappings selon vos données
    };
    
    return categoryMap[category] || 'activites';
}

// Fonction pour mapper les sous-catégories du jeu de données aux sous-catégories de filtres
function mapToFilterSubcategory(subcategory) {
    const subcategoryMap = {
        'Patrimoine bâti monumental': 'patrimoine',
        'Patrimoine Religieux': 'religieux',
        'Bâti Traditionnel': 'traditionnel',
        'Etangs et Rivières': 'nature',
        'Curiosité': 'curiosite',
        // Ajoutez d'autres mappings selon vos données
    };
    
    return subcategoryMap[subcategory] || 'default';
}

// Initialisation des filtres
function initFilters() {
    // Sélection de toutes les cases à cocher de filtre
    const filterCheckboxes = document.querySelectorAll('.filter-options input[type="checkbox"]');
    
    // Cocher toutes les cases par défaut
    filterCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
        
        const category = checkbox.dataset.category;
        const subcategory = checkbox.dataset.subcategory;
        
        if (!categoryFilters[category]) {
            categoryFilters[category] = {};
        }
        
        categoryFilters[category][subcategory] = true;
    });
    
    // Ajout des écouteurs d'événements pour les cases à cocher
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const category = this.dataset.category;
            const subcategory = this.dataset.subcategory;
            
            if (!categoryFilters[category]) {
                categoryFilters[category] = {};
            }
            
            categoryFilters[category][subcategory] = this.checked;
            
            updateMarkers();
        });
    });
    
    // Écouteur pour le bouton de réinitialisation
    document.querySelector('.reset-filters').addEventListener('click', resetFilters);
    
    // Écouteurs pour les titres de groupes de filtres (accordéon)
    document.querySelectorAll('.filter-title').forEach(title => {
        title.addEventListener('click', function() {
            this.classList.toggle('active');
            const options = this.nextElementSibling;
            options.style.display = options.style.display === 'none' ? 'flex' : 'none';
        });
    });
    
    // Écouteur pour le bouton d'affichage/masquage des filtres (mobile)
    document.querySelector('.toggle-filters-btn').addEventListener('click', function() {
        document.querySelector('.filters-panel').classList.add('active');
    });
    
    // Écouteur pour le bouton de fermeture des filtres (mobile)
    document.querySelector('.close-filters').addEventListener('click', function() {
        document.querySelector('.filters-panel').classList.remove('active');
    });
}

// Mise à jour des marqueurs selon les filtres
function updateMarkers() {
    // Supprimer tous les marqueurs
    markers.clearLayers();
    
    // Parcourir toutes les catégories et sous-catégories
    for (const category in allMarkers) {
        for (const subcategory in allMarkers[category]) {
            // Vérifier si cette catégorie/sous-catégorie est activée
            if (categoryFilters[category] && categoryFilters[category][subcategory]) {
                // Ajouter tous les marqueurs de cette sous-catégorie
                allMarkers[category][subcategory].forEach(marker => {
                    markers.addLayer(marker);
                });
            }
        }
    }
    
    // Gérer l'affichage des rivières
    if (rivieresLayer) {
        if (categoryFilters['geographie'] && categoryFilters['geographie']['rivieres']) {
            if (!map.hasLayer(rivieresLayer)) {
                map.addLayer(rivieresLayer);
            }
        } else {
            if (map.hasLayer(rivieresLayer)) {
                map.removeLayer(rivieresLayer);
            }
        }
    }
}

// Réinitialisation des filtres
function resetFilters() {
    // Cocher toutes les cases
    document.querySelectorAll('.filter-options input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
        
        const category = checkbox.dataset.category;
        const subcategory = checkbox.dataset.subcategory;
        
        if (!categoryFilters[category]) {
            categoryFilters[category] = {};
        }
        
        categoryFilters[category][subcategory] = true;
    });
    
    // Mettre à jour les marqueurs
    updateMarkers();
}

// Fonction pour gérer l'agrandissement des images
function setupImageModal() {
    const modal = document.querySelector('.image-modal');
    const modalImg = document.getElementById('modal-img');
    const closeModal = document.querySelector('.close-modal');
    
    // Fermer le modal au clic sur le bouton de fermeture
    closeModal.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Fermer le modal au clic en dehors de l'image
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Délégation d'événements pour les images dans les popups
    document.addEventListener('click', function(event) {
        if (event.target && event.target.classList.contains('popup-thumbnail')) {
            const fullImgSrc = event.target.getAttribute('data-full-img');
            modalImg.src = fullImgSrc;
            modal.style.display = 'flex';
        }
    });
}

// Fonction pour la lecture vocale du texte
function speakText(text, button) {
    // Si déjà en train de parler, on arrête
    if (isSpeaking) {
        speechSynthesis.cancel();
        isSpeaking = false;
        
        // Réinitialiser tous les boutons de lecture
        document.querySelectorAll('.speak-button').forEach(btn => {
            btn.innerHTML = '<i class="fas fa-volume-up"></i> Lire';
            btn.classList.remove('speaking');
        });
        
        return;
    }
    
    // Créer un nouvel objet d'énoncé
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configurer la voix en français si disponible
    const voices = speechSynthesis.getVoices();
    const frenchVoice = voices.find(voice => voice.lang.includes('fr'));
    if (frenchVoice) {
        utterance.voice = frenchVoice;
    }
    
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Événement de fin de lecture
    utterance.onend = function() {
        isSpeaking = false;
        button.innerHTML = '<i class="fas fa-volume-up"></i> Lire';
        button.classList.remove('speaking');
    };
    
    // Événement d'erreur
    utterance.onerror = function() {
        isSpeaking = false;
        button.innerHTML = '<i class="fas fa-volume-up"></i> Lire';
        button.classList.remove('speaking');
    };
    
    // Changer l'apparence du bouton
    button.innerHTML = '<i class="fas fa-pause"></i> Pause';
    button.classList.add('speaking');
    
    // Lire le texte
    speechSynthesis.speak(utterance);
    isSpeaking = true;
}

// Fonction pour extraire le texte lisible d'un élément HTML
function getReadableText(element) {
    // Cloner l'élément pour ne pas modifier l'original
    const clone = element.cloneNode(true);
    
    // Supprimer les éléments qui ne doivent pas être lus
    const elementsToRemove = clone.querySelectorAll('button, .speak-button');
    elementsToRemove.forEach(el => el.remove());
    
    // Récupérer le texte
    let text = clone.textContent || '';
    
    // Nettoyer le texte
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
}

// Fonction pour ajouter un bouton de lecture à un élément
function addSpeakButton(element) {
    // Créer le bouton
    const speakButton = document.createElement('button');
    speakButton.className = 'speak-button';
    speakButton.innerHTML = '<i class="fas fa-volume-up"></i> Lire';
    
    // Ajouter l'événement de clic
    speakButton.addEventListener('click', function(event) {
        event.stopPropagation();
        const text = getReadableText(element);
        speakText(text, this);
    });
    
    // Ajouter le bouton à l'élément
    element.appendChild(speakButton);
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    setupImageModal();
    
    // Gestion du menu mobile
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            document.querySelector('.main-nav').classList.toggle('active');
            document.querySelector('.header-actions').classList.toggle('active');
        });
    }
    
    // Initialiser les voix pour la synthèse vocale
    if (speechSynthesis) {
        // Charger les voix disponibles
        speechSynthesis.onvoiceschanged = function() {
            speechSynthesis.getVoices();
        };
    }
    
    // Ajouter un écouteur d'événements pour les popups Leaflet
    map.on('popupopen', function(e) {
        const popupContent = e.popup._contentNode;
        if (popupContent) {
            // Ajouter un bouton de lecture à la popup
            addSpeakButton(popupContent);
        }
    });
    
    // Arrêter la lecture lorsqu'une popup est fermée
    map.on('popupclose', function() {
        if (isSpeaking) {
            speechSynthesis.cancel();
            isSpeaking = false;
        }
    });
});