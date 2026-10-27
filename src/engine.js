export const workflows = {
  lead: {
    name: 'Lead qualification',
    description: 'Turn a new enquiry into a clear next step.',
    icon: '01',
    fields: [
      { key: 'company', label: 'Company', type: 'text', value: 'Northstar Retail', required: true },
      { key: 'budget', label: 'Estimated budget (USD)', type: 'number', value: 3500, min: 0 },
      { key: 'volume', label: 'Requests per month', type: 'number', value: 180, min: 0 },
      { key: 'timeline', label: 'Target timeline (days)', type: 'number', value: 30, min: 1 },
      { key: 'need', label: 'What needs to change?', type: 'textarea', value: 'Automate order updates and customer follow-ups.' }
    ]
  },
  support: {
    name: 'Support triage',
    description: 'Route an incoming request with an audit trail.',
    icon: '02',
    fields: [
      { key: 'customer', label: 'Customer', type: 'text', value: 'Aster Logistics', required: true },
      { key: 'tier', label: 'Customer tier', type: 'select', value: 'Standard', options: ['Standard', 'Priority'] },
      { key: 'subject', label: 'Subject', type: 'text', value: 'Checkout is down', required: true },
      { key: 'message', label: 'Message', type: 'textarea', value: 'Our production checkout stopped accepting payments this morning.', required: true }
    ]
  },
  invoice: {
    name: 'Invoice review',
    description: 'Catch exceptions before a payment is released.',
    icon: '03',
    fields: [
      { key: 'vendor', label: 'Vendor', type: 'text', value: 'Acme Supplies', required: true },
      { key: 'invoiceNo', label: 'Invoice number', type: 'text', value: 'INV-2408', required: true },
      { key: 'amount', label: 'Amount (USD)', type: 'number', value: 6400, min: 0 },
      { key: 'poMatched', label: 'Purchase order matched', type: 'select', value: 'No', options: ['Yes', 'No'] },
      { key: 'duplicate', label: 'Possible duplicate', type: 'select', value: 'No', options: ['No', 'Yes'] }
    ]
  }
};

const includesAny = (text, words) => words.some(word => text.includes(word));
const asNumber = value => Math.max(0, Number(value) || 0);
const clean = value => String(value ?? '').trim();

function lead(input) {
  const company = clean(input.company);
  const budget = asNumber(input.budget);
  const volume = asNumber(input.volume);
  const timeline = asNumber(input.timeline);
  let score = 0;
  const signals = [];
  if (company) { score += 20; signals.push('Company identified'); }
  if (budget >= 2000) { score += 35; signals.push('Budget meets discovery threshold'); }
  if (volume >= 100) { score += 20; signals.push('High-volume workflow'); }
  if (timeline > 0 && timeline <= 45) { score += 25; signals.push('Near-term timeline'); }
  const qualified = score >= 70;
  return {
    decision: qualified ? 'Book discovery call' : 'Request more detail',
    tone: qualified ? 'success' : 'review',
    owner: qualified ? 'Solutions team' : 'Intake queue',
    nextAction: qualified ? 'Send a tailored discovery agenda.' : 'Clarify budget, volume, and timing.',
    summary: `${company || 'This enquiry'} scored ${score}/100 using four visible rules.`,
    metric: `${score}/100`, metricLabel: 'Qualification score', signals,
    steps: [
      ['Capture request', `Created a case for ${company || 'an unnamed company'}.`],
      ['Apply rules', `${signals.length} of 4 qualification signals matched.`],
      ['Route owner', `Assigned to ${qualified ? 'Solutions team' : 'Intake queue'}.`],
      ['Human handoff', qualified ? 'A person reviews the brief before outreach.' : 'A person requests missing details.']
    ],
    requiresApproval: false
  };
}

function support(input) {
  const text = `${clean(input.subject)} ${clean(input.message)}`.toLowerCase();
  const customer = clean(input.customer) || 'This customer';
  const priorityTier = clean(input.tier) === 'Priority';
  const outage = includesAny(text, ['outage', 'is down', 'stopped', 'offline', 'security breach']);
  const billing = includesAny(text, ['invoice', 'refund', 'billing', 'payment', 'charged']);
  const priority = outage ? 'Critical' : priorityTier ? 'High' : 'Normal';
  const owner = outage ? 'Incident response' : billing ? 'Billing support' : 'Customer support';
  const signals = [outage ? 'Service interruption language' : 'No outage signal', priorityTier ? 'Priority customer' : 'Standard customer'];
  if (billing) signals.push('Billing-related terms');
  return {
    decision: `${priority} priority`, tone: outage ? 'danger' : priorityTier ? 'review' : 'success',
    owner, nextAction: outage ? 'Review immediately and confirm impact.' : 'Review the drafted response before sending.',
    summary: `${customer}'s request was routed from explicit text and customer-tier rules.`,
    metric: priority, metricLabel: 'Queue priority', signals,
    steps: [
      ['Capture request', `Logged “${clean(input.subject) || 'Untitled request'}”.`],
      ['Detect signals', outage ? 'An interruption signal was found.' : 'No interruption signal was found.'],
      ['Route owner', `Assigned to ${owner}.`],
      ['Human handoff', 'A support teammate reviews the case and response.']
    ],
    requiresApproval: false
  };
}

function invoice(input) {
  const amount = asNumber(input.amount);
  const noPo = clean(input.poMatched) !== 'Yes';
  const duplicate = clean(input.duplicate) === 'Yes';
  const highValue = amount > 5000;
  const flags = [duplicate && 'Possible duplicate', noPo && 'PO not matched', highValue && 'Above review threshold'].filter(Boolean);
  const hold = flags.length > 0;
  return {
    decision: hold ? 'Hold for review' : 'Ready for approval', tone: hold ? 'review' : 'success',
    owner: 'Finance reviewer',
    nextAction: hold ? 'Verify the exceptions before release.' : 'Confirm details before approving payment.',
    summary: `${clean(input.invoiceNo) || 'This invoice'} from ${clean(input.vendor) || 'the vendor'} has ${flags.length} review flag${flags.length === 1 ? '' : 's'}.`,
    metric: String(flags.length), metricLabel: 'Review flags', signals: flags.length ? flags : ['No exception rules matched'],
    steps: [
      ['Capture invoice', `Recorded ${clean(input.invoiceNo) || 'an unnumbered invoice'} for $${amount.toLocaleString('en-US')}.`],
      ['Check exceptions', flags.length ? flags.join(' · ') : 'No exception rules matched.'],
      ['Route owner', 'Assigned to Finance reviewer.'],
      ['Human handoff', 'A person makes the final release decision.']
    ],
    requiresApproval: true
  };
}

export function runWorkflow(id, input) {
  if (!workflows[id]) throw new Error(`Unknown workflow: ${id}`);
  if (!input || typeof input !== 'object') throw new Error('Case input is required');
  const result = { lead, support, invoice }[id](input);
  return { workflow: id, input: { ...input }, ...result, runAt: new Date().toISOString(), mode: 'rule-based-demo' };
}
