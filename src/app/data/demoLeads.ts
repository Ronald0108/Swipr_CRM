import type { Lead } from './leads';

const contacts = [
  ['Avery Morgan', 'Northstar Labs', 'VP of Sales', 'Software'],
  ['Jordan Lee', 'Cedar Analytics', 'Founder', 'Analytics'],
  ['Taylor Brooks', 'Harbor Studio', 'Operations Director', 'Design'],
  ['Casey Rivera', 'Summit Supply', 'Sales Manager', 'Logistics'],
  ['Morgan Chen', 'Orchard Cloud', 'Head of Growth', 'Software'],
  ['Riley Patel', 'Willow Partners', 'Managing Director', 'Consulting'],
  ['Alex Kim', 'Brightfield Energy', 'Commercial Lead', 'Energy'],
  ['Sam Wilson', 'Meadow Retail', 'Revenue Director', 'Retail'],
  ['Jamie Ellis', 'Pinecrest Learning', 'CEO', 'Education'],
  ['Drew Parker', 'Beacon Works', 'Business Development', 'Manufacturing'],
];

export function createDemoLeads(): Lead[] {
  return contacts.map(([name, company, title, industry], index) => ({
    id: `demo-lead-${index + 1}`,
    name, company, title, industry,
    phone: `+1 202-555-01${String(index).padStart(2, '0')}`,
    email: `lead${index + 1}@example.com`,
    dealSize: `$${(index + 1) * 5},000`,
    dealSizeNum: (index + 1) * 5000,
    score: 95 - index * 4,
    lastContact: 'Not contacted',
    notes: 'Fictional sample lead. Try editing details, adding notes, and recording a call outcome.',
    status: 'new',
    avatar: '',
    location: 'New York, NY',
    source: 'Demo sample',
    callAttempts: 0,
    timezone: 'America/New_York',
    tags: ['Demo', index % 2 === 0 ? 'Inbound' : 'Outbound'],
    companySize: '11-50',
  }));
}
