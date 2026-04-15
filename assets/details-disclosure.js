class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.content = this.mainDetailsToggle.querySelector('summary').nextElementSibling;

    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
  }
}

customElements.define('details-disclosure', DetailsDisclosure);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();
    this.header = document.querySelector('.header-wrapper');

    // On desktop: open/close on hover instead of click
    this.addEventListener('mouseenter', this.openOnHover.bind(this));
    this.addEventListener('mouseleave', this.closeOnHover.bind(this));

    // Prevent click from toggling the dropdown on desktop (hover handles it)
    this.mainDetailsToggle.querySelector('summary').addEventListener('click', (event) => {
      if (window.innerWidth >= 990) event.preventDefault();
    });
  }

  openOnHover() {
    if (window.innerWidth < 990) return;
    this.mainDetailsToggle.setAttribute('open', '');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', 'true');
  }

  closeOnHover() {
    if (window.innerWidth < 990) return;
    this.close();
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}

customElements.define('header-menu', HeaderMenu);
