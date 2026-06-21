export const ATTENDEE_TYPES = [
  "Father",
  "Mother",
  "Parents",
  "Boy",
  "Rabbi",
  "Yeshiva",
  "Other",
];

function clean(value) {
  return String(value || "").trim();
}

function joinNames(names) {
  return names.map(clean).filter(Boolean).join(" / ");
}

function phoneMatches(phone, terms) {
  const label = `${phone?.tag || ""} ${phone?.custom_label || ""}`.toLowerCase();
  return terms.some((term) => label.includes(term));
}

function firstPhone(client, terms = []) {
  const phones = Array.isArray(client?.phone_numbers) ? client.phone_numbers : [];
  const matched = terms.length > 0
    ? phones.find((phone) => phone.number && phoneMatches(phone, terms))
    : null;
  return clean(matched?.number || phones.find((phone) => phone.number)?.number || client?.parent_phone);
}

export function appointmentAttendeeForClient(client, attendeeType) {
  if (!client) return { attendee_name: "", attendee_phone: "" };

  const boyName = joinNames([client.boy_first_name, client.boy_last_name]);
  const fatherName = clean(client.father_name);
  const motherName = clean(client.mother_name);

  switch (attendeeType) {
    case "Father":
      return {
        attendee_name: fatherName,
        attendee_phone: firstPhone(client, ["father"]),
      };
    case "Mother":
      return {
        attendee_name: motherName,
        attendee_phone: firstPhone(client, ["mother"]),
      };
    case "Parents":
      return {
        attendee_name: clean(client.parent_names) || joinNames([fatherName, motherName]) || fatherName || motherName,
        attendee_phone: firstPhone(client, ["father"]) || firstPhone(client, ["mother"]) || firstPhone(client),
      };
    case "Boy":
      return {
        attendee_name: boyName,
        attendee_phone: firstPhone(client),
      };
    case "School":
    case "Yeshiva":
      return {
        attendee_name: clean(client.current_school),
        attendee_phone: "",
      };
    case "Rabbi":
    case "Other":
    default:
      return { attendee_name: "", attendee_phone: "" };
  }
}

export function attendeeSummary(appointment) {
  const type = clean(appointment?.attendee_type);
  const name = clean(appointment?.attendee_name);
  const phone = clean(appointment?.attendee_phone);
  if (!type && !name && !phone) return "";
  const person = [type, name].filter(Boolean).join(": ");
  return [person, phone].filter(Boolean).join(" · ");
}
