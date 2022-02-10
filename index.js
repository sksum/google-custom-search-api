import fetch from 'node-fetch';
import dotenv from 'dotenv'
dotenv.config()
/*
.env structure:
  API_KEY=xxxx
  SEARCH_ENGINE_ID=bc7da1830511c0906
  API_KEYS='["xxxx", "zzzz", "yyyy"]'
*/
import data from './flipkart_reviews_dataset.js';
const reviews = data.reviews;

const API_RATE_LIMIT_DAY = 100; // rate limit per day ... TODO: limit to 100 requests per day then switch api key
const API_RATE_LIMIT_MIN = Infinity; // rate limit per minute
const search_engine_id = process.env.SEARCH_ENGINE_ID;
const key = process.env.API_KEY;
const keys = JSON.parse(process.env.API_KEYS);
const PER_PAGE = 10
const lang = 'lang_en';

var currentDateTime = new Date();
var global_req_count = 0;
var latest_time = currentDateTime.getTime();


let analyze_results = async (results) => {
  let global_social_count = {};
  for (let res of results) {
    if (res in global_social_count) {
      global_social_count[res] ++;
    } else {
      global_social_count[res] = 1;
    }
  }
  return global_social_count;
}

function waitforme(milisec) {
  return new Promise(resolve => {
    setTimeout(() => { resolve('') }, milisec);
  })
}
 
let search_q = async (q) => {
  let url = `https://content-customsearch.googleapis.com/customsearch/v1?cx=${search_engine_id}&lr=${lang}&q=${q}&key=${key}&num=${PER_PAGE}&c2coff=1&filter=1`;
  let res = await fetch(url);
  let json = await res.json();
  return json;
}

let search_users = async (queries) => {
  let all_results = []
  for (let q of queries) {
    let results = await search_q(q);
    //analyze results

    results = results.items.map((item) => item.link)
    console.log(`+ ${results.length} results for ${q}`);
    all_results = all_results.concat(results);
  }
  return all_results;
}

let search_queries = reviews.map((item)=> item.name + " " + item.location);
search_users(search_queries)
.then((results)=>analyze_results(results))
.then((results)=>console.log("analysis done ✅", results));