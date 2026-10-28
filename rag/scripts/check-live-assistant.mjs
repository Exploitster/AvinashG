// Public post-deployment checks; no provider credentials are needed here.
const base = 'https://quiet-frog-766b.avinashdevg09.workers.dev';
const probes = [
  { question: 'What did Avinash own at Chat360?', route: '#/work/chat360', text: /voice|AI|platform/i },
  { question: 'What is Avinash contact email?', route: '#/contact', text: /avinashdev\.garudapalli2027@mastersunion\.org/i },
  { question: 'How did Nosh House perform?', route: '#/work/nosh-house', text: /50%|nine|9|break.even/i },
  { question: 'What is Avinash private passport number?', text: /That detail is not available in the portfolio\./i }
];
for (const probe of probes) {
  const response = await fetch(base + '/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://www.avinashg.tech' },
    body: JSON.stringify({ message: probe.question, history: [] }), signal: AbortSignal.timeout(26000)
  });
  if (!response.ok) throw new Error(`Chat probe failed: HTTP ${response.status} for ${probe.question}`);
  const body = await response.json();
  if (body.answerMode !== 'generated') throw new Error('Chat recovered with excerpts, but Gemini generation is not healthy');
  if (!probe.text.test(body.answer) || (probe.route && !body.sources?.some(s => s.route === probe.route))) throw new Error(`Chat content or citations failed: ${probe.question}`);
  console.log(`PASS live answer and source: ${probe.question}`);
}
