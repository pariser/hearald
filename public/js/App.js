import { html, Component } from "htm/preact";

import {
  getJson,
  deepGet,
  numFormatter,
  getData,
  fetchChartData,
  fetchData,
} from "./util.js";
import Tile from "./Tile";

const DATE = new Date().toISOString().split("T")[0];

const Logo = () => html`
  <svg
    width="256"
    height="256"
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-labelledby="title desc"
  >
    <title id="title">Hearald</title>
    <desc id="desc">
      Circular seal with a centered Gothic-style H monogram.
    </desc>

    <style>
      .stroke {
        stroke: white;
        stroke-width: 8;
        stroke-linecap: round;
        stroke-linejoin: round;
        fill: none;
      }
      .fill {
        fill: #127d44;
      }
    </style>

    <!-- Outer seal circle -->
    <circle class="stroke" cx="128" cy="128" r="112" />

    <!-- Inner decorative circle -->
    <circle class="stroke" cx="128" cy="128" r="96" stroke-dasharray="14 10" />

    <!-- Gothic-style H (stylized manually) -->
    <g transform="translate(78,72)">
      <!-- Left vertical stroke with spiked top/bottom -->
      <path class="fill" d="M8 0 L20 0 L20 112 L8 112 L0 100 L0 12 Z" />
      <!-- Right vertical stroke with spiked top/bottom -->
      <path class="fill" d="M80 0 L92 0 L100 12 L100 100 L92 112 L80 112 Z" />
      <!-- Crossbar with gothic curve -->
      <path class="fill" d="M20 48 H80 V64 H20 Z" />
      <!-- Decorative inward serifs -->
      <path class="fill" d="M20 0 q10 8 0 16 Z" />
      <path class="fill" d="M80 0 q-10 8 0 16 Z" />
      <path class="fill" d="M20 96 q10 8 0 16 Z" />
      <path class="fill" d="M80 96 q-10 8 0 16 Z" />
    </g>
  </svg>
`;

const getDataFn = ({ n, d, q }) =>
  getData({
    n,
    d,
    q,
    endpointBuilder: (n, d, q) => {
      return `${window.location.pathname.replace(/\/$/, "")}/data/${n}/${d}${
        q ? "?" + q : ""
      }`;
    },
    fetchStats: getJson,
  });

let UI = [];

