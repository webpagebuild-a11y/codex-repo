// Conservative editorial gate: only explicit, consequential testing changes.
export const POLICY_VERSION = 2;
export const FOCUS = ['selenium', 'playwright', 'mcp', 'ai'];
export function testingPolicy(item) {
  const text = `${item.title || ''}. ${item.body || item.summary || ''}`;
  const testing = /\b(test automation|automated test|browser automation|testing|test runner|test generation|end.to.end|playwright|selenium|webdriver|assertions?|test suites?)\b/i;
  const relevant = FOCUS.includes(item.tech) && (['selenium','playwright','ai'].includes(item.tech) || testing.test(text));
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter(s => !/\b(no breaking changes|no security fixes|documentation only|dependabot|bump dependencies)\b/i.test(s));
  const security = /\b(CVE-\d{4}-\d+|remote code execution|security (?:fix|patch|advisory)|(?:fix\w*|patch\w*)\b.{0,70}\bvulnerabilit\w*)\b/i;
  const breaking = /\b(breaking changes?|remov(?:e[ds]?|ing) support|end.of.life|will (?:remove|stop supporting)|deprecat(?:ed|ion|ing))\b/i;
  const capability = /\b(?:introduc\w*|new|add(?:ed|s)? support for)\b.{0,90}\b(test agents?|test generation|self.healing tests?|test runner|webDriver biDi|network interception|browser automation|test isolation)\b/i;
  const severe = /\b(?:fix\w*|resolv\w*)\b.{0,70}\b(?:critical|data loss|test runner crash|browser crash|all tests fail)\b/i;
  const evidence = sentences.find(s => (security.test(s) || breaking.test(s) || capability.test(s) || severe.test(s)) && (item.tech !== 'mcp' || testing.test(s)));
  const promotion = /\b(webinar|sponsored|register now|conference|save your seat)\b/i.test(item.title || '');
  const important = relevant && !!evidence && !promotion;
  const upcoming = !!item.prerelease || /\b(upcoming|planned|roadmap|will (?:remove|release|introduce|stop supporting)|preview|release candidate)\b/i.test(evidence || item.title || '');
  return { ...item, policyVersion: POLICY_VERSION, testingRelevant: relevant, important, upcoming,
    ...(important ? { impact:'High', action:security.test(evidence) || breaking.test(evidence), kind:security.test(evidence)?'Security':breaking.test(evidence)?'Breaking change':'Testing capability', summary:evidence.trim().slice(0,260) } : {}) };
}
export function eligible(item, settings) {
  return !settings.testingOnly || (FOCUS.includes(item.tech) && item.policyVersion === POLICY_VERSION && item.testingRelevant && item.important && (settings.includeUpcoming !== false || !item.upcoming));
}
