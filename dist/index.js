(function () {
  'use strict';

  var n$1,l,u,i,r,o,e$1,f,c,s,a,p={},v=[],y=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,w=Array.isArray;function d(n,l){for(var u in l)n[u]=l[u];return n}function g(n){n&&n.parentNode&&n.parentNode.removeChild(n);}function _(l,u,t){var i,r,o,e={};for(o in u)"key"==o?i=u[o]:"ref"==o?r=u[o]:e[o]=u[o];if(arguments.length>2&&(e.children=arguments.length>3?n$1.call(arguments,2):t),"function"==typeof l&&null!=l.defaultProps)for(o in l.defaultProps)void 0===e[o]&&(e[o]=l.defaultProps[o]);return m$1(l,e,i,r,null)}function m$1(n,t,i,r,o){var e={type:n,props:t,key:i,ref:r,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:null==o?++u:o,__i:-1,__u:0};return null==o&&null!=l.vnode&&l.vnode(e),e}function k(n){return n.children}function x(n,l){this.props=n,this.context=l;}function S(n,l){if(null==l)return n.__?S(n.__,n.__i+1):null;for(var u;l<n.__k.length;l++)if(null!=(u=n.__k[l])&&null!=u.__e)return u.__e;return "function"==typeof n.type?S(n):null}function C(n){var l,u;if(null!=(n=n.__)&&null!=n.__c){for(n.__e=n.__c.base=null,l=0;l<n.__k.length;l++)if(null!=(u=n.__k[l])&&null!=u.__e){n.__e=n.__c.base=u.__e;break}return C(n)}}function M(n){(!n.__d&&(n.__d=!0)&&i.push(n)&&!$.__r++||r!=l.debounceRendering)&&((r=l.debounceRendering)||o)($);}function $(){for(var n,u,t,r,o,f,c,s=1;i.length;)i.length>s&&i.sort(e$1),n=i.shift(),s=i.length,n.__d&&(t=void 0,r=void 0,o=(r=(u=n).__v).__e,f=[],c=[],u.__P&&((t=d({},r)).__v=r.__v+1,l.vnode&&l.vnode(t),O(u.__P,t,r,u.__n,u.__P.namespaceURI,32&r.__u?[o]:null,f,null==o?S(r):o,!!(32&r.__u),c),t.__v=r.__v,t.__.__k[t.__i]=t,N(f,t,c),r.__e=r.__=null,t.__e!=o&&C(t)));$.__r=0;}function I(n,l,u,t,i,r,o,e,f,c,s){var a,h,y,w,d,g,_,m=t&&t.__k||v,b=l.length;for(f=P(u,l,m,f,b),a=0;a<b;a++)null!=(y=u.__k[a])&&(h=-1==y.__i?p:m[y.__i]||p,y.__i=a,g=O(n,y,h,i,r,o,e,f,c,s),w=y.__e,y.ref&&h.ref!=y.ref&&(h.ref&&B(h.ref,null,y),s.push(y.ref,y.__c||w,y)),null==d&&null!=w&&(d=w),(_=!!(4&y.__u))||h.__k===y.__k?f=A(y,f,n,_):"function"==typeof y.type&&void 0!==g?f=g:w&&(f=w.nextSibling),y.__u&=-7);return u.__e=d,f}function P(n,l,u,t,i){var r,o,e,f,c,s=u.length,a=s,h=0;for(n.__k=new Array(i),r=0;r<i;r++)null!=(o=l[r])&&"boolean"!=typeof o&&"function"!=typeof o?(f=r+h,(o=n.__k[r]="string"==typeof o||"number"==typeof o||"bigint"==typeof o||o.constructor==String?m$1(null,o,null,null,null):w(o)?m$1(k,{children:o},null,null,null):null==o.constructor&&o.__b>0?m$1(o.type,o.props,o.key,o.ref?o.ref:null,o.__v):o).__=n,o.__b=n.__b+1,e=null,-1!=(c=o.__i=L(o,u,f,a))&&(a--,(e=u[c])&&(e.__u|=2)),null==e||null==e.__v?(-1==c&&(i>s?h--:i<s&&h++),"function"!=typeof o.type&&(o.__u|=4)):c!=f&&(c==f-1?h--:c==f+1?h++:(c>f?h--:h++,o.__u|=4))):n.__k[r]=null;if(a)for(r=0;r<s;r++)null!=(e=u[r])&&0==(2&e.__u)&&(e.__e==t&&(t=S(e)),D(e,e));return t}function A(n,l,u,t){var i,r;if("function"==typeof n.type){for(i=n.__k,r=0;i&&r<i.length;r++)i[r]&&(i[r].__=n,l=A(i[r],l,u,t));return l}n.__e!=l&&(t&&(l&&n.type&&!l.parentNode&&(l=S(n)),u.insertBefore(n.__e,l||null)),l=n.__e);do{l=l&&l.nextSibling;}while(null!=l&&8==l.nodeType);return l}function L(n,l,u,t){var i,r,o,e=n.key,f=n.type,c=l[u],s=null!=c&&0==(2&c.__u);if(null===c&&null==n.key||s&&e==c.key&&f==c.type)return u;if(t>(s?1:0))for(i=u-1,r=u+1;i>=0||r<l.length;)if(null!=(c=l[o=i>=0?i--:r++])&&0==(2&c.__u)&&e==c.key&&f==c.type)return o;return -1}function T(n,l,u){"-"==l[0]?n.setProperty(l,null==u?"":u):n[l]=null==u?"":"number"!=typeof u||y.test(l)?u:u+"px";}function j(n,l,u,t,i){var r,o;n:if("style"==l)if("string"==typeof u)n.style.cssText=u;else {if("string"==typeof t&&(n.style.cssText=t=""),t)for(l in t)u&&l in u||T(n.style,l,"");if(u)for(l in u)t&&u[l]==t[l]||T(n.style,l,u[l]);}else if("o"==l[0]&&"n"==l[1])r=l!=(l=l.replace(f,"$1")),o=l.toLowerCase(),l=o in n||"onFocusOut"==l||"onFocusIn"==l?o.slice(2):l.slice(2),n.l||(n.l={}),n.l[l+r]=u,u?t?u.u=t.u:(u.u=c,n.addEventListener(l,r?a:s,r)):n.removeEventListener(l,r?a:s,r);else {if("http://www.w3.org/2000/svg"==i)l=l.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if("width"!=l&&"height"!=l&&"href"!=l&&"list"!=l&&"form"!=l&&"tabIndex"!=l&&"download"!=l&&"rowSpan"!=l&&"colSpan"!=l&&"role"!=l&&"popover"!=l&&l in n)try{n[l]=null==u?"":u;break n}catch(n){}"function"==typeof u||(null==u||!1===u&&"-"!=l[4]?n.removeAttribute(l):n.setAttribute(l,"popover"==l&&1==u?"":u));}}function F(n){return function(u){if(this.l){var t=this.l[u.type+n];if(null==u.t)u.t=c++;else if(u.t<t.u)return;return t(l.event?l.event(u):u)}}}function O(n,u,t,i,r,o,e,f,c,s){var a,h,p,v,y,_,m,b,S,C,M,$,P,A,H,L,T,j=u.type;if(null!=u.constructor)return null;128&t.__u&&(c=!!(32&t.__u),o=[f=u.__e=t.__e]),(a=l.__b)&&a(u);n:if("function"==typeof j)try{if(b=u.props,S="prototype"in j&&j.prototype.render,C=(a=j.contextType)&&i[a.__c],M=a?C?C.props.value:a.__:i,t.__c?m=(h=u.__c=t.__c).__=h.__E:(S?u.__c=h=new j(b,M):(u.__c=h=new x(b,M),h.constructor=j,h.render=E),C&&C.sub(h),h.props=b,h.state||(h.state={}),h.context=M,h.__n=i,p=h.__d=!0,h.__h=[],h._sb=[]),S&&null==h.__s&&(h.__s=h.state),S&&null!=j.getDerivedStateFromProps&&(h.__s==h.state&&(h.__s=d({},h.__s)),d(h.__s,j.getDerivedStateFromProps(b,h.__s))),v=h.props,y=h.state,h.__v=u,p)S&&null==j.getDerivedStateFromProps&&null!=h.componentWillMount&&h.componentWillMount(),S&&null!=h.componentDidMount&&h.__h.push(h.componentDidMount);else {if(S&&null==j.getDerivedStateFromProps&&b!==v&&null!=h.componentWillReceiveProps&&h.componentWillReceiveProps(b,M),!h.__e&&null!=h.shouldComponentUpdate&&!1===h.shouldComponentUpdate(b,h.__s,M)||u.__v==t.__v){for(u.__v!=t.__v&&(h.props=b,h.state=h.__s,h.__d=!1),u.__e=t.__e,u.__k=t.__k,u.__k.some(function(n){n&&(n.__=u);}),$=0;$<h._sb.length;$++)h.__h.push(h._sb[$]);h._sb=[],h.__h.length&&e.push(h);break n}null!=h.componentWillUpdate&&h.componentWillUpdate(b,h.__s,M),S&&null!=h.componentDidUpdate&&h.__h.push(function(){h.componentDidUpdate(v,y,_);});}if(h.context=M,h.props=b,h.__P=n,h.__e=!1,P=l.__r,A=0,S){for(h.state=h.__s,h.__d=!1,P&&P(u),a=h.render(h.props,h.state,h.context),H=0;H<h._sb.length;H++)h.__h.push(h._sb[H]);h._sb=[];}else do{h.__d=!1,P&&P(u),a=h.render(h.props,h.state,h.context),h.state=h.__s;}while(h.__d&&++A<25);h.state=h.__s,null!=h.getChildContext&&(i=d(d({},i),h.getChildContext())),S&&!p&&null!=h.getSnapshotBeforeUpdate&&(_=h.getSnapshotBeforeUpdate(v,y)),L=a,null!=a&&a.type===k&&null==a.key&&(L=V(a.props.children)),f=I(n,w(L)?L:[L],u,t,i,r,o,e,f,c,s),h.base=u.__e,u.__u&=-161,h.__h.length&&e.push(h),m&&(h.__E=h.__=null);}catch(n){if(u.__v=null,c||null!=o)if(n.then){for(u.__u|=c?160:128;f&&8==f.nodeType&&f.nextSibling;)f=f.nextSibling;o[o.indexOf(f)]=null,u.__e=f;}else {for(T=o.length;T--;)g(o[T]);z(u);}else u.__e=t.__e,u.__k=t.__k,n.then||z(u);l.__e(n,u,t);}else null==o&&u.__v==t.__v?(u.__k=t.__k,u.__e=t.__e):f=u.__e=q(t.__e,u,t,i,r,o,e,c,s);return (a=l.diffed)&&a(u),128&u.__u?void 0:f}function z(n){n&&n.__c&&(n.__c.__e=!0),n&&n.__k&&n.__k.forEach(z);}function N(n,u,t){for(var i=0;i<t.length;i++)B(t[i],t[++i],t[++i]);l.__c&&l.__c(u,n),n.some(function(u){try{n=u.__h,u.__h=[],n.some(function(n){n.call(u);});}catch(n){l.__e(n,u.__v);}});}function V(n){return "object"!=typeof n||null==n||n.__b&&n.__b>0?n:w(n)?n.map(V):d({},n)}function q(u,t,i,r,o,e,f,c,s){var a,h,v,y,d,_,m,b=i.props,k=t.props,x=t.type;if("svg"==x?o="http://www.w3.org/2000/svg":"math"==x?o="http://www.w3.org/1998/Math/MathML":o||(o="http://www.w3.org/1999/xhtml"),null!=e)for(a=0;a<e.length;a++)if((d=e[a])&&"setAttribute"in d==!!x&&(x?d.localName==x:3==d.nodeType)){u=d,e[a]=null;break}if(null==u){if(null==x)return document.createTextNode(k);u=document.createElementNS(o,x,k.is&&k),c&&(l.__m&&l.__m(t,e),c=!1),e=null;}if(null==x)b===k||c&&u.data==k||(u.data=k);else {if(e=e&&n$1.call(u.childNodes),b=i.props||p,!c&&null!=e)for(b={},a=0;a<u.attributes.length;a++)b[(d=u.attributes[a]).name]=d.value;for(a in b)if(d=b[a],"children"==a);else if("dangerouslySetInnerHTML"==a)v=d;else if(!(a in k)){if("value"==a&&"defaultValue"in k||"checked"==a&&"defaultChecked"in k)continue;j(u,a,null,d,o);}for(a in k)d=k[a],"children"==a?y=d:"dangerouslySetInnerHTML"==a?h=d:"value"==a?_=d:"checked"==a?m=d:c&&"function"!=typeof d||b[a]===d||j(u,a,d,b[a],o);if(h)c||v&&(h.__html==v.__html||h.__html==u.innerHTML)||(u.innerHTML=h.__html),t.__k=[];else if(v&&(u.innerHTML=""),I("template"==t.type?u.content:u,w(y)?y:[y],t,i,r,"foreignObject"==x?"http://www.w3.org/1999/xhtml":o,e,f,e?e[0]:i.__k&&S(i,0),c,s),null!=e)for(a=e.length;a--;)g(e[a]);c||(a="value","progress"==x&&null==_?u.removeAttribute("value"):null!=_&&(_!==u[a]||"progress"==x&&!_||"option"==x&&_!=b[a])&&j(u,a,_,b[a],o),a="checked",null!=m&&m!=u[a]&&j(u,a,m,b[a],o));}return u}function B(n,u,t){try{if("function"==typeof n){var i="function"==typeof n.__u;i&&n.__u(),i&&null==u||(n.__u=n(u));}else n.current=u;}catch(n){l.__e(n,t);}}function D(n,u,t){var i,r;if(l.unmount&&l.unmount(n),(i=n.ref)&&(i.current&&i.current!=n.__e||B(i,null,u)),null!=(i=n.__c)){if(i.componentWillUnmount)try{i.componentWillUnmount();}catch(n){l.__e(n,u);}i.base=i.__P=null;}if(i=n.__k)for(r=0;r<i.length;r++)i[r]&&D(i[r],u,t||"function"!=typeof n.type);t||g(n.__e),n.__c=n.__=n.__e=void 0;}function E(n,l,u){return this.constructor(n,u)}function G(u,t,i){var r,o,e,f;t==document&&(t=document.documentElement),l.__&&l.__(u,t),o=(r="function"==typeof i)?null:i&&i.__k||t.__k,e=[],f=[],O(t,u=(!r&&i||t).__k=_(k,null,[u]),o||p,p,t.namespaceURI,!r&&i?[i]:o?null:t.firstChild?n$1.call(t.childNodes):null,e,!r&&i?i:o?o.__e:t.firstChild,r,f),N(e,u,f);}n$1=v.slice,l={__e:function(n,l,u,t){for(var i,r,o;l=l.__;)if((i=l.__c)&&!i.__)try{if((r=i.constructor)&&null!=r.getDerivedStateFromError&&(i.setState(r.getDerivedStateFromError(n)),o=i.__d),null!=i.componentDidCatch&&(i.componentDidCatch(n,t||{}),o=i.__d),o)return i.__E=i}catch(l){n=l;}throw n}},u=0,x.prototype.setState=function(n,l){var u;u=null!=this.__s&&this.__s!=this.state?this.__s:this.__s=d({},this.state),"function"==typeof n&&(n=n(d({},u),this.props)),n&&d(u,n),null!=n&&this.__v&&(l&&this._sb.push(l),M(this));},x.prototype.forceUpdate=function(n){this.__v&&(this.__e=!0,n&&this.__h.push(n),M(this));},x.prototype.render=k,i=[],o="function"==typeof Promise?Promise.prototype.then.bind(Promise.resolve()):setTimeout,e$1=function(n,l){return n.__v.__b-l.__v.__b},$.__r=0,f=/(PointerCapture)$|Capture$/i,c=0,s=F(!1),a=F(!0);

  var n=function(t,s,r,e){var u;s[0]=0;for(var h=1;h<s.length;h++){var p=s[h++],a=s[h]?(s[0]|=p?1:2,r[s[h++]]):s[++h];3===p?e[0]=a:4===p?e[1]=Object.assign(e[1]||{},a):5===p?(e[1]=e[1]||{})[s[++h]]=a:6===p?e[1][s[++h]]+=a+"":p?(u=t.apply(a,n(t,a,r,["",null])),e.push(u),a[0]?s[0]|=2:(s[h-2]=0,s[h]=u)):e.push(a);}return e},t=new Map;function e(s){var r=t.get(this);return r||(r=new Map,t.set(this,r)),(r=n(this,r.get(s)||(r.set(s,r=function(n){for(var t,s,r=1,e="",u="",h=[0],p=function(n){1===r&&(n||(e=e.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?h.push(0,n,e):3===r&&(n||e)?(h.push(3,n,e),r=2):2===r&&"..."===e&&n?h.push(4,n,0):2===r&&e&&!n?h.push(5,0,!0,e):r>=5&&((e||!n&&5===r)&&(h.push(r,0,e,s),r=6),n&&(h.push(r,n,0,s),r=6)),e="";},a=0;a<n.length;a++){a&&(1===r&&p(),p(a));for(var l=0;l<n[a].length;l++)t=n[a][l],1===r?"<"===t?(p(),h=[h],r=3):e+=t:4===r?"--"===e&&">"===t?(r=1,e=""):e=t+e[0]:u?t===u?u="":e+=t:'"'===t||"'"===t?u=t:">"===t?(p(),r=1):r&&("="===t?(r=5,s=e,e=""):"/"===t&&(r<5||">"===n[a][l+1])?(p(),3===r&&(h=h[0]),r=h,(h=h[0]).push(2,0,r),r=0):" "===t||"\t"===t||"\n"===t||"\r"===t?(p(),r=2):e+=t),3===r&&"!--"===e&&(r=4,h=h[0]);}return p(),h}(s)),r),arguments,[])).length>1?r:r[0]}

  var m=e.bind(_);

  function iso(time) {
    return [
      time.getUTCFullYear(),
      (time.getUTCMonth() + 1).toString().padStart(2, "0"),
      time.getUTCDate().toString().padStart(2, "0"),
    ].join("-");
  }

  /* START methods for fetching data from the server */

  const dataCache = {};

  // Fetches data from the server with caching
  async function getData({ n, d, q, endpointBuilder, fetchStats }) {
    const key = [n, d, q].join("_");
    if (dataCache[key]) {
      return dataCache[key];
    }

    const endpoint = endpointBuilder
      ? endpointBuilder(n, d, q)
      : `/data/${n}/${d}${q ? "?" + q : ""}`;

    const data = await fetchStats(endpoint);
    dataCache[key] = data;
    return data;
  }

  // Fetches and builds chart data for a given field/context over a time window
  async function fetchChartData({
    numDays,
    date,
    chartContext,
    chartField,
    getDataFn,

    onLoadProgress, // (i, n) => void
    onLoadComplete, // (data, max) => void
  }) {
    const n = numDays;
    const d = date;
    const field = chartField;
    const context = chartContext;

    const [yyyy, mm, dd] = d.split("-");
    const startDate = new Date(yyyy, mm - 1, dd);

    let data = [];
    let max = 1;

    for (let i = 0; i < n; i++) {
      let day = new Date(startDate);
      day.setDate(startDate.getDate() - i);
      onLoadProgress(i, n);

      const json = await getDataFn({ n: 1, d: iso(day) });
      const v = json.metrics[context][field] || 0;

      data.unshift({ date: iso(day), value: v });
      max = Math.max(max, v);
    }

    onLoadComplete(data, max);
  }

  // Fetches and sets the main stats data for a given date/range
  async function fetchData({
    numDays,
    date,
    getDataFn,
    onLoadComplete, // (stats) => void
  }) {
    const n = numDays;
    const d = date;
    const stats = await getDataFn({ n, d });
    onLoadComplete(stats);
  }

  /* END methods for fetching data from the server */

  /* START helper methods */

  const getJson = async (url) => {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "Content-Type": "application/json" },
    });
    return response.json();
  };

  const deepGet = (obj, path) => {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length; i += 1) {
      if (current == null) return undefined;
      current = current[parts[i]];
    }
    return current;
  };

  function numFormatter(n) {
    if (typeof Intl !== "undefined" && Intl.NumberFormat) {
      return new Intl.NumberFormat().format(n);
    }
    return n;
  }

  /* END helper methods */

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

  class Tile extends x {
    render({
      title,
      value,
      type,
      percent = false,
      plain = false,
      endRow = false,
      span = null,
    }) {
      return m`
      <div
        class="analytics__tile ${span ? `analytics__tile--span-${span}` : ""}"
      >
        <div class="analytics__tile__header">${title}</div>
        ${type === "histogram"
          ? m`
              <!-- div class="analytics__tile__value" -->
              <ul class="analytics__tile__histogram">
                ${value && value.length
                  ? value.map(
                      ([label, count]) => m`
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
                  : m`
                      <li class="analytics__tile__histogram__row">No data</li>
                    `}
              </ul>
              <!-- /div -->
            `
          : m`
              <div class="analytics__tile__value" data-value=${value}>
                ${getFormattedValue(value, percent, plain)}
              </div>
            `}
      </div>
      ${endRow &&
      m` <div class="analytics__tile analytics__tile--end-row" /> `}
    `;
    }
  }

  const DATE = new Date().toISOString().split("T")[0];

  const Logo = () => m`
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

  class App extends x {
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
      return m`
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
          ? m` <div><section class="analytics">Loading...</section></div> `
          : m`
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
                            m`
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
                                m`
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
                    m` <span class="bar-chart__empty">no data</span> `}
                    ${chartData &&
                    chartData.loading &&
                    m`
                      <progress
                        class="bar-chart__empty"
                        max=${chartData.loading.max}
                        value=${chartData.loading.value}
                      ></progress>
                    `}
                    ${chartData &&
                    !chartData.loading &&
                    m`
                      <div class="bar-chart__scale">${chartData.max}</div>
                      ${chartData.data.map(
                        (v) =>
                          m`
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
                  return m`
                    <section class="analytics analytics--${statsSection.id}">
                      ${statsSection.menuName !== "" &&
                      m`
                        <h2 class="analytics__title">
                          ${statsSection.menuName}
                        </h2>
                      `}
                      ${statsSection.stats.map((f) => {
                        return m`
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

  G(m` <${App} /> `, document.getElementById("analytics-root"));

})();