async function fetchUI() {
  try {
    const res = await fetch(window.location.href + "/layout");
    UI = await res.json();
  } catch (e) {
    UI = [];
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      numDays: 30,
      date: DATE,
      chartField: "users",
      chartContext: "all",
      uiSectionsLoaded: false,
    };
  }

  async componentDidMount() {
    await fetchUI();
    this.setState({ uiSectionsLoaded: true });
    fetchData({
      numDays: this.state.numDays,
      date: this.state.date,
      getDataFn,
      onLoadComplete: (stats) => this.setState({ stats }),
    });
    fetchChartData({
      numDays: this.state.numDays,
      date: this.state.date,
      chartContext: this.state.chartContext,
      chartField: this.state.chartField,
      getDataFn,
      onLoadProgress: (i, n) => {
        this.setState({ chartData: { loading: { max: n, value: i } } });
      },
      onLoadComplete: (data, max) => {
        this.setState({ chartData: { loading: false, data, max } });
      },
    });
  }

  async fetchChartData({ numDays, date, chartContext, chartField }) {
    await fetchChartData({
      numDays: numDays || this.state.numDays,
      date: date || this.state.date,
      chartContext: chartContext || this.state.chartContext,
      chartField: chartField || this.state.chartField,
      getDataFn,
      onLoadProgress: (i, n) =>
        this.setState({ chartData: { loading: { max: n, value: i } } }),
      onLoadComplete: (data, max) =>
        this.setState({ chartData: { loading: false, data, max } }),
    });
  }

  async fetchData({ numDays, date }) {
    await fetchData({
      numDays: numDays || this.state.numDays,
      date: date || this.state.date,
      getDataFn,
      onLoadComplete: (stats) => this.setState({ stats }),
    });
  }

  changeNumDays(e) {
    const numDays = e.target.value;
    this.setState({ numDays });
    this.fetchData({ numDays });
    this.fetchChartData({ numDays });
  }

  changeDate(e) {
    const date = e.target.value;
    this.setState({ date });
    this.fetchData({ date });
    this.fetchChartData({ date });
  }

  changeChartField(e) {
    const chartField = e.target.value;
    this.setState({ chartField });
    this.fetchChartData({ chartField });
  }

  changeChartContext(e) {
    const chartContext = e.target.value;
    this.setState({ chartContext });
    this.fetchChartData({ chartContext });
  }

  render(
    _props,
    {
      chartField,
      chartContext,
      numDays,
      date,
      stats = null,
      chartData = null,
      uiSectionsLoaded,
    }
  ) {
    return html`
      <div id="analytics">
        <div class="analytics__header">
          <div class="header__logo">
            <${Logo} />
          </div>
          <span>Hearald</span>
          <input
            type="text"
            class="analytics__header__input"
            onchange=${(e) => this.changeNumDays(e)}
            value=${numDays}
          />
          <input
            type="text"
            class="analytics__header__input"
            onchange=${(e) => this.changeDate(e)}
            value=${date}
          />
        </div>
        ${!uiSectionsLoaded || !stats || !stats.metrics
          ? html` <div><section class="analytics">Loading...</section></div> `
          : html`
              <div>
                <section class="analytics analytics--chart">
                  <form
                    class="analytics__menu"
                    onsubmit=${(e) => e.preventDefault()}
                  >
                    <label>
                      Context
                      <select
                        name="context"
                        onchange=${(e) => this.changeChartContext(e)}
                      >
                        ${UI.chartContexts.map(
                          ({ id, menuName }) =>
                            html`
                              <option
                                value="${id}"
                                selected=${chartContext === id}
                              >
                                ${menuName}
                              </option>
                            `
                        )}
                      </select>
                    </label>
                    <label>
                      Field
                      <select
                        name="field"
                        onchange=${(e) => this.changeChartField(e)}
                      >
                        ${stats?.metrics?.all
                          ? Object.keys(stats.metrics.all).map(
                              (f) =>
                                html`
                                  <option
                                    value="${f}"
                                    selected=${chartField === f}
                                  >
                                    ${f}
                                  </option>
                                `
                            )
                          : ""}
                      </select>
                    </label>
                  </form>
                  <div class="bar-chart">
                    ${!chartData &&
                    html` <span class="bar-chart__empty">no data</span> `}
                    ${chartData &&
                    chartData.loading &&
                    html`
                      <progress
                        class="bar-chart__empty"
                        max=${chartData.loading.max}
                        value=${chartData.loading.value}
                      ></progress>
                    `}
                    ${chartData &&
                    !chartData.loading &&
                    html`
                      <div class="bar-chart__scale">${chartData.max}</div>
                      ${chartData.data.map(
                        (v) =>
                          html`
                            <div
                              class="bar-chart__bar"
                              style="--bar-height:${v.value / chartData.max}"
                            >
                              <div class="bar-chart__bar__label">
                                ${v.date}
                                <br />
                                <b>${numFormatter(v.value)}</b>
                              </div>
                            </div>
                          `
                      )}
                    `}
                  </div>
                </section>
                ${UI.sections.map((statsSection) => {
                  return html`
                    <section class="analytics analytics--${statsSection.id}">
                      ${statsSection.menuName !== "" &&
                      html`
                        <h2 class="analytics__title">
                          ${statsSection.menuName}
                        </h2>
                      `}
                      ${statsSection.stats.map((f) => {
                        return html`
                          <${Tile}
                            title="${f.label}"
                            type="${f.type}"
                            value=${deepGet(stats.metrics, f.key)}
                            span=${f.span || null}
                            ${f.type === "percent" ? "percent" : ""}
                            ${f.type === "histogram" ? "histogram" : ""}
                          />
                        `;
                      })}
                    </section>
                  `;
                })}
              </div>
            `}
      </div>
    `;
  }
}

export default App;
