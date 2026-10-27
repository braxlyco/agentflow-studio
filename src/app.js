import { workflows, runWorkflow } from './engine.js';

const nav = document.querySelector('#workflow-nav');
const form = document.querySelector('#case-form');
const fields = document.querySelector('#fields');
const panel = document.querySelector('#result-panel');
const title = document.querySelector('#workflow-title');
const description = document.querySelector('#workflow-description');
const runButton = document.querySelector('#run-button');
let active = 'lead';
let latestRun = null;
let review = null;

function node(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content != null) element.textContent = content;
  return element;
}

function setWorkflow(id) {
  active = id;
  latestRun = null;
  review = null;
  const workflow = workflows[id];
  title.textContent = workflow.name;
  description.textContent = workflow.description;
  nav.replaceChildren(...Object.entries(workflows).map(([key, item]) => {
    const button = node('button', `nav-item ${key === id ? 'active' : ''}`);
    button.type = 'button';
    button.setAttribute('aria-current', key === id ? 'page' : 'false');
    button.append(node('span', 'nav-num', item.icon), node('span', 'nav-name', item.name), node('span', 'nav-arrow', '↗'));
    button.addEventListener('click', () => setWorkflow(key));
    return button;
  }));
  fields.replaceChildren(...workflow.fields.map(field => {
    const wrap = node('div', `field ${field.type === 'textarea' ? 'wide' : ''}`);
    const label = node('label', '', field.label);
    label.htmlFor = field.key;
    let input;
    if (field.type === 'textarea') {
      input = node('textarea'); input.rows = 4; input.value = field.value;
    } else if (field.type === 'select') {
      input = node('select');
      for (const option of field.options) {
        const item = node('option', '', option);
        item.value = option;
        input.append(item);
      }
      input.value = field.value;
    } else {
      input = node('input'); input.type = field.type; input.value = field.value;
      if (field.type === 'number') input.min = field.min ?? 0;
    }
    input.id = field.key; input.name = field.key; input.required = Boolean(field.required);
    wrap.append(label, input);
    return wrap;
  }));
  panel.innerHTML = '<div class="empty-state"><div class="empty-icon">◇</div><h3>Ready when you are.</h3><p>Adjust the sample case and run the workflow to see its decision trace.</p></div>';
}

function renderResult(result) {
  panel.replaceChildren();
  const top = node('div', 'result-top');
  top.append(node('span', 'section-kicker', '02 / DECISION TRACE'), node('span', 'mode-pill', 'RULE-BASED DEMO'));
  const verdict = node('div', `verdict ${result.tone}`);
  const verdictText = node('div');
  verdictText.append(node('span', 'verdict-label', 'WORKFLOW RESULT'), node('h3', '', result.decision));
  verdict.append(verdictText, node('span', 'verdict-symbol', result.tone === 'danger' ? '!' : '✓'));
  const summary = node('p', 'result-summary', result.summary);
  const mini = node('div', 'result-stats');
  for (const [value, label] of [[result.metric, result.metricLabel], [result.owner, 'Assigned owner']]) {
    const box = node('div'); box.append(node('strong', '', value), node('span', '', label)); mini.append(box);
  }
  const traceTitle = node('div', 'trace-heading'); traceTitle.append(node('h4', '', 'What happened'), node('span', '', '4 STEPS'));
  const trace = node('ol', 'trace');
  for (const [name, detail] of result.steps) {
    const item = node('li'); item.append(node('strong', '', name), node('span', '', detail)); trace.append(item);
  }
  const signals = node('div', 'signals'); signals.append(node('span', 'signals-title', 'MATCHED SIGNALS'));
  for (const signal of result.signals) signals.append(node('span', 'signal-chip', signal));
  const action = node('div', 'next-action'); action.append(node('span', '', 'NEXT ACTION'), node('strong', '', result.nextAction));
  const actions = node('div', 'result-actions');
  const download = node('button', 'secondary-button', 'Download trace ↓'); download.type = 'button';
  download.addEventListener('click', () => {
    const report = { ...latestRun, humanReview: review };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `braxly-${active}-trace.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  actions.append(download);
  if (result.requiresApproval) {
    const reviewButton = node('button', 'secondary-button', review ? `Human review: ${review.decision}` : 'Record human review');
    reviewButton.type = 'button';
    reviewButton.addEventListener('click', () => {
      const decision = window.prompt('Record a human decision: approve, reject, or investigate', 'investigate');
      if (decision == null) return;
      const normalized = decision.trim().toLowerCase();
      if (!['approve', 'reject', 'investigate'].includes(normalized)) { window.alert('Choose approve, reject, or investigate.'); return; }
      review = { decision: normalized, at: new Date().toISOString() };
      renderResult(result);
    });
    actions.append(reviewButton);
  }
  panel.append(top, verdict, summary, mini, traceTitle, trace, signals, action, actions);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const input = Object.fromEntries(new FormData(form).entries());
  runButton.disabled = true;
  runButton.firstElementChild.textContent = '◌';
  setTimeout(() => {
    latestRun = runWorkflow(active, input);
    review = null;
    renderResult(latestRun);
    runButton.disabled = false;
    runButton.firstElementChild.textContent = '▶';
    if (window.innerWidth < 900) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 320);
});

setWorkflow('lead');
