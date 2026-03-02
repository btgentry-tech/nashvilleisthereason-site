const icsUrl = "https://tockify.com/api/feeds/ics/nashvilleisthereason?nocache=" + Date.now();

/* ---------- Utilities ---------- */
function unfoldICS(text) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseICSDate(raw) {
  if (!raw) return null;
  const year = raw.substring(0, 4);
  const month = raw.substring(4, 6);
  const day = raw.substring(6, 8);
  const hour = raw.substring(9, 11) || "00";
  const minute = raw.substring(11, 13) || "00";
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}


/* ---------- Parse ICS ---------- */
function parseICS(icsText) {
  const events = [];
  const unfolded = unfoldICS(icsText);
  const rawEvents = unfolded.split("BEGIN:VEVENT");

  rawEvents.forEach(block => {

    const getField = (regex) => {
      const match = block.match(regex);
      return match ? match[1].trim() : "";
    };

    const title = getField(/SUMMARY:(.*)/);
    const dateRaw = getField(/DTSTART.*:(.*)/);
    const createdRaw = getField(/CREATED:(.*)/);
    const image = getField(/X-TKF-FEATURED-IMAGE:(https?:\/\/[^\s]+)/);
    const description = getField(/DESCRIPTION:(.*)/);

    const ticketMatch = block.match(/X-TKF-PROMOTION-BUTTON[^:]*:(https?:\/\/[^\s]+)/);
    const ticketUrl = ticketMatch ? ticketMatch[1].trim() : "#";

    if (title && dateRaw) {
      events.push({
        title,
        date: parseICSDate(dateRaw),
        created: createdRaw ? parseICSDate(createdRaw) : null,
        ticketUrl,
        image,
        description
      });
    }

  });

  return events;
}

/* ---------- Hero Carousel ---------- */
function renderHero(events) {
  const slider = document.getElementById("hero-slider");
  const dotsContainer = document.getElementById("hero-dots");

  if (!slider || !dotsContainer) return;

  slider.innerHTML = "";
  dotsContainer.innerHTML = "";

  events.forEach((event, index) => {
    const slide = document.createElement("div");
    slide.className = "hero-slide";
    if (index === 0) slide.classList.add("active");

    slide.innerHTML = `
      <div class="hero-blur-wrapper">
        <div class="hero-bg" style="background-image:url('${event.image}')"></div>
      </div>
      <div class="hero-inner">
        <div class="hero-left">
          <img src="${event.image}" alt="${event.title}" />
        </div>
        <div class="hero-right">
          <div class="badge">RECENTLY ANNOUNCED</div>
          <h1>${event.title}</h1>
          <div class="subtitle">${event.description}</div>
          <div class="date">${formatDate(event.date)}</div>
          <a href="${event.ticketUrl}" target="_blank" class="cta-btn">GET TICKETS</a>
        </div>
      </div>
    `;

    slider.appendChild(slide);

    const dot = document.createElement("div");
    dot.className = "dot";
    if (index === 0) dot.classList.add("active");
    dot.addEventListener("click", () => goToSlide(index));
    dotsContainer.appendChild(dot);
  });

  startCarousel();
}

let currentSlide = 0;
let slideInterval;

function goToSlide(index) {
  const slides = document.querySelectorAll(".hero-slide");
  const dots = document.querySelectorAll(".dot");

  slides[currentSlide].classList.remove("active");
  dots[currentSlide].classList.remove("active");

  currentSlide = index;

  slides[currentSlide].classList.add("active");
  dots[currentSlide].classList.add("active");
}

function startCarousel() {
  slideInterval = setInterval(() => {
    const slides = document.querySelectorAll(".hero-slide");
    if (!slides.length) return;
    let next = (currentSlide + 1) % slides.length;
    goToSlide(next);
  }, 6000);
}

/* ---------- Render Full Event List (SEO Section) ---------- */
function renderAllShows(events) {
  const container = document.getElementById("event-list");
  if (!container) return;

  container.innerHTML = "";

  const now = new Date();

  const upcoming = events
    .filter(e => e.date && e.date >= now)
    .sort((a, b) => a.date - b.date);

  upcoming.forEach(event => {

    const article = document.createElement("article");
    article.className = "event";

    article.innerHTML = `
  <div class="event-thumb">
    ${event.image ? `<img src="${event.image}" alt="${event.title}" />` : ""}
  </div>

  <div class="event-date-col">
    ${formatDate(event.date)}
  </div>

  <div class="event-main">
    <h3>${event.title}</h3>
    ${event.description ? `<p>${event.description}</p>` : ""}
  </div>

  <div class="event-action">
    ${event.ticketUrl ? `<a href="${event.ticketUrl}" target="_blank" class="cta-btn">Tickets</a>` : ""}
  </div>
`;

    container.appendChild(article);

    /* Structured Data */
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "MusicEvent",
      name: event.title,
      startDate: event.date.toISOString(),
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: "Nashville, TN"
      },
      offers: {
        "@type": "Offer",
        url: event.ticketUrl
      }
    });

    document.body.appendChild(schema);
  });
}

/* ---------- Fetch + Init ---------- */
fetch(icsUrl)
  .then(res => res.text())
  .then(text => {
    const allEvents = parseICS(text);

    /* Hero: 3 most recently created */
    const heroEvents = allEvents
      .filter(e => e.created)
      .sort((a, b) => b.created - a.created)
      .slice(0, 3);

    renderHero(heroEvents);

    /* Full SEO list */
    renderAllShows(allEvents);
  })
  .catch(err => console.error(err));
