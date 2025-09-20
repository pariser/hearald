import "../css/analytics.css";

console.log("index.js loaded");

import { render, html } from "htm/preact";

import App from "./App";

render(html` <${App} /> `, document.getElementById("analytics-root"));
