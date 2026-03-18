class SearchComponent {

constructor(){

// --- CONFIGS ---
this.API_KEY = "b5ac8324b1f539404286a9da8673155d";
this.BASE_URL = "https://api.themoviedb.org/3/search/movie";

// --- DOM ---
this.input = document.querySelector("#search-input");
this.resultList = document.querySelector("#results");
this.template = document.querySelector("#result-template");
this.container = document.querySelector(".app");

// --- STATE ---
this.cache = new Map();
this.debounceTimer = null;
this.abortController = null;

// --- INIT ---
this.init();
}


// ----------------------
// INITIAL SETUP
// ----------------------
init(){

this.input.addEventListener("input", (e)=>{

const query = e.target.value.trim();

// debounce reset
clearTimeout(this.debounceTimer);

if(!query){
this.clearResults();
return;
}

// debounce (300ms)
this.debounceTimer = setTimeout(()=>{
this.search(query);
},300);

});

}


// ----------------------
// CORE SEARCH LOGIC
// ----------------------
async search(query){

// 1. CACHE CHECK
if(this.cache.has(query)){
this.renderResults(this.cache.get(query));
return;
}

// 2. CANCEL PREVIOUS REQUEST
if(this.abortController){
this.abortController.abort();
}

this.abortController = new AbortController();

try{

// 3. LOADING ON
this.setLoading(true);

// 4. FETCH
const url = `${this.BASE_URL}?api_key=${this.API_KEY}&query=${encodeURIComponent(query)}`;

const response = await fetch(url,{
signal: this.abortController.signal
});

// handle bad HTTP responses
if(!response.ok){
throw new Error("Network response failed");
}

const data = await response.json();

const results = data.results || [];

// 5. CACHE STORE
this.cache.set(query, results);

// 6. RENDER
this.renderResults(results);

}catch(err){

// ignore abort errors (expected behavior)
if(err.name === "AbortError"){
console.log("Request cancelled");
return;
}

// real errors → resilience
console.error("Fetch failed:", err);
this.renderError();

}finally{
// 7. LOADING OFF
this.setLoading(false);
}

}


// ----------------------
// UI STATE
// ----------------------
setLoading(state){
this.container.dataset.loading = state;
}


// ----------------------
// RENDERING (Fragment Pattern)
// ----------------------
renderResults(results){

this.resultList.innerHTML = "";

// handle empty results (resilience case)
if(results.length === 0){
const li = document.createElement("li");
li.textContent = "No results found.";
this.resultList.appendChild(li);
return;
}

const frag = new DocumentFragment();

results.forEach(movie => {

const clone = this.template.content.cloneNode(true);

clone.querySelector(".title").textContent = movie.title;

frag.appendChild(clone);

});

this.resultList.appendChild(frag);
}


// ----------------------
// HELPERS
// ----------------------
clearResults(){
this.resultList.innerHTML = "";
}

renderError(){

this.resultList.innerHTML = "";

const li = document.createElement("li");
li.textContent = "Something went wrong. Please try again.";

this.resultList.appendChild(li);
}

}


// ----------------------
// APP START
// ----------------------
new SearchComponent();