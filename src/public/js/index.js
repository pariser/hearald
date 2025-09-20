import "../css/analytics.css";

import { render, html } from "htm/preact";

import App from "./App";

render(html` <${App} /> `, document.getElementById("analytics-root"));
