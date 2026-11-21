// Static checks on the upgraded client: JS parses, and login, sync, push, install, analytics and the alerts fix are wired in.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };

const js = (html.match(/<script>([\s\S]*?)<\/script>/) || [])[1] || '';
try { new vm.Script(js, { filename: 'index.inline.js' }); ok(true, `inline JS parses (${js.split('\n').length} lines)`); }
catch (e) { ok(false, 'inline JS parses: ' + e.message); }

const has = (re, m) => ok(re.test(html), m);
has(/<link rel="manifest" href="\/manifest\.webmanifest">/, 'links the PWA manifest');
has(/<link rel="apple-touch-icon" href="\/icons\/apple-touch-icon\.png">/, 'has the iPhone home-screen icon');
has(/<link rel="icon"[^>]+favicon-32\.png/, 'has a favicon');
has(/navigator\.serviceWorker\.register\('\/sw\.js'/, 'registers the service worker');
has(/pushManager\.subscribe\(\{ userVisibleOnly: true, applicationServerKey/, 'subscribes to real Web Push with the server key');
has(/'\/api\/push\/subscribe'/, 'sends the phone subscription to the server');
has(/id="authForm"/, 'has a login / sign-up screen');
has(/'\/api\/signup' : '\/api\/login'/, 'signs up / signs in against the server');
has(/'PUT', '\/api\/reminders'/, 'saves reminders to the user account');
has(/'POST', '\/api\/events'/, 'sends usage events for analytics');
has(/'\/api\/admin\/analytics' : '\/api\/analytics'/, 'shows personal and all-user analytics');
has(/beforeinstallprompt/, 'offers Install app');
// the Enable alerts fix: explains every reason it can fail instead of a bare "not allowed"
has(/function alertBlocker\(\)/, 'diagnoses why alerts are blocked');
has(/inIframe\) return/, 'handles being opened inside a preview frame');
has(/!window\.isSecureContext\) return/, 'handles non-https links');
has(/isIOS && !isStandalone\) return/, 'handles iPhone needing Add to Home Screen');
has(/Notification\.permission === 'denied'/, 'gives unblock steps when permission was denied');
has(/await Notification\.requestPermission\(\)/, 'asks for permission straight from the tap');
ok(!/Alerts not allowed/.test(html), 'old bare "Alerts not allowed" message is gone');

console.log(fail ? `\n${fail} check(s) failed` : '\nAll client checks passed');
process.exit(fail ? 1 : 0);
