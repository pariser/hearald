import { html, Component } from "htm/preact";

const prettyNumericFormatter = (val) => {
  const digits = Math.log10(val);
  let truncDigits = 0;
  let decimalPlaces = 0;
  let suffix = "";
  if (digits > 8) {
    truncDigits = 9;
    suffix = "b";
    decimalPlaces = 2;
  } else if (digits > 5) {
    truncDigits = 6;
    suffix = "m";
    decimalPlaces = 2;
  } else if (digits > 3) {
    truncDigits = 3;
    suffix = "k";
    decimalPlaces = 2;
  }

  const numeric = Math.floor(val / 10 ** truncDigits);
  if (decimalPlaces) {
    const fractional =
      (val % 10 ** decimalPlaces) % 10 ** (truncDigits - decimalPlaces);
    return `${numeric}.${fractional}${suffix}`;
  } else {
    return `${numeric}${suffix}`;
  }
};

const percentFormatter = (val) =>
  `${(Math.round(val * 100) / 100).toFixed(2)}%`;

const plainFormatter = (val) => val;

const getFormattedValue = (value, percent = false, plain = false) => {
  let formattedValue;
  let formatter = prettyNumericFormatter;
  if (percent) {
    if (plain) {
      console.error("Multiple formatters specified, using percent formatter");
    }

    formatter = percentFormatter;
  } else if (plain) {
    formatter = plainFormatter;
  }

  if (isNaN(value)) {
    formattedValue = "(no data)";
  } else {
    formattedValue = formatter(value);
  }

  return formattedValue;
};

class Tile extends Component {
  render({
    title,
    value,
    type,
    percent = false,
    plain = false,
    endRow = false,
    span = null,
  }) {
    return html`
      <div
        class="analytics__tile ${span ? `analytics__tile--span-${span}` : ""}"
      >
        <div class="analytics__tile__header">${title}</div>
        ${type === "histogram"
          ? html`
              <!-- div class="analytics__tile__value" -->
              <ul class="analytics__tile__histogram">
                ${value && value.length
                  ? value.map(
                      ([label, count]) => html`
                        <li class="analytics__tile__histogram__row">
                          <div class="analytics__tile__histogram__value">
                            ${count}
                          </div>
                          <div
                            class="analytics__tile__histogram__label"
                            style="--bar-width:${count / (value[0]?.[1] || 1)}"
                          >
                            ${label}
                          </div>
                        </li>
                      `
                    )
                  : html`
                      <li class="analytics__tile__histogram__row">No data</li>
                    `}
              </ul>
              <!-- /div -->
            `
          : html`
              <div class="analytics__tile__value" data-value=${value}>
                ${getFormattedValue(value, percent, plain)}
              </div>
            `}
      </div>
      ${endRow &&
      html` <div class="analytics__tile analytics__tile--end-row" /> `}
    `;
  }
}

export default Tile;
