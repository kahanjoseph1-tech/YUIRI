// Suggests schools for a client based on hashkafa, religious level,
// special needs and grade range. Returns sorted matches with reasons.

const RELIGIOUS_TO_HASHKAFA = {
  Chassidish: ["Satmar", "Bobov", "Belz", "Ger", "Vizhnitz", "Skver", "Lubavitch"],
  Yeshivish: ["Litvish/Yeshivish"],
  "Modern Orthodox": ["Modern Orthodox"],
  Traditional: ["Sephardi", "Mixed", "Modern Orthodox"],
  Other: [],
};

// Loose check whether a grade label falls inside a school's grade_range string.
function gradeInRange(grade, range) {
  if (!grade || !range) return false;
  return range.toLowerCase().includes(String(grade).toLowerCase());
}

export function scoreSchool(client, school) {
  let score = 0;
  const reasons = [];

  const preferred = RELIGIOUS_TO_HASHKAFA[client.religious_level] || [];
  if (school.hashkafa && preferred.includes(school.hashkafa)) {
    score += 40;
    reasons.push(`Hashkafa match (${school.hashkafa})`);
  } else if (school.hashkafa === "Mixed") {
    score += 20;
    reasons.push("Mixed hashkafa — flexible fit");
  }

  if (gradeInRange(client.grade_level, school.grade_range)) {
    score += 25;
    reasons.push(`Serves grade ${client.grade_level}`);
  }

  const hasNeeds = Array.isArray(client.special_needs) && client.special_needs.length > 0;
  if (hasNeeds) {
    if (school.accepts_special_needs) {
      score += 25;
      reasons.push("Accepts special needs");
    } else {
      score -= 10;
      reasons.push("Does not accept special needs");
    }
  } else {
    score += 5;
  }

  if (client.city && school.location &&
      school.location.toLowerCase().includes(client.city.toLowerCase())) {
    score += 10;
    reasons.push(`Located in ${client.city}`);
  }

  score = Math.max(0, Math.min(100, score));
  return { score, reasons };
}

export function suggestSchools(client, schools) {
  return (schools || [])
    .map((school) => {
      const { score, reasons } = scoreSchool(client, school);
      return { school, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
