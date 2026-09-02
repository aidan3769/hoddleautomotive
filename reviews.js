// =========================================
// HODDLE AUTOMOTIVE — reviews.js (live Google reviews)
//
// NOT CURRENTLY IN USE. The reviews section on index.html is hand-written
// static markup (real reviews copied from the Google listing), which needs
// no API key, no billing account and no third-party script.
//
// This file is kept so the section can be switched to live updating later.
// TO ENABLE: add an API key below, re-add <script src="reviews.js"></script>
// before </body> in index.html, and replace the static markup inside
// <section id="reviews"> with the empty shells the script expects:
//   <div id="reviewsSummary" class="reviews-summary">…Google logo svg…</div>
//   <div id="reviewsGrid" class="reviews-grid"></div>
//   <a id="reviewsWriteLink" …>  <a id="reviewsAllLink" …>
// (see git history or the comments below for the original structure)
//
// Pulls the business's real Google rating + latest reviews on every
// page load, so the section stays up to date automatically.
//
// SETUP — only the API key is required:
//   1. Go to https://console.cloud.google.com and create a project
//      (or reuse an existing one). Billing must be enabled — Google
//      gives a free monthly allowance a site this size won't exceed.
//   2. Enable these two APIs for the project:
//        • "Maps JavaScript API"
//        • "Places API (New)"
//   3. Create an API key (APIs & Services → Credentials), then
//      RESTRICT it (important — an unrestricted key can be copied
//      and used on someone else's site at your expense):
//        • Application restriction: "Websites" — add
//          https://hoddleautomotive.com.au/* and
//          https://www.hoddleautomotive.com.au/*
//        • API restriction: limit to the two APIs above.
//   4. Paste the key below.
//
// The Place ID is looked up automatically from the business name and
// address. Filling GOOGLE_PLACE_ID in is optional: it skips the lookup
// and halves the API calls per page load, so it's worth pasting in once
// known. Get it from the console's Place ID Finder, or read it from
// this page's console log on first load.
//
// Until the key is filled in, the reviews section simply stays
// hidden — nothing broken is shown to visitors.
// =========================================

const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY';
const GOOGLE_PLACE_ID     = '';  // optional — auto-detected when blank
const GOOGLE_PLACE_QUERY  = 'Hoddle Automotive, 234 Hoddle St, Abbotsford VIC 3067';

(function () {
  const section = document.getElementById('reviews');
  if (!section) return;

  if (GOOGLE_MAPS_API_KEY.startsWith('YOUR_')) return; // hidden until the key is added

  // Load the Maps JS API only when actually configured
  const s = document.createElement('script');
  s.src = 'https://maps.googleapis.com/maps/api/js?key=' +
          encodeURIComponent(GOOGLE_MAPS_API_KEY) +
          '&libraries=places&v=weekly&loading=async&callback=__initGoogleReviews';
  s.async = true;
  document.head.appendChild(s);

  const STAR_FULL =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="#FBBC04" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';
  const STAR_EMPTY =
    '<svg viewBox="0 0 24 24" width="16" height="16" fill="#DADCE0" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>';

  function starRow(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) html += i <= Math.round(rating) ? STAR_FULL : STAR_EMPTY;
    return '<span class="review-stars" aria-label="' + rating + ' out of 5 stars">' + html + '</span>';
  }

  // All review content is inserted with textContent (never innerHTML)
  // so nothing from the API can inject markup into the page.
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  window.__initGoogleReviews = async function () {
    try {
      const { Place } = await google.maps.importLibrary('places');

      let placeId = GOOGLE_PLACE_ID;
      if (!placeId) {
        const { places } = await Place.searchByText({
          textQuery: GOOGLE_PLACE_QUERY,
          fields: ['id'],
          maxResultCount: 1
        });
        if (!places || !places.length) return;
        placeId = places[0].id;
        // Paste this into GOOGLE_PLACE_ID above to skip this lookup in future
        console.info('Hoddle Automotive Place ID:', placeId);
      }

      const place = new Place({ id: placeId });
      await place.fetchFields({
        fields: ['displayName', 'rating', 'userRatingCount', 'reviews', 'googleMapsURI']
      });

      const reviews = (place.reviews || []).filter(r => r.text && r.rating >= 4);
      if (!reviews.length) return;

      // Summary line — appended so the Google logo already in the markup survives
      const summary = document.getElementById('reviewsSummary');
      if (summary && place.rating) {
        summary.innerHTML +=
          '<span class="reviews-score">' + place.rating.toFixed(1) + '</span>' +
          starRow(place.rating) +
          '<span class="reviews-count">from ' + (place.userRatingCount || 0) + ' Google reviews</span>';
      }

      // Review cards
      const grid = document.getElementById('reviewsGrid');
      reviews.slice(0, 6).forEach(r => {
        const card = el('article', 'review-card');

        const head = el('div', 'review-head');
        const author = r.authorAttribution || {};
        if (author.photoURI) {
          const img = document.createElement('img');
          img.className = 'review-avatar';
          img.src = author.photoURI;
          img.alt = '';
          img.loading = 'lazy';
          img.referrerPolicy = 'no-referrer';
          head.appendChild(img);
        } else {
          head.appendChild(el('div', 'review-avatar review-avatar-fallback',
            (author.displayName || '?').charAt(0).toUpperCase()));
        }

        const meta = el('div', 'review-meta');
        meta.appendChild(el('strong', 'review-name', author.displayName || 'Google user'));
        const sub = el('div', 'review-sub');
        sub.innerHTML = starRow(r.rating);
        sub.appendChild(el('span', 'review-time', r.relativePublishTimeDescription || ''));
        meta.appendChild(sub);
        head.appendChild(meta);
        card.appendChild(head);

        card.appendChild(el('p', 'review-text', r.text));
        grid.appendChild(card);
      });

      // "Review us" + "See all" links
      const writeLink = document.getElementById('reviewsWriteLink');
      if (writeLink) {
        writeLink.href = 'https://search.google.com/local/writereview?placeid=' +
                         encodeURIComponent(placeId);
      }
      const allLink = document.getElementById('reviewsAllLink');
      if (allLink && place.googleMapsURI) {
        allLink.href = place.googleMapsURI;
      }

      section.hidden = false;
    } catch (err) {
      // Leave the section hidden — visitors never see an error state
      console.warn('Google reviews unavailable:', err);
    }
  };
})();
