const gh = (repo) => ({ type: 'github', url: `https://api.github.com/repos/${repo}/releases?per_page=5`, home: `https://github.com/${repo}/releases` });
const rss = (url, home) => ({ type: 'rss', url, home });
export const catalog = [
  ['playwright', 'Playwright', 'UI testing', 'PW', gh('microsoft/playwright')],
  ['cypress', 'Cypress', 'UI testing', 'cy', gh('cypress-io/cypress')],
  ['selenium', 'Selenium', 'UI testing', 'Se', gh('SeleniumHQ/selenium')],
  ['webdriverio', 'WebdriverIO', 'UI testing', 'W', gh('webdriverio/webdriverio')],
  ['java', 'Java', 'Languages', 'J', rss('https://inside.java/feed.xml', 'https://inside.java')],
  ['typescript', 'TypeScript', 'Languages', 'TS', gh('microsoft/TypeScript')],
  ['javascript', 'JavaScript', 'Languages', 'JS', rss('https://v8.dev/blog.atom', 'https://v8.dev/blog')],
  ['python', 'Python', 'Languages', 'Py', rss('https://blog.python.org/feeds/posts/default?alt=rss', 'https://blog.python.org')],
  ['csharp', 'C#', 'Languages', 'C#', gh('dotnet/roslyn')],
  ['node', 'Node.js', 'Runtime & CI', 'N', gh('nodejs/node')],
  ['github', 'GitHub Actions', 'Runtime & CI', 'GH', gh('actions/runner-images')],
  ['jenkins', 'Jenkins', 'Runtime & CI', 'Je', gh('jenkinsci/jenkins')],
  ['azure', 'Azure DevOps', 'Runtime & CI', 'Az', rss('https://devblogs.microsoft.com/devops/feed/', 'https://devblogs.microsoft.com/devops/')],
  ['aws', 'AWS', 'Infrastructure', 'aws', rss('https://aws.amazon.com/about-aws/whats-new/recent/feed/', 'https://aws.amazon.com/new/')],
  ['docker', 'Docker', 'Infrastructure', 'D', gh('moby/moby')],
  ['kubernetes', 'Kubernetes', 'Infrastructure', 'K', gh('kubernetes/kubernetes')],
  ['helm', 'Helm', 'Infrastructure', 'H', gh('helm/helm')],
  ['postman', 'Postman', 'API & performance', 'Po', gh('postmanlabs/newman')],
  ['restassured', 'RestAssured', 'API & performance', 'RA', gh('rest-assured/rest-assured')],
  ['pactum', 'PactumJS', 'API & performance', 'Pa', gh('pactumjs/pactum')],
  ['jmeter', 'JMeter', 'API & performance', 'JM', gh('apache/jmeter')],
  ['mcp', 'MCP for testing', 'AI tooling', 'MCP', rss('https://blog.modelcontextprotocol.io/index.xml', 'https://blog.modelcontextprotocol.io/')],
  ['ai', 'AI agents & testing', 'AI tooling', '✧', gh('microsoft/playwright-mcp')],
].map(([id, name, category, icon, source]) => ({ id, name, category, icon, source }));
export const defaults = { email: '', frequency: 'daily', limit: 5, enabled: false, testingOnly: true, includeUpcoming: true, technologies: ['selenium','playwright','mcp','ai'], versions: {} };
export const samples = [
  ['node', 'A runtime security patch worth prioritizing', 'A sample security advisory shows how runtime fixes surface above routine releases.', 'High', 'Security', true],
  ['github', 'A runner image change could affect your pipeline', 'An example image migration highlights dependencies to check before your next CI run.', 'High', 'Breaking change', true],
  ['playwright', 'A better way to investigate flaky UI tests', 'An illustrative release highlights trace diagnostics and a practical check for your test suite.', 'Medium', 'Release', false],
  ['cypress', 'Less guesswork when debugging a failed test', 'A sample debugging improvement helps you decide whether a tool upgrade is worth a trial.', 'Medium', 'Release', false],
  ['docker', 'Keep your test containers reproducible', 'An example engine update reminds you to validate pinned images in a staging pipeline.', 'Medium', 'Release', false],
  ['mcp', 'MCP for testing', 'AI tooling', 'MCP', rss('https://blog.modelcontextprotocol.io/index.xml', 'https://blog.modelcontextprotocol.io/')],
  ['ai', 'Explore agents in a controlled testing workflow', 'An illustrative tooling update suggests trying an agent against a small, non-production test suite.', 'Low', 'Release', false],
].map(([tech, title, summary, impact, kind, action], i) => ({ id: `sample-${i}`, tech, title, summary, impact, kind, action, sample: true, url: catalog.find(t => t.id === tech).source.home, published: '2026-09-19T09:00:00Z', body: summary, ranking: 'Illustrative sample', version: '' }));
