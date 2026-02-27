const icsUrl = "https://tockify.com/api/feeds/ics/nashvilleisthereason";

function unfoldICS(text) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseICS(icsText) {
  const events = [];
  const unfolded = unfoldICS(icsText);
  const rawEvents = unfolded.split("BEGIN:VEVENT");

  rawEvents.forEach(block => {
    const titleMatch = block.match(/SUMMARY:(.*)/);
    const dateMatch = block.match(/DTSTART.*:(.*)/);
    const locationMatch = block.match(/LOCATION:(.*)/);
    const urlMatch = block.match(/URL:(.*)/);

    if (titleMatch && dateMatch) {
      const rawDate = dateMatch[1].trim();

      const year = rawDate.substring(0, 4);
      const month = rawDate.substring(4, 6);
      const day = rawDate.substring(6, 8);
      const hour = rawDate.substring(9, 11) || "00";
      const minute = rawDate.substring(11, 13) || "00";

      const formattedDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);

      events.push({
        title: titleMatch[1].trim(),
        date: formattedDate,
        location: locationMatch ? locationMatch[1].trim() : "Nashville, TN",
        url: urlMatch ? urlMatch[1].trim() : "#"
      });
    }
  });

  return events;
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function renderUpcoming(events) {
  const container = document.getElementById("upcoming-shows");
  container.innerHTML = "";

  events.forEach(event => {
    const div = document.createElement("div");
    div.className = "show-item";
    div.innerHTML = `
      <div class="show-date">${formatDate(event.date)}</div>
      <div class="show-title">${event.title}</div>
      <div class="show-location">${event.location}</div>
      <a href="${event.url}" target="_blank" class="ticket-link">Tickets</a>
    `;
    container.appendChild(div);
  });
}

fetch(icsUrl)
  .then(res => res.text())
  .then(text => {
    const allEvents = parseICS(text);

    const upcoming = allEvents
      .filter(e => e.date > new Date())
      .sort((a, b) => a.date - b.date)
      .slice(0, 3);

    renderUpcoming(upcoming);
  })
  .catch(err => {
    console.error("Error loading events:", err);
  });
