// tailwind.config.js (se estiver usando Tailwind separado)
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    200: '#bae6fd',
                    300: '#7dd3fc',
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                    700: '#0369a1',
                    800: '#075985',
                    900: '#0c4a6e',
                }
            }
        }
    }
}

// script.js
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const moviesContainer = document.getElementById('movies-container');
    const favoritesList = document.getElementById('favorites-list');
    const noFavorites = document.getElementById('no-favorites');
    const loadMoreBtn = document.getElementById('load-more');
    const errorMessage = document.getElementById('error-message');
    const loading = document.getElementById('loading');
    const movieModal = document.getElementById('movie-modal');
    const closeModal = document.getElementById('close-modal');
    const modalContent = document.getElementById('modal-content');
    const searchTab = document.getElementById('search-tab');
    const favoritesTab = document.getElementById('favorites-tab');
    const searchResults = document.getElementById('search-results');
    const favoritesContainer = document.getElementById('favorites-container');
    const themeToggle = document.getElementById('theme-toggle');
    const homeScreen = document.getElementById('home-screen');
    const catalogSection = document.getElementById('catalog-section');
    const exploreBtn = document.getElementById('explore-btn');
    const viewAllTrendingBtn = document.getElementById('view-all-trending');
    const trendingMoviesContainer = document.getElementById('trending-movies');

    // State
    let currentPage = 1;
    let totalResults = 0;
    let currentSearchTerm = '';
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    // Initialize
    updateFavoritesList();
    checkNoFavorites();
    loadTrendingMovies();

    // Event Listeners
    searchBtn.addEventListener('click', searchMovies);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchMovies();
    });
    loadMoreBtn.addEventListener('click', loadMoreMovies);
    closeModal.addEventListener('click', closeMovieModal);
    searchTab.addEventListener('click', () => switchTab('search'));
    favoritesTab.addEventListener('click', () => switchTab('favorites'));
    themeToggle.addEventListener('click', toggleTheme);
    exploreBtn.addEventListener('click', showCatalog);
    viewAllTrendingBtn.addEventListener('click', showCatalog);

    // Check theme preference
    if (localStorage.getItem('darkMode') === 'true' || 
        (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    // Functions
    function toggleTheme() {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
    }

    function showCatalog() {
        homeScreen.classList.add('hidden');
        catalogSection.classList.remove('hidden');
        searchInput.focus();
    }

    function switchTab(tab) {
        if (tab === 'search') {
            searchTab.classList.add('active', 'text-primary-600', 'dark:text-primary-400', 'border-primary-500');
            searchTab.classList.remove('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-gray-300');
            favoritesTab.classList.remove('active', 'text-primary-600', 'dark:text-primary-400', 'border-primary-500');
            favoritesTab.classList.add('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-gray-300');
            searchResults.classList.remove('hidden');
            favoritesContainer.classList.add('hidden');
        } else {
            favoritesTab.classList.add('active', 'text-primary-600', 'dark:text-primary-400', 'border-primary-500');
            favoritesTab.classList.remove('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-gray-300');
            searchTab.classList.remove('active', 'text-primary-600', 'dark:text-primary-400', 'border-primary-500');
            searchTab.classList.add('text-gray-500', 'dark:text-gray-400', 'hover:text-gray-700', 'dark:hover:text-gray-300');
            searchResults.classList.add('hidden');
            favoritesContainer.classList.remove('hidden');
            updateFavoritesList();
        }
    }

    async function fetchWithCORS(url) {
        try {
            const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            return JSON.parse(data.contents);
        } catch (error) {
            console.error('Error fetching with CORS proxy:', error);
            throw error;
        }
    }

    async function fetchMovies(searchTerm, page = 1) {
        const apiKey = '5b9bd435'; // Substitua por sua chave
        const url = `https://www.omdbapi.com/?s=${encodeURIComponent(searchTerm)}&page=${page}&apikey=${apiKey}`;
        
        try {
            return await fetchWithCORS(url);
        } catch (error) {
            // Fallback para tentar sem proxy se o proxy falhar
            const directResponse = await fetch(url);
            if (!directResponse.ok) throw new Error('Network response was not ok');
            return await directResponse.json();
        }
    }

    async function fetchMovieDetails(imdbID) {
        const apiKey = '5b9bd435'; // Substitua por sua chave
        const url = `https://www.omdbapi.com/?i=${imdbID}&apikey=${apiKey}&plot=full`;
        
        try {
            return await fetchWithCORS(url);
        } catch (error) {
            // Fallback para tentar sem proxy
            const directResponse = await fetch(url);
            if (!directResponse.ok) throw new Error('Network response was not ok');
            return await directResponse.json();
        }
    }

    async function searchMovies() {
        const searchTerm = searchInput.value.trim();
        if (!searchTerm) return;

        currentSearchTerm = searchTerm;
        currentPage = 1;
        moviesContainer.innerHTML = '';
        loadMoreBtn.classList.add('hidden');
        errorMessage.classList.add('hidden');
        loading.classList.remove('hidden');

        try {
            const data = await fetchMovies(searchTerm, currentPage);
            loading.classList.add('hidden');
            
            if (data.Response === 'True') {
                displayMovies(data.Search);
                totalResults = parseInt(data.totalResults);
                if (totalResults > 10) {
                    loadMoreBtn.classList.remove('hidden');
                }
            } else {
                showError(data.Error || 'No movies found');
            }
        } catch (err) {
            loading.classList.add('hidden');
            showError('Failed to fetch movies. Please try again.');
            console.error('Error:', err);
        }
    }

    async function loadMoreMovies() {
        currentPage++;
        loading.classList.remove('hidden');
        loadMoreBtn.classList.add('hidden');

        try {
            const data = await fetchMovies(currentSearchTerm, currentPage);
            loading.classList.add('hidden');
            
            if (data.Response === 'True') {
                displayMovies(data.Search);
                if (moviesContainer.children.length < totalResults) {
                    loadMoreBtn.classList.remove('hidden');
                }
            }
        } catch (err) {
            loading.classList.add('hidden');
            showError('Failed to load more movies. Please try again.');
            console.error('Error:', err);
        }
    }

    function displayMovies(movies) {
        if (!movies || movies.length === 0) return;

        movies.forEach(movie => {
            const isFavorite = favorites.some(fav => fav.imdbID === movie.imdbID);
            
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow';
            movieCard.innerHTML = `
                <div class="relative">
                    <img 
                        src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster'}" 
                        alt="${movie.Title}" 
                        class="w-full h-64 sm:h-80 object-cover"
                        onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'"
                    >
                    <button 
                        class="absolute top-2 right-2 p-2 bg-gray-800 bg-opacity-70 text-white rounded-full hover:bg-primary-500 transition-colors favorite-btn ${isFavorite ? 'active' : ''}" 
                        data-id="${movie.imdbID}"
                        title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                    >
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-lg mb-1 truncate">${movie.Title}</h3>
                    <div class="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                        <span>${movie.Year}</span>
                        <span>${movie.Type}</span>
                    </div>
                    <button 
                        class="mt-3 w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors details-btn" 
                        data-id="${movie.imdbID}"
                    >
                        View Details
                    </button>
                </div>
            `;
            
            moviesContainer.appendChild(movieCard);
        });

        // Add event listeners
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const imdbID = this.getAttribute('data-id');
                toggleFavorite(imdbID);
            });
        });

        document.querySelectorAll('.details-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const imdbID = this.getAttribute('data-id');
                showMovieDetails(imdbID);
            });
        });
    }

    async function toggleFavorite(imdbID) {
        try {
            const movie = await fetchMovieDetails(imdbID);
            const index = favorites.findIndex(fav => fav.imdbID === imdbID);
            
            if (index === -1) {
                favorites.push(movie);
            } else {
                favorites.splice(index, 1);
            }
            
            localStorage.setItem('favorites', JSON.stringify(favorites));
            updateFavoritesList();
            
            // Update all favorite buttons with this ID
            document.querySelectorAll(`.favorite-btn[data-id="${imdbID}"]`).forEach(btn => {
                btn.classList.toggle('active');
                btn.setAttribute('title', 
                    btn.classList.contains('active') ? 'Remove from favorites' : 'Add to favorites');
            });
            
            checkNoFavorites();
        } catch (err) {
            console.error('Error toggling favorite:', err);
        }
    }

    function updateFavoritesList() {
        favoritesList.innerHTML = '';
        
        favorites.forEach(movie => {
            const favoriteCard = document.createElement('div');
            favoriteCard.className = 'movie-card bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow';
            favoriteCard.innerHTML = `
                <div class="relative">
                    <img 
                        src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster'}" 
                        alt="${movie.Title}" 
                        class="w-full h-64 sm:h-80 object-cover"
                        onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'"
                    >
                    <button 
                        class="absolute top-2 right-2 p-2 bg-gray-800 bg-opacity-70 text-white rounded-full hover:bg-primary-500 transition-colors favorite-btn active" 
                        data-id="${movie.imdbID}"
                        title="Remove from favorites"
                    >
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-lg mb-1 truncate">${movie.Title}</h3>
                    <div class="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                        <span>${movie.Year}</span>
                        <span>${movie.Type}</span>
                    </div>
                    <button 
                        class="mt-3 w-full py-2 bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors details-btn" 
                        data-id="${movie.imdbID}"
                    >
                        View Details
                    </button>
                </div>
            `;
            
            favoritesList.appendChild(favoriteCard);
        });

        // Add event listeners
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const imdbID = this.getAttribute('data-id');
                toggleFavorite(imdbID);
            });
        });

        document.querySelectorAll('.details-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const imdbID = this.getAttribute('data-id');
                showMovieDetails(imdbID);
            });
        });
    }

    function checkNoFavorites() {
        noFavorites.classList.toggle('hidden', favorites.length > 0);
    }

    async function showMovieDetails(imdbID) {
        loading.classList.remove('hidden');
        movieModal.classList.remove('hidden');
        
        try {
            const favoriteMovie = favorites.find(movie => movie.imdbID === imdbID);
            const movie = favoriteMovie || await fetchMovieDetails(imdbID);
            
            displayMovieDetails(movie);
        } catch (err) {
            showError('Failed to fetch movie details. Please try again.');
            console.error('Error:', err);
        } finally {
            loading.classList.add('hidden');
        }
    }

    function displayMovieDetails(movie) {
        modalContent.innerHTML = `
            <div class="flex flex-col md:flex-row gap-6">
                <div class="w-full md:w-1/3">
                    <img 
                        src="${movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster'}" 
                        alt="${movie.Title}" 
                        class="w-full rounded-lg shadow-md"
                        onerror="this.src='https://via.placeholder.com/300x450?text=No+Poster'"
                    >
                </div>
                <div class="w-full md:w-2/3">
                    <h2 class="text-2xl font-bold mb-2">${movie.Title} <span class="text-gray-600 dark:text-gray-400">(${movie.Year})</span></h2>
                    
                    ${movie.imdbRating && movie.imdbRating !== 'N/A' ? `
                    <div class="flex items-center mb-4">
                        ${renderRating(movie.imdbRating)}
                        <span class="ml-2 text-gray-600 dark:text-gray-400">${movie.imdbRating}/10 (${movie.imdbVotes || 'N/A'} votes)</span>
                    </div>
                    ` : ''}
                    
                    ${movie.Genre && movie.Genre !== 'N/A' ? `
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${movie.Genre.split(', ').map(genre => `
                            <span class="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 text-xs rounded-full">
                                ${genre}
                            </span>
                        `).join('')}
                    </div>
                    ` : ''}
                    
                    <div class="grid grid-cols-2 gap-4 mb-4">
                        ${movie.Released && movie.Released !== 'N/A' ? `
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Released</p>
                            <p>${movie.Released}</p>
                        </div>
                        ` : ''}
                        
                        ${movie.Runtime && movie.Runtime !== 'N/A' ? `
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Runtime</p>
                            <p>${movie.Runtime}</p>
                        </div>
                        ` : ''}
                        
                        ${movie.Director && movie.Director !== 'N/A' ? `
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Director</p>
                            <p>${movie.Director}</p>
                        </div>
                        ` : ''}
                        
                        ${movie.Actors && movie.Actors !== 'N/A' ? `
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">Actors</p>
                            <p class="truncate">${movie.Actors}</p>
                        </div>
                        ` : ''}
                    </div>
                    
                    ${movie.Plot && movie.Plot !== 'N/A' ? `
                    <div class="mb-4">
                        <p class="text-sm text-gray-500 dark:text-gray-400">Plot</p>
                        <p>${movie.Plot}</p>
                    </div>
                    ` : ''}
                    
                    <div class="flex gap-2">
                        <a 
                            href="https://www.imdb.com/title/${movie.imdbID}/" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition-colors flex items-center gap-2"
                        >
                            <i class="fab fa-imdb"></i>
                            <span>View on IMDB</span>
                        </a>
                        <button 
                            class="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors flex items-center gap-2 favorite-btn ${favorites.some(fav => fav.imdbID === movie.imdbID) ? 'active' : ''}" 
                            data-id="${movie.imdbID}"
                        >
                            <i class="fas fa-heart"></i>
                            <span>${favorites.some(fav => fav.imdbID === movie.imdbID) ? 'Remove Favorite' : 'Add Favorite'}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add event listener to the favorite button in modal
        const modalFavoriteBtn = modalContent.querySelector('.favorite-btn');
        if (modalFavoriteBtn) {
            modalFavoriteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleFavorite(this.getAttribute('data-id'));
            });
        }
    }

    function renderRating(rating) {
        if (!rating || rating === 'N/A') return '';
        
        const stars = Math.round(parseFloat(rating) / 2);
        let starsHTML = '';
        
        for (let i = 0; i < 5; i++) {
            starsHTML += i < stars 
                ? '<i class="fas fa-star text-yellow-400"></i>' 
                : '<i class="far fa-star text-yellow-400"></i>';
        }
        
        return starsHTML;
    }

    function closeMovieModal() {
        movieModal.classList.add('hidden');
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function loadTrendingMovies() {
        const trendingMovies = [
            { imdbID: "tt1375666", Title: "Inception", Year: "2010", Poster: "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg" },
            { imdbID: "tt0816692", Title: "Interstellar", Year: "2014", Poster: "https://m.media-amazon.com/images/M/MV5BZjdkOTU3MDktN2IxOS00OGEyLWFmMmItYzU2Y2JkY2RlMGY3XkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg" },
            { imdbID: "tt4154796", Title: "Avengers: Endgame", Year: "2019", Poster: "https://m.media-amazon.com/images/M/MV5BMTc5MDE2ODcwNV5BMl5BanBnXkFtZTgwMzI2NzQ2NzM@._V1_SX300.jpg" },
            { imdbID: "tt0111161", Title: "The Shawshank Redemption", Year: "1994", Poster: "https://m.media-amazon.com/images/M/MV5BNDE3ODcxYzMtY2YzZC00NmNlLWJiNDMtZDViYWM2MzIxZDYwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_SX300.jpg" },
            { imdbID: "tt0120737", Title: "The Lord of the Rings: The Fellowship of the Ring", Year: "2001", Poster: "https://m.media-amazon.com/images/M/MV5BN2EyZjM3NzUtNWUzMi00MTgxLWI0NTctMzY4M2VlOTdjZWRiXkEyXkFqcGdeQXVyNDUzOTQ5MjY@._V1_SX300.jpg" }
        ];

        trendingMoviesContainer.innerHTML = '';

        trendingMovies.forEach(movie => {
            const isFavorite = favorites.some(fav => fav.imdbID === movie.imdbID);
            
            const movieCard = document.createElement('div');
            movieCard.className = 'trending-movie cursor-pointer';
            movieCard.innerHTML = `
                <div class="relative">
                    <img 
                        src="${movie.Poster}" 
                        alt="${movie.Title}" 
                        class="w-full h-64 object-cover rounded-lg shadow-md"
                    >
                    <button 
                        class="absolute top-2 right-2 p-2 bg-gray-800 bg-opacity-70 text-white rounded-full hover:bg-primary-500 transition-colors favorite-btn ${isFavorite ? 'active' : ''}" 
                        data-id="${movie.imdbID}"
                        title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}"
                    >
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="mt-2">
                    <h3 class="font-semibold truncate">${movie.Title}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${movie.Year}</p>
                </div>
            `;
            
            movieCard.addEventListener('click', function() {
                showMovieDetails(movie.imdbID);
            });

            const favoriteBtn = movieCard.querySelector('.favorite-btn');
            favoriteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleFavorite(this.getAttribute('data-id'));
            });

            trendingMoviesContainer.appendChild(movieCard);
        });
    }

    // Close modal when clicking outside
    movieModal.addEventListener('click', function(e) {
        if (e.target === movieModal) {
            closeMovieModal();
        }
    });
});