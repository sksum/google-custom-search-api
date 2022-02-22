import fetch from 'node-fetch';
import dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config()
/*
.env structure:
  API_KEY=xxxx
  SEARCH_ENGINE_ID=bc7da1830511c0906
  API_KEYS='["xxxx", "zzzz", "yyyy"]'
*/
import data from './flipkart_reviews_dataset.js';
const reviews = data.reviews;
// const reviews = data.reviews.slice(0, 100);
const SOCIAL_FILE = 'social_links.csv';
const SOCIAL_FILE_FIRST_LINE = 'name,location,facebook_urls,linkedin_urls\n';
const API_RATE_LIMIT_DAY = 100; // rate limit per day ... TODO: limit to 100 requests per day then switch api key //✅ ... keeps rotating keys when error faced
const API_RATE_LIMIT_MIN = Infinity; // rate limit per minute
const search_engine_id = process.env.SEARCH_ENGINE_ID;
const keys = JSON.parse(process.env.API_KEYS);
let key = 0;
const PER_PAGE = 10
const lang = 'lang_en';
let UNSUCCESSFUL_SAVE_HANDLER = async (err) => {
  if (err) console.log('Some error occured - file either not saved or corrupted file saved.');
}


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

let store_social_links = async (results, q) => {
  let facebook_results = []
  let linkedin_results = []
  for (let result of results) {
    if (result.displayLink.includes('facebook')) {
      facebook_results.push(result.link);
    }
    if (result.displayLink.includes('linkedin')) {
      linkedin_results.push(result.link);
    }
  }
  linkedin_results = linkedin_results.join(' ');
  facebook_results = facebook_results.join(' ');
  let dataToWrite = `${q.name},${q.location},${facebook_results},${linkedin_results}\n`;
  fs.appendFileSync(SOCIAL_FILE, dataToWrite, 'utf8', UNSUCCESSFUL_SAVE_HANDLER);
}

function waitforme(milisec) {
  return new Promise(resolve => {
    setTimeout(() => { resolve('') }, milisec);
  })
}
 
let search_q = async (q) => {
  let url = `https://content-customsearch.googleapis.com/customsearch/v1?cx=${search_engine_id}&lr=${lang}&q=${q}&key=${keys[key]}&num=${PER_PAGE}&c2coff=1&filter=1`;
  let res = await fetch(url);
  let json = await res.json();
  return json;
}

let search_users = async (queries) => {
  let all_results = []
  for (let q of queries) {
    if (q.name == 'Flipkart Customer') continue;
    if (q.locaiton == '') continue;
    let query = q.name + " " + q.location;

    let results = await search_q(query);
    while (results.error) {
      console.error("Error: ", results.error.status);
      key = (key + 1) % keys.length;
      console.log(`Changing API key to ${key} - ${keys[key]}`);
      results = await search_q(query);
    }
    //analyze results
    // console.log(results.items)
    try {
      await store_social_links(results.items, q);
      results = results.items.map((item) => item.displayLink);
      console.log(`+ ${results.length} results for ${query}`);
      all_results = all_results.concat(results);
    }
    catch (err) {
      console.log(err);
      console.log(results)
    }
  }
  return all_results;
}


let search_queries = reviews.map((item)=> {return {'name': item.name, 'location':item.location}});
fs.writeFileSync(SOCIAL_FILE, SOCIAL_FILE_FIRST_LINE, 'utf8', UNSUCCESSFUL_SAVE_HANDLER );
search_users(search_queries)
.then((results)=>analyze_results(results))
.then((results)=>console.log("analysis done ✅", results));