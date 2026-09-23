// A simple drag-to-swipe card stack. No dependencies, pointer events only
// (works for mouse and touch alike).
function createSwipeDeck({ container, titles, onSwipe }) {
  let index = 0;

  function cardHtml(title, depth) {
    const rating = title.imdbRating != null ? `★ ${title.imdbRating.toFixed(1)}` : 'Unrated';
    const runtime = title.runtimeMinutes ? `${title.runtimeMinutes} min` : '';
    const poster = title.posterUrl || '';
    return `
      <div class="swipe-card" data-depth="${depth}" style="z-index:${100 - depth}">
        <div class="swipe-card__poster" style="background-image:url('${poster}')"></div>
        <div class="swipe-card__badge swipe-card__badge--like">LIKE</div>
        <div class="swipe-card__badge swipe-card__badge--pass">PASS</div>
        <div class="swipe-card__info">
          <h3>${escapeHtml(title.title)} <span class="swipe-card__year">${title.year || ''}</span></h3>
          <div class="swipe-card__meta">${rating} &middot; ${runtime}</div>
          <p class="swipe-card__synopsis">${escapeHtml(title.synopsis || 'No synopsis available.')}</p>
        </div>
      </div>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    const visible = titles.slice(index, index + 3);
    if (!visible.length) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = visible.map((t, i) => cardHtml(t, i)).reverse().join('');
    attachDrag();
  }

  function attachDrag() {
    const topCard = container.querySelector('.swipe-card[data-depth="0"]');
    if (!topCard) return;

    let startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;

    const onPointerDown = e => {
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      topCard.setPointerCapture && topCard.setPointerCapture(e.pointerId);
    };
    const onPointerMove = e => {
      if (!dragging) return;
      dx = e.clientX - startX;
      dy = e.clientY - startY;
      const rotate = dx / 12;
      topCard.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`;
      const likeOpacity = Math.max(0, Math.min(1, dx / 100));
      const passOpacity = Math.max(0, Math.min(1, -dx / 100));
      topCard.querySelector('.swipe-card__badge--like').style.opacity = likeOpacity;
      topCard.querySelector('.swipe-card__badge--pass').style.opacity = passOpacity;
    };
    const onPointerUp = () => {
      if (!dragging) return;
      dragging = false;
      const threshold = 90;
      if (Math.abs(dx) > threshold) {
        commitSwipe(topCard, dx > 0);
      } else {
        topCard.style.transition = 'transform 0.25s ease';
        topCard.style.transform = 'translate(0,0) rotate(0)';
        setTimeout(() => { topCard.style.transition = ''; }, 250);
      }
      dx = 0; dy = 0;
    };

    topCard.addEventListener('pointerdown', onPointerDown);
    topCard.addEventListener('pointermove', onPointerMove);
    topCard.addEventListener('pointerup', onPointerUp);
    topCard.addEventListener('pointercancel', onPointerUp);
  }

  function commitSwipe(cardEl, liked) {
    const flyX = liked ? window.innerWidth : -window.innerWidth;
    cardEl.style.transition = 'transform 0.4s ease';
    cardEl.style.transform = `translate(${flyX}px, -40px) rotate(${liked ? 25 : -25}deg)`;
    const title = titles[index];
    index += 1;
    onSwipe(title, liked);
    setTimeout(render, 220);
  }

  // Buttons as an alternative to dragging.
  function swipeTop(liked) {
    const topCard = container.querySelector('.swipe-card[data-depth="0"]');
    if (topCard) commitSwipe(topCard, liked);
  }

  render();
  return { swipeTop, hasMore: () => index < titles.length };
}
