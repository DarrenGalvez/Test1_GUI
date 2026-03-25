// ----------------------
// CONFIG
// ----------------------
const API_KEY = "b5ac8324b1f539404286a9da8673155d";
const BASE_URL = "https://api.themoviedb.org/3";

// ----------------------
// DOM
// ----------------------
const input = document.querySelector("#search-input");
const resultList = document.querySelector("#results");
const template = document.querySelector("#result-template");
const container = document.querySelector(".app");

// detail panel (add this in HTML)
const detailPanel = document.querySelector("#details");

// ----------------------
// STATE
// ----------------------
const cache = new Map();
let debounceTimer = null;
let abortController = null;
let currentResults = [];
let selectedIndex = -1;


// ----------------------
// INPUT LISTENER
// ----------------------
input.addEventListener("input", (e) => {

const query = e.target.value.trim();

clearTimeout(debounceTimer);

if(!query){
clearResults();
return;
}

debounceTimer = setTimeout(() => {
search(query);
}, 300);

});


// ----------------------
// KEYBOARD NAVIGATION
// ----------------------
input.addEventListener("keydown", (e) => {

const items = resultList.querySelectorAll(".result-item");

if(e.key === "ArrowDown"){
selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
updateActive(items);
}

if(e.key === "ArrowUp"){
selectedIndex = Math.max(selectedIndex - 1, 0);
updateActive(items);
}

if(e.key === "Enter"){
if(selectedIndex >= 0){
const movie = currentResults[selectedIndex];
loadMovieDetails(movie.id);
}
}

});

function updateActive(items){
items.forEach(item => item.classList.remove("active"));

if(items[selectedIndex]){
items[selectedIndex].classList.add("active");
}
}


// ----------------------
// SEARCH
// ----------------------
async function search(query){

if(cache.has(query)){
currentResults = cache.get(query);
renderResults(currentResults, query);
return;
}

if(abortController){
abortController.abort();
}

abortController = new AbortController();

try{

setLoading(true);

const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}`;

const res = await fetch(url, { signal: abortController.signal });

if(!res.ok) throw new Error("Network error");

const data = await res.json();

const results = data.results || [];

cache.set(query, results);
currentResults = results;

renderResults(results, query);

}catch(err){

if(err.name === "AbortError") return;

console.error(err);
renderError();

}finally{
setLoading(false);
}

}


// ----------------------
// MOVIE DETAILS (CONCURRENCY)
// ----------------------
async function loadMovieDetails(id){

detailPanel.textContent = "Loading...";

// ⚠ break one URL intentionally for demo if needed
const endpoints = [
`${BASE_URL}/movie/${id}?api_key=${API_KEY}`,
`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`,
`${BASE_URL}/movie/${id}/videos?api_key=${API_KEY}`
];

const [detailsRes, creditsRes, videosRes] = await Promise.allSettled(
endpoints.map(url => fetch(url).then(r => r.json()))
);

// clear panel
detailPanel.innerHTML = "";

// DETAILS
if(detailsRes.status === "fulfilled"){
const d = detailsRes.value;

const title = document.createElement("h2");
title.textContent = d.title;

const overview = document.createElement("p");
overview.textContent = d.overview;

detailPanel.appendChild(title);
detailPanel.appendChild(overview);
}

// CREDITS
if(creditsRes.status === "fulfilled"){
const cast = creditsRes.value.cast?.slice(0,5) || [];

const castTitle = document.createElement("h3");
castTitle.textContent = "Cast";

const ul = document.createElement("ul");

cast.forEach(actor => {
const li = document.createElement("li");
li.textContent = actor.name;
ul.appendChild(li);
});

detailPanel.appendChild(castTitle);
detailPanel.appendChild(ul);
}

// VIDEOS
if(videosRes.status === "fulfilled"){
const vids = videosRes.value.results || [];

const trailer = vids.find(v => v.type === "Trailer");

if(trailer){
const link = document.createElement("a");
link.href = `https://www.youtube.com/watch?v=${trailer.key}`;
link.textContent = "Watch Trailer";
link.target = "_blank";

detailPanel.appendChild(link);
}
}

}


// ----------------------
// UI STATE
// ----------------------
function setLoading(state){
container.dataset.loading = state;
}


// ----------------------
// RENDER RESULTS
// ----------------------
function renderResults(results, query){

resultList.innerHTML = "";
selectedIndex = -1;

if(results.length === 0){
const li = document.createElement("li");
li.textContent = "No results found.";
resultList.appendChild(li);
return;
}

const frag = new DocumentFragment();

results.forEach((movie, index) => {

const clone = template.content.cloneNode(true);
const item = clone.querySelector(".result-item");

// CLICK SUPPORT
item.addEventListener("click", () => {
loadMovieDetails(movie.id);
});

// XSS SAFE HIGHLIGHT
const titleNode = clone.querySelector(".title");
titleNode.appendChild(buildHighlightedTitle(movie.title, query));

frag.appendChild(clone);

});

resultList.appendChild(frag);
}


// ----------------------
// SAFE HIGHLIGHT (XSS)
// ----------------------
function buildHighlightedTitle(title, query){

const container = document.createElement("span");

const idx = title.toLowerCase().indexOf(query.toLowerCase());

if(idx === -1){
container.textContent = title;
return container;
}

const before = document.createTextNode(title.slice(0, idx));

const match = document.createElement("span");
match.className = "highlight";
match.textContent = title.slice(idx, idx + query.length);

const after = document.createTextNode(
title.slice(idx + query.length)
);

container.appendChild(before);
container.appendChild(match);
container.appendChild(after);

return container;
}


// ----------------------
// HELPERS
// ----------------------
function clearResults(){
resultList.innerHTML = "";
detailPanel.textContent = "";
}

function renderError(){
resultList.innerHTML = "";
const li = document.createElement("li");
li.textContent = "Error fetching data.";
resultList.appendChild(li);
}