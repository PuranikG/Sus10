export function parseReportSections(reportText) {
  if (!reportText) return null;

  const parts = reportText.split(/(?=^## \d+\.)/m);

  const getSection = (num) => {
    const part = parts.find(p => p.match(new RegExp(`^## ${num}\\.`)));
    if (!part) return '';
    return part.replace(/^## [^\n]+\n/, '').trim();
  };

  const extractBullets = (text) => {
    if (!text) return [];
    return text
      .split('\n')
      .map(l => l.trim())
      .filter(l =>
        l.startsWith('- ') ||
        l.startsWith('* ') ||
        l.startsWith('• ') ||
        /^\d+\.\s/.test(l)
      )
      .map(l => l.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '').trim())
      .filter(l => l.length > 3);
  };

  const section3 = getSection(3);
  const section5 = getSection(5);
  const section7 = getSection(7);
  const section9 = getSection(9);

  const parsePhase = (text, phaseNum) => {
    const phasePatterns = [
      /Phase\s+1[:\s]|0[-–]3\s+[Mm]onths?/,
      /Phase\s+2[:\s]|3[-–]12\s+[Mm]onths?/,
      /Phase\s+3[:\s]|1[-–]3\s+[Yy]ears?/,
    ];
    const pattern = phasePatterns[phaseNum - 1];
    const phaseMatch = text.match(
      new RegExp(`(${pattern.source}[^\\n]*)([\\s\\S]*?)(?=Phase\\s+[23]:|$)`, 'i')
    );
    if (!phaseMatch) {
      const lines = text.split('\n').filter(l => l.trim());
      const third = Math.floor(lines.length / 3);
      const start = (phaseNum - 1) * third;
      const chunk = lines.slice(start, start + third);
      return {
        title: phaseNum === 1 ? 'Foundation' : phaseNum === 2 ? 'Install' : 'Optimise',
        body: chunk.join('\n'),
      };
    }
    const titleLine = phaseMatch[1]?.trim() || '';
    const body = phaseMatch[2]?.trim() || '';
    const titleClean =
      titleLine
        .replace(/Phase\s+\d+[:\s\-–]*/i, '')
        .replace(/\d+[-–]\d+\s*(months?|years?)/i, '')
        .replace(/[:\s]+$/, '')
        .trim() ||
      (phaseNum === 1 ? 'Foundation' : phaseNum === 2 ? 'Install' : 'Optimise');
    return { title: titleClean, body };
  };

  return {
    profile:     getSection(1),
    readiness:   getSection(2),
    strengths:
      extractBullets(section3).length > 0
        ? extractBullets(section3)
        : section3.split('\n\n').filter(p => p.trim().length > 20).slice(0, 4),
    gapAnalysis: getSection(4),
    recommendations:
      extractBullets(section5).length > 0
        ? extractBullets(section5)
        : section5.split('\n\n').filter(p => p.trim().length > 20).slice(0, 3),
    savings:         getSection(6),
    roadmap: {
      phase1: parsePhase(section7, 1),
      phase2: parsePhase(section7, 2),
      phase3: parsePhase(section7, 3),
    },
    support:         getSection(8),
    finalAssessment: section9,
  };
}
